// Nghiệp vụ "Không gian đàm phán" của Doanh nghiệp (DN-09 danh sách phòng, DN-16 trong phòng). Migration 005.
// Phòng = connection_request đã được DN chấp nhận (In_Discussion / Contracted / Completed).
//
// Quy tắc 3 bước Technical → NDA_IP → Contract:
//   - Bước xong khi CẢ HAI bên xác nhận. Bước sau chỉ xác nhận được khi bước trước đã xong (409 STEP_LOCKED).
//   - DN chỉ xác nhận / hủy xác nhận phía mình. Hủy được khi đối tác CHƯA xác nhận (409 STEP_COMPLETED).
//     Phía đối tác xác nhận trên tài khoản của họ (chưa có màn hình SV/GV).
//   - Bước Contract đủ hai bên → proposal 'Contracted' (+ student_confirmed, business_confirmed) và bài toán
//     đang Open chuyển In_Progress. Hợp đồng ký NGOÀI hệ thống, UIT Connect chỉ ghi nhận.
// Trao đổi là tin theo lượt, không phải chat realtime.
import { supabase } from '../db.js';
import { AppError } from '../errors.js';
import { COT_YEU_CAU, chuyenYeuCau, BUCKET, SIGNED_URL_SECONDS } from './businessInboxService.js';

export const BUOC = ['Technical', 'NDA_IP', 'Contract'];
const TEN_BUOC = { Technical: 'Trao đổi kỹ thuật', NDA_IP: 'NDA & IP', Contract: 'Hợp đồng' };
const TRANG_THAI_PHONG = ['In_Discussion', 'Contracted', 'Completed'];

const COT_PHONG = COT_YEU_CAU +
  ', room_opened_at, business_last_read_at, proposed_budget, contract_code, contracted_at' +
  ', problem:business_problem!fk_connection_request_problem(problem_id, problem_code, title, problem_type, funding, status)' +
  ', steps:connection_step(step_code, business_confirmed, partner_confirmed, business_confirmed_at, partner_confirmed_at, note)';

const xong = (b) => Boolean(b?.business_confirmed && b?.partner_confirmed);

// Trạng thái phòng suy ra từ các bước (giống giao diện): đã ký / chờ DN / chờ đối tác / đang trao đổi
function trangThaiPhong(steps) {
  if (xong(steps.Contract)) return 'Contracted';
  const ds = BUOC.map((b) => steps[b]).filter(Boolean);
  if (ds.some((b) => b.partner_confirmed && !b.business_confirmed)) return 'Awaiting_Business';
  if (ds.some((b) => b.business_confirmed && !b.partner_confirmed)) return 'Awaiting_Partner';
  return 'In_Discussion';
}

function dinhDangNgay(iso) {
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function chuyenPhong(r, tinNhan = []) {
  const steps = Object.fromEntries((r.steps ?? []).map((s) => [s.step_code, s]));
  const roomStatus = trangThaiPhong(steps);
  const lastRead = r.business_last_read_at ? Date.parse(r.business_last_read_at) : 0;
  const choDn = BUOC.filter((b) => steps[b]?.partner_confirmed && !steps[b]?.business_confirmed);
  return {
    ...chuyenYeuCau(r, r.problem?.problem_code ?? null, []),
    problem: r.problem
      ? { id: r.problem.problem_id, code: r.problem.problem_code, title: r.problem.title, type: r.problem.problem_type, funding: r.problem.funding, status: r.problem.status }
      : null,
    roomOpenedAt: r.room_opened_at ?? r.updated_at,
    proposedBudget: r.proposed_budget,
    contractCode: r.contract_code,
    contractedAt: r.contracted_at,
    roomStatus,
    steps: BUOC.map((b, i) => ({
      code: b,
      name: TEN_BUOC[b],
      businessConfirmed: Boolean(steps[b]?.business_confirmed),
      partnerConfirmed: Boolean(steps[b]?.partner_confirmed),
      businessConfirmedAt: steps[b]?.business_confirmed_at ?? null,
      partnerConfirmedAt: steps[b]?.partner_confirmed_at ?? null,
      note: steps[b]?.note ?? null,
      unlocked: BUOC.slice(0, i).every((truoc) => xong(steps[truoc])),
    })),
    warning: choDn.length
      ? `Đối tác đã xác nhận ${choDn.map((b) => `"${TEN_BUOC[b]}"`).join(', ')}` +
        ` (${dinhDangNgay(steps[choDn[0]].partner_confirmed_at)}). Vui lòng rà soát và xác nhận.`
      : null,
    unreadCount: tinNhan.filter((m) => m.sender_type === 'Partner' && Date.parse(m.created_at) > lastRead).length,
  };
}

// Tên DN hiển thị trong tin hệ thống ("V-Tech Global đã xác nhận ...")
export async function tenDoanhNghiep(businessId) {
  const { data, error } = await supabase.from('business_profile').select('company_name').eq('business_id', businessId).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Không tìm thấy hồ sơ doanh nghiệp của tài khoản thử. Hãy chạy database/seed_dn.sql.');
  return data.company_name;
}

export async function listRooms(businessId) {
  const { data: rows, error } = await supabase
    .from('connection_request')
    .select(COT_PHONG)
    .eq('business_id', businessId)
    .in('status', TRANG_THAI_PHONG)
    .order('room_opened_at', { ascending: false });
  if (error) throw error;
  const ids = rows.map((r) => r.request_id);
  let tinTheoPhong = {};
  if (ids.length) {
    const { data: tin, error: tError } = await supabase
      .from('connection_message')
      .select('request_id, sender_type, created_at')
      .in('request_id', ids);
    if (tError) throw tError;
    tinTheoPhong = tin.reduce((acc, m) => { (acc[m.request_id] ??= []).push(m); return acc; }, {});
  }
  return { rooms: rows.map((r) => chuyenPhong(r, tinTheoPhong[r.request_id] ?? [])) };
}

async function findRoom(businessId, roomId) {
  const { data, error } = await supabase
    .from('connection_request')
    .select('request_id, status, problem_id')
    .eq('request_id', roomId)
    .eq('business_id', businessId)
    .in('status', TRANG_THAI_PHONG)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng đàm phán.');
  return data;
}

// Chi tiết phòng; đánh dấu DN đã đọc mục Trao đổi
export async function getRoom(businessId, roomId) {
  await findRoom(businessId, roomId);
  const { data: r, error } = await supabase.from('connection_request').select(COT_PHONG).eq('request_id', roomId).single();
  if (error) throw error;
  const { data: tin, error: tError } = await supabase
    .from('connection_message')
    .select('message_id, sender_type, content, created_at')
    .eq('request_id', roomId)
    .order('created_at')
    .order('message_id');
  if (tError) throw tError;
  const { data: tep, error: fError } = await supabase
    .from('rd_attachment')
    .select('attachment_id, owner_type, file_name, size_bytes, doc_type')
    .in('owner_type', ['Negotiation', 'Request'])
    .eq('owner_id', roomId)
    .order('owner_type')
    .order('attachment_id');
  if (fError) throw fError;

  const phong = chuyenPhong(r, tin);
  const { error: readError } = await supabase
    .from('connection_request')
    .update({ business_last_read_at: new Date().toISOString() })
    .eq('request_id', roomId);
  if (readError) throw readError;

  return {
    ...phong,
    messages: tin.map((m) => ({ id: m.message_id, sender: m.sender_type, content: m.content, createdAt: m.created_at })),
    documents: tep.map((t) => ({
      id: t.attachment_id, fileName: t.file_name, sizeBytes: t.size_bytes, docType: t.doc_type,
      fromProposal: t.owner_type === 'Request',
    })),
  };
}

async function themTinHeThong(roomId, noiDung) {
  const { error } = await supabase.from('connection_message').insert({ request_id: roomId, sender_type: 'System', content: noiDung });
  if (error) throw error;
}

async function docBuoc(roomId) {
  const { data, error } = await supabase
    .from('connection_step')
    .select('step_code, business_confirmed, partner_confirmed')
    .eq('request_id', roomId);
  if (error) throw error;
  return Object.fromEntries(data.map((s) => [s.step_code, s]));
}

export async function confirmStep(businessId, roomId, step, tenDn) {
  const phong = await findRoom(businessId, roomId);
  const steps = await docBuoc(roomId);
  if (!steps[step]) throw new AppError(404, 'STEP_NOT_FOUND', 'Phòng chưa có bước này.');
  const truoc = BUOC.slice(0, BUOC.indexOf(step));
  if (!truoc.every((b) => xong(steps[b]))) {
    throw new AppError(409, 'STEP_LOCKED', `Bước "${TEN_BUOC[step]}" chỉ mở khi các bước trước đã được cả hai bên xác nhận.`);
  }
  if (steps[step].business_confirmed) throw new AppError(409, 'ALREADY_CONFIRMED', 'Doanh nghiệp đã xác nhận bước này.');

  const now = new Date().toISOString();
  const { data: capNhat, error } = await supabase
    .from('connection_step')
    .update({ business_confirmed: true, business_confirmed_at: now })
    .eq('request_id', roomId)
    .eq('step_code', step)
    .eq('business_confirmed', false)
    .select('partner_confirmed')
    .maybeSingle();
  if (error) throw error;
  if (!capNhat) throw new AppError(409, 'ALREADY_CONFIRMED', 'Doanh nghiệp đã xác nhận bước này.');
  await themTinHeThong(roomId, `${tenDn} đã xác nhận bước "${TEN_BUOC[step]}".`);

  const hoanTat = capNhat.partner_confirmed;
  if (hoanTat && step === 'Contract') {
    const { error: ycError } = await supabase
      .from('connection_request')
      .update({ status: 'Contracted', student_confirmed: true, business_confirmed: true, contracted_at: now, updated_at: now })
      .eq('request_id', roomId)
      .eq('status', 'In_Discussion');
    if (ycError) throw ycError;
    const { error: btError } = await supabase
      .from('business_problem')
      .update({ status: 'In_Progress' })
      .eq('problem_id', phong.problem_id)
      .eq('status', 'Open');
    if (btError) throw btError;
    await themTinHeThong(roomId, 'Hai bên đã xác nhận ký hợp đồng. Bài toán chuyển sang Đang thực hiện.');
  }
  return { step, businessConfirmed: true, completed: hoanTat, contracted: hoanTat && step === 'Contract' };
}

export async function unconfirmStep(businessId, roomId, step, tenDn) {
  await findRoom(businessId, roomId);
  const steps = await docBuoc(roomId);
  if (!steps[step]) throw new AppError(404, 'STEP_NOT_FOUND', 'Phòng chưa có bước này.');
  if (!steps[step].business_confirmed) throw new AppError(409, 'NOT_CONFIRMED', 'Doanh nghiệp chưa xác nhận bước này.');
  if (steps[step].partner_confirmed) {
    throw new AppError(409, 'STEP_COMPLETED', 'Đối tác cũng đã xác nhận nên bước đã hoàn tất, không hủy được.');
  }
  const { data, error } = await supabase
    .from('connection_step')
    .update({ business_confirmed: false, business_confirmed_at: null })
    .eq('request_id', roomId)
    .eq('step_code', step)
    .eq('business_confirmed', true)
    .eq('partner_confirmed', false)
    .select('step_code')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(409, 'STEP_COMPLETED', 'Trạng thái bước vừa thay đổi, vui lòng tải lại.');
  await themTinHeThong(roomId, `${tenDn} đã hủy xác nhận bước "${TEN_BUOC[step]}".`);
  return { step, businessConfirmed: false };
}

export async function postMessage(businessId, roomId, content) {
  await findRoom(businessId, roomId);
  const { data, error } = await supabase
    .from('connection_message')
    .insert({ request_id: roomId, sender_type: 'Business', sender_account_id: businessId, content })
    .select('message_id, sender_type, content, created_at')
    .single();
  if (error) throw error;
  await supabase.from('connection_request').update({ business_last_read_at: new Date().toISOString() }).eq('request_id', roomId);
  return { id: data.message_id, sender: data.sender_type, content: data.content, createdAt: data.created_at };
}

export async function scheduleRoomMeeting(businessId, roomId, { startAt, mode, agenda }, tenDn) {
  await findRoom(businessId, roomId);
  const { data, error } = await supabase
    .from('connection_meeting')
    .insert({ request_id: roomId, start_at: startAt, mode, agenda: agenda || null, created_by_account_id: businessId })
    .select('meeting_id, start_at, mode, agenda')
    .single();
  if (error) throw error;
  const luc = new Date(startAt);
  const gio = luc.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  await themTinHeThong(roomId, `${tenDn} đề xuất lịch trao đổi ${gio} ngày ${dinhDangNgay(startAt)} (${mode}).`);
  return { id: data.meeting_id, startAt: data.start_at, mode: data.mode, agenda: data.agenda };
}

export async function getRoomDocumentUrl(businessId, roomId, attachmentId, download) {
  await findRoom(businessId, roomId);
  const { data: tep, error } = await supabase
    .from('rd_attachment')
    .select('file_name, storage_path')
    .eq('attachment_id', attachmentId)
    .in('owner_type', ['Negotiation', 'Request'])
    .eq('owner_id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!tep) throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Không tìm thấy văn bản.');
  const { data, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(tep.storage_path, SIGNED_URL_SECONDS, download ? { download: tep.file_name } : undefined);
  if (urlError || !data?.signedUrl) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Tệp chưa có trên máy chủ. Hãy chạy: cd backend && npm run seed:dn-files');
  }
  return { url: data.signedUrl, fileName: tep.file_name, expiresIn: SIGNED_URL_SECONDS };
}
