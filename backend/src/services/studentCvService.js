// Dữ liệu CV của SV: gom từ các bảng hồ sơ để hiển thị bản xem trước CV (SV-04).
// Tôn trọng lựa chọn ẩn/công khai: chỉ số đang ẩn KHÔNG được gửi về (chỉ báo tên trong hiddenFields).
import { supabase } from '../db.js';
import { AppError } from '../errors.js';
import { listShowcase } from './studentShowcaseService.js';

// Phạm vi hệ thống là một Khoa của UIT (CLAUDE.md mục 1)
const UNIVERSITY = 'Trường Đại học Công nghệ Thông tin – ĐHQG-HCM';

// Nhóm thành tích: Award/Publication vào "Giải thưởng & Công bố", hai loại chứng chỉ vào "Chứng chỉ"
const AWARD_CATEGORIES = ['Award', 'Publication'];

function check({ data, error }) {
  if (error) throw error;
  return data;
}

export async function getCv(studentId) {
  const [profile, skills, timeline, achievements, showcase] = await Promise.all([
    supabase
      .from('student_profile')
      .select(`full_name, student_code, class_name, cohort, enrollment_year, graduation_year,
               gpa, training_score, headline, github_url, linkedin_url,
               is_gpa_public, is_training_score_public, is_achievements_public, updated_at,
               account(email, avatar_url),
               major(name, faculty(name))`)
      .eq('student_id', studentId)
      .maybeSingle()
      .then(check),
    supabase
      .from('student_skill')
      .select('skill_level, skill(name, category)')
      .eq('student_id', studentId)
      .order('skill_level', { ascending: false })
      .then(check),
    supabase
      .from('profile_timeline')
      .select('entry_type, title, organization, start_date, end_date, description')
      .eq('account_id', studentId)
      .order('sort_order')
      .order('start_date', { ascending: false, nullsFirst: false })
      .then(check),
    supabase
      .from('student_achievement')
      .select('category, title, issued_by, issued_date, detail, verification_status')
      .eq('student_id', studentId)
      .neq('visibility', 'Private') // mục SV để Riêng tư không đưa lên CV
      .neq('verification_status', 'Rejected')
      .order('issued_date', { ascending: false, nullsFirst: false })
      .then(check),
    listShowcase(studentId),
  ]);

  if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');

  const hiddenFields = [];
  if (!profile.is_gpa_public) hiddenFields.push('gpa');
  if (!profile.is_training_score_public) hiddenFields.push('drl');
  if (!profile.is_achievements_public) hiddenFields.push('projects');

  const timelineDto = timeline.map((t) => ({
    type: t.entry_type,
    title: t.title,
    organization: t.organization,
    startDate: t.start_date,
    endDate: t.end_date,
    description: t.description,
  }));
  const achievementDto = achievements.map((a) => ({
    category: a.category,
    title: a.title,
    issuedBy: a.issued_by,
    issuedDate: a.issued_date,
    detail: a.detail,
    status: a.verification_status, // Self_Declared | Pending | Verified
  }));

  return {
    fullName: profile.full_name,
    headline: profile.headline,
    studentCode: profile.student_code,
    className: profile.class_name,
    cohort: profile.cohort,
    email: profile.account?.email ?? null,
    avatarUrl: profile.account?.avatar_url ?? null,
    githubUrl: profile.github_url,
    linkedinUrl: profile.linkedin_url,
    // Học vấn chính tại UIT lấy từ hồ sơ; các mục học vấn khác lấy từ profile_timeline
    university: {
      name: UNIVERSITY,
      faculty: profile.major?.faculty?.name ?? null,
      major: profile.major?.name ?? null,
      enrollmentYear: profile.enrollment_year,
      graduationYear: profile.graduation_year,
      gpa: profile.is_gpa_public ? profile.gpa : null,
      trainingScore: profile.is_training_score_public ? profile.training_score : null,
    },
    hiddenFields,
    skills: skills.map((s) => ({ name: s.skill.name, level: s.skill_level, category: s.skill.category })),
    education: timelineDto.filter((t) => t.type !== 'Work'),
    experience: timelineDto.filter((t) => t.type === 'Work'),
    // Chỉ công trình SV chọn hiện trên CV VÀ còn đủ điều kiện (đã được GV thẩm định đạt)
    projects: profile.is_achievements_public
      ? showcase
          .filter((p) => p.isShownOnCv && p.eligible)
          .map((p) => ({
            title: p.title,
            type: p.type,
            venue: p.venue,
            trlLevel: p.trlLevel,
            date: p.date,
            role: p.role,
            highlights: p.highlights,
            reviewerName: p.reviewerName,
          }))
      : [],
    awards: achievementDto.filter((a) => AWARD_CATEGORIES.includes(a.category)),
    certificates: achievementDto.filter((a) => !AWARD_CATEGORIES.includes(a.category)),
    updatedAt: profile.updated_at,
  };
}
