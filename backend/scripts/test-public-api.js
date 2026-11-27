// Kiểm thử API công khai (/api/public) cho trang tổng quan và chi tiết bài toán của khách.
// Điều kiện: đã chạy seed_dn.sql + migrations/006 + seed_sv_rd.sql; máy chủ đang chạy (npm start).
// Chạy: cd backend && npm run test:public          (BASE_URL mặc định http://localhost:3000)
// Chỉ đọc, không tạo dữ liệu (riêng một lần đăng nhập SV để so sánh, phiên đó bị đăng xuất ngay).
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
let dat = 0;
let truot = 0;

async function goi(duong, cookie) {
  const res = await fetch(BASE + duong, { headers: cookie ? { Cookie: cookie } : {} });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 100) }; }
  return { status: res.status, data, text, cache: res.headers.get('cache-control') || '' };
}
function kiem(ten, dk, chiTiet) {
  if (dk) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet !== undefined ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}

// Không được lộ: khóa dữ liệu riêng của người xem, tệp đính kèm, email, MSSV, tên sinh viên thử
const KHOA_CAM = ['saved', 'myProposal', 'fitScore', 'attachments', 'mySkills', 'options', 'email', 'password_hash', 'tax_code', 'student_code'];
function khoaCam(obj, duong = '') {
  if (Array.isArray(obj)) return obj.flatMap((x, i) => khoaCam(x, `${duong}[${i}]`));
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => (KHOA_CAM.includes(k) ? [`${duong}.${k}`] : khoaCam(v, `${duong}.${k}`)));
  }
  return [];
}
const RE_NHAY_CAM = /[\w.+-]+@[\w-]+\.[\w.-]+|\b\d{8}\b|Sinh viên Thử|Nguyễn Văn An/;
// Chỉ quét giá trị chữ (bỏ số: kinh phí 60000000 có 8 chữ số nhưng không phải MSSV)
const chuTrongJson = (data) => JSON.stringify(data, (k, v) => (typeof v === 'number' ? 0 : v));

async function chay() {
  console.log(`Máy chủ: ${BASE}\n`);

  console.log('1. Trang tổng quan');
  const r = await goi('/public/overview');
  kiem('GET /public/overview không cần đăng nhập → 200', r.status === 200, r.status);
  const { stats, problems = [], partners = [] } = r.data;
  const ma = problems.map((p) => p.code);
  kiem('có bài DN khác (RD-2026-101) và bài V-Tech (RD-2026-084, RD-2026-071 đang thực hiện)', ['RD-2026-101', 'RD-2026-084', 'RD-2026-071'].every((m) => ma.includes(m)), ma);
  kiem('không có bài chờ duyệt (RD-2026-091) / bản nháp (DRAFT-904)', !ma.includes('RD-2026-091') && !ma.includes('DRAFT-904'));
  kiem('mọi bài đều Open / In_Progress', problems.every((p) => ['Open', 'In_Progress'].includes(p.status)));
  kiem('số liệu khớp danh sách', stats?.openProblems === problems.filter((p) => p.status === 'Open').length &&
    stats?.inProgressProblems === problems.filter((p) => p.status === 'In_Progress').length && stats?.partners === partners.length, stats);
  const tong = problems.filter((p) => p.status === 'Open').reduce((t, p) => t + (p.funding ?? 0), 0);
  kiem('tổng kinh phí = tổng mức tối đa của bài đang mở', stats?.totalFunding === tong, [stats?.totalFunding, tong]);
  const vtech = partners.find((d) => d.name === 'V-Tech Global');
  kiem('đối tác V-Tech Global có 3 bài công khai', vtech?.problemCount === 3, vtech);
  kiem('không có khóa dữ liệu riêng / tệp / email trong câu trả lời', khoaCam(r.data).length === 0, khoaCam(r.data).slice(0, 5));
  kiem('không có email, MSSV, tên sinh viên trong câu trả lời', !RE_NHAY_CAM.test(chuTrongJson(r.data)), (chuTrongJson(r.data).match(RE_NHAY_CAM) || [])[0]);
  kiem('cho trình duyệt lưu đệm 60 giây', /public/.test(r.cache) && /max-age=60/.test(r.cache), r.cache);

  console.log('2. Chi tiết bài toán');
  const ct = await goi('/public/problems/RD-2026-084');
  kiem('GET /public/problems/RD-2026-084 → 200, có mô tả, mốc, quy mô nhóm', ct.status === 200 && ct.data.requirement && ct.data.milestones?.length > 0 && ct.data.teamSizeMin, ct.data);
  kiem('không có tệp đính kèm / dữ liệu riêng', khoaCam(ct.data).length === 0, khoaCam(ct.data));
  kiem('không có email, MSSV, tên sinh viên', !RE_NHAY_CAM.test(chuTrongJson(ct.data)), (chuTrongJson(ct.data).match(RE_NHAY_CAM) || [])[0]);
  kiem('mã viết thường vẫn tìm được', (await goi('/public/problems/rd-2026-101')).status === 200);
  let e = await goi('/public/problems/RD-2026-091');
  kiem('bài chờ duyệt → 404 PROBLEM_NOT_FOUND', e.status === 404 && e.data.code === 'PROBLEM_NOT_FOUND', e.data);
  e = await goi('/public/problems/KHONG-CO-123');
  kiem('mã không tồn tại → 404', e.status === 404 && e.data.code === 'PROBLEM_NOT_FOUND', e.data);
  e = await goi('/public/problems/a%20b');
  kiem('mã sai định dạng → 400 INVALID_INPUT', e.status === 400 && e.data.code === 'INVALID_INPUT', e.data);

  console.log('3. Đăng nhập rồi gọi vẫn không lộ dữ liệu riêng');
  const login = await fetch(BASE + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '23529101@gm.uit.edu.vn', password: 'MatKhau@123', portal: 'uit' }),
  });
  const m = /uitc_session=([^;]*)/.exec(login.headers.get('set-cookie') || '');
  if (login.status === 200 && m) {
    const cookie = `uitc_session=${m[1]}`;
    const co = await goi('/public/overview', cookie);
    kiem('SV đã đăng nhập gọi /public/overview: giống hệt khách, không thêm dữ liệu riêng', co.text === r.text && khoaCam(co.data).length === 0);
    await fetch(BASE + '/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
  } else {
    console.log('  (bỏ qua: chưa chạy seed_auth.sql nên không đăng nhập được tài khoản thử)');
  }
}

try {
  await chay();
} catch (err) {
  truot++;
  console.error('\nLỗi khi chạy kiểm thử:', err.message);
} finally {
  console.log(`\nKết quả: ${dat} đạt, ${truot} trượt.`);
  process.exit(truot ? 1 : 0);
}
