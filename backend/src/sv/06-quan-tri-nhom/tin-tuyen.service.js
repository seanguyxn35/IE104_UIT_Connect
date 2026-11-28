// SV-06 tab "Tin tuyển quân" (team_recruitment, chốt 27/11/2026).
//   - Mọi thành viên xem; CHỈ Leader đăng / sửa / đóng / xóa (nhóm phải Active để đăng, sửa).
//   - Tối đa MAX_OPEN tin đang mở mỗi nhóm. Không giảm chỉ tiêu xuống dưới số đơn đã chấp nhận.
//   - Đủ chỉ tiêu thì tin chuyển "Đủ chỉ tiêu" (Filled); tăng chỉ tiêu thì mở lại. Tin đã đóng không sửa được:
//     "Mở lại đợt mới" ở giao diện tạo tin mới chép nội dung cũ, đơn cũ giữ nguyên ở tin cũ.
//   - Tin đã có đơn (kể cả đơn đã rút) thì không xóa, chỉ đóng. Đơn của tin đã đóng vẫn xử lý nốt.
//   - Ghi bằng hàm CSDL (migration 013): một transaction, khóa dòng nhóm. MAX_OPEN phải khớp migration 013.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { postState } from './don-gia-nhap.service.js';

export const MAX_OPEN = 5;

const ERRORS = {
  TEAM_NOT_FOUND: () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.'),
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được quản lý tin tuyển.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không đăng hoặc sửa tin tuyển được.'),
  POST_NOT_FOUND: () => new AppError(404, 'POST_NOT_FOUND', 'Nhóm không có tin tuyển này.'),
  POST_CLOSED: () => new AppError(409, 'POST_CLOSED', 'Tin tuyển đã đóng. Hãy dùng "Mở lại đợt mới" để đăng tin mới.'),
  POST_LIMIT: () => new AppError(409, 'POST_LIMIT', `Nhóm đang có ${MAX_OPEN} tin tuyển mở. Hãy đóng bớt trước khi đăng thêm.`),
  FIELD_NOT_FOUND: () => new AppError(400, 'FIELD_NOT_FOUND', 'Lĩnh vực đã chọn không tồn tại.'),
  RESOURCE_NOT_FOUND: () => new AppError(400, 'RESOURCE_NOT_FOUND', 'Đề tài gắn kèm không thuộc nhóm hoặc không còn hiển thị.'),
  SLOTS_BELOW_ACCEPTED: (r) => new AppError(409, 'SLOTS_BELOW_ACCEPTED',
    `Tin này đã nhận ${r.accepted} người nên chỉ tiêu không thể thấp hơn ${r.accepted}.`),
  POST_HAS_APPLICATIONS: () => new AppError(409, 'POST_HAS_APPLICATIONS', 'Tin tuyển đã có đơn ứng tuyển nên chỉ đóng được, không xóa được.'),
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

const STATE_ORDER = { Open: 0, Filled: 1, Expired: 2, Closed: 3 };

export async function listRecruitments(studentId, teamId) {
  const membership = check(await supabase.from('team_member').select('role_in_team, student_team(status)')
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!membership) throw ERRORS.TEAM_NOT_FOUND();
  const isLeader = membership.role_in_team === 'Leader';
  const active = membership.student_team.status === 'Active';

  const posts = check(await supabase.from('team_recruitment')
    .select(`recruit_id, title, requirement, slots, deadline, status, created_at, is_interdisciplinary,
             field(field_id, name), academic_resource(resource_id, title, trl_level), recruitment_skill(skill(name))`)
    .eq('team_id', teamId));
  const ids = posts.map((p) => p.recruit_id);
  const [applications, fields, resources] = await Promise.all([
    ids.length ? supabase.from('recruitment_application').select('recruit_id, status').in('recruit_id', ids).then(check) : [],
    isLeader ? supabase.from('field').select('field_id, name').order('name').then(check) : null,
    // Đề tài có thể gắn vào tin: của nhóm, chưa bị từ chối / ẩn
    isLeader ? supabase.from('academic_resource').select('resource_id, title, type, trl_level')
      .eq('owner_team_id', teamId).not('status', 'in', '(Rejected,Hidden)').order('title').then(check) : null,
  ]);

  const counts = new Map(ids.map((id) => [id, { pending: 0, accepted: 0, total: 0 }]));
  for (const a of applications) {
    const c = counts.get(a.recruit_id);
    c.total++;
    if (a.status === 'Pending') c.pending++;
    if (a.status === 'Accepted') c.accepted++;
  }

  const list = posts.map((p) => {
    const c = counts.get(p.recruit_id);
    const state = postState(p, c.accepted);
    return {
      recruitId: p.recruit_id,
      title: p.title,
      requirement: p.requirement,
      slots: p.slots,
      deadline: p.deadline,
      state, // Open | Filled | Closed | Expired
      createdAt: p.created_at,
      isInterdisciplinary: p.is_interdisciplinary,
      field: p.field ? { fieldId: p.field.field_id, name: p.field.name } : null,
      relatedResource: p.academic_resource
        ? { resourceId: p.academic_resource.resource_id, title: p.academic_resource.title, trlLevel: p.academic_resource.trl_level }
        : null,
      skills: (p.recruitment_skill ?? []).map((s) => s.skill.name).sort((a, b) => a.localeCompare(b, 'vi')),
      applications: { pending: c.pending, accepted: c.accepted },
      canEdit: isLeader && active && p.status !== 'Closed',
      canClose: isLeader && p.status !== 'Closed',
      canDelete: isLeader && c.total === 0,
    };
  }).sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.createdAt.localeCompare(a.createdAt) || b.recruitId - a.recruitId);

  return {
    viewer: { role: membership.role_in_team, canManage: isLeader && active },
    maxOpen: MAX_OPEN,
    posts: list,
    options: isLeader ? {
      fields: fields.map((f) => ({ fieldId: f.field_id, name: f.name })),
      resources: resources.map((r) => ({ resourceId: r.resource_id, title: r.title, type: r.type, trlLevel: r.trl_level })),
    } : null,
  };
}

async function onePost(studentId, teamId, recruitId) {
  const { posts } = await listRecruitments(studentId, teamId);
  return posts.find((p) => p.recruitId === recruitId);
}

// data đã được route kiểm tra: title, requirement, slots, deadline, fieldId, isInterdisciplinary, relatedResourceId, skills
export async function createRecruitment(studentId, teamId, data) {
  const result = await rpc('luu_tin_tuyen', { p_team_id: teamId, p_actor_id: studentId, p_recruit_id: null, p_data: data });
  return onePost(studentId, teamId, result.recruitId);
}

export async function updateRecruitment(studentId, teamId, recruitId, changes) {
  await rpc('luu_tin_tuyen', { p_team_id: teamId, p_actor_id: studentId, p_recruit_id: recruitId, p_data: changes });
  return onePost(studentId, teamId, recruitId);
}

export async function closeRecruitment(studentId, teamId, recruitId) {
  await rpc('dong_tin_tuyen', { p_team_id: teamId, p_actor_id: studentId, p_recruit_id: recruitId });
  return onePost(studentId, teamId, recruitId);
}

export async function deleteRecruitment(studentId, teamId, recruitId) {
  await rpc('xoa_tin_tuyen', { p_team_id: teamId, p_actor_id: studentId, p_recruit_id: recruitId });
}
