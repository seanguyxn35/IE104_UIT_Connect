// SV-06 tab "Thông tin nhóm": xem và cập nhật hồ sơ nhóm.
//   - Mọi thành viên xem được; CHỈ Leader cập nhật. Người ngoài nhóm nhận 404.
//   - Mã định danh và cố vấn chỉ đọc: cố vấn được gán qua luồng "Đề xuất cố vấn" với giảng viên.
//   - Tối đa 3 lĩnh vực; lĩnh vực chọn đầu tiên là lĩnh vực chính (student_team.field_id).
//   - Lưu bằng hàm CSDL cap_nhat_ho_so_nhom (migration 010): một transaction cho cả 4 bảng.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';

const UPDATE_ERRORS = {
  TEAM_NOT_FOUND: () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.'),
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được cập nhật hồ sơ nhóm.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không cập nhật được hồ sơ.'),
  FACULTY_NOT_FOUND: () => new AppError(400, 'FACULTY_NOT_FOUND', 'Khoa đã chọn không tồn tại.'),
  FIELD_NOT_FOUND: () => new AppError(400, 'FIELD_NOT_FOUND', 'Lĩnh vực đã chọn không tồn tại.'),
};

function check({ data, error }) {
  if (error) throw error;
  return data;
}

const byName = (a, b) => a.name.localeCompare(b.name, 'vi');

async function advisorOf(lecturerId) {
  if (!lecturerId) return null;
  const [lecturer, hours] = await Promise.all([
    // Chỉ rõ quan hệ: bảng lab còn có khóa ngoại trỏ ngược về giảng viên (trưởng lab)
    supabase.from('lecturer_profile')
      .select('lecturer_id, full_name, academic_title, position_title, account(email, avatar_url), lab!fk_lecturer_profile_lab(name, room)')
      .eq('lecturer_id', lecturerId).maybeSingle().then(check),
    supabase.from('office_hour').select('day_of_week, start_time, end_time, location')
      .eq('lecturer_id', lecturerId).order('day_of_week').order('start_time').then(check),
  ]);
  if (!lecturer) return null;
  return {
    lecturerId: lecturer.lecturer_id,
    fullName: lecturer.full_name,
    academicTitle: lecturer.academic_title,
    positionTitle: lecturer.position_title,
    email: lecturer.account?.email ?? null,
    avatarUrl: lecturer.account?.avatar_url ?? null,
    lab: lecturer.lab ? { name: lecturer.lab.name, room: lecturer.lab.room } : null,
    // Lịch tiếp sinh viên của giảng viên (CSDL không lưu lịch họp riêng của nhóm)
    officeHours: hours.map((h) => ({
      dayOfWeek: h.day_of_week, // 2 = Thứ Hai ... 8 = Chủ nhật
      start: h.start_time.slice(0, 5),
      end: h.end_time.slice(0, 5),
      location: h.location,
    })),
  };
}

export async function getTeamProfile(studentId, teamId) {
  const membership = check(await supabase.from('team_member')
    .select(`role_in_team, student_team(team_id, team_name, short_name, team_code, description, semester, status,
             max_members, advisor_lecturer_id, avatar_url, faculty(faculty_id, name),
             field:field!fk_student_team_field(field_id, name))`)
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!membership) throw UPDATE_ERRORS.TEAM_NOT_FOUND();
  const team = membership.student_team;

  const [fieldRows, skillRows, members, advisor] = await Promise.all([
    supabase.from('team_field').select('field(field_id, name)').eq('team_id', teamId).then(check),
    supabase.from('team_skill').select('skill(skill_id, name)').eq('team_id', teamId).then(check),
    supabase.from('team_member').select('student_profile(major(name))').eq('team_id', teamId).then(check),
    advisorOf(team.advisor_lecturer_id),
  ]);

  // Lĩnh vực chính đứng đầu. Nhóm cũ chưa có dòng team_field thì chỉ có lĩnh vực chính.
  const primaryId = team.field?.field_id ?? null;
  const chosen = fieldRows.map((r) => ({ fieldId: r.field.field_id, name: r.field.name }));
  const fields = chosen.length
    ? chosen.sort((a, b) => (b.fieldId === primaryId) - (a.fieldId === primaryId) || byName(a, b))
    : team.field ? [{ fieldId: primaryId, name: team.field.name }] : [];

  const canEdit = membership.role_in_team === 'Leader' && team.status === 'Active';
  return {
    teamId: team.team_id,
    name: team.team_name,
    shortName: team.short_name,
    avatarUrl: team.avatar_url,
    code: team.team_code,
    description: team.description,
    semester: team.semester,
    status: team.status,
    maxMembers: team.max_members,
    memberCount: members.length,
    role: membership.role_in_team,
    canEdit,
    faculty: team.faculty ? { facultyId: team.faculty.faculty_id, name: team.faculty.name } : null,
    // Ngành lấy từ hồ sơ của các thành viên hiện tại, không nhập tay
    memberMajors: [...new Set(members.map((m) => m.student_profile?.major?.name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi')),
    fields,
    skills: skillRows.map((r) => ({ skillId: r.skill.skill_id, name: r.skill.name })).sort(byName),
    advisor,
  };
}

// Lựa chọn cho biểu mẫu cập nhật
export async function getProfileOptions() {
  const [faculties, fields, skills] = await Promise.all([
    supabase.from('faculty').select('faculty_id, name').order('name').then(check),
    supabase.from('field').select('field_id, name').order('name').then(check),
    supabase.from('skill').select('name').order('name').then(check),
  ]);
  return {
    faculties: faculties.map((f) => ({ facultyId: f.faculty_id, name: f.name })),
    fields: fields.map((f) => ({ fieldId: f.field_id, name: f.name })),
    skills: skills.map((s) => s.name), // gợi ý khi gõ; vẫn được nhập kỹ năng mới
  };
}

// changes chỉ chứa các trường cần đổi: name, description, facultyId, fieldIds, skills
export async function updateTeamProfile(studentId, teamId, changes) {
  const result = check(await supabase.rpc('cap_nhat_ho_so_nhom', {
    p_team_id: teamId,
    p_actor_id: studentId,
    p_changes: changes,
  }));
  if (result.error) throw UPDATE_ERRORS[result.error]();
  return getTeamProfile(studentId, teamId);
}
