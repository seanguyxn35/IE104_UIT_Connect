// Ảnh đại diện SV: ảnh lưu ở Supabase Storage (bucket công khai "avatars"),
// đường dẫn công khai lưu ở account.avatar_url.
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

const BUCKET = 'avatars';
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const TYPES = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/webp': { ext: 'webp', magic: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};
export const AVATAR_TYPES = Object.keys(TYPES);

// Tạo bucket ở lần dùng đầu tiên (bucket công khai: ảnh đại diện là thông tin hiển thị công khai)
let bucketReady;
function ensureBucket() {
  bucketReady ??= (async () => {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_AVATAR_BYTES,
      allowedMimeTypes: AVATAR_TYPES,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  })().catch((err) => { bucketReady = undefined; throw err; });
  return bucketReady;
}

export async function getAvatarUrl(accountId) {
  const { data, error } = await supabase
    .from('account')
    .select('avatar_url')
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.');
  return data.avatar_url;
}

export async function saveAvatar(accountId, buffer, contentType) {
  const type = TYPES[contentType];
  if (!type) {
    throw new AppError(415, 'UNSUPPORTED_TYPE', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
  }
  if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', 'Ảnh tối đa 2 MB.');
  }
  // Nội dung phải đúng định dạng đã khai báo (không tin Content-Type của client)
  if (!type.magic(buffer)) {
    throw new AppError(415, 'UNSUPPORTED_TYPE', 'Nội dung tệp không phải ảnh hợp lệ.');
  }

  const oldUrl = await getAvatarUrl(accountId);
  await ensureBucket();

  const path = `account-${accountId}/${Date.now()}.${type.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from('account')
    .update({ avatar_url: pub.publicUrl })
    .eq('account_id', accountId);
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]); // không để lại ảnh mồ côi
    throw updateError;
  }

  // Xóa ảnh cũ (nếu có) – lỗi ở bước này không làm hỏng việc đã lưu
  const marker = `/${BUCKET}/`;
  if (oldUrl && oldUrl.includes(marker)) {
    const oldPath = decodeURIComponent(oldUrl.split(marker)[1]);
    await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }
  return pub.publicUrl;
}
