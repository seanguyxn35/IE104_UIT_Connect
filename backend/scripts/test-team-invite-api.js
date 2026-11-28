// Kiểm thử API lời mời vào nhóm (SV-06): /api/student-teams/:teamId/invitations, /api/student-invitations.
// Điều kiện: đã chạy migrations/012_sv_loi_moi_vao_nhom.sql, seed.sql, seed_dn.sql, seed_auth.sql; máy chủ MỚI KHỞI ĐỘNG
// (giới hạn tra cứu đếm trong bộ nhớ máy chủ). Chạy: cd backend && npm run test:team-invite
// Ca 401 chỉ kiểm khi máy chủ và script cùng đặt AUTH_MODE=session.
// Script tạo nhóm tạm 9470 (kèm tin tuyển 9470, đơn 9470–9472) rồi tự xóa cùng lời mời và thông báo đã tạo.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const TEAMS = `${BASE}/student-teams`;
const MINE = `${BASE}/student-invitations`;
const MARK = '[TEST-AUTO]';
const MK = 'MatKhau@123';
const TEAM = 9470;
const INVITE = `${TEAMS}/${TEAM}/invitations`;
const LOOKUP = `${TEAMS}/${TEAM}/invite-lookup`;
const DAY = 24 * 60 * 60 * 1000;
const NGUOI_THU = [9102, 9103, 9104, 9601, 9602, 9603, 9604, 9605, 9606, 9607, 9608, 9609, 9610, 9611, 9612, 9613, 9614, 9615, 9616, 9617];
let dat = 0;
let truot = 0;
const phien = [];
const ma = new Map(); // accountId -> MSSV

function kiem(ten, dieuKien, chiTiet) {
  if (dieuKien) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet !== undefined ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}
const la = (r, status, code) => r.status === status && (!code || r.data?.code === code);

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

async function goi(method, url, { cookie, json } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') ?? '' };
}

async function dangNhap(accountId, portal = 'uit') {
  const { email } = ok(await supabase.from('account').select('email').eq('account_id', accountId).single());
  const r = await goi('POST', `${BASE}/auth/login`, { json: { email, password: MK, portal } });
  if (r.status !== 200) throw new Error(`Không đăng nhập được tài khoản ${accountId}: ${r.status} ${r.data.code} (đã chạy seed_auth.sql?)`);
  const cookie = r.setCookie.split(';')[0];
  phien.push(cookie);
  return cookie;
}

async function donDuLieu() {
  const team = ok(await supabase.from('student_team').select('team_name').eq('team_id', TEAM).maybeSingle());
  if (team && !team.team_name.startsWith(MARK)) throw new Error(`Nhóm ${TEAM} không phải dữ liệu của script này, dừng lại.`);
  // Xóa nhóm kéo theo thành viên, lời mời, tin tuyển và đơn
  ok(await supabase.from('student_team').delete().eq('team_id', TEAM).like('team_name', `${MARK}%`));
  ok(await supabase.from('notification').delete().eq('category', 'Team').in('account_id', [9101, ...NGUOI_THU]).like('content', `%${MARK}%`));
}

const moi = (cookie, sv, them) => goi('POST', INVITE, { cookie, json: { student: ma.get(sv), ...them } });
const tra = (cookie, student) => goi('GET', `${LOOKUP}?student=${encodeURIComponent(student)}`, { cookie });
const docMoi = async (id) => ok(await supabase.from('team_invitation').select('status, message, response_note, responded_at, student_id').eq('invitation_id', id).single());
const thanhVien = async () => ok(await supabase.from('team_member').select('student_id, role_in_team').eq('team_id', TEAM));
const thongBao = async (sv) => ok(await supabase.from('notification').select('title, content').eq('account_id', sv).like('content', `%${MARK}%`));
const luiNgay = (id, cot, ngay) => supabase.from('team_invitation').update({ [cot]: new Date(Date.now() - ngay * DAY).toISOString() }).eq('invitation_id', id).then(ok);
const dsCuaToi = async (cookie) => (await goi('GET', MINE, { cookie })).data.invitations ?? [];
const loiMoiNhom = async (cookie) => (await goi('GET', INVITE, { cookie })).data.invitations ?? [];

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);
  await donDuLieu();
  for (const s of ok(await supabase.from('student_profile').select('student_id, student_code').in('student_id', [9101, ...NGUOI_THU]))) ma.set(s.student_id, s.student_code);
  ok(await supabase.from('student_team').insert({ team_id: TEAM, team_name: `${MARK} Nhóm kiểm thử lời mời`, max_members: 20 }));
  ok(await supabase.from('team_member').insert([
    { team_id: TEAM, student_id: 9101, role_in_team: 'Leader' },
    { team_id: TEAM, student_id: 9102, role_in_team: 'Member' },
  ]));

  const leader = await dangNhap(9101);
  const member = await dangNhap(9102);
  const [a, b, c] = [await dangNhap(9606), await dangNhap(9607), await dangNhap(9608)];
  const dn = await dangNhap(9501, 'business');

  console.log('1. Xác thực và phân quyền');
  if (config.authMode === 'session') {
    kiem('chưa đăng nhập: gửi lời mời → 401', la(await goi('POST', INVITE, { json: { student: ma.get(9606) } }), 401, 'UNAUTHENTICATED'));
    kiem('chưa đăng nhập: xem lời mời của tôi → 401', la(await goi('GET', MINE), 401, 'UNAUTHENTICATED'));
  } else {
    console.log('  (bỏ qua ca 401: cần AUTH_MODE=session)');
  }
  kiem('tài khoản DN → 403', la(await goi('GET', MINE, { cookie: dn }), 403, 'FORBIDDEN_ROLE') && la(await moi(dn, 9606), 403, 'FORBIDDEN_ROLE'));
  kiem('người ngoài nhóm: tra cứu → 404', la(await tra(a, ma.get(9607)), 404, 'TEAM_NOT_FOUND'));
  kiem('người ngoài nhóm: gửi → 404', la(await moi(a, 9607), 404, 'TEAM_NOT_FOUND'));
  kiem('Member: tra cứu → 403', la(await tra(member, ma.get(9606)), 403, 'NOT_TEAM_LEADER'));
  kiem('Member: gửi → 403', la(await moi(member, 9606), 403, 'NOT_TEAM_LEADER'));
  kiem('Member: xem lời mời của nhóm → 403', la(await goi('GET', INVITE, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  kiem('Member không tạo được lời mời nào', ok(await supabase.from('team_invitation').select('invitation_id').eq('team_id', TEAM)).length === 0);

  console.log('2. Tra cứu sinh viên');
  let r = await tra(leader, ma.get(9606));
  kiem('tra bằng MSSV: chỉ tên, MSSV, ngành', r.status === 200 && r.data.canInvite === true && Object.keys(r.data.student).sort().join() === 'fullName,major,studentCode' && r.data.student.studentCode === ma.get(9606), r.data);
  kiem('không lộ GPA, email, mã tài khoản', !/gpa|email|studentId|student_id|9606/i.test(JSON.stringify(r.data)), r.data);
  r = await tra(leader, `  ${ma.get(9606)}@GM.UIT.EDU.VN `);
  kiem('tra bằng email (khác hoa thường, thừa khoảng trắng)', r.status === 200 && r.data.student.studentCode === ma.get(9606), r.data);
  for (const [ten, q] of [['rỗng', ''], ['tên người', 'Nguyễn Văn A'], ['MSSV thiếu số', '2352'], ['email ngoài UIT', 'abc@gmail.com'], ['ký tự đại diện', '%@gm.uit.edu.vn%']]) {
    kiem(`tra ${ten} → 400`, la(await tra(leader, q), 400, 'INVALID_INPUT'));
  }
  kiem('MSSV không có → 404', la(await tra(leader, '99999999'), 404, 'STUDENT_NOT_FOUND'));
  kiem('tài khoản bị khóa (9104) → như không có', la(await tra(leader, ma.get(9104)), 404, 'STUDENT_NOT_FOUND'));
  kiem('tài khoản chưa xác thực email (9103) → như không có', la(await tra(leader, ma.get(9103)), 404, 'STUDENT_NOT_FOUND'));
  kiem('mời tài khoản bị khóa → 404', la(await moi(leader, 9104), 404, 'STUDENT_NOT_FOUND'));
  r = await tra(leader, ma.get(9102));
  kiem('đã là thành viên → tra cứu báo không mời được', r.status === 200 && r.data.canInvite === false && r.data.blockedReason === 'ALREADY_MEMBER', r.data);
  kiem('tự mời mình → 409 ALREADY_MEMBER', la(await moi(leader, 9101), 409, 'ALREADY_MEMBER'));

  console.log('3. Gửi lời mời');
  kiem('thiếu người được mời → 400', la(await goi('POST', INVITE, { cookie: leader, json: {} }), 400, 'INVALID_INPUT'));
  kiem('gửi bằng studentId bị bỏ qua → 400', la(await goi('POST', INVITE, { cookie: leader, json: { studentId: 9606 } }), 400, 'INVALID_INPUT'));
  kiem('lời nhắn 501 ký tự → 400', la(await moi(leader, 9606, { message: 'a'.repeat(501) }), 400, 'INVALID_INPUT'));
  kiem('lời nhắn không phải chuỗi → 400', la(await moi(leader, 9606, { message: 5 }), 400, 'INVALID_INPUT'));
  r = await moi(leader, 9606, { message: '  Mời bạn vào nhóm  ' });
  const idA = r.data.invitationId;
  kiem('gửi → 201', r.status === 201 && Number.isInteger(idA), r.data);
  let m = await docMoi(idA);
  kiem('lưu Pending, lời nhắn đã cắt khoảng trắng', m.status === 'Pending' && m.message === 'Mời bạn vào nhóm' && m.student_id === 9606, m);
  kiem('chưa đồng ý thì chưa là thành viên', (await thanhVien()).length === 2);
  kiem('người được mời nhận thông báo', (await thongBao(9606)).length === 1);
  kiem('mời lại khi đang chờ → 409 ALREADY_INVITED', la(await moi(leader, 9606), 409, 'ALREADY_INVITED'));
  kiem('tra cứu cũng báo ALREADY_INVITED', (await tra(leader, ma.get(9606))).data.blockedReason === 'ALREADY_INVITED');
  const hai = await Promise.all([moi(leader, 9607), moi(leader, 9607)]);
  kiem('hai lần gửi cùng lúc → một 201, một 409', hai.map((x) => x.status).sort().join() === '201,409', hai.map((x) => x.data));
  const idB = hai.find((x) => x.status === 201).data.invitationId;
  r = await goi('GET', INVITE, { cookie: leader });
  const cuaA = r.data.invitations?.find((i) => i.invitationId === idA);
  kiem('Leader xem 2 lời mời chờ, có hạn 7 ngày', r.data.maxPending === 10 && r.data.invitations.length === 2 && Math.abs(Date.parse(cuaA.expiresAt) - Date.parse(cuaA.createdAt) - 7 * DAY) < 1000 && !!cuaA.invitedBy, r.data);

  console.log('4. Phía người được mời');
  let ds = await dsCuaToi(a);
  const cuaToi = ds.find((i) => i.invitationId === idA);
  kiem('thấy lời mời của mình kèm thông tin nhóm', cuaToi?.team.teamId === TEAM && cuaToi.team.memberCount === 2 && cuaToi.message === 'Mời bạn vào nhóm' && cuaToi.canAccept === true && !!cuaToi.invitedBy, cuaToi);
  kiem('không thấy lời mời của người khác', ds.every((i) => i.invitationId !== idB));
  kiem('người khác đồng ý hộ → 404', la(await goi('POST', `${MINE}/${idA}/accept`, { cookie: b }), 404, 'INVITATION_NOT_FOUND'));
  kiem('Leader đồng ý hộ → 404', la(await goi('POST', `${MINE}/${idA}/accept`, { cookie: leader }), 404, 'INVITATION_NOT_FOUND'));
  kiem('mã lời mời sai → 400', la(await goi('POST', `${MINE}/abc/accept`, { cookie: a }), 400, 'INVALID_INPUT'));
  kiem('lý do từ chối 501 ký tự → 400', la(await goi('POST', `${MINE}/${idA}/decline`, { cookie: a, json: { reason: 'a'.repeat(501) } }), 400, 'INVALID_INPUT'));

  console.log('5. Từ chối và mời lại');
  r = await goi('POST', `${MINE}/${idA}/decline`, { cookie: a, json: { reason: 'Đang bận đồ án.' } });
  m = await docMoi(idA);
  kiem('từ chối có lý do → 200', r.status === 200 && m.status === 'Declined' && m.response_note === 'Đang bận đồ án.' && !!m.responded_at, m);
  kiem('Leader nhận thông báo kèm lý do', (await thongBao(9101)).some((t) => t.content.includes('Đang bận đồ án.')));
  kiem('từ chối lần hai → 409', la(await goi('POST', `${MINE}/${idA}/decline`, { cookie: a }), 409, 'INVITATION_NOT_PENDING'));
  kiem('đã từ chối thì không đồng ý lại được', la(await goi('POST', `${MINE}/${idA}/accept`, { cookie: a }), 409, 'INVITATION_NOT_PENDING'));
  r = await moi(leader, 9606);
  kiem('mời lại ngay → 409 DECLINED_RECENTLY, có ngày mời lại', la(r, 409, 'DECLINED_RECENTLY') && /\d{2}\/\d{2}\/\d{4}/.test(r.data.message), r.data);
  await luiNgay(idA, 'responded_at', 8);
  r = await moi(leader, 9606);
  const idA2 = r.data.invitationId;
  kiem('sau 7 ngày mời lại được', r.status === 201, r.data);
  r = await goi('POST', `${MINE}/${idA2}/decline`, { cookie: a });
  kiem('từ chối không cần lý do → 200', r.status === 200 && (await docMoi(idA2)).response_note === null, r.data);

  console.log('6. Thu hồi');
  kiem('Member thu hồi → 403', la(await goi('POST', `${INVITE}/${idB}/cancel`, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  kiem('lời mời không thuộc nhóm → 404', la(await goi('POST', `${INVITE}/999999/cancel`, { cookie: leader }), 404, 'INVITATION_NOT_FOUND'));
  r = await goi('POST', `${INVITE}/${idB}/cancel`, { cookie: leader });
  kiem('thu hồi → 200 Cancelled', r.status === 200 && (await docMoi(idB)).status === 'Cancelled', r.data);
  kiem('thu hồi lần hai → 409', la(await goi('POST', `${INVITE}/${idB}/cancel`, { cookie: leader }), 409, 'INVITATION_NOT_PENDING'));
  r = await goi('POST', `${MINE}/${idB}/accept`, { cookie: b });
  kiem('đồng ý lời mời đã thu hồi → 409, báo đã thu hồi', la(r, 409, 'INVITATION_NOT_PENDING') && r.data.message.includes('thu hồi'), r.data);
  r = await moi(leader, 9607);
  const idB2 = r.data.invitationId;
  kiem('đã thu hồi thì mời lại ngay được', r.status === 201, r.data);

  console.log('7. Hết hạn');
  await luiNgay(idB2, 'created_at', 8);
  kiem('quá 7 ngày: không còn trong danh sách của hai phía', !(await dsCuaToi(b)).some((i) => i.invitationId === idB2) && !(await loiMoiNhom(leader)).some((i) => i.invitationId === idB2));
  kiem('đồng ý lời mời hết hạn → 409 INVITATION_EXPIRED', la(await goi('POST', `${MINE}/${idB2}/accept`, { cookie: b }), 409, 'INVITATION_EXPIRED'));
  kiem('được ghi nhận Expired, không thêm thành viên', (await docMoi(idB2)).status === 'Expired' && (await thanhVien()).length === 2);
  r = await moi(leader, 9607);
  const idB3 = r.data.invitationId;
  await luiNgay(idB3, 'created_at', 8);
  r = await moi(leader, 9607);
  const idB4 = r.data.invitationId;
  kiem('lời mời hết hạn chưa ai đụng tới không chặn lời mời mới', r.status === 201 && (await docMoi(idB3)).status === 'Expired', r.data);

  console.log('8. Đồng ý');
  ok(await supabase.from('team_recruitment').insert({ recruit_id: 9470, team_id: TEAM, title: `${MARK} Tin`, slots: 3 }));
  ok(await supabase.from('recruitment_application').insert({ apply_id: 9470, recruit_id: 9470, student_id: 9607 }));
  r = await goi('POST', `${MINE}/${idB4}/accept`, { cookie: b });
  kiem('đồng ý → 200, 3 thành viên', r.status === 200 && r.data.teamId === TEAM && r.data.memberCount === 3 && r.data.withdrawnApplications === 1, r.data);
  kiem('thành viên mới có vai trò Member', (await thanhVien()).find((t) => t.student_id === 9607)?.role_in_team === 'Member');
  kiem('lời mời chuyển Accepted', (await docMoi(idB4)).status === 'Accepted');
  const don = ok(await supabase.from('recruitment_application').select('status').eq('apply_id', 9470).single());
  kiem('đơn xin vào chính nhóm này chuyển Withdrawn', don.status === 'Withdrawn', don);
  kiem('Leader nhận thông báo đã tham gia', (await thongBao(9101)).some((t) => t.content.includes('đã tham gia')));
  kiem('đồng ý lần hai → 409', la(await goi('POST', `${MINE}/${idB4}/accept`, { cookie: b }), 409, 'INVITATION_NOT_PENDING'));
  kiem('thành viên mới thấy nhóm trong danh sách', (await goi('GET', TEAMS, { cookie: b })).data.teams.some((t) => t.teamId === TEAM && t.role === 'Member'));

  console.log('9. Đơn xin vào nhóm và đếm huy hiệu');
  const dem = async (cookie) => (await goi('GET', `${TEAMS}/pending-count`, { cookie })).data;
  const gocC = await dem(c);
  r = await moi(leader, 9608);
  const idC = r.data.invitationId;
  const sauC = await dem(c);
  kiem('người được mời: huy hiệu tăng 1 lời mời', sauC.invitations === gocC.invitations + 1 && sauC.pending === sauC.applications + sauC.invitations, { gocC, sauC });
  ok(await supabase.from('recruitment_application').insert({ apply_id: 9471, recruit_id: 9470, student_id: 9608 }));
  r = await goi('POST', `${TEAMS}/${TEAM}/applications/9471/accept`, { cookie: leader });
  kiem('duyệt đơn của người đang được mời → lời mời tự hủy', r.status === 200 && (await docMoi(idC)).status === 'Cancelled', r.data);
  kiem('huy hiệu lời mời giảm lại', (await dem(c)).invitations === gocC.invitations);
  ok(await supabase.from('recruitment_application').insert({ apply_id: 9472, recruit_id: 9470, student_id: 9609 }));
  kiem('người đã nộp đơn đang chờ → 409 HAS_PENDING_APPLICATION', la(await moi(leader, 9609), 409, 'HAS_PENDING_APPLICATION'));

  console.log('10. Giới hạn số lời mời, sức chứa và đồng thời');
  for (const x of await loiMoiNhom(leader)) await goi('POST', `${INVITE}/${x.invitationId}/cancel`, { cookie: leader });
  const muoi = [9601, 9602, 9603, 9604, 9605, 9610, 9611, 9612, 9613, 9614];
  const ketQua = [];
  for (const sv of muoi) ketQua.push((await moi(leader, sv)).status);
  kiem('gửi được 10 lời mời đang chờ', ketQua.every((s) => s === 201), ketQua);
  kiem('lời mời thứ 11 → 409 INVITE_LIMIT', la(await moi(leader, 9615), 409, 'INVITE_LIMIT'));
  for (const x of await loiMoiNhom(leader)) await goi('POST', `${INVITE}/${x.invitationId}/cancel`, { cookie: leader });

  const soHienTai = (await thanhVien()).length;
  const idX = (await moi(leader, 9615)).data.invitationId;
  const idY = (await moi(leader, 9616)).data.invitationId;
  ok(await supabase.from('student_team').update({ max_members: soHienTai + 1 }).eq('team_id', TEAM));
  const [x, y] = [await dangNhap(9615), await dangNhap(9616)];
  const dua = await Promise.all([goi('POST', `${MINE}/${idX}/accept`, { cookie: x }), goi('POST', `${MINE}/${idY}/accept`, { cookie: y })]);
  kiem('còn 1 chỗ, 2 người đồng ý cùng lúc → đúng một người vào', dua.map((d) => d.status).sort().join() === '200,409' && dua.some((d) => d.data.code === 'TEAM_FULL'), dua.map((d) => d.data));
  kiem('số thành viên không vượt tối đa', (await thanhVien()).length === soHienTai + 1);
  const [idThua, cookieThua] = dua[0].status === 200 ? [idY, y] : [idX, x];
  const dsThua = await dsCuaToi(cookieThua);
  kiem('người còn lại: lời mời vẫn đó nhưng không đồng ý được', dsThua.find((i) => i.invitationId === idThua)?.acceptBlockedReason === 'TEAM_FULL', dsThua);
  kiem('nhóm đủ người: gửi thêm → 409 TEAM_FULL', la(await moi(leader, 9617), 409, 'TEAM_FULL'));

  console.log('11. Nhóm ngừng hoạt động và đổi Leader');
  ok(await supabase.from('student_team').update({ max_members: 20, status: 'Inactive' }).eq('team_id', TEAM));
  kiem('gửi → 409 TEAM_INACTIVE', la(await moi(leader, 9617), 409, 'TEAM_INACTIVE'));
  kiem('đồng ý → 409 TEAM_INACTIVE', la(await goi('POST', `${MINE}/${idThua}/accept`, { cookie: cookieThua }), 409, 'TEAM_INACTIVE'));
  ok(await supabase.from('student_team').update({ status: 'Active' }).eq('team_id', TEAM));
  ok(await supabase.from('team_member').update({ role_in_team: 'Member' }).eq('team_id', TEAM).eq('student_id', 9101));
  ok(await supabase.from('team_member').update({ role_in_team: 'Leader' }).eq('team_id', TEAM).eq('student_id', 9102));
  kiem('Leader cũ không thu hồi được nữa', la(await goi('POST', `${INVITE}/${idThua}/cancel`, { cookie: leader }), 403, 'NOT_TEAM_LEADER'));
  kiem('Leader mới thu hồi được lời mời của Leader cũ', la(await goi('POST', `${INVITE}/${idThua}/cancel`, { cookie: member }), 200));

  console.log('12. Giới hạn tra cứu');
  let biChan = null;
  for (let i = 0; i < 35 && !biChan; i++) {
    const kq = await tra(member, String(80000000 + i));
    if (kq.status === 429) biChan = i;
  }
  kiem('dò nhiều MSSV khác nhau → 429 sau 30 người', biChan === 30, biChan);
  kiem('tra lại người đã tra không tính thêm lượt', la(await tra(member, '80000000'), 404, 'STUDENT_NOT_FOUND'));
  kiem('gửi cho người mới cũng bị chặn', la(await goi('POST', INVITE, { cookie: member, json: { student: '81111111' } }), 429, 'TOO_MANY_ATTEMPTS'));
}

async function donCuoi() {
  for (const cookie of phien) await goi('POST', `${BASE}/auth/logout`, { cookie }).catch(() => {});
  await donDuLieu();
}

try {
  await chay();
} catch (err) {
  truot++;
  console.error('Lỗi khi chạy:', err.message ?? err);
} finally {
  await donCuoi();
  console.log(`\n${dat} đạt, ${truot} trượt. Đã dọn dữ liệu thử.`);
  process.exitCode = truot ? 1 : 0;
}
