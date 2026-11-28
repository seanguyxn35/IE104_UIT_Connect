// Kiểm thử API tìm kiếm / lọc đề tài Lab (SV-07): GET /api/lab-topics.
// Điều kiện: seed.sql, seed_dn.sql, seed_auth.sql; máy chủ đang chạy. Chạy: cd backend && npm run test:lab-topics
// Ca 401 chỉ kiểm khi máy chủ và script cùng đặt AUTH_MODE=session.
// Script tạo đề tài tạm 9031–9038 (tiêu đề có từ khóa riêng để tách khỏi dữ liệu khác) rồi tự xóa.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const URL_ = `${BASE}/lab-topics`;
const MARK = '[TEST-AUTO]';
const KEY = 'zqkiemthucho'; // từ khóa riêng có trong mọi đề tài tạm
const MK = 'MatKhau@123';
const IDS = [9031, 9032, 9033, 9034, 9035, 9036, 9037, 9038];
let dat = 0;
let truot = 0;
const phien = [];

function kiem(ten, dieuKien, chiTiet) {
  if (dieuKien) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet !== undefined ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}
const la = (r, status, code) => r.status === status && (!code || r.data?.code === code);

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

async function goi(url, cookie) {
  const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function dangNhap(accountId, portal = 'uit') {
  const { email } = ok(await supabase.from('account').select('email').eq('account_id', accountId).single());
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: MK, portal }) });
  if (res.status !== 200) throw new Error(`Không đăng nhập được tài khoản ${accountId} (đã chạy seed_auth.sql?)`);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  phien.push(cookie);
  return cookie;
}

async function donDuLieu() {
  const cu = ok(await supabase.from('lab_topic').select('topic_id, title').in('topic_id', IDS));
  if (cu.some((t) => !t.title.startsWith(MARK))) throw new Error('Đề tài 9031–9038 không phải dữ liệu của script này, dừng lại.');
  ok(await supabase.from('lab_application').delete().in('topic_id', IDS));
  ok(await supabase.from('topic_skill').delete().in('topic_id', IDS));
  ok(await supabase.from('lab_topic').delete().in('topic_id', IDS).like('title', `${MARK}%`));
}

const ngay = (offset) => new Date(Date.now() + 7 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
const tim = (cookie, query) => goi(`${URL_}?${new URLSearchParams({ pageSize: '24', ...query })}`, cookie);
const ids = (r) => (r.data.items ?? []).map((i) => i.topicId);

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);
  await donDuLieu();
  const [gv] = ok(await supabase.from('lecturer_profile').select('lecturer_id, full_name, faculty_id').eq('lecturer_id', 9201));
  const [lab5] = ok(await supabase.from('lab').select('lab_id, name, faculty_id').eq('lab_id', 5));
  const skill = ok(await supabase.from('skill').select('skill_id, name').eq('name', 'ROS2').maybeSingle());
  const goc = { lecturer_id: 9201, topic_type: 'Student_Research', slots: 2, deadline: ngay(30), status: 'Open', partner_name: null, is_interdisciplinary: false, created_at: new Date(Date.now() - 9000).toISOString() };
  ok(await supabase.from('lab_topic').insert([
    { ...goc, topic_id: 9031, lab_id: 5, field_id: 8, title: `${MARK} Giám sát khuyết tật ${KEY} bằng thị giác máy tính`, created_at: new Date(Date.now() - 1000).toISOString() },
    { ...goc, topic_id: 9032, lab_id: 1, field_id: 2, title: `${MARK} Nhận dạng ${KEY} khuôn mặt`, partner_name: 'Đối tác Zeta', is_interdisciplinary: true, created_at: new Date(Date.now() - 2000).toISOString() },
    { ...goc, topic_id: 9033, lab_id: null, field_id: 2, title: `${MARK} Đề tài ${KEY} không có Lab`, created_at: new Date(Date.now() - 3000).toISOString() },
    { ...goc, topic_id: 9034, lab_id: 1, field_id: 2, title: `${MARK} Đề tài ${KEY} đã đủ`, status: 'Filled', created_at: new Date().toISOString() },
    { ...goc, topic_id: 9035, lab_id: 1, field_id: 2, title: `${MARK} Đề tài ${KEY} đủ theo số đơn`, slots: 1, created_at: new Date(Date.now() - 500).toISOString() },
    { ...goc, topic_id: 9036, lab_id: 1, field_id: 2, title: `${MARK} Đề tài ${KEY} tạm dừng`, status: 'Paused' },
    { ...goc, topic_id: 9037, lab_id: 1, field_id: 2, title: `${MARK} Đề tài ${KEY} đã đóng`, status: 'Closed' },
    { ...goc, topic_id: 9038, lab_id: 1, field_id: 2, title: `${MARK} Đề tài ${KEY} quá hạn`, deadline: ngay(-1) },
  ]));
  if (skill) ok(await supabase.from('topic_skill').insert({ topic_id: 9031, skill_id: skill.skill_id }));
  ok(await supabase.from('lab_application').insert([
    { topic_id: 9035, student_id: 9102, status: 'Accepted', responded_at: new Date().toISOString() },
    { topic_id: 9032, student_id: 9101, status: 'Pending', responded_at: null },
  ]));

  const sv = await dangNhap(9101);
  const sv2 = await dangNhap(9102);
  const dn = await dangNhap(9501, 'business');

  console.log('1. Xác thực và đầu vào');
  if (config.authMode === 'session') kiem('chưa đăng nhập → 401', la(await goi(URL_), 401, 'UNAUTHENTICATED'));
  else console.log('  (bỏ qua ca 401: cần AUTH_MODE=session)');
  kiem('tài khoản DN → 403', la(await goi(URL_, dn), 403, 'FORBIDDEN_ROLE'));
  for (const [ten, query] of [['khoa không phải số', 'faculty=abc'], ['lĩnh vực 0', 'field=0'], ['trang 0', 'page=0'],
    ['pageSize 25', 'pageSize=25'], ['từ khóa 101 ký tự', `q=${'a'.repeat(101)}`], ['từ khóa dạng mảng', 'q=a&q=b']]) {
    kiem(`${ten} → 400`, la(await goi(`${URL_}?${query}`, sv), 400, 'INVALID_INPUT'));
  }
  const macDinh = await goi(URL_, sv);
  kiem('mặc định → 200, 6 đề tài mỗi trang', macDinh.status === 200 && macDinh.data.pageSize === 6 && macDinh.data.items.length <= 6, macDinh.data);

  console.log('2. Trạng thái hiển thị');
  let r = await tim(sv, { q: KEY });
  kiem('chỉ hiện Open / Filled còn hạn (5 đề tài)', r.status === 200 && r.data.total === 5 && [9031, 9032, 9033, 9034, 9035].every((id) => ids(r).includes(id)), ids(r));
  kiem('ẩn Paused, Closed, quá hạn', ![9036, 9037, 9038].some((id) => ids(r).includes(id)));
  const theoId = new Map((r.data.items ?? []).map((i) => [i.topicId, i]));
  kiem('Filled → Đã đủ chỗ', theoId.get(9034)?.isFull === true);
  kiem('đủ số đơn Accepted → Đã đủ chỗ, còn 0', theoId.get(9035)?.isFull === true && theoId.get(9035).remaining === 0 && theoId.get(9035).accepted === 1);
  kiem('đề tài còn chỗ xếp trước đề tài đã đủ', ids(r).slice(-2).sort().join() === '9034,9035', ids(r));
  const t31 = theoId.get(9031);
  kiem('thẻ có GV, Lab, khoa, lĩnh vực, loại', t31?.lecturer?.includes(gv.full_name) && t31.lab?.name === lab5.name && t31.faculty?.facultyId === lab5.faculty_id && t31.field?.fieldId === 8 && t31.typeLabel === 'NCKH sinh viên', t31);
  kiem('không trả mã tài khoản / email', !/student_id|studentId|email|accountId/.test(JSON.stringify(r.data.items)));

  console.log('3. Tìm kiếm');
  r = await tim(sv, { q: `${KEY} giam sat khuyet tat` });
  kiem('không dấu khớp có dấu, mọi từ phải khớp', ids(r).join() === '9031', ids(r));
  r = await tim(sv, { q: `${KEY.toUpperCase()}   KHUÔN   MẶT` });
  kiem('không phân biệt hoa thường, gộp khoảng trắng', ids(r).join() === '9032' && r.data.filters.q === `${KEY.toUpperCase()} KHUÔN MẶT`, r.data.filters);
  if (skill) {
    r = await tim(sv, { q: `${KEY} ros2` });
    kiem('tìm theo kỹ năng', ids(r).join() === '9031', ids(r));
  }
  r = await tim(sv, { q: `${KEY} ${lab5.name}` });
  kiem('tìm theo tên Lab', ids(r).includes(9031) && !ids(r).includes(9032), ids(r));
  r = await tim(sv, { q: `${KEY} zeta` });
  kiem('tìm theo đối tác', ids(r).join() === '9032', ids(r));
  r = await tim(sv, { q: `${KEY} khongcotrongdetainao` });
  kiem('không khớp → 0 kết quả, vẫn 200', r.status === 200 && r.data.total === 0 && r.data.items.length === 0 && r.data.totalPages === 1, r.data);

  console.log('4. Lọc khoa, lĩnh vực và số đếm');
  r = await tim(sv, { q: KEY, faculty: String(lab5.faculty_id) });
  kiem('lọc theo khoa của Lab', ids(r).includes(9031) && (lab5.faculty_id === 1 || !ids(r).includes(9032)), ids(r));
  r = await tim(sv, { q: KEY, faculty: String(gv.faculty_id) });
  kiem('đề tài không có Lab lấy khoa của GV', ids(r).includes(9033), ids(r));
  r = await tim(sv, { q: KEY, field: '8' });
  kiem('lọc theo lĩnh vực', ids(r).join() === '9031', ids(r));
  const dem = new Map(r.data.fields.map((f) => [f.fieldId, f.count]));
  kiem('số theo lĩnh vực tính trước khi áp lĩnh vực', dem.get(8) === 1 && dem.get(2) === 4 && r.data.summary.matchedBeforeField === 5, r.data.fields);
  r = await tim(sv, { q: KEY, field: '12' });
  kiem('lĩnh vực không có đề tài: vẫn có nút để bỏ chọn', r.data.total === 0 && r.data.fields.some((f) => f.fieldId === 12 && f.count === 0), r.data.fields);
  kiem('trả danh sách khoa để chọn', r.data.faculties.length >= 1 && r.data.faculties.every((f) => f.facultyId && f.name));

  console.log('5. Phân trang');
  r = await tim(sv, { q: KEY, pageSize: '2', page: '2' });
  kiem('trang 2, cỡ 2', r.data.page === 2 && r.data.totalPages === 3 && r.data.items.length === 2 && r.data.total === 5, r.data);
  const trang1 = ids(await tim(sv, { q: KEY, pageSize: '2', page: '1' }));
  kiem('hai trang không trùng nhau', !ids(r).some((id) => trang1.includes(id)));
  r = await tim(sv, { q: KEY, pageSize: '2', page: '99' });
  kiem('trang vượt quá → trang cuối', r.data.page === 3 && r.data.items.length === 1, r.data);

  console.log('6. Đánh dấu đã ứng tuyển theo người xem');
  r = await tim(sv, { q: KEY });
  kiem('SV 9101 thấy "đã ứng tuyển" ở 9032', r.data.items.find((i) => i.topicId === 9032)?.applied === true && r.data.items.filter((i) => i.applied).length === 1);
  r = await tim(sv2, { q: KEY });
  kiem('SV 9102 thấy 9035 (đơn đã nhận), không thấy 9032', r.data.items.find((i) => i.topicId === 9035)?.applied === true && r.data.items.find((i) => i.topicId === 9032)?.applied === false);
}

async function donCuoi() {
  for (const cookie of phien) await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: { Cookie: cookie } }).catch(() => {});
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
