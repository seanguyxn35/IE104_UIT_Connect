// Thông tin hồ sơ SV (bảng student_profile). Hiện có: liên kết GitHub và LinkedIn.
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

// Khóa ở giao diện <-> cột trong CSDL
const COLUMN_BY_LINK = {
  githubUrl: 'github_url',
  linkedinUrl: 'linkedin_url',
};
export const LINK_FIELDS = Object.keys(COLUMN_BY_LINK);

const LINK_COLUMNS = Object.values(COLUMN_BY_LINK).join(', ');

function toLinksDto(row) {
  return Object.fromEntries(LINK_FIELDS.map((f) => [f, row[COLUMN_BY_LINK[f]]]));
}

export async function getLinks(studentId) {
  const { data, error } = await supabase
    .from('student_profile')
    .select(LINK_COLUMNS)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');
  return toLinksDto(data);
}

// changes chỉ chứa các liên kết cần đổi; giá trị null = xóa liên kết
export async function updateLinks(studentId, changes) {
  const columns = Object.fromEntries(Object.entries(changes).map(([f, url]) => [COLUMN_BY_LINK[f], url]));
  const { data, error } = await supabase
    .from('student_profile')
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .select(LINK_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');
  return toLinksDto(data);
}
