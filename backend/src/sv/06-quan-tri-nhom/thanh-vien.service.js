// SV-06 tab "Thành viên" (chốt 27/11/2026).
//   - Mọi thành viên xem danh sách (tên, MSSV, email trường, ngành, vai trò, chức danh, đóng góp, ngày vào).
//     Người ngoài nhóm nhận 404.
//   - Leader sửa chức danh và đóng góp của mọi người; thành viên chỉ sửa "đóng góp" của chính mình. Nhóm phải Active.
//   - Leader mời thành viên ra khỏi nhóm (bắt buộc lý do, người đó nhận thông báo) và chuyển quyền Leader.
//   - Ai cũng tự rời được; Leader phải chuyển quyền trước. Mỗi nhóm luôn có đúng một Leader.
//   - Rời / mời ra / chuyển quyền chạy bằng hàm CSDL (migration 013): một transaction, khóa dòng nhóm.
//   - Thành viên được chỉ định bằng MSSV, không nhận studentId từ client.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';

const ERRORS = {
  TEAM_NOT_FOUND: () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.'),
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được thực hiện thao tác này.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không thay đổi được thành viên.'),
  MEMBER_NOT_FOUND: () => new AppError(404, 'MEMBER_NOT_FOUND', 'Nhóm không có thành viên này.'),
  CANNOT_REMOVE_SELF: () => new AppError(409, 'CANNOT_REMOVE_SELF',
    'Bạn không thể tự mời mình ra khỏi nhóm. Hãy chuyển quyền trưởng nhóm rồi rời nhóm.'),
  ALREADY_LEADER: () => new AppError(409, 'ALREADY_LEADER', 'Bạn đang là trưởng nhóm.'),
  LEADER_MUST_TRANSFER: (r) => new AppError(409, 'LEADER_MUST_TRANSFER', r.memberCount > 1
    ? 'Hãy chuyển quyền trưởng nhóm cho một thành viên khác trước khi rời nhóm.'
    : 'Nhóm chỉ còn mình bạn. Hệ thống chưa hỗ trợ giải tán nhóm.'),
  NOT_OWN_CONTRIBUTION: () => new AppError(403, 'NOT_TEAM_LEADER',
    'Thành viên chỉ sửa được phần đóng góp của chính mình; chức danh do trưởng nhóm đặt.'),
};

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function rpc(name, params) {
  const result = check(await supabase.rpc(name, params));
  if (result.error) throw ERRORS[result.error](result);
  return result;
}

async function requireMembership(studentId, teamId) {
  const row = check(await supabase.from('team_member')
    .select('role_in_team, student_team(status, max_members, semester)')
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!row) throw ERRORS.TEAM_NOT_FOUND();
  return { role: row.role_in_team, team: row.student_team };
}

// MSSV -> student_id của một thành viên nhóm; null nếu không có trong nhóm
async function memberIdByCode(teamId, studentCode) {
  const row = check(await supabase.from('team_member')
    .select('student_id, student_profile!inner(student_code)')
    .eq('team_id', teamId).eq('student_profile.student_code', studentCode).maybeSingle());
  return row?.student_id ?? null;
}

export async function listMembers(studentId, teamId) {
  const { role, team } = await requireMembership(studentId, teamId);
  const rows = check(await supabase.from('team_member')
    .select(`student_id, role_in_team, position_title, contribution, joined_at,
             student_profile(full_name, student_code, cohort, class_name, major(name, faculty(name)), account(email, avatar_url))`)
    .eq('team_id', teamId));
  const isLeader = role === 'Leader';
  const active = team.status === 'Active';
  const members = rows.map((r) => {
    const p = r.student_profile;
    const isMe = r.student_id === studentId;
    return {
      fullName: p.full_name,
      studentCode: p.student_code,
      email: p.account?.email ?? null,
      avatarUrl: p.account?.avatar_url ?? null,
      cohort: p.cohort,
      className: p.class_name,
      major: p.major?.name ?? null,
      faculty: p.major?.faculty?.name ?? null,
      role: r.role_in_team,
      positionTitle: r.position_title,
      contribution: r.contribution,
      joinedAt: r.joined_at,
      isMe,
      // Quyền theo từng dòng; máy chủ vẫn kiểm tra lại khi ghi
      canEditTitle: isLeader && active,
      canEditContribution: active && (isLeader || isMe),
      canRemove: isLeader && active && !isMe,
      canMakeLeader: isLeader && active && !isMe,
    };
  }).sort((a, b) => (b.role === 'Leader') - (a.role === 'Leader') || a.joinedAt.localeCompare(b.joinedAt)
    || a.fullName.localeCompare(b.fullName, 'vi'));
  return {
    viewer: { role, canManage: isLeader && active, canLeave: !isLeader },
    team: { teamId, status: team.status, semester: team.semester, maxMembers: team.max_members, memberCount: rows.length },
    members,
  };
}

// changes: { positionTitle?, contribution? } (null = xóa)
export async function updateMember(studentId, teamId, studentCode, changes) {
  const { role, team } = await requireMembership(studentId, teamId);
  const targetId = await memberIdByCode(teamId, studentCode);
  if (targetId === null) throw ERRORS.MEMBER_NOT_FOUND();
  if (role !== 'Leader') {
    if (targetId !== studentId || 'positionTitle' in changes) throw ERRORS.NOT_OWN_CONTRIBUTION();
  }
  if (team.status !== 'Active') throw ERRORS.TEAM_INACTIVE();
  const update = {};
  if ('positionTitle' in changes) update.position_title = changes.positionTitle;
  if ('contribution' in changes) update.contribution = changes.contribution;
  const row = check(await supabase.from('team_member').update(update)
    .eq('team_id', teamId).eq('student_id', targetId).select('position_title, contribution').maybeSingle());
  if (!row) throw ERRORS.MEMBER_NOT_FOUND(); // vừa rời nhóm
  return { studentCode, positionTitle: row.position_title, contribution: row.contribution };
}

export async function removeMember(studentId, teamId, studentCode, reason) {
  await requireMembership(studentId, teamId);
  const targetId = await memberIdByCode(teamId, studentCode);
  if (targetId === null) throw ERRORS.MEMBER_NOT_FOUND();
  const result = await rpc('moi_ra_khoi_nhom', { p_team_id: teamId, p_actor_id: studentId, p_student_id: targetId, p_reason: reason });
  return { studentCode, memberCount: result.memberCount };
}

export async function transferLeader(studentId, teamId, studentCode) {
  await requireMembership(studentId, teamId);
  const targetId = await memberIdByCode(teamId, studentCode);
  if (targetId === null) throw ERRORS.MEMBER_NOT_FOUND();
  await rpc('chuyen_quyen_truong_nhom', { p_team_id: teamId, p_actor_id: studentId, p_student_id: targetId });
  return { leader: studentCode };
}

export async function leaveTeam(studentId, teamId) {
  const result = await rpc('roi_nhom', { p_team_id: teamId, p_actor_id: studentId });
  return { teamId, memberCount: result.memberCount };
}
