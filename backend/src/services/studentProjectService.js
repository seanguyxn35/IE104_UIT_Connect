// "Đề tài của tôi" (SV-05): đề tài nghiên cứu, sản phẩm, bài báo, luận văn của SV hoặc của nhóm SV.
// Dữ liệu nằm ở bảng academic_resource. Đề tài mới luôn bắt đầu ở trạng thái Draft (bản nháp);
// service này KHÔNG có đường nào để SV đổi trạng thái sang đã duyệt / công bố.
//
// Quyền tính theo VAI TRÒ TRONG NHÓM (team_member.role_in_team), không theo người tạo:
//   - Đề tài của nhóm: mọi thành viên được xem, tạo, sửa, tải PDF; chỉ Leader được xóa bản nháp (và gửi thẩm định).
//     Người tạo đã rời nhóm thì không còn quyền.
//   - Đề tài cá nhân (không thuộc nhóm): chỉ người tạo thấy, và có quyền như Leader.
//   - Bài báo (Paper) bắt buộc thuộc một nhóm.
import { randomUUID } from 'node:crypto';
import { supabase } from '../db.js';
import { AppError } from '../errors.js';
import { belongsToStudent, getTeams, ownershipFilter } from './resourceOwnership.js';

// Loại tài nguyên SV được tạo trên SV-05 (Textbook / Slide là tài liệu giảng dạy của GV)
export const PROJECT_TYPES = ['Project', 'Product', 'Paper', 'Thesis'];
// Chỉ sửa nội dung / thay tệp khi bản nháp hoặc GV yêu cầu bổ sung. Đang chờ thẩm định hoặc đã duyệt thì khóa,
// để nội dung được công bố luôn đúng là bản GV đã xem.
export const EDITABLE_STATUSES = ['Draft', 'Revision_Needed'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const BUCKET = 'papers'; // kho riêng tư: chỉ mở tệp qua đường dẫn ký có hạn
const SIGNED_URL_SECONDS = 60;
// Đường dẫn tệp do service này tạo: <resource_id>/<uuid>.pdf. Giá trị khác trong file_url (dữ liệu cũ) bị bỏ qua.
const FILE_PATH = /^\d+\/[0-9a-f-]{36}\.pdf$/;

const COLUMNS = `resource_id, resource_code, type, status, title, abstract, authors, keywords, venue, doi, trl_level,
  field_id, source_code_url, demo_url, file_url, file_size_kb, created_by_account_id, owner_team_id, created_at, updated_at,
  field(name),
  student_team(team_id, team_name),
  lecturer_profile(full_name, academic_title),
  academic_review_log(decision, comment, total_score, review_date, lecturer_profile(full_name, academic_title))`;

// Tên trường ở API <-> cột trong CSDL (những trường SV được sửa)
const COLUMN_BY_FIELD = {
  title: 'title',
  abstract: 'abstract',
  authors: 'authors',
  keywords: 'keywords',
  venue: 'venue',
  doi: 'doi',
  fieldId: 'field_id',
  sourceCodeUrl: 'source_code_url',
  demoUrl: 'demo_url',
};

const notFound = () => new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy đề tài này trong danh sách của bạn.');
const locked = () => new AppError(409, 'PROJECT_LOCKED', 'Chỉ sửa được khi đề tài là bản nháp hoặc đang được yêu cầu bổ sung.');

function check({ data, error }) {
  if (error) throw error;
  return data;
}

function lecturerName(lecturer) {
  return lecturer ? [lecturer.academic_title, lecturer.full_name].filter(Boolean).join('. ') : null;
}

// Quyền của SV trên một đề tài; null = không được xem
function accessOf(row, studentId, teams) {
  if (!belongsToStudent(row, studentId, teams)) return null;
  if (row.owner_team_id === null) return { role: 'Leader', active: true };
  const membership = teams.find((t) => t.teamId === row.owner_team_id);
  return { role: membership.role, active: membership.status === 'Active' };
}

function toDto(row, access) {
  const review = (row.academic_review_log ?? [])
    .slice()
    .sort((a, b) => b.review_date.localeCompare(a.review_date))[0];
  const hasFile = FILE_PATH.test(row.file_url ?? '');
  return {
    resourceId: row.resource_id,
    resourceCode: row.resource_code,
    type: row.type,
    status: row.status,
    title: row.title,
    abstract: row.abstract,
    authors: row.authors,
    keywords: row.keywords,
    venue: row.venue,
    doi: row.doi,
    trlLevel: row.trl_level,
    sourceCodeUrl: row.source_code_url,
    demoUrl: row.demo_url,
    fieldId: row.field_id,
    field: row.field?.name ?? null,
    team: row.student_team ? { teamId: row.student_team.team_id, name: row.student_team.team_name } : null,
    lecturer: lecturerName(row.lecturer_profile),
    role: access.role,
    hasFile,
    fileSizeKb: hasFile ? row.file_size_kb : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestReview: review
      ? {
          decision: review.decision,
          comment: review.comment,
          score: review.total_score,
          date: review.review_date,
          reviewer: lecturerName(review.lecturer_profile),
        }
      : null,
    canEdit: access.active && EDITABLE_STATUSES.includes(row.status),
    canDelete: access.active && access.role === 'Leader' && row.status === 'Draft',
  };
}

// Lấy một đề tài SV được xem; không có quyền xem cũng trả 404 để không lộ đề tài của người khác
async function findAccessible(studentId, resourceId) {
  const [row, teams] = await Promise.all([
    supabase.from('academic_resource').select(COLUMNS).eq('resource_id', resourceId).in('type', PROJECT_TYPES).maybeSingle().then(check),
    getTeams(studentId),
  ]);
  const access = row && accessOf(row, studentId, teams);
  if (!access) throw notFound();
  return { row, access };
}

// Điều kiện chung trước khi ghi: nhóm còn hoạt động và đề tài đang cho sửa
function assertEditable(row, access) {
  if (!access.active) throw new AppError(409, 'TEAM_INACTIVE', 'Nhóm này không còn hoạt động.');
  if (!EDITABLE_STATUSES.includes(row.status)) throw locked();
}

export async function listProjects(studentId) {
  const teams = await getTeams(studentId);
  const rows = check(await supabase
    .from('academic_resource')
    .select(COLUMNS)
    .in('type', PROJECT_TYPES)
    .or(ownershipFilter(studentId, teams))
    .order('updated_at', { ascending: false })
    .order('resource_id', { ascending: false }));
  return rows.map((row) => toDto(row, accessOf(row, studentId, teams)));
}

// Lựa chọn cho biểu mẫu tạo đề tài: lĩnh vực và các nhóm đang hoạt động của SV
export async function getOptions(studentId) {
  const [fields, teams] = await Promise.all([
    supabase.from('field').select('field_id, name').order('name').then(check),
    getTeams(studentId),
  ]);
  return {
    fields: fields.map((f) => ({ fieldId: f.field_id, name: f.name })),
    teams: teams.filter((t) => t.status === 'Active').map(({ teamId, name, role }) => ({ teamId, name, role })),
  };
}

async function assertFieldExists(fieldId) {
  if (fieldId === null) return;
  const field = check(await supabase.from('field').select('field_id').eq('field_id', fieldId).maybeSingle());
  if (!field) throw new AppError(400, 'INVALID_INPUT', 'Lĩnh vực không tồn tại.');
}

export async function createProject(studentId, input) {
  await assertFieldExists(input.fieldId);
  const teams = await getTeams(studentId);
  if (input.teamId !== null) {
    const team = teams.find((t) => t.teamId === input.teamId);
    if (!team) throw new AppError(403, 'NOT_TEAM_MEMBER', 'Bạn không phải thành viên của nhóm này.');
    if (team.status !== 'Active') throw new AppError(409, 'TEAM_INACTIVE', 'Nhóm này không còn hoạt động.');
  }

  const columns = Object.fromEntries(Object.entries(COLUMN_BY_FIELD).map(([field, column]) => [column, input[field]]));
  const row = check(await supabase
    .from('academic_resource')
    .insert({ ...columns, created_by_account_id: studentId, owner_team_id: input.teamId, type: input.type, status: 'Draft' })
    .select(COLUMNS)
    .single());
  return toDto(row, accessOf(row, studentId, teams));
}

// Cập nhật có kèm điều kiện trạng thái: trạng thái có thể vừa đổi giữa lúc kiểm tra và lúc ghi
async function updateEditable(resourceId, columns) {
  return check(await supabase
    .from('academic_resource')
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq('resource_id', resourceId)
    .in('status', EDITABLE_STATUSES)
    .select(COLUMNS)
    .maybeSingle());
}

export async function updateProject(studentId, resourceId, changes) {
  const { row, access } = await findAccessible(studentId, resourceId);
  assertEditable(row, access);
  if (changes.fieldId !== undefined) await assertFieldExists(changes.fieldId);

  const columns = Object.fromEntries(Object.entries(changes).map(([field, value]) => [COLUMN_BY_FIELD[field], value]));
  const updated = await updateEditable(resourceId, columns);
  if (!updated) throw locked();
  return toDto(updated, access);
}

let bucketReady;
function ensureBucket() {
  bucketReady ??= (async () => {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: ['application/pdf'],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  })().catch((err) => { bucketReady = undefined; throw err; });
  return bucketReady;
}

// Xóa tệp khỏi kho, TRỪ tệp đã nằm trong một lần nộp thẩm định (resource_submission) vì phải giữ làm lịch sử.
// Lỗi ở bước dọn tệp không làm hỏng thao tác chính.
async function removeUnusedFile(path) {
  if (!FILE_PATH.test(path ?? '')) return;
  try {
    const used = check(await supabase.from('resource_submission').select('submission_id').eq('file_url', path).limit(1));
    if (!used.length) await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error('Không dọn được tệp', path, err.message);
  }
}

export async function saveFile(studentId, resourceId, buffer) {
  if (buffer.length === 0) throw new AppError(400, 'INVALID_INPUT', 'Tệp PDF rỗng.');
  // Kiểm tra nội dung tệp, không tin Content-Type của client
  if (buffer.toString('ascii', 0, 5) !== '%PDF-') {
    throw new AppError(415, 'UNSUPPORTED_TYPE', 'Nội dung tệp không phải PDF.');
  }
  const { row, access } = await findAccessible(studentId, resourceId);
  assertEditable(row, access);

  await ensureBucket();
  const path = `${resourceId}/${randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) {
    await removeUnusedFile(path); // cố dọn nếu kho đã kịp nhận tệp
    if (error.originalError?.name === 'TimeoutError') {
      throw new AppError(504, 'UPLOAD_TIMEOUT', 'Đẩy tệp lên kho quá lâu do mạng chậm. Hãy thử lại.');
    }
    throw error;
  }

  let updated;
  try {
    updated = await updateEditable(resourceId, { file_url: path, file_size_kb: Math.ceil(buffer.length / 1024), page_count: null });
  } finally {
    if (!updated) await removeUnusedFile(path); // không để lại tệp mồ côi
  }
  if (!updated) throw locked();
  await removeUnusedFile(row.file_url);
  return toDto(updated, access);
}

export async function getFileUrl(studentId, resourceId) {
  const { row } = await findAccessible(studentId, resourceId);
  if (!FILE_PATH.test(row.file_url ?? '')) throw new AppError(404, 'FILE_NOT_FOUND', 'Đề tài này chưa có tệp PDF.');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_url, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteProject(studentId, resourceId) {
  const { row, access } = await findAccessible(studentId, resourceId);
  if (access.role !== 'Leader') throw new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ Leader của nhóm được xóa bản nháp.');
  if (!access.active) throw new AppError(409, 'TEAM_INACTIVE', 'Nhóm này không còn hoạt động.');
  const notDraft = () => new AppError(409, 'NOT_DRAFT', 'Chỉ xóa được đề tài đang ở trạng thái bản nháp.');
  if (row.status !== 'Draft') throw notDraft();
  // Điều kiện status trong câu xóa: tránh xóa nếu trạng thái vừa đổi giữa hai lệnh
  const deleted = check(await supabase
    .from('academic_resource')
    .delete()
    .eq('resource_id', resourceId)
    .eq('status', 'Draft')
    .select('resource_id'));
  if (!deleted.length) throw notDraft();
  await removeUnusedFile(row.file_url);
}
