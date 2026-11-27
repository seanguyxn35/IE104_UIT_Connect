// Nghiệp vụ "Bài toán DN & R&D" phía Sinh viên (SV-09 danh sách, SV-13 chi tiết & nộp proposal).
// Bảng: business_problem (+ problem_skill, problem_milestone), connection_request, rd_attachment, saved_opportunity
// (migration 004, 005, 006).
//
// SV chỉ thấy bài toán đã được Admin duyệt công khai: status Open (đang nhận hồ sơ) hoặc In_Progress (đã có đơn vị thực hiện).
// Bài toán khác (nháp, chờ duyệt, đã đóng, bị từ chối) trả 404 như không tồn tại.
//
// Nộp proposal, kiểm tra theo thứ tự (sai bước nào dừng ở bước đó):
//   1. Bài toán công khai                      → 404 PROBLEM_NOT_FOUND
//   2. Còn nhận hồ sơ (Open, chưa quá hạn nộp)  → 409 PROBLEM_CLOSED
//   3. Hình thức nộp thuộc đối tượng bài nhận   → 409 PARTNER_TYPE_NOT_ACCEPTED
//   4. Nhóm: SV là thành viên (404 TEAM_NOT_FOUND), là trưởng nhóm (403 NOT_TEAM_LEADER),
//      số thành viên trong khoảng DN yêu cầu (409 TEAM_SIZE_MISMATCH); Lab: GV tồn tại (400 LECTURER_NOT_FOUND)
//   5. Chưa có proposal đang hiệu lực của SV hoặc nhóm của SV cho bài này → 409 ALREADY_APPLIED
//      (CSDL chặn thêm bằng ux_connection_request_student_problem / ux_connection_request_team_problem)
//   6. Cam kết NDA nếu đề bài yêu cầu           → 400 NDA_REQUIRED
//   7. Tệp proposal đã tải lên                   → 400 UPLOAD_NOT_FOUND
// Proposal ghi vào connection_request nên hiện ngay trong Hộp thư kết nối của DN (DN-08).
import { randomUUID } from 'node:crypto';
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { BUCKET, SIGNED_URL_SECONDS } from '../../shared/rdFiles.js';

export const MAX_PROPOSAL_FILE_BYTES = 10 * 1024 * 1024;
export const PARTNER_TYPES = ['Student', 'Team', 'Lab'];
export const TRL_LABELS = [
  'TRL 1 (Nguyên lý cơ bản)', 'TRL 2 (Ý tưởng công nghệ)', 'TRL 3 (Proof of Concept)',
  'TRL 4 (Lab Prototype)', 'TRL 5 (Thử nghiệm môi trường liên quan)',
];
const CONG_KHAI = ['Open', 'In_Progress'];
const THU_MUC_TAM = 'proposal-uploads';

const COT_BAI_TOAN = 'problem_id, problem_code, title, summary, requirement, problem_type, funding, funding_min, location, ' +
  'deadline, status, accepted_partners, team_size_min, team_size_max, trl_level, deliverables, selection_criteria, ' +
  'nda_required, start_date, duration_weeks, work_mode, approved_at, created_at, business_id, ' +
  'field:field!fk_business_problem_field(name), ' +
  'business:business_profile!fk_business_problem_business(business_id, company_name, industry, address, logo_url, description, verified_status), ' +
  'skills:problem_skill(skill:skill!fk_problem_skill_skill(name))';

// ---------- Tiện ích ----------
function homNayVN() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function conNhan(p) {
  return p.status === 'Open' && (!p.deadline || p.deadline >= homNayVN());
}

function chuHtml(html) {
  return String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function tomTat(p) {
  if (p.summary) return p.summary;
  const chu = chuHtml(p.requirement);
  return chu.length > 300 ? chu.slice(0, 297) + '…' : chu;
}

function chuanHoa(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

// Mức phù hợp 0–100 theo số kỹ năng yêu cầu trùng với kỹ năng SV đã khai ở Hồ sơ năng lực
function mucPhuHop(kyNangBai, kyNangSv) {
  if (!kyNangBai.length) return 70;
  const cua = new Set(kyNangSv.map(chuanHoa));
  const trung = kyNangBai.filter((k) => cua.has(chuanHoa(k))).length;
  return Math.min(98, 55 + Math.round((40 * trung) / kyNangBai.length));
}

// Tên tệp an toàn để làm đường dẫn trong bucket: bỏ dấu, chỉ giữ chữ, số, . _ -
export function tenTepAnToan(ten) {
  const goc = String(ten ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const s = goc.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[._]+/, '').slice(0, 80);
  const coDuoi = /\.pdf$/i.test(s) ? s : `${s || 'proposal'}.pdf`;
  return coDuoi.replace(/\.pdf$/i, '.pdf');
}

function doanhNghiep(b) {
  if (!b) return null;
  return {
    id: b.business_id,
    name: b.company_name,
    industry: b.industry,
    address: b.address,
    logoUrl: b.logo_url,
    description: b.description,
    verified: b.verified_status === 'Verified',
  };
}

// Phần tóm tắt AN TOÀN ĐỂ CÔNG KHAI của một bài toán (dùng cả cho /api/public, không có dữ liệu riêng của người xem)
export function tomTatCongKhai(p) {
  return {
    id: p.problem_id,
    code: p.problem_code ?? `RD-${p.problem_id}`,
    title: p.title,
    summary: tomTat(p),
    type: p.problem_type,
    fieldName: p.field?.name ?? null,
    status: p.status,
    isOpen: conNhan(p),
    funding: p.funding === null ? null : Number(p.funding),
    fundingMin: p.funding_min === null ? null : Number(p.funding_min),
    deadline: p.deadline,
    location: p.location,
    acceptedPartners: p.accepted_partners ?? [],
    skills: kyNangBai(p),
    publishedAt: p.approved_at ?? p.created_at,
    business: doanhNghiep(p.business),
  };
}

function kyNangBai(p) {
  return (p.skills ?? []).map((s) => s.skill?.name).filter(Boolean);
}

// Tóm tắt cho SV đang đăng nhập: phần công khai + đã lưu, proposal của tôi, mức phù hợp
function tomTatBaiToan(p, phuTro) {
  return {
    ...tomTatCongKhai(p),
    saved: phuTro.daLuu.has(p.problem_id),
    myProposal: phuTro.proposal.get(p.problem_id) ?? null,
    fitScore: mucPhuHop(kyNangBai(p), phuTro.kyNang),
  };
}

async function mocCua(problemId) {
  const { data, error } = await supabase.from('problem_milestone')
    .select('seq, name, due_week, budget_percent').eq('problem_id', problemId).order('seq');
  if (error) throw error;
  return data.map((m) => ({ seq: m.seq, name: m.name, dueWeek: m.due_week, budgetPercent: m.budget_percent }));
}

// Phần chi tiết đề bài AN TOÀN ĐỂ CÔNG KHAI (không có tệp đính kèm, không có dữ liệu riêng của người xem)
export function chiTietCongKhai(p, milestones) {
  return {
    ...tomTatCongKhai(p),
    requirement: p.requirement,
    teamSizeMin: p.team_size_min,
    teamSizeMax: p.team_size_max,
    trlLevel: p.trl_level,
    deliverables: p.deliverables ?? [],
    selectionCriteria: p.selection_criteria,
    ndaRequired: p.nda_required,
    startDate: p.start_date,
    durationWeeks: p.duration_weeks,
    workMode: p.work_mode,
    milestones,
  };
}

// Chi tiết một bài công khai cho khách (/api/public/problems/:code)
export async function getPublicProblem(code) {
  const p = await timBaiCongKhai(code);
  return chiTietCongKhai(p, await mocCua(p.problem_id));
}

// Tất cả bài công khai (Open / In_Progress), mới duyệt trước
export async function listPublicProblemRows() {
  const { data, error } = await supabase.from('business_problem').select(COT_BAI_TOAN).in('status', CONG_KHAI)
    .order('approved_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ---------- Dữ liệu của SV đang đăng nhập ----------
async function nhomCuaToi(studentId) {
  const { data, error } = await supabase
    .from('team_member')
    .select('team_id, role_in_team, team:student_team!fk_team_member_team(team_id, team_name, status)')
    .eq('student_id', studentId);
  if (error) throw error;
  return data.filter((m) => m.team && m.team.status === 'Active');
}

async function kyNangCuaToi(studentId) {
  const { data, error } = await supabase
    .from('student_skill')
    .select('skill:skill!fk_student_skill_skill(name)')
    .eq('student_id', studentId);
  if (error) throw error;
  return data.map((r) => r.skill?.name).filter(Boolean);
}

// Proposal đang hiệu lực (khác Cancelled) do SV nộp cá nhân hoặc nhóm của SV nộp
async function proposalCuaToi(studentId, teamIds, problemId) {
  const dieuKien = [`student_id.eq.${studentId}`];
  if (teamIds.length) dieuKien.push(`team_id.in.(${teamIds.join(',')})`);
  let truyVan = supabase
    .from('connection_request')
    .select('request_id, problem_id, status, title, team_id, lecturer_id, student_id, submitted_by_account_id, created_at, decline_reason, ' +
      'team:student_team!fk_connection_request_team(team_name), ' +
      'lecturer:lecturer_profile!fk_connection_request_lecturer(full_name, academic_title), ' +
      'meetings:connection_meeting(start_at, mode, agenda, created_at)')
    .not('problem_id', 'is', null)
    .neq('status', 'Cancelled')
    .or(dieuKien.join(','))
    .order('created_at', { ascending: false });
  if (problemId) truyVan = truyVan.eq('problem_id', problemId);
  const { data, error } = await truyVan;
  if (error) throw error;
  return data;
}

async function daLuuCuaToi(accountId) {
  const { data, error } = await supabase
    .from('saved_opportunity')
    .select('problem_id, saved_at')
    .eq('account_id', accountId)
    .not('problem_id', 'is', null);
  if (error) throw error;
  return data;
}

function loaiDoiTac(r) {
  if (r.student_id) return 'Student';
  return r.lecturer_id ? 'Lab' : 'Team';
}

function proposalNgan(r) {
  return { id: r.request_id, status: r.status };
}

function proposalDayDu(r, studentId, tep) {
  const meeting = [...(r.meetings ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    id: r.request_id,
    status: r.status,
    title: r.title,
    partnerType: loaiDoiTac(r),
    teamName: r.team?.team_name ?? null,
    lecturerName: r.lecturer ? [r.lecturer.academic_title, r.lecturer.full_name].filter(Boolean).join('. ') : null,
    createdAt: r.created_at,
    declineReason: r.decline_reason,
    meeting: meeting ? { startAt: meeting.start_at, mode: meeting.mode, agenda: meeting.agenda } : null,
    attachments: tep.map((t) => ({ id: t.attachment_id, fileName: t.file_name, sizeBytes: t.size_bytes, docType: t.doc_type })),
    // Chỉ người gửi rút được, và chỉ khi DN chưa phản hồi
    canWithdraw: r.status === 'Submitted' && r.submitted_by_account_id === studentId,
  };
}

async function tepCua(ownerType, ownerIds) {
  if (!ownerIds.length) return [];
  const { data, error } = await supabase
    .from('rd_attachment')
    .select('attachment_id, owner_id, file_name, size_bytes, doc_type, storage_path')
    .eq('owner_type', ownerType)
    .in('owner_id', ownerIds)
    .order('attachment_id');
  if (error) throw error;
  return data;
}

async function timBaiCongKhai(code) {
  const { data, error } = await supabase
    .from('business_problem')
    .select(COT_BAI_TOAN)
    .eq('problem_code', code)
    .in('status', CONG_KHAI)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PROBLEM_NOT_FOUND', 'Không tìm thấy bài toán hoặc bài toán chưa được công khai.');
  return data;
}

// ---------- Danh sách ----------
export async function listProblems(studentId) {
  const [baiToan, nhom, kyNang, daLuu] = await Promise.all([
    listPublicProblemRows(),
    nhomCuaToi(studentId),
    kyNangCuaToi(studentId),
    daLuuCuaToi(studentId),
  ]);
  const dsProposal = await proposalCuaToi(studentId, nhom.map((m) => m.team_id));
  const phuTro = {
    kyNang,
    daLuu: new Set(daLuu.map((s) => s.problem_id)),
    proposal: new Map(dsProposal.map((r) => [r.problem_id, proposalNgan(r)])),
  };
  return {
    problems: baiToan.map((p) => tomTatBaiToan(p, phuTro)),
    // Thứ tự lưu (mới nhất trước) cho tab "Đã lưu"
    saved: daLuu.sort((a, b) => b.saved_at.localeCompare(a.saved_at)).map((s) => s.problem_id),
  };
}

// ---------- Chi tiết ----------
export async function getProblem(studentId, code) {
  const p = await timBaiCongKhai(code);
  const [nhom, kyNang, daLuu, moc, tepBai] = await Promise.all([
    nhomCuaToi(studentId),
    kyNangCuaToi(studentId),
    daLuuCuaToi(studentId),
    mocCua(p.problem_id),
    tepCua('Problem', [p.problem_id]),
  ]);
  const teamIds = nhom.map((m) => m.team_id);
  const [cuaToi] = await proposalCuaToi(studentId, teamIds, p.problem_id);
  const tepProposal = cuaToi ? await tepCua('Request', [cuaToi.request_id]) : [];

  // Lựa chọn cho form nộp proposal: nhóm của SV (kèm thành viên) và GV đang nhận hướng dẫn
  let teams = [];
  if (teamIds.length) {
    const { data, error } = await supabase
      .from('team_member')
      .select('team_id, role_in_team, position_title, student:student_profile!fk_team_member_student(full_name, student_code)')
      .in('team_id', teamIds);
    if (error) throw error;
    teams = nhom.map((m) => ({
      id: m.team_id,
      name: m.team.team_name,
      isLeader: m.role_in_team === 'Leader',
      members: data.filter((x) => x.team_id === m.team_id).map((x) => ({
        name: x.student?.full_name, studentCode: x.student?.student_code, role: x.position_title, isLeader: x.role_in_team === 'Leader',
      })).sort((a, b) => Number(b.isLeader) - Number(a.isLeader)),
    }));
  }
  const { data: gv, error: gvError } = await supabase
    .from('lecturer_profile')
    .select('lecturer_id, full_name, academic_title, faculty:faculty!fk_lecturer_profile_faculty(name)')
    .eq('is_accepting_advisees', true)
    .order('full_name')
    .limit(100);
  if (gvError) throw gvError;

  const phuTro = {
    kyNang,
    daLuu: new Set(daLuu.map((s) => s.problem_id)),
    proposal: new Map(cuaToi ? [[p.problem_id, proposalNgan(cuaToi)]] : []),
  };
  return {
    ...chiTietCongKhai(p, moc),
    ...tomTatBaiToan(p, phuTro),
    attachments: tepBai.map((t) => ({ id: t.attachment_id, fileName: t.file_name, sizeBytes: t.size_bytes, docType: t.doc_type })),
    myProposal: cuaToi ? proposalDayDu(cuaToi, studentId, tepProposal) : null,
    mySkills: kyNang,
    options: {
      teams,
      lecturers: gv.map((g) => ({
        id: g.lecturer_id,
        name: [g.academic_title, g.full_name].filter(Boolean).join('. '),
        faculty: g.faculty?.name ?? null,
      })),
    },
  };
}

// ---------- Lưu / bỏ lưu ----------
export async function saveProblem(studentId, code) {
  const p = await timBaiCongKhai(code);
  const { error } = await supabase.from('saved_opportunity').insert({ account_id: studentId, problem_id: p.problem_id });
  // Đã lưu từ trước (ux_saved_opportunity_problem): coi như thành công
  if (error && error.code !== '23505') throw error;
  return { code: p.problem_code, saved: true };
}

export async function unsaveProblem(studentId, code) {
  const p = await timBaiCongKhai(code);
  const { error } = await supabase.from('saved_opportunity').delete()
    .eq('account_id', studentId).eq('problem_id', p.problem_id);
  if (error) throw error;
}

// ---------- Tải tệp proposal (bước 1) ----------
// Lưu tạm ở proposal-uploads/<studentId>/<uploadId>/<tên tệp>; bước nộp proposal chuyển sang requests/<id>/.
export async function uploadProposalFile(studentId, buffer, fileName) {
  if (!buffer.length) throw new AppError(400, 'INVALID_INPUT', 'Tệp rỗng.');
  if (buffer.length > MAX_PROPOSAL_FILE_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'Tệp proposal tối đa 10 MB.');
  // Kiểm tra nội dung tệp, không tin Content-Type / phần mở rộng
  if (buffer.toString('ascii', 0, 5) !== '%PDF-') {
    throw new AppError(415, 'UNSUPPORTED_TYPE', 'Tệp không phải PDF hợp lệ.');
  }
  const uploadId = randomUUID();
  const ten = tenTepAnToan(fileName);
  const { error } = await supabase.storage.from(BUCKET)
    .upload(`${THU_MUC_TAM}/${studentId}/${uploadId}/${ten}`, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new AppError(500, 'STORAGE_NOT_READY', 'Chưa có bucket "rd-files": chạy cd backend && npm run seed:dn-files.');
    }
    throw error;
  }
  return { uploadId, fileName: ten, sizeBytes: buffer.length };
}

async function timTepTam(studentId, uploadId) {
  const thuMuc = `${THU_MUC_TAM}/${studentId}/${uploadId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(thuMuc, { limit: 2 });
  if (error) throw error;
  const tep = (data ?? []).find((t) => t.id && t.name);
  if (!tep) throw new AppError(400, 'UPLOAD_NOT_FOUND', 'Không tìm thấy tệp proposal đã tải lên, hãy chọn lại tệp.');
  return { path: `${thuMuc}/${tep.name}`, name: tep.name, size: tep.metadata?.size ?? 0 };
}

// ---------- Nộp proposal (bước 2) ----------
export async function submitProposal(studentId, code, input) {
  // 1–2. Bài toán công khai và còn nhận hồ sơ
  const p = await timBaiCongKhai(code);
  if (!conNhan(p)) {
    throw new AppError(409, 'PROBLEM_CLOSED', p.status === 'In_Progress'
      ? 'Bài toán đã có đơn vị thực hiện, không nhận thêm proposal.'
      : 'Bài toán đã hết hạn nhận hồ sơ.');
  }
  // 3. Đối tượng bài nhận
  if (!(p.accepted_partners ?? []).includes(input.partnerType)) {
    throw new AppError(409, 'PARTNER_TYPE_NOT_ACCEPTED', 'Bài toán không nhận hình thức ứng tuyển này.');
  }
  // 4. Nhóm / GV
  const nhom = await nhomCuaToi(studentId);
  const teamIds = nhom.map((m) => m.team_id);
  if (input.partnerType !== 'Student') {
    const thanhVien = nhom.find((m) => m.team_id === input.teamId);
    if (!thanhVien) throw new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm của bạn.');
    if (thanhVien.role_in_team !== 'Leader') {
      throw new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm được nộp proposal thay cho nhóm.');
    }
    const { count, error } = await supabase.from('team_member')
      .select('student_id', { count: 'exact', head: true }).eq('team_id', input.teamId);
    if (error) throw error;
    const min = p.team_size_min ?? 1;
    const max = p.team_size_max ?? 20;
    if (count < min || count > max) {
      throw new AppError(409, 'TEAM_SIZE_MISMATCH',
        `Nhóm có ${count} thành viên, doanh nghiệp yêu cầu ${min}–${max} thành viên.`);
    }
  }
  if (input.partnerType === 'Lab') {
    const { data: gv, error } = await supabase.from('lecturer_profile')
      .select('lecturer_id').eq('lecturer_id', input.lecturerId).maybeSingle();
    if (error) throw error;
    if (!gv) throw new AppError(400, 'LECTURER_NOT_FOUND', 'Giảng viên hướng dẫn không tồn tại.');
  }
  // 5. Chưa nộp
  const daNop = await proposalCuaToi(studentId, teamIds, p.problem_id);
  if (daNop.length) throw new AppError(409, 'ALREADY_APPLIED', 'Bạn hoặc nhóm của bạn đã nộp proposal cho bài toán này.');
  // 6. NDA
  if (p.nda_required && !input.ndaAccepted) {
    throw new AppError(400, 'NDA_REQUIRED', 'Đề bài yêu cầu đồng ý ký thỏa thuận bảo mật (NDA).');
  }
  // 7. Tệp đã tải lên
  const tep = await timTepTam(studentId, input.uploadId);

  const skills = (p.skills ?? []).map((s) => s.skill?.name).filter(Boolean);
  const kyNang = await kyNangCuaToi(studentId);
  const laNhom = input.partnerType !== 'Student';
  const { data: yc, error: insError } = await supabase
    .from('connection_request')
    .insert({
      business_id: p.business_id,
      problem_id: p.problem_id,
      student_id: laNhom ? null : studentId,
      team_id: laNhom ? input.teamId : null,
      lecturer_id: input.partnerType === 'Lab' ? input.lecturerId : null,
      initiated_by: laNhom ? 'Team' : 'Student',
      title: input.title,
      proposal_content: input.content + (input.durationWeeks ? `\n\nThời gian thực hiện đề xuất: ${input.durationWeeks} tuần.` : ''),
      cover_letter: input.coverLetter || null,
      tags: skills.slice(0, 4),
      trl_label: input.trlLabel,
      fit_score: mucPhuHop(skills, kyNang),
      status: 'Submitted',
      submitted_by_account_id: studentId,
    })
    .select('request_id, status, created_at')
    .single();
  if (insError) {
    if (insError.code === '23505') throw new AppError(409, 'ALREADY_APPLIED', 'Bạn hoặc nhóm của bạn đã nộp proposal cho bài toán này.');
    throw insError;
  }

  // Chuyển tệp tạm sang thư mục của proposal và ghi rd_attachment; lỗi thì gỡ proposal vừa tạo
  const dich = `requests/${yc.request_id}/${tep.name}`;
  try {
    const { error: mvError } = await supabase.storage.from(BUCKET).move(tep.path, dich);
    if (mvError) throw mvError;
    const { error: attError } = await supabase.from('rd_attachment').insert({
      owner_type: 'Request', owner_id: yc.request_id, file_name: tep.name, storage_path: dich,
      size_bytes: Math.max(1, tep.size), doc_type: 'Proposal kỹ thuật', uploaded_by_account_id: studentId,
    });
    if (attError) {
      await supabase.storage.from(BUCKET).move(dich, tep.path);
      throw attError;
    }
  } catch (err) {
    await supabase.from('connection_request').delete().eq('request_id', yc.request_id);
    throw err;
  }
  return { id: yc.request_id, problemCode: p.problem_code, status: yc.status, createdAt: yc.created_at };
}

// ---------- Rút proposal ----------
export async function withdrawProposal(studentId, code, requestId) {
  const p = await timBaiCongKhai(code);
  const { data: yc, error } = await supabase.from('connection_request')
    .select('request_id, status, submitted_by_account_id')
    .eq('request_id', requestId).eq('problem_id', p.problem_id).maybeSingle();
  if (error) throw error;
  if (!yc || yc.submitted_by_account_id !== studentId) {
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'Không tìm thấy proposal của bạn.');
  }
  if (yc.status !== 'Submitted') {
    throw new AppError(409, 'INVALID_STATE', 'Doanh nghiệp đã phản hồi proposal nên không rút được.');
  }
  // UPDATE có điều kiện: DN vừa phản hồi cùng lúc thì không ghi đè
  const { data, error: upError } = await supabase.from('connection_request')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('request_id', requestId).eq('status', 'Submitted')
    .select('request_id, status').maybeSingle();
  if (upError) throw upError;
  if (!data) throw new AppError(409, 'INVALID_STATE', 'Doanh nghiệp đã phản hồi proposal nên không rút được.');
  return { id: data.request_id, status: data.status };
}

// ---------- Liên kết tải tệp (ký tạm 60 s) ----------
async function lienKet(tep, taiVe) {
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(tep.storage_path, SIGNED_URL_SECONDS, taiVe ? { download: tep.file_name } : undefined);
  if (error) {
    if (/not found/i.test(error.message)) throw new AppError(404, 'FILE_NOT_FOUND', 'Tệp chưa có trên kho lưu trữ (chạy npm run seed:dn-files).');
    throw error;
  }
  return { url: data.signedUrl, fileName: tep.file_name, expiresIn: SIGNED_URL_SECONDS };
}

export async function getProblemAttachmentUrl(code, attachmentId, taiVe) {
  const p = await timBaiCongKhai(code);
  const tep = (await tepCua('Problem', [p.problem_id])).find((t) => t.attachment_id === attachmentId);
  if (!tep) throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Không tìm thấy tệp đính kèm.');
  return lienKet(tep, taiVe);
}

export async function getProposalAttachmentUrl(studentId, code, requestId, attachmentId, taiVe) {
  const p = await timBaiCongKhai(code);
  const nhom = await nhomCuaToi(studentId);
  const cuaToi = (await proposalCuaToi(studentId, nhom.map((m) => m.team_id), p.problem_id))
    .find((r) => r.request_id === requestId);
  if (!cuaToi) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Không tìm thấy proposal của bạn.');
  const tep = (await tepCua('Request', [requestId])).find((t) => t.attachment_id === attachmentId);
  if (!tep) throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Không tìm thấy tệp đính kèm.');
  return lienKet(tep, taiVe);
}
