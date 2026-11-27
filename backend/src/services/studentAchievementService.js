// Thành tích / chứng chỉ SV tự khai (bảng student_achievement, cần migration 002 và 004).
// Loại 'Publication' là "Công bố bên ngoài hệ thống" (SV tự cung cấp, KHÔNG phải bài đã thẩm định trong UIT Connect):
// bắt buộc có liên kết DOI/URL https hoặc tệp minh chứng; thiếu cả hai thì không đưa lên CV.
// Trạng thái: Self_Declared (Tự khai, mặc định) -> Pending (SV gửi xác minh) -> Verified / Rejected.
// Tệp minh chứng lưu ở bucket RIÊNG TƯ "evidence"; cột evidence_url giữ đường dẫn trong bucket,
// chỉ xem được qua liên kết ký tạm thời do máy chủ cấp.
// Mọi truy vấn đều lọc theo student_id: mục của người khác coi như không tồn tại (404).
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

const TABLE = 'student_achievement';
const COLUMNS = 'achievement_id, category, title, issued_by, issued_date, detail, visibility, verification_status, evidence_url, external_url, created_at';
const PG_UNIQUE_VIOLATION = '23505';
// Chỉ được đổi minh chứng / gửi xác minh khi mục chưa nằm trong quy trình xác minh
const EDITABLE_STATUSES = ['Self_Declared', 'Rejected'];

export const ACHIEVEMENT_CATEGORIES = ['Award', 'Publication', 'Language_Cert', 'Tech_Cert'];

const BUCKET = 'evidence';
const SIGNED_URL_SECONDS = 60;
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const EVIDENCE_TYPES_MAP = {
  'application/pdf': { ext: 'pdf', magic: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
};
export const EVIDENCE_TYPES = Object.keys(EVIDENCE_TYPES_MAP);

// Công bố bên ngoài hệ thống chưa có gì để người xem đối chiếu
export function isMissingProof(row) {
  return row.category === 'Publication' && !row.external_url && !row.evidence_url;
}

function toDto(row) {
  return {
    achievementId: row.achievement_id,
    category: row.category,
    title: row.title,
    issuedBy: row.issued_by,
    issuedDate: row.issued_date,
    detail: row.detail,
    visibility: row.visibility,
    status: row.verification_status,
    hasEvidence: Boolean(row.evidence_url), // không trả đường dẫn lưu trữ ra ngoài
    externalUrl: row.external_url,
    missingProof: isMissingProof(row),
    createdAt: row.created_at,
  };
}

const notFound = () => new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Không tìm thấy thành tích trong hồ sơ của bạn.');
const locked = () => new AppError(409, 'ACHIEVEMENT_LOCKED', 'Mục đang chờ xác minh hoặc đã được xác minh nên không đổi được minh chứng.');

async function findOwn(studentId, achievementId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('student_id', studentId)
    .eq('achievement_id', achievementId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data;
}

// Xóa tệp cũ – lỗi ở bước này không làm hỏng thao tác chính
async function removeFile(path) {
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

let bucketReady;
function ensureBucket() {
  bucketReady ??= (async () => {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_EVIDENCE_BYTES,
      allowedMimeTypes: EVIDENCE_TYPES,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  })().catch((err) => { bucketReady = undefined; throw err; });
  return bucketReady;
}

export async function listAchievements(studentId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('student_id', studentId)
    .order('issued_date', { ascending: false, nullsFirst: false })
    .order('achievement_id', { ascending: false });
  if (error) throw error;
  return data.map(toDto);
}

export async function createAchievement(studentId, { category, title, issuedBy, issuedDate, detail, visibility, externalUrl }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: studentId,
      category,
      title,
      issued_by: issuedBy,
      issued_date: issuedDate,
      detail,
      visibility,
      external_url: externalUrl,
      verification_status: 'Self_Declared', // trạng thái do máy chủ quyết định, không nhận từ client
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'ALREADY_EXISTS', 'Thành tích này (cùng tên, tổ chức cấp và ngày cấp) đã có trong hồ sơ.');
    }
    throw error;
  }
  return toDto(data);
}

export async function setAchievementVisibility(studentId, achievementId, visibility) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ visibility })
    .eq('student_id', studentId)
    .eq('achievement_id', achievementId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return toDto(data);
}

export async function deleteAchievement(studentId, achievementId) {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('student_id', studentId)
    .eq('achievement_id', achievementId)
    .select('evidence_url')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  await removeFile(data.evidence_url);
}

export async function saveEvidence(studentId, achievementId, buffer, contentType) {
  const type = EVIDENCE_TYPES_MAP[contentType];
  if (!type) throw new AppError(415, 'UNSUPPORTED_TYPE', 'Minh chứng chỉ nhận tệp PDF, JPG hoặc PNG.');
  if (buffer.length === 0) throw new AppError(400, 'INVALID_INPUT', 'Tệp minh chứng rỗng.');
  // Nội dung phải đúng định dạng đã khai báo (không tin Content-Type của client)
  if (!type.magic(buffer)) throw new AppError(415, 'UNSUPPORTED_TYPE', 'Nội dung tệp không đúng định dạng PDF, JPG hoặc PNG.');

  const current = await findOwn(studentId, achievementId);
  if (!EDITABLE_STATUSES.includes(current.verification_status)) throw locked();

  await ensureBucket();
  const path = `student-${studentId}/${achievementId}-${Date.now()}.${type.ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ evidence_url: path })
    .eq('student_id', studentId)
    .eq('achievement_id', achievementId)
    .in('verification_status', EDITABLE_STATUSES) // trạng thái có thể vừa đổi trong lúc tải tệp
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) {
    await removeFile(path); // không để lại tệp mồ côi
    if (error) throw error;
    throw locked();
  }
  await removeFile(current.evidence_url);
  return toDto(data);
}

export async function getEvidenceUrl(studentId, achievementId) {
  const row = await findOwn(studentId, achievementId);
  if (!row.evidence_url) throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'Mục này chưa có tệp minh chứng.');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.evidence_url, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function requestVerification(studentId, achievementId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ verification_status: 'Pending', verified_by_account_id: null })
    .eq('student_id', studentId)
    .eq('achievement_id', achievementId)
    .in('verification_status', EDITABLE_STATUSES)
    .not('evidence_url', 'is', null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (data) return toDto(data);

  // Không cập nhật được: tìm lý do để báo đúng lỗi
  const row = await findOwn(studentId, achievementId);
  if (!EDITABLE_STATUSES.includes(row.verification_status)) {
    throw new AppError(409, 'INVALID_STATUS', 'Mục này đang chờ xác minh hoặc đã được xác minh.');
  }
  throw new AppError(409, 'EVIDENCE_REQUIRED', 'Cần tải tệp minh chứng trước khi gửi xác minh.');
}
