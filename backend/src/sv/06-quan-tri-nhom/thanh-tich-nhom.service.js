// SV-06 tab "Portfolio & Thành tích" (chốt 27/11/2026).
//   - Mọi thành viên xem. CHỈ Leader thêm / sửa / xóa thành tích nhóm (team_achievement), nhóm phải Active.
//   - Thành tích nhóm là TỰ KHAI, không qua duyệt: giao diện luôn gắn nhãn "Nhóm tự khai".
//   - Kèm danh sách công trình ĐÃ CÔNG KHAI của nhóm: cùng quy tắc với CV (Published + có phiếu thẩm định Approved),
//     ghi "Đã thẩm định bởi" GV. Phần này chỉ đọc.
//   - Trang Portfolio công khai cho người ngoài nhóm: TBD (chưa làm).
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';

export const MAX_ACHIEVEMENTS = 50;

const ERRORS = {
  TEAM_NOT_FOUND: () => new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.'),
  NOT_TEAM_LEADER: () => new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được cập nhật thành tích nhóm.'),
  TEAM_INACTIVE: () => new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không cập nhật thành tích được.'),
  ACHIEVEMENT_NOT_FOUND: () => new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Nhóm không có thành tích này.'),
  ACHIEVEMENT_LIMIT: () => new AppError(409, 'ACHIEVEMENT_LIMIT', `Mỗi nhóm khai tối đa ${MAX_ACHIEVEMENTS} thành tích.`),
};

const ACHIEVEMENT_COLUMNS = 'achievement_id, category, title, issued_by, issued_date, certificate_code, doi, external_url, detail, created_at';
const WORK_COLUMNS = `resource_id, resource_code, type, title, venue, trl_level, doi, published_at,
  academic_review_log(decision, review_date, lecturer_profile(full_name, academic_title))`;

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function requireMembership(studentId, teamId) {
  const row = check(await supabase.from('team_member').select('role_in_team, student_team(status)')
    .eq('student_id', studentId).eq('team_id', teamId).maybeSingle());
  if (!row) throw ERRORS.TEAM_NOT_FOUND();
  return { role: row.role_in_team, status: row.student_team.status };
}

async function requireEditor(studentId, teamId) {
  const { role, status } = await requireMembership(studentId, teamId);
  if (role !== 'Leader') throw ERRORS.NOT_TEAM_LEADER();
  if (status !== 'Active') throw ERRORS.TEAM_INACTIVE();
}

const toAchievement = (r) => ({
  achievementId: r.achievement_id,
  category: r.category,
  title: r.title,
  issuedBy: r.issued_by,
  issuedDate: r.issued_date,
  certificateCode: r.certificate_code,
  doi: r.doi,
  externalUrl: r.external_url,
  detail: r.detail,
  createdAt: r.created_at,
});

// Phiếu Approved mới nhất; không có thì công trình chưa được công khai
function approvalOf(resource) {
  return (resource.academic_review_log ?? []).filter((l) => l.decision === 'Approved')
    .sort((a, b) => b.review_date.localeCompare(a.review_date))[0] ?? null;
}

async function publishedWorks(teamId) {
  const rows = check(await supabase.from('academic_resource').select(WORK_COLUMNS)
    .eq('owner_team_id', teamId).eq('status', 'Published'));
  return rows.map((r) => ({ r, approval: approvalOf(r) })).filter((x) => x.approval).map(({ r, approval }) => {
    const lecturer = approval.lecturer_profile;
    return {
      resourceId: r.resource_id,
      code: r.resource_code,
      type: r.type,
      title: r.title,
      venue: r.venue,
      trlLevel: r.trl_level,
      doi: r.doi,
      publishedAt: r.published_at,
      reviewerName: lecturer ? [lecturer.academic_title, lecturer.full_name].filter(Boolean).join('. ') : null,
    };
  }).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.resourceId - a.resourceId);
}

// Số mục trong tab Portfolio (thẻ trên thanh tab, được gọi định kỳ cùng thống kê nhóm)
export async function countPortfolio(teamId) {
  const [achievements, works] = await Promise.all([
    supabase.from('team_achievement').select('achievement_id', { count: 'exact', head: true }).eq('team_id', teamId),
    publishedWorks(teamId),
  ]);
  if (achievements.error) throw achievements.error;
  return { achievements: achievements.count ?? 0, works: works.length };
}

export async function getPortfolio(studentId, teamId) {
  const { role, status } = await requireMembership(studentId, teamId);
  const [achievements, works] = await Promise.all([
    supabase.from('team_achievement').select(ACHIEVEMENT_COLUMNS).eq('team_id', teamId)
      .order('issued_date', { ascending: false, nullsFirst: false }).order('achievement_id', { ascending: false }).then(check),
    publishedWorks(teamId),
  ]);
  return {
    viewer: { role, canEdit: role === 'Leader' && status === 'Active' },
    maxAchievements: MAX_ACHIEVEMENTS,
    achievements: achievements.map(toAchievement),
    works,
  };
}

// data đã được route kiểm tra (tên trường theo API)
const toRow = (data) => Object.fromEntries(Object.entries({
  category: data.category,
  title: data.title,
  issued_by: data.issuedBy,
  issued_date: data.issuedDate,
  certificate_code: data.certificateCode,
  doi: data.doi,
  external_url: data.externalUrl,
  detail: data.detail,
}).filter(([, v]) => v !== undefined));

export async function createAchievement(studentId, teamId, data) {
  await requireEditor(studentId, teamId);
  const { count, error } = await supabase.from('team_achievement')
    .select('achievement_id', { count: 'exact', head: true }).eq('team_id', teamId);
  if (error) throw error;
  if (count >= MAX_ACHIEVEMENTS) throw ERRORS.ACHIEVEMENT_LIMIT();
  const row = check(await supabase.from('team_achievement')
    .insert({ ...toRow(data), team_id: teamId, created_by_account_id: studentId })
    .select(ACHIEVEMENT_COLUMNS).single());
  return toAchievement(row);
}

export async function updateAchievement(studentId, teamId, achievementId, changes) {
  await requireEditor(studentId, teamId);
  const row = check(await supabase.from('team_achievement').update(toRow(changes))
    .eq('team_id', teamId).eq('achievement_id', achievementId).select(ACHIEVEMENT_COLUMNS).maybeSingle());
  if (!row) throw ERRORS.ACHIEVEMENT_NOT_FOUND();
  return toAchievement(row);
}

export async function deleteAchievement(studentId, teamId, achievementId) {
  await requireEditor(studentId, teamId);
  const rows = check(await supabase.from('team_achievement').delete()
    .eq('team_id', teamId).eq('achievement_id', achievementId).select('achievement_id'));
  if (!rows.length) throw ERRORS.ACHIEVEMENT_NOT_FOUND();
}
