// Quy tắc "tài nguyên học thuật nào thuộc về SV" – dùng CHUNG cho "Đề tài của tôi" và công trình trưng bày trên CV,
// để quyền xem, quyền sở hữu và việc ghi tác quyền lên hồ sơ không bị lệch nhau.
//   - Tài nguyên của nhóm: chỉ SV ĐANG là thành viên nhóm. SV đã rời nhóm không còn quyền, kể cả khi là người tạo.
//   - Tài nguyên cá nhân (không thuộc nhóm): chỉ người tạo.
import { supabase } from '../db.js';

// Các nhóm SV đang là thành viên: [{ teamId, role, name, status }]
export async function getTeams(studentId) {
  const { data, error } = await supabase
    .from('team_member')
    .select('team_id, role_in_team, student_team(team_name, status)')
    .eq('student_id', studentId);
  if (error) throw error;
  return data.map((r) => ({ teamId: r.team_id, role: r.role_in_team, name: r.student_team?.team_name, status: r.student_team?.status }));
}

export function belongsToStudent(resource, studentId, teams) {
  return resource.owner_team_id === null
    ? resource.created_by_account_id === studentId
    : teams.some((t) => t.teamId === resource.owner_team_id);
}

// Cùng quy tắc trên, ở dạng điều kiện cho .or(...) của Supabase
export function ownershipFilter(studentId, teams) {
  const filters = [`and(owner_team_id.is.null,created_by_account_id.eq.${studentId})`];
  if (teams.length) filters.push(`owner_team_id.in.(${teams.map((t) => t.teamId).join(',')})`);
  return filters.join(',');
}
