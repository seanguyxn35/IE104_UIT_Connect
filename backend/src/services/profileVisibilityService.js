// Ẩn / công khai từng chỉ số trên hồ sơ SV: GPA, Điểm rèn luyện, Đề tài & Công bố (bảng student_profile).
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

// Khóa ở giao diện <-> cột trong CSDL
const COLUMN_BY_FIELD = {
  gpa: 'is_gpa_public',
  drl: 'is_training_score_public',
  projects: 'is_achievements_public',
};
export const VISIBILITY_FIELDS = Object.keys(COLUMN_BY_FIELD);

const SELECT_COLUMNS = Object.values(COLUMN_BY_FIELD).join(', ');

function toDto(row) {
  return Object.fromEntries(VISIBILITY_FIELDS.map((f) => [f, row[COLUMN_BY_FIELD[f]]]));
}

export async function getVisibility(studentId) {
  const { data, error } = await supabase
    .from('student_profile')
    .select(SELECT_COLUMNS)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');
  return toDto(data);
}

export async function setVisibility(studentId, field, isPublic) {
  const { data, error } = await supabase
    .from('student_profile')
    .update({ [COLUMN_BY_FIELD[field]]: isPublic, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');
  return toDto(data);
}
