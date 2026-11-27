// Dữ liệu CV của SV: gom từ các bảng hồ sơ để hiển thị bản xem trước CV (SV-04).
// Tôn trọng lựa chọn ẩn/công khai: chỉ số và mục đang ẩn KHÔNG được gửi về (chỉ báo tên trong hiddenFields).
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { isMissingProof } from './thanh-tich.service.js';
import { listCvProjects } from './cong-trinh-trung-bay.service.js';

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
               is_gpa_public, is_training_score_public, is_achievements_public,
               is_education_public, is_skills_public, updated_at,
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
      .select('category, title, issued_by, issued_date, detail, verification_status, external_url, evidence_url')
      .eq('student_id', studentId)
      .neq('visibility', 'Private') // mục SV để Riêng tư không đưa lên CV
      .neq('verification_status', 'Rejected')
      .order('issued_date', { ascending: false, nullsFirst: false })
      .then(check),
    listCvProjects(studentId),
  ]);

  if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ sinh viên.');

  const hiddenFields = [];
  if (!profile.is_gpa_public) hiddenFields.push('gpa');
  if (!profile.is_training_score_public) hiddenFields.push('drl');
  if (!profile.is_achievements_public) hiddenFields.push('projects');
  if (!profile.is_education_public) hiddenFields.push('education');
  if (!profile.is_skills_public) hiddenFields.push('skills');
  const showEducation = profile.is_education_public;

  const timelineDto = timeline.map((t) => ({
    type: t.entry_type,
    title: t.title,
    organization: t.organization,
    startDate: t.start_date,
    endDate: t.end_date,
    description: t.description,
  }));
  // Công bố tự khai thiếu cả liên kết lẫn minh chứng thì không đưa lên CV
  const achievementDto = achievements.filter((a) => !isMissingProof(a)).map((a) => ({
    category: a.category,
    title: a.title,
    issuedBy: a.issued_by,
    issuedDate: a.issued_date,
    detail: a.detail,
    status: a.verification_status, // Self_Declared | Pending | Verified
    externalUrl: a.external_url, // chỉ công bố bên ngoài hệ thống mới có; tệp minh chứng không gửi ra
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
    // GPA và điểm rèn luyện có công tắc riêng, không phụ thuộc mục Học vấn
    university: {
      name: showEducation ? UNIVERSITY : null,
      faculty: showEducation ? (profile.major?.faculty?.name ?? null) : null,
      major: showEducation ? (profile.major?.name ?? null) : null,
      enrollmentYear: showEducation ? profile.enrollment_year : null,
      graduationYear: showEducation ? profile.graduation_year : null,
      gpa: profile.is_gpa_public ? profile.gpa : null,
      trainingScore: profile.is_training_score_public ? profile.training_score : null,
    },
    hiddenFields,
    skills: profile.is_skills_public
      ? skills.map((s) => ({ name: s.skill.name, level: s.skill_level, category: s.skill.category }))
      : [],
    education: showEducation ? timelineDto.filter((t) => t.type !== 'Work') : [],
    experience: timelineDto.filter((t) => t.type === 'Work'),
    // Công trình SV ghim, đã công khai và còn đủ điều kiện (lọc trong listCvProjects)
    projects: profile.is_achievements_public
      ? showcase.map((p) => ({
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
