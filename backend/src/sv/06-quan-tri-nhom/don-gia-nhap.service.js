// SV-06 Quản trị nhóm: đơn xin gia nhập nhóm (recruitment_application). Đây là thực thể riêng, không phải
// connection_request (kết nối DN / đề tài).
//   - Mọi thành viên xem được nhóm và đơn; CHỈ Leader (theo team_member.role_in_team) chấp nhận / từ chối.
//   - Người ngoài nhóm nhận 404 như thể nhóm không tồn tại.
//   - Chấp nhận / từ chối chạy bằng hàm trong CSDL (migration 009): một transaction, khóa dòng nhóm.
//   - Số thành viên đếm từ team_member, số đơn đếm từ recruitment_application: không lưu số đếm riêng.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { getTeams } from '../../shared/resourceOwnership.js';
import { listCvProjects } from '../04-ho-so-nang-luc-cv/cong-trinh-trung-bay.service.js';

export const LIST_STATUSES = ['Pending', 'Accepted', 'Rejected']; // đơn SV đã rút (Withdrawn) không hiện ở tab nào
const SLA_HOURS = 72; // cam kết phản hồi
const URGENT_HOURS = 24; // "cần phản hồi gấp" khi còn dưới ngần này giờ tới hạn
const HOUR = 60 * 60 * 1000;

const APPLICATION_COLUMNS = `apply_id, recruit_id, student_id, message, status, applied_at, responded_at, response_note, share_gpa,
  team_recruitment!inner(recruit_id, team_id, title, slots, status, deadline)`;

const teamNotFound = () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.');

// Mã lỗi hàm CSDL trả về -> lỗi API
const DECISION_ERRORS = {
  TEAM_NOT_FOUND: teamNotFound,
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được xử lý đơn xin gia nhập.'),
  APPLICATION_NOT_FOUND: () => new AppError(404, 'APPLICATION_NOT_FOUND', 'Nhóm không có đơn này.'),
  APPLICATION_NOT_PENDING: (r) => new AppError(409, 'APPLICATION_NOT_PENDING',
    r.status === 'Withdrawn' ? 'Sinh viên đã rút đơn này.' : 'Đơn này đã được xử lý.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không nhận thêm thành viên.'),
  TEAM_FULL: (r) => new AppError(409, 'TEAM_FULL',
    `Nhóm đã đủ ${r.maxMembers} thành viên. Bạn có thể đóng các tin tuyển đang mở.`),
  ALREADY_MEMBER: () => new AppError(409, 'ALREADY_MEMBER', 'Sinh viên này đã là thành viên của nhóm.'),
  APPLICANT_INACTIVE: () => new AppError(409, 'APPLICANT_INACTIVE', 'Tài khoản của người nộp đơn đang bị khóa.'),
  POST_FILLED: () => new AppError(409, 'POST_FILLED', 'Tin tuyển này đã đủ chỉ tiêu.'),
};

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (cùng dạng với cột deadline)
const todayInVietnam = () => new Date(Date.now() + 7 * HOUR).toISOString().slice(0, 10);

// Trạng thái thực của tin tuyển: đủ chỉ tiêu được ưu tiên hơn đóng / hết hạn vì nó chặn chấp nhận
function postState(post, acceptedCount) {
  if (post.status === 'Filled' || acceptedCount >= post.slots) return 'Filled';
  if (post.status === 'Closed') return 'Closed';
  if (post.deadline && post.deadline < todayInVietnam()) return 'Expired';
  return 'Open';
}

// Hạn phản hồi tính từ lúc nộp, không ai gán tay
function responseDeadline(appliedAt, now) {
  const dueAt = Date.parse(appliedAt) + SLA_HOURS * HOUR;
  const level = now > dueAt ? 'overdue' : dueAt - now < URGENT_HOURS * HOUR ? 'urgent' : 'normal';
  return { dueAt: new Date(dueAt).toISOString(), level };
}

// Tỉ lệ phản hồi đúng hạn: trong các đơn đã xử lý và đơn đang chờ đã quá hạn. null = chưa có gì để tính
function responseRate(rows, now) {
  let onTime = 0;
  let total = 0;
  for (const row of rows) {
    const applied = Date.parse(row.applied_at);
    if (['Accepted', 'Rejected'].includes(row.status) && row.responded_at) {
      total++;
      if (Date.parse(row.responded_at) - applied <= SLA_HOURS * HOUR) onTime++;
    } else if (row.status === 'Pending' && now - applied > SLA_HOURS * HOUR) {
      total++;
    }
  }
  return total ? Math.round((onTime / total) * 100) : null;
}

const countBy = (rows, key) => rows.reduce((map, row) => map.set(row[key], (map.get(row[key]) ?? 0) + 1), new Map());

async function teamApplications(teamId) {
  return check(await supabase.from('recruitment_application').select(APPLICATION_COLUMNS)
    .eq('team_recruitment.team_id', teamId));
}

async function teamMemberIds(teamId) {
  const rows = check(await supabase.from('team_member').select('student_id').eq('team_id', teamId));
  return new Set(rows.map((r) => r.student_id));
}

// SV phải là thành viên nhóm; trả { team, role }
async function requireMembership(studentId, teamId) {
  const row = check(await supabase.from('team_member')
    .select(`role_in_team, student_team(team_id, team_name, short_name, team_code, semester, status, max_members,
             description, field(name))`)
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!row) throw teamNotFound();
  return { team: row.student_team, role: row.role_in_team };
}

const toTeamDto = (team, role) => ({
  teamId: team.team_id,
  name: team.team_name,
  shortName: team.short_name,
  code: team.team_code,
  semester: team.semester,
  status: team.status,
  maxMembers: team.max_members,
  role,
});

export async function listMyTeams(studentId) {
  const mine = await getTeams(studentId);
  if (mine.length === 0) return [];
  const ids = mine.map((t) => t.teamId);
  const [teams, members, pending] = await Promise.all([
    supabase.from('student_team')
      .select('team_id, team_name, short_name, team_code, semester, status, max_members')
      .in('team_id', ids).order('team_name').then(check),
    supabase.from('team_member').select('team_id').in('team_id', ids).then(check),
    supabase.from('recruitment_application').select('apply_id, team_recruitment!inner(team_id)')
      .eq('status', 'Pending').in('team_recruitment.team_id', ids).then(check),
  ]);
  const memberCounts = countBy(members, 'team_id');
  const pendingCounts = countBy(pending.map((p) => p.team_recruitment), 'team_id');
  const roles = new Map(mine.map((t) => [t.teamId, t.role]));
  return teams.map((team) => ({
    ...toTeamDto(team, roles.get(team.team_id)),
    memberCount: memberCounts.get(team.team_id) ?? 0,
    pendingCount: pendingCounts.get(team.team_id) ?? 0,
  }));
}

// Số liệu cho các thẻ đầu trang
export async function getTeamOverview(studentId, teamId) {
  const { team, role } = await requireMembership(studentId, teamId);
  const [memberIds, posts, applications, top] = await Promise.all([
    teamMemberIds(teamId),
    supabase.from('team_recruitment').select('recruit_id, slots, status, deadline').eq('team_id', teamId).then(check),
    teamApplications(teamId),
    supabase.from('academic_resource').select('title, trl_level')
      .eq('owner_team_id', teamId).not('trl_level', 'is', null).not('status', 'in', '(Rejected,Hidden)')
      .order('trl_level', { ascending: false }).order('resource_id').limit(1).then(check),
  ]);
  const accepted = countBy(applications.filter((a) => a.status === 'Accepted'), 'recruit_id');
  const states = countBy(posts.map((p) => ({ state: postState(p, accepted.get(p.recruit_id) ?? 0) })), 'state');
  const now = Date.now();
  const pending = applications.filter((a) => a.status === 'Pending');
  return {
    ...toTeamDto(team, role),
    description: team.description,
    field: team.field?.name ?? null,
    memberCount: memberIds.size,
    applications: {
      pending: pending.length,
      newLast24h: pending.filter((a) => now - Date.parse(a.applied_at) <= 24 * HOUR).length,
      responseRate: responseRate(applications, now),
    },
    recruitments: {
      total: posts.length,
      open: states.get('Open') ?? 0,
      filled: states.get('Filled') ?? 0,
      closed: states.get('Closed') ?? 0,
      expired: states.get('Expired') ?? 0,
    },
    highestTrl: top[0] ? { level: top[0].trl_level, title: top[0].title } : null,
  };
}

// Thông tin người nộp để Leader quyết định, chỉ lấy cho đơn đang chờ. Tôn trọng lựa chọn ẩn trên hồ sơ:
// Kỹ năng đang ẩn thì không gửi; "Đề tài & Công bố" đang ẩn thì không gửi công trình. GPA xét riêng theo từng đơn.
// Không gửi email, điểm rèn luyện hay điểm thẩm định.
async function applicantDetails(studentIds) {
  if (studentIds.length === 0) return new Map();
  const [profiles, skills, publications] = await Promise.all([
    supabase.from('student_profile')
      .select('student_id, gpa, github_url, is_skills_public, is_achievements_public')
      .in('student_id', studentIds).then(check),
    supabase.from('student_skill').select('student_id, skill_level, skill(name)')
      .in('student_id', studentIds).order('skill_level', { ascending: false }).then(check),
    // Công bố tự cung cấp có liên kết; chỉ mục để Công khai ('Partners_Only' không dành cho trưởng nhóm)
    supabase.from('student_achievement').select('student_id, title, external_url')
      .in('student_id', studentIds).eq('category', 'Publication').eq('visibility', 'Public')
      .neq('verification_status', 'Rejected').not('external_url', 'is', null)
      .order('achievement_id').then(check),
  ]);

  return new Map(await Promise.all(profiles.map(async (profile) => {
    const id = profile.student_id;
    // Cùng quy tắc với CV: công trình ghim, đã công khai, đã thẩm định và SV còn quyền ghi tác quyền
    const projects = profile.is_achievements_public ? await listCvProjects(id) : [];
    const selfDeclared = publications.filter((p) => p.student_id === id)
      .map((p) => ({ title: p.title, url: p.external_url }));
    if (profile.github_url) selfDeclared.unshift({ title: 'GitHub', url: profile.github_url });
    return [id, {
      gpa: profile.gpa,
      skills: profile.is_skills_public
        ? skills.filter((s) => s.student_id === id).map((s) => ({ name: s.skill.name, level: s.skill_level }))
        : null, // null = SV đang ẩn mục kỹ năng
      evidence: {
        // "Đã thẩm định" (từ hệ thống) và "SV tự cung cấp" (liên kết nhập tay) để riêng, không trộn
        reviewed: projects.map((p) => ({ title: p.title, type: p.type, trlLevel: p.trlLevel, reviewerName: p.reviewerName })),
        selfDeclared,
      },
    }];
  })));
}

// Lý do chặn chấp nhận, theo đúng thứ tự kiểm tra của hàm CSDL (hàm vẫn kiểm tra lại lúc ghi)
function acceptBlocker({ team, memberCount, isMember, isActive, state }) {
  if (team.status !== 'Active') return 'TEAM_INACTIVE';
  if (memberCount >= team.max_members) return 'TEAM_FULL';
  if (isMember) return 'ALREADY_MEMBER';
  if (!isActive) return 'APPLICANT_INACTIVE';
  if (state === 'Filled') return 'POST_FILLED';
  return null;
}

export async function listTeamApplications(studentId, teamId, status) {
  const { team, role } = await requireMembership(studentId, teamId);
  const [rows, memberIds] = await Promise.all([teamApplications(teamId), teamMemberIds(teamId)]);
  const isLeader = role === 'Leader';
  const now = Date.now();
  const accepted = countBy(rows.filter((r) => r.status === 'Accepted'), 'recruit_id');

  const shown = rows.filter((r) => r.status === status).sort(status === 'Pending'
    ? (a, b) => a.applied_at.localeCompare(b.applied_at) || a.apply_id - b.apply_id // gần hết hạn đứng trước
    : (a, b) => (b.responded_at ?? '').localeCompare(a.responded_at ?? '') || b.apply_id - a.apply_id);
  const studentIds = [...new Set(shown.map((r) => r.student_id))];

  const [people, details] = await Promise.all([
    studentIds.length
      ? supabase.from('student_profile')
        .select('student_id, full_name, student_code, class_name, cohort, major(name), account(avatar_url, is_active)')
        .in('student_id', studentIds).then(check)
      : [],
    // Đơn đã xử lý chỉ còn danh tính và kết quả, không tiếp tục chia sẻ hồ sơ của người nộp
    status === 'Pending' ? applicantDetails(studentIds) : new Map(),
  ]);
  const peopleById = new Map(people.map((p) => [p.student_id, p]));

  const applications = shown.map((row) => {
    const person = peopleById.get(row.student_id);
    const post = row.team_recruitment;
    const state = postState(post, accepted.get(post.recruit_id) ?? 0);
    const base = {
      applyId: row.apply_id,
      status: row.status,
      appliedAt: row.applied_at,
      message: row.message,
      applicant: {
        studentId: row.student_id,
        fullName: person?.full_name ?? null,
        studentCode: person?.student_code ?? null,
        className: person?.class_name ?? null,
        cohort: person?.cohort ?? null,
        major: person?.major?.name ?? null,
        avatarUrl: person?.account?.avatar_url ?? null,
      },
      recruitment: { recruitId: post.recruit_id, title: post.title, state },
    };
    if (status !== 'Pending') {
      return {
        ...base,
        respondedAt: row.responded_at,
        responseNote: row.response_note,
        // Chỉ có nghĩa với đơn đã chấp nhận: người đó còn ở trong nhóm hay đã rời
        stillMember: row.status === 'Accepted' ? memberIds.has(row.student_id) : null,
      };
    }
    const detail = details.get(row.student_id);
    const blocker = acceptBlocker({
      team,
      memberCount: memberIds.size,
      isMember: memberIds.has(row.student_id),
      isActive: person?.account?.is_active === true,
      state,
    });
    return {
      ...base,
      response: responseDeadline(row.applied_at, now),
      gpaShared: row.share_gpa,
      gpa: row.share_gpa ? (detail?.gpa ?? null) : null,
      skills: detail?.skills ?? null,
      evidence: detail?.evidence ?? { reviewed: [], selfDeclared: [] },
      canAccept: isLeader && blocker === null,
      canReject: isLeader,
      acceptBlockedReason: blocker,
    };
  });

  const counts = countBy(rows, 'status');
  return {
    viewer: { role, canDecide: isLeader },
    team: { teamId, status: team.status, memberCount: memberIds.size, maxMembers: team.max_members },
    // "Accepted" tính mọi đơn từng được chấp nhận, kể cả người đã rời nhóm (xem stillMember)
    counts: Object.fromEntries(LIST_STATUSES.map((s) => [s, counts.get(s) ?? 0])),
    applications,
  };
}

async function decide(rpc, params) {
  const result = check(await supabase.rpc(rpc, params));
  if (result.error) throw DECISION_ERRORS[result.error](result);
  return result;
}

export async function acceptApplication(studentId, teamId, applyId) {
  const result = await decide('chap_nhan_don_gia_nhap', { p_team_id: teamId, p_apply_id: applyId, p_actor_id: studentId });
  return { applyId, status: 'Accepted', ...result };
}

export async function rejectApplication(studentId, teamId, applyId, reason) {
  await decide('tu_choi_don_gia_nhap', { p_team_id: teamId, p_apply_id: applyId, p_actor_id: studentId, p_reason: reason });
  return { applyId, status: 'Rejected', responseNote: reason };
}
