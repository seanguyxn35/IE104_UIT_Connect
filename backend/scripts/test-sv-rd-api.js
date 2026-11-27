// Kiểm thử API "Bài toán DN & R&D" phía SV (/api/student-rd-problems) và liên kết với Hộp thư DN (/api/business-inbox).
// Điều kiện: đã chạy migrations/006_sv_bai_toan_rd.sql + database/seed_sv_rd.sql; máy chủ đang chạy (npm start).
// Chạy: cd backend && npm run test:sv-rd          (BASE_URL mặc định http://localhost:3000)
// Có ca dương và âm (400 / 403 / 404 / 409 / 413 / 415). Chưa có đăng nhập nên chưa thử 401.
// Dữ liệu tạo ra (proposal, tệp, bài đã lưu) được xóa ở cuối, kể cả khi có ca lỗi.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const SV = `${BASE}/student-rd-problems`;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\ntrailer\n<< >>\n%%EOF\n', 'latin1');
let dat = 0;
let truot = 0;
const proposalTao = new Set();
const tepTam = new Set();
const baiDaLuu = new Set();

async function goi(method, url, { json, body, headers } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json ? JSON.stringify(json) : body,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function kiem(ten, dieuKien, chiTiet) {
  if (dieuKien) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}
const ma = (r, status, code) => r.status === status && (!code || r.data.code === code);

async function taiTep() {
  const r = await goi('POST', `${SV}/proposal-files`, { body: PDF, headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent('Proposal thử nghiệm.pdf') } });
  if (r.status === 201) tepTam.add(r.data.uploadId);
  return r;
}

function proposal(them) {
  return {
    partnerType: 'Student',
    title: 'Proposal thử nghiệm tự động',
    content: 'Nội dung giải pháp thử nghiệm đủ dài để vượt qua kiểm tra năm mươi ký tự của máy chủ.',
    trlLabel: 'TRL 3 (Proof of Concept)',
    ndaAccepted: true,
    confirmed: true,
    ...them,
  };
}

async function nop(code, them) {
  const r = await goi('POST', `${SV}/${code}/proposals`, { json: proposal(them) });
  if (r.status === 201) proposalTao.add(r.data.id);
  return r;
}

async function chay() {
  console.log(`Máy chủ: ${BASE}   SV thử: ${config.testStudentId}   DN thử: ${config.testBusinessId}\n`);

  console.log('1. Danh sách & chi tiết');
  let r = await goi('GET', SV);
  kiem('GET danh sách → 200', r.status === 200, r.data);
  const dsMa = (r.data.problems ?? []).map((p) => p.code);
  kiem('có bài DN khác (RD-2026-101) và bài V-Tech (RD-2026-084)', dsMa.includes('RD-2026-101') && dsMa.includes('RD-2026-084'), dsMa);
  kiem('không có bài chờ duyệt (RD-2026-091) / bản nháp', !dsMa.includes('RD-2026-091') && !dsMa.includes('DRAFT-904'));
  r = await goi('GET', `${SV}/RD-2026-084`);
  kiem('GET chi tiết → 200, có mốc + đối tượng nhận', r.status === 200 && r.data.milestones?.length > 0 && r.data.acceptedPartners?.length > 0, r.data);
  r = await goi('GET', `${SV}/RD-2026-091`);
  kiem('bài chưa duyệt → 404 PROBLEM_NOT_FOUND', ma(r, 404, 'PROBLEM_NOT_FOUND'), r);
  r = await goi('GET', `${SV}/KHONG-CO-123`);
  kiem('mã không tồn tại → 404', ma(r, 404, 'PROBLEM_NOT_FOUND'), r);
  r = await goi('GET', `${SV}/a%20b`);
  kiem('mã sai định dạng → 400', ma(r, 400, 'INVALID_INPUT'), r);

  console.log('2. Lưu bài toán');
  r = await goi('PUT', `${SV}/RD-2026-101/saved`);
  kiem('PUT saved → 200', r.status === 200 && r.data.saved === true, r);
  r = await goi('PUT', `${SV}/RD-2026-101/saved`);
  kiem('PUT saved lần 2 vẫn 200 (không trùng)', r.status === 200, r);
  r = await goi('GET', SV);
  const id101 = r.data.problems.find((p) => p.code === 'RD-2026-101')?.id;
  if (id101) baiDaLuu.add(id101);
  kiem('danh sách đánh dấu đã lưu', r.data.saved.includes(id101) && r.data.problems.find((p) => p.id === id101).saved, r.data.saved);
  r = await goi('DELETE', `${SV}/RD-2026-101/saved`);
  kiem('DELETE saved → 204', r.status === 204, r);
  r = await goi('PUT', `${SV}/RD-2026-091/saved`);
  kiem('lưu bài chưa duyệt → 404', ma(r, 404, 'PROBLEM_NOT_FOUND'), r);

  console.log('3. Tải tệp proposal');
  r = await goi('POST', `${SV}/proposal-files`, { body: Buffer.from('khong phai pdf'), headers: { 'Content-Type': 'application/pdf' } });
  kiem('tệp không phải PDF → 415', ma(r, 415, 'UNSUPPORTED_TYPE'), r);
  r = await goi('POST', `${SV}/proposal-files`, { body: Buffer.alloc(10 * 1024 * 1024 + 1, 0x25), headers: { 'Content-Type': 'application/pdf' } });
  kiem('tệp > 10 MB → 413', ma(r, 413, 'FILE_TOO_LARGE'), r);
  r = await taiTep();
  kiem('tệp PDF → 201 có uploadId', r.status === 201 && !!r.data.uploadId, r);
  const tep1 = r.data.uploadId;

  console.log('4. Nộp proposal – ca âm');
  r = await nop('RD-2026-114', { uploadId: tep1 });
  kiem('bài hết hạn → 409 PROBLEM_CLOSED', ma(r, 409, 'PROBLEM_CLOSED'), r);
  r = await nop('RD-2026-071', { uploadId: tep1 });
  kiem('bài đang thực hiện → 409 PROBLEM_CLOSED', ma(r, 409, 'PROBLEM_CLOSED'), r);
  r = await nop('RD-2026-108', { uploadId: tep1 });
  kiem('bài chỉ nhận Lab, nộp cá nhân → 409 PARTNER_TYPE_NOT_ACCEPTED', ma(r, 409, 'PARTNER_TYPE_NOT_ACCEPTED'), r);
  r = await nop('RD-2026-101', { partnerType: 'Team', teamId: 9999, uploadId: tep1 });
  kiem('nhóm không phải của SV → 404 TEAM_NOT_FOUND', ma(r, 404, 'TEAM_NOT_FOUND'), r);
  r = await nop('RD-2026-101', { partnerType: 'Team', teamId: 9822, uploadId: tep1 });
  kiem('SV không phải trưởng nhóm → 403 NOT_TEAM_LEADER', ma(r, 403, 'NOT_TEAM_LEADER'), r);
  r = await nop('RD-2026-101', { partnerType: 'Team', teamId: 9823, uploadId: tep1 });
  kiem('nhóm 5 người, đề bài 1–4 → 409 TEAM_SIZE_MISMATCH', ma(r, 409, 'TEAM_SIZE_MISMATCH'), r);
  r = await nop('RD-2026-079', { partnerType: 'Lab', teamId: 9821, lecturerId: 9999, uploadId: tep1 });
  kiem('GV không tồn tại → 400 LECTURER_NOT_FOUND', ma(r, 400, 'LECTURER_NOT_FOUND'), r);
  r = await nop('RD-2026-102', { partnerType: 'Team', teamId: 9821, ndaAccepted: false, uploadId: tep1 });
  kiem('chưa đồng ý NDA → 400 NDA_REQUIRED', ma(r, 400, 'NDA_REQUIRED'), r);
  r = await nop('RD-2026-106', { uploadId: '00000000-0000-4000-8000-000000000000' });
  kiem('uploadId không tồn tại → 400 UPLOAD_NOT_FOUND', ma(r, 400, 'UPLOAD_NOT_FOUND'), r);
  r = await nop('RD-2026-106', { title: 'ngắn', uploadId: tep1 });
  kiem('tiêu đề quá ngắn → 400 INVALID_INPUT', ma(r, 400, 'INVALID_INPUT'), r);

  console.log('5. Nộp proposal – ca dương');
  r = await nop('RD-2026-101', { uploadId: tep1 });
  kiem('SV cá nhân nộp RD-2026-101 → 201 Submitted', r.status === 201 && r.data.status === 'Submitted', r);
  const pCaNhan = r.data.id;
  tepTam.delete(tep1);
  r = await nop('RD-2026-101', { uploadId: tep1 });
  kiem('nộp lần 2 → 409 ALREADY_APPLIED', ma(r, 409, 'ALREADY_APPLIED'), r);
  const tep2 = (await taiTep()).data.uploadId;
  r = await nop('RD-2026-084', { partnerType: 'Team', teamId: 9821, uploadId: tep2 });
  kiem('nhóm 9821 (trưởng nhóm SV A) nộp RD-2026-084 của V-Tech → 201', r.status === 201, r);
  const pNhom = r.data.id;
  tepTam.delete(tep2);

  r = await goi('GET', `${SV}/RD-2026-101`);
  kiem('chi tiết hiện proposal của tôi, rút được', r.data.myProposal?.id === pCaNhan && r.data.myProposal.canWithdraw === true, r.data.myProposal);
  const tepP = r.data.myProposal?.attachments?.[0];
  kiem('proposal có tệp đính kèm', !!tepP, r.data.myProposal);
  if (tepP) {
    r = await goi('GET', `${SV}/RD-2026-101/proposals/${pCaNhan}/attachments/${tepP.id}`);
    kiem('lấy liên kết tải tệp proposal → 200', r.status === 200 && /^https?:/.test(r.data.url), r);
  }

  console.log('6. Liên kết với Hộp thư DN (DN-08)');
  r = await goi('GET', `${BASE}/business-inbox`);
  const trongHopThu = (r.data.requests ?? []).find((x) => x.id === pNhom);
  kiem('DN V-Tech thấy proposal của nhóm SV trong hộp thư', !!trongHopThu && trongHopThu.status === 'Submitted', r.status);
  r = await goi('POST', `${BASE}/business-inbox/${pNhom}/decline`, { json: { reason: 'Kiểm thử tự động' } });
  kiem('DN từ chối → 200', r.status === 200, r);
  r = await goi('GET', `${SV}/RD-2026-084`);
  kiem('SV thấy trạng thái Declined + lý do', r.data.myProposal?.status === 'Declined' && r.data.myProposal.declineReason === 'Kiểm thử tự động', r.data.myProposal);
  r = await goi('POST', `${SV}/RD-2026-084/proposals/${pNhom}/withdraw`);
  kiem('rút proposal DN đã phản hồi → 409 INVALID_STATE', ma(r, 409, 'INVALID_STATE'), r);

  console.log('7. Rút proposal');
  r = await goi('POST', `${SV}/RD-2026-101/proposals/9901/withdraw`);
  kiem('rút proposal không phải của mình → 404', ma(r, 404, 'REQUEST_NOT_FOUND'), r);
  r = await goi('POST', `${SV}/RD-2026-101/proposals/${pCaNhan}/withdraw`);
  kiem('rút proposal đang chờ → 200 Cancelled', r.status === 200 && r.data.status === 'Cancelled', r);
  r = await goi('GET', `${BASE}/business-inbox`);
  kiem('proposal đã rút không còn trong hộp thư DN', !(r.data.requests ?? []).some((x) => x.id === pCaNhan));
  r = await goi('GET', `${SV}/RD-2026-101`);
  kiem('sau khi rút, SV nộp lại được (không còn proposal hiệu lực)', r.data.myProposal === null, r.data.myProposal);
}

async function donDep() {
  const ids = [...proposalTao];
  if (ids.length) {
    const { data: tep } = await supabase.from('rd_attachment').select('attachment_id, storage_path').eq('owner_type', 'Request').in('owner_id', ids);
    if (tep?.length) {
      await supabase.storage.from('rd-files').remove(tep.map((t) => t.storage_path));
      await supabase.from('rd_attachment').delete().in('attachment_id', tep.map((t) => t.attachment_id));
    }
    await supabase.from('connection_request').delete().in('request_id', ids);
  }
  for (const id of tepTam) {
    const thuMuc = `proposal-uploads/${config.testStudentId}/${id}`;
    const { data } = await supabase.storage.from('rd-files').list(thuMuc);
    if (data?.length) await supabase.storage.from('rd-files').remove(data.map((t) => `${thuMuc}/${t.name}`));
  }
  if (baiDaLuu.size) await supabase.from('saved_opportunity').delete().eq('account_id', config.testStudentId).in('problem_id', [...baiDaLuu]);
  console.log(`\nĐã dọn: ${ids.length} proposal, ${tepTam.size} tệp tạm, bài đã lưu do kiểm thử tạo.`);
}

try {
  await chay();
} catch (err) {
  truot++;
  console.error('\nLỗi khi chạy kiểm thử:', err.message);
} finally {
  await donDep();
  console.log(`Kết quả: ${dat} đạt, ${truot} trượt.`);
  process.exit(truot ? 1 : 0);
}
