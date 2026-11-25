// Kỹ năng & Tech-stack trên hồ sơ SV: đọc / thêm / xóa kỹ năng của một sinh viên.
// Bảng: skill (danh mục dùng chung, name UNIQUE) và student_skill (SV – kỹ năng – mức 1..5).
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

const PG_UNIQUE_VIOLATION = '23505';

// Khóa nhóm ở giao diện <-> giá trị cột skill.category trong CSDL
const CATEGORY_BY_KEY = {
  ai: 'Lĩnh vực & Mô hình AI',
  lang: 'Ngôn ngữ & Frameworks',
  infra: 'Hạ tầng & Công cụ',
};
const KEY_BY_CATEGORY = Object.fromEntries(Object.entries(CATEGORY_BY_KEY).map(([k, v]) => [v, k]));

export const CATEGORY_KEYS = Object.keys(CATEGORY_BY_KEY);

function toDto(row) {
  return {
    skillId: row.skill_id,
    name: row.skill.name,
    level: row.skill_level,
    // Kỹ năng chưa phân loại (category NULL) được xếp vào nhóm đầu
    category: KEY_BY_CATEGORY[row.skill.category] ?? 'ai',
  };
}

export async function listSkills(studentId) {
  const { data, error } = await supabase
    .from('student_skill')
    .select('skill_id, skill_level, skill(name, category)')
    .eq('student_id', studentId);
  if (error) throw error;
  return data.map(toDto);
}

// Tìm kỹ năng theo tên (không phân biệt hoa thường); chưa có thì tạo trong danh mục
async function findOrCreateSkill(name, categoryKey) {
  const exact = name.replace(/[\\%_]/g, '\\$&'); // ilike: thoát ký tự đại diện
  const find = async () => {
    const { data, error } = await supabase
      .from('skill')
      .select('skill_id, name, category')
      .ilike('name', exact)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const found = await find();
  if (found) return found;

  const { data, error } = await supabase
    .from('skill')
    .insert({ name, category: CATEGORY_BY_KEY[categoryKey] })
    .select('skill_id, name, category')
    .single();
  if (!error) return data;
  if (error.code === PG_UNIQUE_VIOLATION) return find(); // người khác vừa tạo cùng lúc
  throw error;
}

export async function addSkill(studentId, { name, level, category }) {
  const skill = await findOrCreateSkill(name, category);

  const { error } = await supabase
    .from('student_skill')
    .insert({ student_id: studentId, skill_id: skill.skill_id, skill_level: level });
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'ALREADY_EXISTS', 'Kỹ năng này đã có trong hồ sơ của bạn.');
    }
    throw error;
  }
  return toDto({ skill_id: skill.skill_id, skill_level: level, skill });
}

export async function removeSkill(studentId, skillId) {
  const { data, error } = await supabase
    .from('student_skill')
    .delete()
    .eq('student_id', studentId)
    .eq('skill_id', skillId)
    .select('skill_id');
  if (error) throw error;
  if (data.length === 0) {
    throw new AppError(404, 'SKILL_NOT_FOUND', 'Kỹ năng không có trong hồ sơ.');
  }
}
