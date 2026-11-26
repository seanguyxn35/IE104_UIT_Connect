// Công trình & Project trưng bày trên CV (bảng cv_showcase_item).
// SV chỉ CHỌN từ academic_resource có sẵn, không tạo tài nguyên mới ở đây. Một tài nguyên chọn được khi:
//   1. Thuộc về SV: do SV tạo, hoặc của nhóm SV đang là thành viên; VÀ
//   2. Đã được GV thẩm định: trạng thái Approved / Published VÀ có phiếu thẩm định 'Approved' (academic_review_log).
// Điều kiện được kiểm tra lại mỗi lần đọc: tài nguyên bị ẩn / yêu cầu sửa sau này sẽ không còn lên CV.
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

const TABLE = 'cv_showcase_item';
const PG_UNIQUE_VIOLATION = '23505';
const APPRAISED_STATUSES = ['Approved', 'Published'];

const RESOURCE_COLUMNS = `resource_id, resource_code, type, title, venue, trl_level, status, published_at, created_at,
  created_by_account_id, owner_team_id,
  academic_review_log(decision, review_date, total_score, lecturer_profile(full_name, academic_title))`;
const ITEM_COLUMNS = `resource_id, role_in_project, highlights, is_shown_on_cv, display_order, academic_resource(${RESOURCE_COLUMNS})`;

const notInShowcase = () => new AppError(404, 'SHOWCASE_NOT_FOUND', 'Công trình này không có trong danh sách trưng bày của bạn.');

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function getTeamIds(studentId) {
  const rows = check(await supabase.from('team_member').select('team_id').eq('student_id', studentId));
  return rows.map((r) => r.team_id);
}

function belongsTo(resource, studentId, teamIds) {
  return resource.created_by_account_id === studentId || teamIds.includes(resource.owner_team_id);
}

// Phiếu 'Approved' mới nhất của GV; null = chưa được thẩm định đạt (hoặc trạng thái hiện tại không còn đạt)
function appraisalOf(resource) {
  if (!APPRAISED_STATUSES.includes(resource.status)) return null;
  const approved = (resource.academic_review_log ?? [])
    .filter((log) => log.decision === 'Approved')
    .sort((a, b) => b.review_date.localeCompare(a.review_date));
  return approved[0] ?? null;
}

function toResourceDto(resource) {
  const appraisal = appraisalOf(resource);
  const lecturer = appraisal?.lecturer_profile;
  return {
    resourceId: resource.resource_id,
    resourceCode: resource.resource_code,
    type: resource.type,
    title: resource.title,
    venue: resource.venue,
    trlLevel: resource.trl_level,
    date: resource.published_at ?? resource.created_at,
    reviewerName: lecturer ? [lecturer.academic_title, lecturer.full_name].filter(Boolean).join('. ') : null,
    reviewedAt: appraisal?.review_date ?? null,
    reviewScore: appraisal?.total_score ?? null,
  };
}

function toItemDto(row, studentId, teamIds) {
  const resource = row.academic_resource;
  return {
    ...toResourceDto(resource),
    role: row.role_in_project,
    highlights: row.highlights,
    isShownOnCv: row.is_shown_on_cv,
    displayOrder: row.display_order,
    // false: không còn đủ điều kiện (bị ẩn, yêu cầu sửa, SV rời nhóm...) -> không đưa lên CV
    eligible: belongsTo(resource, studentId, teamIds) && Boolean(appraisalOf(resource)),
  };
}

export async function listShowcase(studentId) {
  const [rows, teamIds] = await Promise.all([
    supabase.from(TABLE).select(ITEM_COLUMNS).eq('student_id', studentId)
      .order('display_order').order('resource_id').then(check),
    getTeamIds(studentId),
  ]);
  return rows.map((row) => toItemDto(row, studentId, teamIds));
}

// Tài nguyên đủ điều kiện mà SV CHƯA đưa vào danh sách trưng bày
export async function listAvailable(studentId) {
  const teamIds = await getTeamIds(studentId);
  const ownership = [`created_by_account_id.eq.${studentId}`];
  if (teamIds.length) ownership.push(`owner_team_id.in.(${teamIds.join(',')})`);

  const [resources, chosen] = await Promise.all([
    supabase.from('academic_resource').select(RESOURCE_COLUMNS)
      .or(ownership.join(','))
      .in('status', APPRAISED_STATUSES)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('resource_id')
      .then(check),
    supabase.from(TABLE).select('resource_id').eq('student_id', studentId).then(check),
  ]);
  const chosenIds = new Set(chosen.map((c) => c.resource_id));
  return resources.filter((r) => !chosenIds.has(r.resource_id) && appraisalOf(r)).map(toResourceDto);
}

async function readItem(studentId, resourceId) {
  const [row, teamIds] = await Promise.all([
    supabase.from(TABLE).select(ITEM_COLUMNS).eq('student_id', studentId).eq('resource_id', resourceId)
      .maybeSingle().then(check),
    getTeamIds(studentId),
  ]);
  if (!row) throw notInShowcase();
  return toItemDto(row, studentId, teamIds);
}

export async function addToShowcase(studentId, { resourceId, role, highlights, isShownOnCv }) {
  const [resource, teamIds] = await Promise.all([
    supabase.from('academic_resource').select(RESOURCE_COLUMNS).eq('resource_id', resourceId).maybeSingle().then(check),
    getTeamIds(studentId),
  ]);
  // Tài nguyên của người khác trả về như không tồn tại, để không lộ thông tin
  if (!resource || !belongsTo(resource, studentId, teamIds)) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy công trình này trong các tài nguyên của bạn.');
  }
  if (!appraisalOf(resource)) {
    throw new AppError(409, 'NOT_REVIEWED', 'Chỉ trưng bày được công trình đã được giảng viên thẩm định đạt.');
  }

  const last = check(await supabase.from(TABLE).select('display_order').eq('student_id', studentId)
    .order('display_order', { ascending: false }).limit(1).maybeSingle());

  const { error } = await supabase.from(TABLE).insert({
    student_id: studentId,
    resource_id: resourceId,
    role_in_project: role,
    highlights,
    is_shown_on_cv: isShownOnCv,
    display_order: (last?.display_order ?? 0) + 1,
  });
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'ALREADY_EXISTS', 'Công trình này đã có trong danh sách trưng bày.');
    }
    throw error;
  }
  return readItem(studentId, resourceId);
}

// changes chỉ chứa các trường cần đổi: role, highlights, isShownOnCv
export async function updateShowcaseItem(studentId, resourceId, changes) {
  const columns = { role: 'role_in_project', highlights: 'highlights', isShownOnCv: 'is_shown_on_cv' };
  const patch = Object.fromEntries(Object.entries(changes).map(([key, value]) => [columns[key], value]));
  const data = check(await supabase.from(TABLE).update(patch)
    .eq('student_id', studentId).eq('resource_id', resourceId)
    .select('resource_id').maybeSingle());
  if (!data) throw notInShowcase();
  return readItem(studentId, resourceId);
}

// Chỉ gỡ khỏi danh sách trưng bày; tài nguyên học thuật vẫn giữ nguyên
export async function removeFromShowcase(studentId, resourceId) {
  const data = check(await supabase.from(TABLE).delete()
    .eq('student_id', studentId).eq('resource_id', resourceId)
    .select('resource_id'));
  if (data.length === 0) throw notInShowcase();
}

export async function reorderShowcase(studentId, resourceIds) {
  const current = check(await supabase.from(TABLE).select('resource_id').eq('student_id', studentId));
  const currentIds = new Set(current.map((c) => c.resource_id));
  if (resourceIds.length !== currentIds.size || !resourceIds.every((id) => currentIds.has(id))) {
    throw new AppError(400, 'INVALID_INPUT', 'resourceIds phải gồm đúng các công trình đang trưng bày, mỗi mục một lần.');
  }
  if (resourceIds.length) {
    // Một câu lệnh upsert cho cả danh sách: hoặc đổi hết thứ tự, hoặc không đổi gì
    check(await supabase.from(TABLE).upsert(
      resourceIds.map((resourceId, index) => ({ student_id: studentId, resource_id: resourceId, display_order: index + 1 })),
      { onConflict: 'student_id,resource_id' },
    ));
  }
  return listShowcase(studentId);
}
