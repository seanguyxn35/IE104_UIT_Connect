// Công trình & Project trưng bày trên CV (bảng cv_showcase_item).
// SV chỉ CHỌN từ academic_resource có sẵn, không tạo tài nguyên mới ở đây. Một tài nguyên chọn được khi:
//   1. Thuộc về SV: của nhóm SV ĐANG là thành viên, hoặc tài nguyên cá nhân do SV tạo (xem resourceOwnership.js).
//      SV đã rời nhóm không được ghi sở hữu / tác quyền trên hồ sơ, kể cả khi là người tạo; VÀ
//   2. Đã CÔNG KHAI: trạng thái Published VÀ có phiếu thẩm định 'Approved' (academic_review_log).
//      'Approved' nghĩa là đạt nhưng không cho công bố, nên KHÔNG được ghim và không lên CV (CV là nơi người ngoài xem).
// Điều kiện được kiểm tra lại mỗi lần đọc: rời nhóm, tài nguyên bị ẩn / yêu cầu sửa thì không còn lên CV.
// Dòng trưng bày không bị xóa, nên vào lại nhóm thì lựa chọn cũ có hiệu lực trở lại.
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { belongsToStudent, getTeams, ownershipFilter } from '../../shared/resourceOwnership.js';

const TABLE = 'cv_showcase_item';
const PG_UNIQUE_VIOLATION = '23505';
const PUBLIC_STATUS = 'Published';

const RESOURCE_COLUMNS = `resource_id, resource_code, type, title, venue, trl_level, status, published_at, created_at,
  created_by_account_id, owner_team_id,
  academic_review_log(decision, review_date, total_score, lecturer_profile(full_name, academic_title))`;
const ITEM_COLUMNS = `resource_id, role_in_project, highlights, is_shown_on_cv, display_order, academic_resource(${RESOURCE_COLUMNS})`;

const notInShowcase = () => new AppError(404, 'SHOWCASE_NOT_FOUND', 'Công trình này không có trong danh sách trưng bày của bạn.');

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Phiếu 'Approved' mới nhất của GV; null = tài nguyên chưa công khai hoặc không có phiếu thẩm định đạt
function appraisalOf(resource) {
  if (resource.status !== PUBLIC_STATUS) return null;
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

// SV đã rời nhóm: chỉ trả đủ thông tin để nhận ra và gỡ mục; không trả vai trò, kết quả, thông tin thẩm định
function toLeftTeamDto(row) {
  const resource = row.academic_resource;
  return {
    resourceId: resource.resource_id,
    resourceCode: null,
    type: resource.type,
    title: resource.title,
    venue: null,
    trlLevel: null,
    date: null,
    reviewerName: null,
    reviewedAt: null,
    reviewScore: null,
    role: null,
    highlights: null,
    isShownOnCv: false,
    displayOrder: row.display_order,
    eligible: false,
    ineligibleReason: 'NOT_MEMBER',
  };
}

function toItemDto(row, studentId, teams) {
  const resource = row.academic_resource;
  if (!belongsToStudent(resource, studentId, teams)) return toLeftTeamDto(row);
  let reason = null;
  if (resource.status !== PUBLIC_STATUS) reason = 'NOT_PUBLISHED';
  else if (!appraisalOf(resource)) reason = 'NOT_REVIEWED';
  return {
    ...toResourceDto(resource),
    role: row.role_in_project,
    highlights: row.highlights,
    isShownOnCv: row.is_shown_on_cv,
    displayOrder: row.display_order,
    // false: chủ hồ sơ vẫn thấy mục (kèm lý do) nhưng không đưa lên CV
    eligible: reason === null,
    ineligibleReason: reason,
  };
}

export async function listShowcase(studentId) {
  const [rows, teams] = await Promise.all([
    supabase.from(TABLE).select(ITEM_COLUMNS).eq('student_id', studentId)
      .order('display_order').order('resource_id').then(check),
    getTeams(studentId),
  ]);
  return rows.map((row) => toItemDto(row, studentId, teams));
}

// Công trình đưa lên CV (CV là nơi người ngoài xem): lọc Published ngay trong truy vấn,
// nên mục ghim từ trước mà nay không còn công khai không được đọc ra.
export async function listCvProjects(studentId) {
  const [rows, teams] = await Promise.all([
    supabase.from(TABLE).select(ITEM_COLUMNS.replace('academic_resource(', 'academic_resource!inner('))
      .eq('student_id', studentId)
      .eq('is_shown_on_cv', true)
      .eq('academic_resource.status', PUBLIC_STATUS)
      .order('display_order').order('resource_id').then(check),
    getTeams(studentId),
  ]);
  // Còn phải thuộc nhóm sở hữu và có phiếu thẩm định đạt
  return rows.map((row) => toItemDto(row, studentId, teams)).filter((item) => item.eligible);
}

// Tài nguyên đủ điều kiện mà SV CHƯA đưa vào danh sách trưng bày
export async function listAvailable(studentId) {
  const teams = await getTeams(studentId);
  const [resources, chosen] = await Promise.all([
    supabase.from('academic_resource').select(RESOURCE_COLUMNS)
      .or(ownershipFilter(studentId, teams))
      .eq('status', PUBLIC_STATUS)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('resource_id')
      .then(check),
    supabase.from(TABLE).select('resource_id').eq('student_id', studentId).then(check),
  ]);
  const chosenIds = new Set(chosen.map((c) => c.resource_id));
  return resources.filter((r) => !chosenIds.has(r.resource_id) && appraisalOf(r)).map(toResourceDto);
}

async function readItem(studentId, resourceId) {
  const [row, teams] = await Promise.all([
    supabase.from(TABLE).select(ITEM_COLUMNS).eq('student_id', studentId).eq('resource_id', resourceId)
      .maybeSingle().then(check),
    getTeams(studentId),
  ]);
  if (!row) throw notInShowcase();
  return toItemDto(row, studentId, teams);
}

export async function addToShowcase(studentId, { resourceId, role, highlights, isShownOnCv }) {
  const [resource, teams] = await Promise.all([
    supabase.from('academic_resource').select(RESOURCE_COLUMNS).eq('resource_id', resourceId).maybeSingle().then(check),
    getTeams(studentId),
  ]);
  // Tài nguyên của người khác trả về như không tồn tại, để không lộ thông tin
  if (!resource || !belongsToStudent(resource, studentId, teams)) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy công trình này trong các tài nguyên của bạn.');
  }
  if (resource.status !== PUBLIC_STATUS) {
    throw new AppError(409, 'NOT_PUBLISHED', 'Chỉ trưng bày được công trình đã được công khai (Đã công bố).');
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
  // Đã rời nhóm thì không được sửa vai trò, kết quả hay đưa lên CV; chỉ còn được gỡ
  const current = await readItem(studentId, resourceId);
  if (current.ineligibleReason === 'NOT_MEMBER') {
    throw new AppError(403, 'NOT_TEAM_MEMBER', 'Bạn không còn trong nhóm sở hữu công trình này nên chỉ có thể gỡ khỏi danh sách.');
  }
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
