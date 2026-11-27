// Kiểm thử API các tab "Thành viên", "Tin tuyển quân", "Portfolio & Thành tích" (SV-06).
// Điều kiện: đã chạy migrations/009, 012, 013, seed.sql, seed_dn.sql, seed_auth.sql; máy chủ đang chạy.
// Chạy: cd backend && npm run test:team-manage. Ca 401 chỉ kiểm khi máy chủ và script cùng đặt AUTH_MODE=session.
// Script tạo nhóm tạm 9460 (tài nguyên 9460, đơn 9460–9463) rồi tự xóa cùng tin tuyển, thành tích, thông báo
// và kỹ năng thử đã tạo.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const TEAMS = `${BASE}/student-teams`;
const MARK = '[TEST-AUTO]';
const MK = 'MatKhau@123';
const TEAM = 9460;
const RESOURCE = 9460;
const T = `${TEAMS}/${TEAM}`;
const SV = [9101, 9102, 9606, 9607, 9608];
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
  const res = ok(await supabase.from('academic_resource').select('title').eq('resource_id', RESOURCE).maybeSingle());
  if (res && !res.title.startsWith(MARK)) throw new Error(`Tài nguyên ${RESOURCE} không phải dữ liệu của script này, dừng lại.`);
  if (team) {
    // Tin tuyển trỏ tới tài nguyên thử: xóa trước (đơn, kỹ năng của tin xóa theo)
    ok(await supabase.from('team_recruitment').delete().eq('team_id', TEAM));
  }
  ok(await supabase.from('academic_resource').delete().eq('resource_id', RESOURCE).like('title', `${MARK}%`));
  // Xóa nhóm kéo theo thành viên, thành tích, lời mời
  ok(await supabase.from('student_team').delete().eq('team_id', TEAM).like('team_name', `${MARK}%`));
  ok(await supabase.from('notification').delete().eq('category', 'Team').in('account_id', SV).like('content', `%${MARK}%`));
  ok(await supabase.from('skill').delete().like('name', `${MARK}%`));
}

const thanhVien = async () => ok(await supabase.from('team_member').select('student_id, role_in_team, position_title, contribution').eq('team_id', TEAM));
const vaiTro = async (sv) => (await thanhVien()).find((m) => m.student_id === sv)?.role_in_team ?? null;
const thongBao = async (sv) => ok(await supabase.from('notification').select('title, content').eq('account_id', sv).like('content', `%${MARK}%`));
const tin = (cookie, json) => goi('POST', `${T}/recruitments`, { cookie, json });
const suaTin = (cookie, id, json) => goi('PATCH', `${T}/recruitments/${id}`, { cookie, json });
const thanhTich = (cookie, json) => goi('POST', `${T}/achievements`, { cookie, json });

function ngay(offset) {
  const d = new Date(Date.now() + 7 * 3600000);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);
  await donDuLieu();
  for (const s of ok(await supabase.from('student_profile').select('student_id, student_code').in('student_id', SV))) ma.set(s.student_id, s.student_code);
  ok(await supabase.from('student_team').insert({ team_id: TEAM, team_name: `${MARK} Nhóm kiểm thử quản trị`, max_members: 10, semester: 'HK1 2026-2027' }));
  ok(await supabase.from('team_member').insert([
    { team_id: TEAM, student_id: 9101, role_in_team: 'Leader', joined_at: '2026-01-01' },
    { team_id: TEAM, student_id: 9102, role_in_team: 'Member', joined_at: '2026-02-01' },
    { team_id: TEAM, student_id: 9606, role_in_team: 'Member', joined_at: '2026-03-01' },
    { team_id: TEAM, student_id: 9607, role_in_team: 'Member', joined_at: '2026-04-01' },
  ]));
  ok(await supabase.from('academic_resource').insert({ resource_id: RESOURCE, owner_team_id: TEAM, created_by_account_id: 9101, type: 'Project', title: `${MARK} Đề tài nháp`, status: 'Draft', trl_level: 4 }));

  const leader = await dangNhap(9101);
  const member = await dangNhap(9102);
  const c = await dangNhap(9606);
  const d = await dangNhap(9607);
  const ngoai = await dangNhap(9608);
  const dn = await dangNhap(9501, 'business');

  console.log('1. Xác thực và phân quyền');
  if (config.authMode === 'session') {
    kiem('chưa đăng nhập → 401', la(await goi('GET', `${T}/members`), 401, 'UNAUTHENTICATED'));
  } else {
    console.log('  (bỏ qua ca 401: cần AUTH_MODE=session)');
  }
  kiem('tài khoản DN → 403', la(await goi('GET', `${T}/members`, { cookie: dn }), 403, 'FORBIDDEN_ROLE'));
  for (const path of ['members', 'recruitments', 'portfolio']) {
    kiem(`người ngoài nhóm xem ${path} → 404`, la(await goi('GET', `${T}/${path}`, { cookie: ngoai }), 404, 'TEAM_NOT_FOUND'));
  }
  kiem('mã nhóm sai → 400', la(await goi('GET', `${TEAMS}/abc/members`, { cookie: leader }), 400, 'INVALID_INPUT'));

  console.log('2. Danh sách thành viên');
  let r = await goi('GET', `${T}/members`, { cookie: leader });
  const ds = r.data.members ?? [];
  kiem('Leader thấy 4 người, Leader đứng đầu', r.status === 200 && ds.length === 4 && ds[0].role === 'Leader' && ds[0].isMe, r.data);
  kiem('có MSSV, email, ngành, ngày vào', ds.every((m) => m.studentCode && m.email && m.joinedAt), ds[1]);
  kiem('không trả mã tài khoản / GPA', !/studentId|student_id|accountId|gpa/i.test(JSON.stringify(r.data)));
  kiem('Leader: quyền quản lý, không tự rời', r.data.viewer.canManage === true && r.data.viewer.canLeave === false && ds[1].canRemove && ds[1].canMakeLeader && !ds[0].canRemove);
  r = await goi('GET', `${T}/members`, { cookie: member });
  kiem('Member: không quản lý, được rời, chỉ sửa đóng góp của mình', r.data.viewer.canManage === false && r.data.viewer.canLeave === true
    && r.data.members.every((m) => !m.canRemove && !m.canEditTitle && m.canEditContribution === m.isMe), r.data);

  console.log('3. Sửa chức danh và đóng góp');
  const sua = (cookie, sv, json) => goi('PATCH', `${T}/members/${ma.get(sv)}`, { cookie, json });
  r = await sua(member, 9102, { contribution: '  Gán   nhãn dữ liệu  ' });
  kiem('Member sửa đóng góp của mình → 200, gộp khoảng trắng', r.status === 200 && r.data.contribution === 'Gán nhãn dữ liệu', r.data);
  kiem('Member sửa chức danh của mình → 403', la(await sua(member, 9102, { positionTitle: 'Trưởng kỹ thuật' }), 403, 'NOT_TEAM_LEADER'));
  kiem('Member sửa đóng góp người khác → 403', la(await sua(member, 9606, { contribution: 'abc' }), 403, 'NOT_TEAM_LEADER'));
  r = await sua(leader, 9606, { positionTitle: 'Kỹ sư AI (ML Engineer)', contribution: 'Huấn luyện mô hình' });
  kiem('Leader sửa chức danh + đóng góp người khác → 200', r.status === 200 && (await thanhVien()).find((m) => m.student_id === 9606).position_title === 'Kỹ sư AI (ML Engineer)', r.data);
  r = await sua(leader, 9606, { contribution: null });
  kiem('gửi null → xóa đóng góp', r.status === 200 && r.data.contribution === null, r.data);
  kiem('chức danh 101 ký tự → 400', la(await sua(leader, 9606, { positionTitle: 'a'.repeat(101) }), 400, 'INVALID_INPUT'));
  kiem('đóng góp không phải chuỗi → 400', la(await sua(leader, 9606, { contribution: 5 }), 400, 'INVALID_INPUT'));
  kiem('thân rỗng → 400', la(await sua(leader, 9606, {}), 400, 'INVALID_INPUT'));
  kiem('MSSV sai định dạng → 400', la(await goi('PATCH', `${T}/members/96060`, { cookie: leader, json: { contribution: 'x' } }), 400, 'INVALID_INPUT'));
  kiem('MSSV không thuộc nhóm → 404', la(await sua(leader, 9608, { contribution: 'x' }), 404, 'MEMBER_NOT_FOUND'));

  console.log('4. Chuyển quyền Leader');
  const chuyen = (cookie, sv) => goi('POST', `${T}/transfer-leader`, { cookie, json: { student: ma.get(sv) } });
  kiem('Member chuyển quyền → 403', la(await chuyen(member, 9606), 403, 'NOT_TEAM_LEADER'));
  kiem('chuyển cho chính mình → 409', la(await chuyen(leader, 9101), 409, 'ALREADY_LEADER'));
  kiem('chuyển cho người ngoài nhóm → 404', la(await chuyen(leader, 9608), 404, 'MEMBER_NOT_FOUND'));
  kiem('gửi studentId thay MSSV → 400', la(await goi('POST', `${T}/transfer-leader`, { cookie: leader, json: { studentId: 9102 } }), 400, 'INVALID_INPUT'));
  r = await chuyen(leader, 9102);
  kiem('chuyển quyền → 200, đổi vai trò hai người', r.status === 200 && await vaiTro(9102) === 'Leader' && await vaiTro(9101) === 'Member', r.data);
  kiem('luôn đúng một Leader', (await thanhVien()).filter((m) => m.role_in_team === 'Leader').length === 1);
  kiem('Leader mới nhận thông báo', (await thongBao(9102)).some((t) => t.title.includes('trưởng nhóm')));
  kiem('Leader cũ mất quyền', la(await chuyen(leader, 9606), 403, 'NOT_TEAM_LEADER'));
  const hai = await supabase.from('team_member').update({ role_in_team: 'Leader' }).eq('team_id', TEAM).eq('student_id', 9606);
  kiem('CSDL chặn hai Leader cùng lúc', hai.error?.code === '23505', hai.error ?? hai.data);
  r = await chuyen(member, 9101);
  kiem('chuyển lại cho Leader cũ → 200', r.status === 200 && await vaiTro(9101) === 'Leader', r.data);

  console.log('5. Mời ra khỏi nhóm');
  const moiRa = (cookie, sv, reason) => goi('POST', `${T}/members/${ma.get(sv)}/remove`, { cookie, json: { reason } });
  kiem('Member mời người khác ra → 403', la(await moiRa(member, 9607, 'Không tham gia họp nhóm'), 403, 'NOT_TEAM_LEADER'));
  kiem('lý do dưới 10 ký tự → 400', la(await moiRa(leader, 9607, 'ngắn'), 400, 'INVALID_INPUT'));
  kiem('thiếu lý do → 400', la(await goi('POST', `${T}/members/${ma.get(9607)}/remove`, { cookie: leader, json: {} }), 400, 'INVALID_INPUT'));
  kiem('tự mời mình ra → 409', la(await moiRa(leader, 9101, 'Lý do đủ dài để kiểm thử'), 409, 'CANNOT_REMOVE_SELF'));
  r = await moiRa(leader, 9607, 'Không tham gia họp nhóm 4 tuần liền');
  kiem('mời ra → 200, còn 3 người', r.status === 200 && r.data.memberCount === 3 && await vaiTro(9607) === null, r.data);
  kiem('người bị mời ra nhận thông báo kèm lý do', (await thongBao(9607)).some((t) => t.content.includes('Không tham gia họp nhóm 4 tuần liền')));
  kiem('người bị mời ra không xem được nhóm nữa', la(await goi('GET', `${T}/members`, { cookie: d }), 404, 'TEAM_NOT_FOUND'));
  kiem('mời ra lần hai → 404', la(await moiRa(leader, 9607, 'Không tham gia họp nhóm 4 tuần liền'), 404, 'MEMBER_NOT_FOUND'));

  console.log('6. Rời nhóm');
  r = await goi('POST', `${T}/leave`, { cookie: leader });
  kiem('Leader rời → 409, phải chuyển quyền trước', la(r, 409, 'LEADER_MUST_TRANSFER') && r.data.message.includes('chuyển quyền'), r.data);
  r = await goi('POST', `${T}/leave`, { cookie: c });
  kiem('Member tự rời → 200', r.status === 200 && r.data.memberCount === 2 && await vaiTro(9606) === null, r.data);
  kiem('Leader nhận thông báo có người rời', (await thongBao(9101)).some((t) => t.title === 'Thành viên rời nhóm'));
  kiem('rời lần hai → 404', la(await goi('POST', `${T}/leave`, { cookie: c }), 404, 'TEAM_NOT_FOUND'));
  ok(await supabase.from('team_member').insert({ team_id: TEAM, student_id: 9606, role_in_team: 'Member' }));

  console.log('7. Nhóm ngừng hoạt động');
  ok(await supabase.from('student_team').update({ status: 'Inactive' }).eq('team_id', TEAM));
  kiem('sửa thành viên → 409', la(await sua(leader, 9606, { contribution: 'x' }), 409, 'TEAM_INACTIVE'));
  kiem('mời ra → 409', la(await moiRa(leader, 9606, 'Lý do đủ dài để kiểm thử'), 409, 'TEAM_INACTIVE'));
  kiem('chuyển quyền → 409', la(await chuyen(leader, 9606), 409, 'TEAM_INACTIVE'));
  kiem('đăng tin → 409', la(await tin(leader, { title: 'Tin khi nhóm ngừng', slots: 1 }), 409, 'TEAM_INACTIVE'));
  kiem('thêm thành tích → 409', la(await thanhTich(leader, { category: 'Award', title: 'Giải thử' }), 409, 'TEAM_INACTIVE'));
  r = await goi('GET', `${T}/members`, { cookie: leader });
  kiem('danh sách không còn quyền sửa', r.data.viewer.canManage === false && r.data.members.every((m) => !m.canEditContribution), r.data.viewer);
  ok(await supabase.from('student_team').update({ status: 'Active' }).eq('team_id', TEAM));

  console.log('8. Tin tuyển: kiểm tra đầu vào');
  const hop = { title: 'Cần 1 bạn mảng AI & Edge', slots: 2, requirement: 'Biết PyTorch', deadline: ngay(30), skills: ['Python', `${MARK} Kỹ năng mới`] };
  kiem('Member đăng tin → 403', la(await tin(member, hop), 403, 'NOT_TEAM_LEADER'));
  for (const [ten, sai] of [
    ['tiêu đề dưới 5 ký tự', { title: 'abc' }], ['chỉ tiêu 0', { slots: 0 }], ['chỉ tiêu 21', { slots: 21 }], ['chỉ tiêu lẻ', { slots: 1.5 }],
    ['hạn nộp trong quá khứ', { deadline: ngay(-1) }], ['hạn nộp quá 1 năm', { deadline: ngay(400) }], ['ngày không tồn tại', { deadline: '2026-02-30' }],
    ['11 kỹ năng', { skills: Array.from({ length: 11 }, (_, i) => `KN${i}`) }], ['kỹ năng trùng', { skills: ['Python', 'python'] }],
    ['liên ngành không phải boolean', { isInterdisciplinary: 'có' }],
  ]) kiem(`${ten} → 400`, la(await tin(leader, { ...hop, ...sai }), 400, 'INVALID_INPUT'));
  kiem('thiếu tiêu đề → 400', la(await tin(leader, { slots: 1 }), 400, 'INVALID_INPUT'));
  kiem('lĩnh vực không có → 400', la(await tin(leader, { ...hop, fieldId: 999999 }), 400, 'FIELD_NOT_FOUND'));
  kiem('đề tài không thuộc nhóm → 400', la(await tin(leader, { ...hop, relatedResourceId: 1 }), 400, 'RESOURCE_NOT_FOUND'));

  console.log('9. Tin tuyển: đăng, sửa, đóng, xóa');
  r = await tin(leader, { ...hop, relatedResourceId: RESOURCE, isInterdisciplinary: true });
  const p1 = r.data;
  kiem('đăng tin → 201, đang mở', r.status === 201 && p1.state === 'Open' && p1.slots === 2 && p1.relatedResource?.resourceId === RESOURCE && p1.isInterdisciplinary === true, r.data);
  kiem('kỹ năng mới được thêm vào danh mục', p1.skills.includes(`${MARK} Kỹ năng mới`) && p1.skills.includes('Python'), p1.skills);
  r = await goi('GET', `${T}/recruitments`, { cookie: member });
  kiem('Member xem được, không có quyền sửa, không nhận danh mục chọn', r.status === 200 && r.data.posts.length === 1 && !r.data.posts[0].canEdit && r.data.options === null, r.data);
  r = await goi('GET', `${T}/recruitments`, { cookie: leader });
  kiem('Leader nhận danh mục lĩnh vực và đề tài để gắn', r.data.options.fields.length > 0 && r.data.options.resources.some((x) => x.resourceId === RESOURCE), r.data.options);

  ok(await supabase.from('recruitment_application').insert([
    { apply_id: 9460, recruit_id: p1.recruitId, student_id: 9607, status: 'Accepted', responded_at: new Date().toISOString() },
    { apply_id: 9461, recruit_id: p1.recruitId, student_id: 9608, status: 'Pending' },
  ]));
  r = await suaTin(leader, p1.recruitId, { slots: 0 });
  kiem('sửa chỉ tiêu 0 → 400', la(r, 400, 'INVALID_INPUT'));
  ok(await supabase.from('recruitment_application').update({ status: 'Accepted' }).eq('apply_id', 9461));
  r = await suaTin(leader, p1.recruitId, { slots: 1 });
  kiem('chỉ tiêu thấp hơn số đã nhận → 409', la(r, 409, 'SLOTS_BELOW_ACCEPTED') && r.data.message.includes('2'), r.data);
  r = await suaTin(leader, p1.recruitId, { slots: 2, title: 'Cần 2 bạn mảng AI & Edge' });
  kiem('chỉ tiêu bằng số đã nhận → Đủ chỉ tiêu', r.status === 200 && r.data.state === 'Filled' && r.data.title === 'Cần 2 bạn mảng AI & Edge', r.data);
  r = await suaTin(leader, p1.recruitId, { slots: 3 });
  kiem('tăng chỉ tiêu → mở lại', r.status === 200 && r.data.state === 'Open', r.data);
  r = await suaTin(leader, p1.recruitId, { skills: [] });
  kiem('xóa hết kỹ năng → 200', r.status === 200 && r.data.skills.length === 0, r.data);
  kiem('Member sửa → 403', la(await suaTin(member, p1.recruitId, { slots: 4 }), 403, 'NOT_TEAM_LEADER'));
  kiem('tin không thuộc nhóm → 404', la(await suaTin(leader, 999999, { slots: 4 }), 404, 'POST_NOT_FOUND'));
  kiem('sửa thân rỗng → 400', la(await suaTin(leader, p1.recruitId, {}), 400, 'INVALID_INPUT'));
  kiem('Member đóng tin → 403', la(await goi('POST', `${T}/recruitments/${p1.recruitId}/close`, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  r = await goi('POST', `${T}/recruitments/${p1.recruitId}/close`, { cookie: leader });
  kiem('đóng tin → 200 Closed', r.status === 200 && r.data.state === 'Closed' && !r.data.canEdit, r.data);
  kiem('đóng lần hai → 409', la(await goi('POST', `${T}/recruitments/${p1.recruitId}/close`, { cookie: leader }), 409, 'POST_CLOSED'));
  kiem('sửa tin đã đóng → 409', la(await suaTin(leader, p1.recruitId, { slots: 5 }), 409, 'POST_CLOSED'));
  kiem('xóa tin đã có đơn → 409', la(await goi('DELETE', `${T}/recruitments/${p1.recruitId}`, { cookie: leader }), 409, 'POST_HAS_APPLICATIONS'));

  const moiDang = [];
  for (let i = 0; i < 5; i++) moiDang.push((await tin(leader, { title: `Tin mở số ${i + 1}`, slots: 1 })).status);
  kiem('đăng được 5 tin đang mở', moiDang.every((s) => s === 201), moiDang);
  r = await tin(leader, { title: 'Tin mở số 6', slots: 1 });
  kiem('tin mở thứ 6 → 409 POST_LIMIT', la(r, 409, 'POST_LIMIT'), r.data);
  const tam = (await goi('GET', `${T}/recruitments`, { cookie: leader })).data.posts.find((p) => p.title === 'Tin mở số 5');
  kiem('Member xóa → 403', la(await goi('DELETE', `${T}/recruitments/${tam.recruitId}`, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  r = await goi('DELETE', `${T}/recruitments/${tam.recruitId}`, { cookie: leader });
  kiem('xóa tin chưa có đơn → 204', r.status === 204);
  kiem('xóa lần hai → 404', la(await goi('DELETE', `${T}/recruitments/${tam.recruitId}`, { cookie: leader }), 404, 'POST_NOT_FOUND'));
  kiem('xóa xong đăng thêm được', (await tin(leader, { title: 'Tin mở số 6', slots: 1 })).status === 201);
  r = await goi('GET', `${TEAMS}/${TEAM}`, { cookie: leader });
  kiem('thống kê nhóm: 6 tin, 5 đang mở, 1 đã đóng', r.data.recruitments?.total === 6 && r.data.recruitments.open === 5 && r.data.recruitments.closed === 1, r.data.recruitments);

  console.log('10. Thành tích nhóm');
  const tot = { category: 'Award', title: 'Giải Nhất NCKH cấp Trường', issuedBy: 'UIT', issuedDate: ngay(-30), certificateCode: 'UIT-NCKH-01', doi: '10.1109/RIVF.2024.1', externalUrl: 'https://uit.edu.vn/giai', detail: 'Mảng Thị giác máy tính' };
  kiem('Member thêm → 403', la(await thanhTich(member, tot), 403, 'NOT_TEAM_LEADER'));
  for (const [ten, sai] of [
    ['loại lạ', { category: 'Medal' }], ['tên 2 ký tự', { title: 'ab' }], ['DOI sai', { doi: 'doi:abc' }], ['liên kết http', { externalUrl: 'http://uit.edu.vn' }],
    ['liên kết javascript', { externalUrl: 'javascript:alert(1)' }], ['ngày ở tương lai', { issuedDate: ngay(2) }], ['mô tả 501 ký tự', { detail: 'a'.repeat(501) }],
  ]) kiem(`${ten} → 400`, la(await thanhTich(leader, { ...tot, ...sai }), 400, 'INVALID_INPUT'));
  kiem('thiếu loại → 400', la(await thanhTich(leader, { title: 'Giải thử nghiệm' }), 400, 'INVALID_INPUT'));
  r = await thanhTich(leader, tot);
  const a1 = r.data;
  kiem('thêm → 201', r.status === 201 && a1.title === tot.title && a1.externalUrl === tot.externalUrl && a1.doi === tot.doi, r.data);
  const goc = ok(await supabase.from('team_achievement').select('created_by_account_id').eq('achievement_id', a1.achievementId).single());
  kiem('ghi người tạo', goc.created_by_account_id === 9101, goc);
  r = await goi('PATCH', `${T}/achievements/${a1.achievementId}`, { cookie: leader, json: { title: 'Giải Nhì NCKH cấp Trường', doi: null } });
  kiem('sửa → 200, null xóa DOI', r.status === 200 && r.data.title === 'Giải Nhì NCKH cấp Trường' && r.data.doi === null && r.data.issuedBy === 'UIT', r.data);
  kiem('Member sửa → 403', la(await goi('PATCH', `${T}/achievements/${a1.achievementId}`, { cookie: member, json: { title: 'Sửa trộm' } }), 403, 'NOT_TEAM_LEADER'));
  kiem('thành tích không thuộc nhóm → 404', la(await goi('PATCH', `${T}/achievements/999999`, { cookie: leader, json: { title: 'Không có' } }), 404, 'ACHIEVEMENT_NOT_FOUND'));
  r = await goi('GET', `${T}/portfolio`, { cookie: member });
  kiem('Member xem portfolio, không có quyền sửa', r.status === 200 && r.data.viewer.canEdit === false && r.data.achievements.length === 1, r.data);
  kiem('đề tài nháp không hiện ở "Công trình đã công khai"', Array.isArray(r.data.works) && !r.data.works.some((w) => w.resourceId === RESOURCE), r.data.works);
  r = await goi('GET', `${TEAMS}/${TEAM}`, { cookie: leader });
  kiem('thống kê nhóm đếm 1 thành tích', r.data.portfolio?.achievements === 1 && r.data.portfolio.works === 0, r.data.portfolio);
  kiem('Member xóa → 403', la(await goi('DELETE', `${T}/achievements/${a1.achievementId}`, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  r = await goi('DELETE', `${T}/achievements/${a1.achievementId}`, { cookie: leader });
  kiem('xóa → 204', r.status === 204 && (await goi('GET', `${T}/portfolio`, { cookie: leader })).data.achievements.length === 0);
  kiem('xóa lần hai → 404', la(await goi('DELETE', `${T}/achievements/${a1.achievementId}`, { cookie: leader }), 404, 'ACHIEVEMENT_NOT_FOUND'));
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
