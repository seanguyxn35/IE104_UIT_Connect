// Nghiệp vụ "Hộp thư kết nối" của Doanh nghiệp (DN-08): proposal SV / GV / Lab gửi tới bài toán R&D của DN.
// Bảng: connection_request (+ connection_meeting, rd_attachment), migration 004.
//
// Trạng thái proposal và tab giao diện:
//   Submitted → Chờ phản hồi | Scheduled → Đã hẹn trao đổi | In_Discussion / Contracted / Completed → Chuyển đàm phán
//   Declined → Đã từ chối
// Chuyển trạng thái hợp lệ (sai thì 409 INVALID_STATE):
//   Từ chối:    Submitted | Scheduled → Declined
//   Hoàn tác:   Declined → Scheduled (nếu đã có lịch hẹn) | Submitted
//   Hẹn:        Submitted | Scheduled → Scheduled (thêm lịch mới)
//   Chấp nhận:  Submitted | Scheduled → In_Discussion
// Proposal không thuộc DN đang đăng nhập trả 404 như không tồn tại (không lộ dữ liệu DN khác).
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import { BUCKET, SIGNED_URL_SECONDS } from '../../shared/rdFiles.js';

const CO_THE_PHAN_HOI = ['Submitted', 'Scheduled'];

const SINH_VIEN = 'full_name, student_code, gpa, training_score, class_name, cohort, ' +
  'major:major!fk_student_profile_major(faculty:faculty!fk_major_faculty(name))';
export const COT_YEU_CAU = 'request_id, problem_id, team_id, lecturer_id, student_id, initiated_by, title, proposal_content, ' +
  'cover_letter, tags, trl_label, fit_score, status, decline_reason, read_at, created_at, updated_at, ' +
  'team:student_team!fk_connection_request_team(team_name, lab:lab!fk_student_team_lab(name), ' +
  `members:team_member(role_in_team, position_title, student:student_profile!fk_team_member_student(${SINH_VIEN}))), ` +
  'lecturer:lecturer_profile!fk_connection_request_lecturer(full_name, academic_title, position_title, ' +
  'faculty:faculty!fk_lecturer_profile_faculty(name), lab:lab!fk_lecturer_profile_lab(name)), ' +
  `student:student_profile!fk_connection_request_student(${SINH_VIEN}), ` +
  'meetings:connection_meeting(start_at, mode, agenda, created_at)';

function sinhVien(s) {
  if (!s) return null;
  return {
    name: s.full_name,
    studentCode: s.student_code,
    gpa: s.gpa,
    trainingScore: s.training_score,
    className: s.class_name,
    cohort: s.cohort,
    faculty: s.major?.faculty?.name ?? null,
  };
}

export function chuyenYeuCau(r, problemCode, tep) {
  const members = (r.team?.members ?? [])
    .map((m) => ({ ...sinhVien(m.student), role: m.position_title, isLeader: m.role_in_team === 'Leader' }))
    .sort((a, b) => Number(b.isLeader) - Number(a.isLeader));
  const lecturer = r.lecturer
    ? {
        name: [r.lecturer.academic_title, r.lecturer.full_name].filter(Boolean).join('. '),
        position: r.lecturer.position_title,
        faculty: r.lecturer.faculty?.name ?? null,
        lab: r.lecturer.lab?.name ?? null,
      }
    : null;
  const student = sinhVien(r.student);
  const leader = student ?? members.find((m) => m.isLeader) ?? members[0] ?? null;
  const meeting = [...(r.meetings ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  let partnerType = 'team';
  if (r.student_id) partnerType = 'student';
  else if (r.lecturer_id || r.team?.lab) partnerType = 'lab';

  return {
    id: r.request_id,
    problemId: r.problem_id,
    problemCode,
    status: r.status,
    initiatedBy: r.initiated_by,
    title: r.title,
    content: r.proposal_content,
    coverLetter: r.cover_letter,
    tags: r.tags ?? [],
    trlLabel: r.trl_label,
    fitScore: r.fit_score,
    declineReason: r.decline_reason,
    isNew: r.read_at === null && r.status === 'Submitted',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    partner: {
      type: partnerType,
      name: r.team?.team_name ?? (student ? 'Cá nhân' : lecturer?.lab ?? ''),
      lab: r.team?.lab?.name ?? lecturer?.lab ?? null,
    },
    lecturer,
    leader,
    members: student ? [{ ...student, role: null, isLeader: false }] : members,
    meeting: meeting ? { startAt: meeting.start_at, mode: meeting.mode, agenda: meeting.agenda } : null,
    attachments: tep.map((t) => ({ id: t.attachment_id, fileName: t.file_name, sizeBytes: t.size_bytes, docType: t.doc_type })),
  };
}

export async function getInbox(businessId) {
  const { data: business, error: bizError } = await supabase
    .from('business_profile')
    .select('business_id, company_name, verified_status')
    .eq('business_id', businessId)
    .maybeSingle();
  if (bizError) throw bizError;
  if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Không tìm thấy hồ sơ doanh nghiệp của tài khoản thử. Hãy chạy database/seed_dn.sql.');

  const { data: problems, error: pError } = await supabase
    .from('business_problem')
    .select('problem_id, problem_code, title, status, problem_type, field:field!fk_business_problem_field(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (pError) throw pError;

  const { data: rows, error: rError } = await supabase
    .from('connection_request')
    .select(COT_YEU_CAU)
    .eq('business_id', businessId)
    .not('problem_id', 'is', null)
    // Proposal SV đã rút (SV-13) không hiện trong hộp thư
    .neq('status', 'Cancelled')
    .order('created_at', { ascending: false });
  if (rError) throw rError;

  const ids = rows.map((r) => r.request_id);
  let tepTheoYc = {};
  if (ids.length) {
    const { data: tep, error: tError } = await supabase
      .from('rd_attachment')
      .select('attachment_id, owner_id, file_name, size_bytes, doc_type')
      .eq('owner_type', 'Request')
      .in('owner_id', ids)
      .order('attachment_id');
    if (tError) throw tError;
    tepTheoYc = tep.reduce((acc, t) => { (acc[t.owner_id] ??= []).push(t); return acc; }, {});
  }

  const maTheoId = Object.fromEntries(problems.map((p) => [p.problem_id, p.problem_code ?? `RD-${p.problem_id}`]));
  return {
    business: { id: business.business_id, name: business.company_name, verifiedStatus: business.verified_status },
    problems: problems.map((p) => ({
      id: p.problem_id,
      code: maTheoId[p.problem_id],
      title: p.title,
      status: p.status,
      type: p.problem_type,
      fieldName: p.field?.name ?? null,
    })),
    requests: rows.map((r) => chuyenYeuCau(r, maTheoId[r.problem_id], tepTheoYc[r.request_id] ?? [])),
  };
}

// Proposal phải thuộc DN này, không thì 404
async function findOwn(businessId, requestId) {
  const { data, error } = await supabase
    .from('connection_request')
    .select('request_id, status')
    .eq('request_id', requestId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Không tìm thấy proposal.');
  return data;
}

function sai(status, hanhDong) {
  return new AppError(409, 'INVALID_STATE', `Proposal đang ở trạng thái ${status}, không thể ${hanhDong}.`);
}

// UPDATE có điều kiện trạng thái: nếu yêu cầu khác vừa đổi trạng thái trước thì không ghi đè (trả 409)
async function doiTrangThai(businessId, requestId, tuTrangThai, patch, hanhDong) {
  const { data, error } = await supabase
    .from('connection_request')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .eq('business_id', businessId)
    .in('status', tuTrangThai)
    .select('request_id, status')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const hienTai = await findOwn(businessId, requestId);
    throw sai(hienTai.status, hanhDong);
  }
  return { id: data.request_id, status: data.status };
}

export async function declineRequest(businessId, requestId, reason) {
  const yc = await findOwn(businessId, requestId);
  if (!CO_THE_PHAN_HOI.includes(yc.status)) throw sai(yc.status, 'từ chối');
  return doiTrangThai(businessId, requestId, CO_THE_PHAN_HOI,
    { status: 'Declined', decline_reason: reason || null, read_at: new Date().toISOString() }, 'từ chối');
}

export async function reopenRequest(businessId, requestId) {
  const yc = await findOwn(businessId, requestId);
  if (yc.status !== 'Declined') throw sai(yc.status, 'hoàn tác từ chối');
  const { count, error } = await supabase
    .from('connection_meeting')
    .select('meeting_id', { count: 'exact', head: true })
    .eq('request_id', requestId);
  if (error) throw error;
  return doiTrangThai(businessId, requestId, ['Declined'],
    { status: count > 0 ? 'Scheduled' : 'Submitted', decline_reason: null }, 'hoàn tác từ chối');
}

export async function scheduleMeeting(businessId, requestId, accountId, { startAt, mode, agenda }) {
  const yc = await findOwn(businessId, requestId);
  if (!CO_THE_PHAN_HOI.includes(yc.status)) throw sai(yc.status, 'hẹn trao đổi');
  const { data: meeting, error } = await supabase
    .from('connection_meeting')
    .insert({ request_id: requestId, start_at: startAt, mode, agenda: agenda || null, created_by_account_id: accountId })
    .select('meeting_id, start_at, mode, agenda')
    .single();
  if (error) throw error;
  try {
    const ketQua = await doiTrangThai(businessId, requestId, CO_THE_PHAN_HOI,
      { status: 'Scheduled', read_at: new Date().toISOString() }, 'hẹn trao đổi');
    return { ...ketQua, meeting: { id: meeting.meeting_id, startAt: meeting.start_at, mode: meeting.mode, agenda: meeting.agenda } };
  } catch (err) {
    // Trạng thái vừa bị đổi bởi yêu cầu khác: bỏ lịch vừa thêm để không để lại dữ liệu lệch
    await supabase.from('connection_meeting').delete().eq('meeting_id', meeting.meeting_id);
    throw err;
  }
}

// Chấp nhận = mở phòng đàm phán: chuyển In_Discussion, tạo 3 bước (chưa bên nào xác nhận) và tin hệ thống
export async function acceptRequest(businessId, requestId) {
  const yc = await findOwn(businessId, requestId);
  if (!CO_THE_PHAN_HOI.includes(yc.status)) throw sai(yc.status, 'chấp nhận');
  const now = new Date().toISOString();
  const ketQua = await doiTrangThai(businessId, requestId, CO_THE_PHAN_HOI,
    { status: 'In_Discussion', read_at: now, room_opened_at: now, business_last_read_at: now }, 'chấp nhận');

  const { error: stepError } = await supabase
    .from('connection_step')
    .upsert(['Technical', 'NDA_IP', 'Contract'].map((step) => ({ request_id: requestId, step_code: step })),
      { onConflict: 'request_id,step_code', ignoreDuplicates: true });
  if (stepError) throw stepError;
  const { error: msgError } = await supabase
    .from('connection_message')
    .insert({ request_id: requestId, sender_type: 'System', content: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' });
  if (msgError) throw msgError;
  return { ...ketQua, roomId: requestId };
}

// Liên kết ký tạm 60 giây để xem / tải tệp đính kèm của proposal (bucket riêng tư)
export async function getAttachmentUrl(businessId, requestId, attachmentId, download) {
  await findOwn(businessId, requestId);
  const { data: tep, error } = await supabase
    .from('rd_attachment')
    .select('attachment_id, file_name, storage_path')
    .eq('attachment_id', attachmentId)
    .eq('owner_type', 'Request')
    .eq('owner_id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!tep) throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Không tìm thấy tệp đính kèm.');
  const { data, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(tep.storage_path, SIGNED_URL_SECONDS, download ? { download: tep.file_name } : undefined);
  if (urlError || !data?.signedUrl) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Tệp chưa có trên máy chủ. Hãy chạy: cd backend && npm run seed:dn-files');
  }
  return { url: data.signedUrl, fileName: tep.file_name, expiresIn: SIGNED_URL_SECONDS };
}
