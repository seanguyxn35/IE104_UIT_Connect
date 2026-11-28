// SV-07 Chợ ghép nhóm: danh sách đề tài Lab đang tuyển, có tìm kiếm, lọc và phân trang.
//   - Chỉ hiện đề tài Open / Filled còn hạn (Paused, Closed, quá hạn thì ẩn). Filled hoặc đủ số đơn Accepted = "Đã đủ chỗ".
//   - Tìm theo tên đề tài, mô tả, Lab, kỹ năng, giảng viên, đối tác; không phân biệt hoa thường và dấu tiếng Việt;
//     mọi từ phải xuất hiện. Lọc theo khoa (khoa của Lab, không có Lab thì khoa của GV) và lĩnh vực.
//   - Lọc trong bộ nhớ: phạm vi một Khoa nên số đề tài nhỏ. Số đề tài theo lĩnh vực tính sau khi áp tìm kiếm + khoa,
//     chưa áp lĩnh vực, để các nút lĩnh vực hiện đúng số sẽ ra.
//   - Đánh dấu đề tài người xem đã ứng tuyển (mọi trạng thái, cùng quy tắc R2 của ung-tuyen-lab.service.js).
import { supabase } from '../../db.js';
import { todayInVietnam } from '../06-quan-tri-nhom/don-gia-nhap.service.js';

const VISIBLE = ['Open', 'Filled'];
const TYPE_LABELS = {
  Thesis: 'Khóa luận tốt nghiệp',
  Student_Research: 'NCKH sinh viên',
  Major_Project: 'Đồ án chuyên ngành',
  Lab_RD: 'Hợp tác R&D Lab',
};

const COLUMNS = `topic_id, topic_type, title, description, slots, trl_level, partner_name, is_interdisciplinary,
  deadline, status, created_at, funding_amount,
  field:field!fk_lab_topic_field(field_id, name),
  lab:lab!fk_lab_topic_lab(lab_id, name, room, faculty_id),
  lecturer:lecturer_profile!fk_lab_topic_lecturer(full_name, academic_title, faculty_id),
  topic_skill(skill(name))`;

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Bỏ dấu, chữ thường: "Thị giác" và "thi giac" khớp nhau
export function normalize(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

function toItem(t, accepted, applied, facultyNames) {
  const facultyId = t.lab?.faculty_id ?? t.lecturer?.faculty_id ?? null;
  const full = t.status === 'Filled' || accepted >= t.slots;
  return {
    topicId: t.topic_id,
    title: t.title,
    description: t.description,
    type: t.topic_type,
    typeLabel: TYPE_LABELS[t.topic_type] ?? t.topic_type,
    trlLevel: t.trl_level,
    isInterdisciplinary: t.is_interdisciplinary,
    partnerName: t.partner_name,
    hasFunding: Number(t.funding_amount) > 0,
    slots: t.slots,
    accepted,
    remaining: Math.max(0, t.slots - accepted),
    isFull: full,
    deadline: t.deadline,
    createdAt: t.created_at,
    lecturer: t.lecturer ? [t.lecturer.academic_title, t.lecturer.full_name].filter(Boolean).join('. ') : null,
    lab: t.lab ? { name: t.lab.name, room: t.lab.room } : null,
    faculty: facultyId ? { facultyId, name: facultyNames.get(facultyId) ?? null } : null,
    field: t.field ? { fieldId: t.field.field_id, name: t.field.name } : null,
    skills: (t.topic_skill ?? []).map((s) => s.skill?.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
    applied,
  };
}

function haystack(item, topic) {
  return normalize([item.title, topic.description, item.lab?.name, item.lecturer, item.partnerName, item.typeLabel,
    item.field?.name, item.faculty?.name, ...item.skills].filter(Boolean).join(' '));
}

// filters: { q, facultyId, fieldId, page, pageSize }
export async function listLabTopics(studentId, { q, facultyId, fieldId, page, pageSize }) {
  const today = todayInVietnam();
  const [topics, faculties, fields] = await Promise.all([
    supabase.from('lab_topic').select(COLUMNS).in('status', VISIBLE).or(`deadline.is.null,deadline.gte.${today}`).then(check),
    supabase.from('faculty').select('faculty_id, name').order('faculty_id').then(check),
    supabase.from('field').select('field_id, name').order('field_id').then(check),
  ]);
  const ids = topics.map((t) => t.topic_id);
  const [acceptedRows, mine] = await Promise.all([
    ids.length ? supabase.from('lab_application').select('topic_id').eq('status', 'Accepted').in('topic_id', ids).then(check) : [],
    ids.length ? supabase.from('lab_application').select('topic_id').eq('student_id', studentId).in('topic_id', ids).then(check) : [],
  ]);
  const accepted = new Map();
  for (const r of acceptedRows) accepted.set(r.topic_id, (accepted.get(r.topic_id) ?? 0) + 1);
  const appliedIds = new Set(mine.map((r) => r.topic_id));
  const facultyNames = new Map(faculties.map((f) => [f.faculty_id, f.name]));

  const words = normalize(q).split(/\s+/).filter(Boolean);
  const all = topics.map((t) => {
    const item = toItem(t, accepted.get(t.topic_id) ?? 0, appliedIds.has(t.topic_id), facultyNames);
    return { item, text: haystack(item, t) };
  });

  // Tìm kiếm + khoa (chưa áp lĩnh vực) -> số theo lĩnh vực; sau đó mới áp lĩnh vực
  const base = all.filter(({ item, text }) => words.every((w) => text.includes(w))
    && (!facultyId || item.faculty?.facultyId === facultyId));
  const fieldCounts = new Map();
  for (const { item } of base) if (item.field) fieldCounts.set(item.field.fieldId, (fieldCounts.get(item.field.fieldId) ?? 0) + 1);
  const matched = base.filter(({ item }) => !fieldId || item.field?.fieldId === fieldId).map((x) => x.item)
    // Còn chỗ trước, rồi đề tài mới đăng trước
    .sort((a, b) => a.isFull - b.isFull || b.createdAt.localeCompare(a.createdAt) || b.topicId - a.topicId);

  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  const current = Math.min(page, totalPages);
  return {
    total: matched.length,
    page: current,
    pageSize,
    totalPages,
    items: matched.slice((current - 1) * pageSize, current * pageSize),
    filters: { q: q || '', facultyId: facultyId || null, fieldId: fieldId || null },
    summary: {
      visible: all.length, // mọi đề tài đang hiện ở chợ
      open: all.filter(({ item }) => !item.isFull).length,
      matchedBeforeField: base.length, // số cho nút "Tất cả"
    },
    faculties: faculties.map((f) => ({ facultyId: f.faculty_id, name: f.name })),
    // Chỉ lĩnh vực có đề tài khớp (và lĩnh vực đang chọn, để bỏ chọn được)
    fields: fields.filter((f) => fieldCounts.has(f.field_id) || f.field_id === fieldId)
      .map((f) => ({ fieldId: f.field_id, name: f.name, count: fieldCounts.get(f.field_id) ?? 0 })),
  };
}
