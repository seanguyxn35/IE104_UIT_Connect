// SV-06: Leader mời sinh viên vào nhóm (team_invitation) và người được mời trả lời.
//   - Chỉ Leader tra cứu, gửi, xem và thu hồi lời mời của nhóm. Chỉ chính người được mời được trả lời.
//   - Tra cứu bằng ĐÚNG MSSV hoặc email, chỉ trả tên, MSSV, ngành; giới hạn số người tra trong 10 phút.
//   - Gửi / trả lời / thu hồi chạy bằng hàm CSDL (migration 012): một transaction, khóa dòng nhóm.
//   - Hết hạn tính khi đọc. INVITE_DAYS, MAX_PENDING phải khớp migration 012.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';

export const INVITE_DAYS = 7;
const REINVITE_DAYS = 7; // sau khi bị từ chối
export const MAX_PENDING = 10;
const DAY = 24 * 60 * 60 * 1000;

// Chống dò danh sách sinh viên: mỗi tài khoản tra tối đa ngần này người KHÁC NHAU trong cửa sổ thời gian.
// Đếm trong bộ nhớ máy chủ (khởi động lại thì xóa), giống đếm đăng nhập sai.
export const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW = 10 * 60 * 1000;
const lookups = new Map(); // accountId -> Map(chuỗi đã tra -> lúc tra)

function countLookup(accountId, query) {
  const now = Date.now();
  const mine = lookups.get(accountId) ?? new Map();
  for (const [key, at] of mine) if (now - at > LOOKUP_WINDOW) mine.delete(key);
  if (!mine.has(query) && mine.size >= LOOKUP_LIMIT) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Bạn đã tra cứu quá nhiều sinh viên. Hãy thử lại sau ít phút.');
  }
  mine.set(query, mine.get(query) ?? now);
  lookups.set(accountId, mine);
}

const viDate = (value) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

// Lỗi phía Leader
const LEADER_ERRORS = {
  TEAM_NOT_FOUND: () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.'),
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được mời thành viên.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không mời thêm được.'),
  STUDENT_NOT_FOUND: () => new AppError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy sinh viên với MSSV hoặc email này.'),
  ALREADY_MEMBER: () => new AppError(409, 'ALREADY_MEMBER', 'Sinh viên này đã là thành viên của nhóm.'),
  TEAM_FULL: (r) => new AppError(409, 'TEAM_FULL', `Nhóm đã đủ ${r.maxMembers} thành viên.`),
  ALREADY_INVITED: () => new AppError(409, 'ALREADY_INVITED', 'Sinh viên này đang có lời mời chờ trả lời.'),
  HAS_PENDING_APPLICATION: () => new AppError(409, 'HAS_PENDING_APPLICATION', 'Sinh viên này đã nộp đơn xin vào nhóm. Hãy duyệt đơn đó thay vì gửi lời mời.'),
  DECLINED_RECENTLY: (r) => new AppError(409, 'DECLINED_RECENTLY', `Sinh viên này vừa từ chối lời mời. Có thể mời lại từ ngày ${viDate(r.retryAt)}.`),
  INVITE_LIMIT: () => new AppError(409, 'INVITE_LIMIT', `Nhóm đang có ${MAX_PENDING} lời mời chờ trả lời. Hãy thu hồi bớt trước khi mời thêm.`),
  INVITATION_NOT_FOUND: () => new AppError(404, 'INVITATION_NOT_FOUND', 'Nhóm không có lời mời này.'),
  INVITATION_NOT_PENDING: () => new AppError(409, 'INVITATION_NOT_PENDING', 'Lời mời này đã được trả lời hoặc đã thu hồi.'),
};

// Lỗi phía người được mời
const INVITEE_ERRORS = {
  INVITATION_NOT_FOUND: () => new AppError(404, 'INVITATION_NOT_FOUND', 'Không tìm thấy lời mời này.'),
  INVITATION_NOT_PENDING: (r) => new AppError(409, 'INVITATION_NOT_PENDING',
    r.status === 'Cancelled' ? 'Nhóm đã thu hồi lời mời này.' : 'Lời mời này đã được trả lời hoặc đã hết hạn.'),
  INVITATION_EXPIRED: () => new AppError(409, 'INVITATION_EXPIRED', 'Lời mời đã hết hạn.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động.'),
  TEAM_FULL: () => new AppError(409, 'TEAM_FULL', 'Nhóm đã đủ thành viên nên bạn chưa thể tham gia.'),
  ALREADY_MEMBER: () => new AppError(409, 'ALREADY_MEMBER', 'Bạn đã là thành viên của nhóm này.'),
};

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function rpc(name, params, errors) {
  const result = check(await supabase.rpc(name, params));
  if (result.error) throw errors[result.error](result);
  return result;
}

const pendingSince = () => new Date(Date.now() - INVITE_DAYS * DAY).toISOString(); // lời mời tạo trước mốc này đã hết hạn
const expiresAt = (createdAt) => new Date(Date.parse(createdAt) + INVITE_DAYS * DAY).toISOString();

// Leader của nhóm; trả thông tin nhóm. Hàm CSDL vẫn kiểm tra lại lúc ghi.
async function requireLeader(studentId, teamId, { active = true } = {}) {
  const row = check(await supabase.from('team_member')
    .select('role_in_team, student_team(status, max_members)')
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!row) throw LEADER_ERRORS.TEAM_NOT_FOUND();
  if (row.role_in_team !== 'Leader') throw LEADER_ERRORS.NOT_TEAM_LEADER();
  if (active && row.student_team.status !== 'Active') throw LEADER_ERRORS.TEAM_INACTIVE();
  return row.student_team;
}

// query: 8 chữ số MSSV hoặc email @gm.uit.edu.vn (route đã chuẩn hóa). Tài khoản khóa / chưa xác thực coi như không có.
async function findStudent(query) {
  const columns = 'student_id, full_name, student_code, major(name), account!inner(email, is_active, email_verified_at)';
  const request = supabase.from('student_profile').select(columns);
  const row = check(await (query.includes('@')
    ? request.eq('account.email', query)
    : request.eq('student_code', query)).maybeSingle());
  return row?.account?.is_active && row.account.email_verified_at ? row : null;
}

const studentDto = (row) => ({ fullName: row.full_name, studentCode: row.student_code, major: row.major?.name ?? null });

export async function lookupStudent(leaderId, teamId, query) {
  const team = await requireLeader(leaderId, teamId);
  countLookup(leaderId, query);
  const student = await findStudent(query);
  if (!student) throw LEADER_ERRORS.STUDENT_NOT_FOUND();

  const [members, invitations, applications] = await Promise.all([
    supabase.from('team_member').select('student_id').eq('team_id', teamId).then(check),
    supabase.from('team_invitation').select('student_id, status, created_at, responded_at')
      .eq('team_id', teamId).in('status', ['Pending', 'Declined']).then(check),
    supabase.from('recruitment_application').select('apply_id, team_recruitment!inner(team_id)')
      .eq('student_id', student.student_id).eq('status', 'Pending').eq('team_recruitment.team_id', teamId).then(check),
  ]);
  const since = Date.parse(pendingSince());
  const pending = invitations.filter((i) => i.status === 'Pending' && Date.parse(i.created_at) > since);
  const declinedAt = Math.max(0, ...invitations
    .filter((i) => i.status === 'Declined' && i.student_id === student.student_id).map((i) => Date.parse(i.responded_at)));

  // Cùng thứ tự với hàm gui_loi_moi_vao_nhom
  let blocked = null;
  if (members.some((m) => m.student_id === student.student_id)) blocked = LEADER_ERRORS.ALREADY_MEMBER();
  else if (members.length >= team.max_members) blocked = LEADER_ERRORS.TEAM_FULL({ maxMembers: team.max_members });
  else if (pending.some((i) => i.student_id === student.student_id)) blocked = LEADER_ERRORS.ALREADY_INVITED();
  else if (applications.length) blocked = LEADER_ERRORS.HAS_PENDING_APPLICATION();
  else if (declinedAt > Date.now() - REINVITE_DAYS * DAY) blocked = LEADER_ERRORS.DECLINED_RECENTLY({ retryAt: declinedAt + REINVITE_DAYS * DAY });
  else if (pending.length >= MAX_PENDING) blocked = LEADER_ERRORS.INVITE_LIMIT();

  return {
    student: studentDto(student),
    canInvite: blocked === null,
    blockedReason: blocked?.code ?? null,
    blockedMessage: blocked?.message ?? null,
  };
}

export async function sendInvitation(leaderId, teamId, query, message) {
  await requireLeader(leaderId, teamId);
  countLookup(leaderId, query);
  const student = await findStudent(query);
  const result = await rpc('gui_loi_moi_vao_nhom', {
    p_team_id: teamId, p_actor_id: leaderId, p_student_id: student?.student_id ?? null, p_message: message,
  }, LEADER_ERRORS);
  return { invitationId: result.invitationId, student: studentDto(student) };
}

async function namesOf(studentIds) {
  if (!studentIds.length) return new Map();
  const rows = check(await supabase.from('student_profile').select('student_id, full_name').in('student_id', studentIds));
  return new Map(rows.map((r) => [r.student_id, r.full_name]));
}

export async function listTeamInvitations(leaderId, teamId) {
  await requireLeader(leaderId, teamId, { active: false }); // nhóm ngừng hoạt động vẫn xem và thu hồi được
  const rows = check(await supabase.from('team_invitation')
    .select('invitation_id, student_id, invited_by_account_id, message, created_at')
    .eq('team_id', teamId).eq('status', 'Pending').gt('created_at', pendingSince())
    .order('created_at', { ascending: false }).order('invitation_id', { ascending: false }));
  const [students, inviters] = await Promise.all([
    rows.length
      ? supabase.from('student_profile').select('student_id, full_name, student_code, major(name)')
        .in('student_id', rows.map((r) => r.student_id)).then(check)
      : [],
    namesOf([...new Set(rows.map((r) => r.invited_by_account_id))]),
  ]);
  const byId = new Map(students.map((s) => [s.student_id, s]));
  return {
    maxPending: MAX_PENDING,
    invitations: rows.map((r) => ({
      invitationId: r.invitation_id,
      student: studentDto(byId.get(r.student_id)),
      invitedBy: inviters.get(r.invited_by_account_id) ?? null,
      message: r.message,
      createdAt: r.created_at,
      expiresAt: expiresAt(r.created_at),
    })),
  };
}

export async function cancelInvitation(leaderId, teamId, invitationId) {
  await rpc('thu_hoi_loi_moi_vao_nhom', { p_team_id: teamId, p_invitation_id: invitationId, p_actor_id: leaderId }, LEADER_ERRORS);
  return { invitationId, status: 'Cancelled' };
}

// Lời mời còn hiệu lực gửi cho tôi
export async function listMyInvitations(studentId) {
  const rows = check(await supabase.from('team_invitation')
    .select(`invitation_id, team_id, invited_by_account_id, message, created_at,
             student_team(team_name, short_name, avatar_url, description, status, max_members,
             field:field!fk_student_team_field(name))`)
    .eq('student_id', studentId).eq('status', 'Pending').gt('created_at', pendingSince())
    .order('created_at', { ascending: false }).order('invitation_id', { ascending: false }));
  if (!rows.length) return [];
  const [members, inviters] = await Promise.all([
    supabase.from('team_member').select('team_id').in('team_id', rows.map((r) => r.team_id)).then(check),
    namesOf([...new Set(rows.map((r) => r.invited_by_account_id))]),
  ]);
  return rows.map((r) => {
    const team = r.student_team;
    const memberCount = members.filter((m) => m.team_id === r.team_id).length;
    const blocked = team.status !== 'Active' ? 'TEAM_INACTIVE' : memberCount >= team.max_members ? 'TEAM_FULL' : null;
    return {
      invitationId: r.invitation_id,
      team: {
        teamId: r.team_id,
        name: team.team_name,
        shortName: team.short_name,
        avatarUrl: team.avatar_url,
        description: team.description,
        field: team.field?.name ?? null,
        memberCount,
        maxMembers: team.max_members,
      },
      invitedBy: inviters.get(r.invited_by_account_id) ?? null,
      message: r.message,
      createdAt: r.created_at,
      expiresAt: expiresAt(r.created_at),
      canAccept: blocked === null,
      acceptBlockedReason: blocked,
    };
  });
}

// Dùng cho huy hiệu menu trái (được gọi định kỳ)
export async function countMyInvitations(studentId) {
  const { count, error } = await supabase.from('team_invitation')
    .select('invitation_id', { count: 'exact', head: true })
    .eq('student_id', studentId).eq('status', 'Pending').gt('created_at', pendingSince());
  if (error) throw error;
  return count ?? 0;
}

export async function acceptInvitation(studentId, invitationId) {
  const result = await rpc('tra_loi_moi_vao_nhom',
    { p_invitation_id: invitationId, p_actor_id: studentId, p_accept: true, p_reason: null }, INVITEE_ERRORS);
  return { invitationId, status: 'Accepted', ...result };
}

export async function declineInvitation(studentId, invitationId, reason) {
  const result = await rpc('tra_loi_moi_vao_nhom',
    { p_invitation_id: invitationId, p_actor_id: studentId, p_accept: false, p_reason: reason }, INVITEE_ERRORS);
  return { invitationId, status: 'Declined', ...result };
}
