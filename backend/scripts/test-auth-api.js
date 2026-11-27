// Kiểm thử API đăng nhập theo vai trò (/api/auth) và phân quyền các API theo phiên.
// Điều kiện: đã chạy migrations/007_dang_nhap.sql + database/seed_auth.sql; máy chủ đang chạy (npm start).
// Chạy: cd backend && npm run test:auth          (BASE_URL mặc định http://localhost:3000)
// Khởi động lại máy chủ trước mỗi lần chạy: bộ đếm "sai 5 lần" và "gửi lại sau 60 giây" nằm trong bộ nhớ máy chủ.
// Dữ liệu tạo ra (phiên, mã, mật khẩu đã đổi) được dọn ở cuối, kể cả khi có ca lỗi.
import crypto from 'node:crypto';
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const MK = 'MatKhau@123';
const TK = {
  sv: '23529101@gm.uit.edu.vn',
  svDoiMk: '23529102@gm.uit.edu.vn',
  svChuaXacThuc: '23529103@gm.uit.edu.vn',
  svBiKhoa: '23529104@gm.uit.edu.vn',
  svKhoaTam: '21520001@gm.uit.edu.vn',
  gv: 'test.gv@uit.edu.vn',
  admin: 'admin.uitconnect@uit.edu.vn',
  dn: 'test.dn@vtech-global.example',
};
let dat = 0;
let truot = 0;
const batDau = new Date().toISOString();
let matKhauGoc9102 = null;

async function goi(method, duong, { json, cookie } = {}) {
  const res = await fetch(BASE + duong, {
    method,
    headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 100) }; }
  const sc = res.headers.get('set-cookie') || '';
  const m = /uitc_session=([^;]*)/.exec(sc);
  return { status: res.status, data, cookie: m && m[1] ? `uitc_session=${m[1]}` : null, setCookie: sc };
}
const dangNhap = (email, password, portal, remember = false) => goi('POST', '/auth/login', { json: { email, password, portal, remember } });

function kiem(ten, dk, chiTiet) {
  if (dk) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}
const la = (r, status, code) => r.status === status && (!code || r.data.code === code);

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);

  console.log('1. Đăng nhập – ca âm');
  kiem('thiếu portal → 400 INVALID_INPUT', la(await goi('POST', '/auth/login', { json: { email: TK.sv, password: MK } }), 400, 'INVALID_INPUT'));
  kiem('abc@gm.uit.edu.vn (không phải MSSV) → 400 INVALID_EMAIL', la(await dangNhap('abc@gm.uit.edu.vn', MK, 'uit'), 400, 'INVALID_EMAIL'));
  kiem('MSSV gắn đuôi GV 24521228@uit.edu.vn → 400 INVALID_EMAIL', la(await dangNhap('24521228@uit.edu.vn', MK, 'uit'), 400, 'INVALID_EMAIL'));
  kiem('email DN ở cổng UIT SSO → 403 WRONG_PORTAL', la(await dangNhap(TK.dn, MK, 'uit'), 403, 'WRONG_PORTAL'));
  kiem('email SV ở cổng Email và mật khẩu → 403 WRONG_PORTAL', la(await dangNhap(TK.sv, MK, 'business'), 403, 'WRONG_PORTAL'));
  kiem('sai mật khẩu → 401 INVALID_CREDENTIALS', la(await dangNhap(TK.sv, 'Sai@12345', 'uit'), 401, 'INVALID_CREDENTIALS'));
  kiem('email không tồn tại → 401 (không lộ email có tài khoản hay không)', la(await dangNhap('29999999@gm.uit.edu.vn', MK, 'uit'), 401, 'INVALID_CREDENTIALS'));
  kiem('chưa xác thực email → 403 EMAIL_NOT_VERIFIED', la(await dangNhap(TK.svChuaXacThuc, MK, 'uit'), 403, 'EMAIL_NOT_VERIFIED'));
  kiem('tài khoản bị khóa → 403 ACCOUNT_DISABLED', la(await dangNhap(TK.svBiKhoa, MK, 'uit'), 403, 'ACCOUNT_DISABLED'));
  for (let i = 0; i < 5; i++) await dangNhap(TK.svKhoaTam, 'Sai@12345', 'uit');
  kiem('sai 5 lần → lần 6 bị khóa tạm 429 TOO_MANY_ATTEMPTS', la(await dangNhap(TK.svKhoaTam, 'Sai@12345', 'uit'), 429, 'TOO_MANY_ATTEMPTS'));
  kiem('đang bị khóa tạm thì mật khẩu đúng cũng 429', la(await dangNhap(TK.svKhoaTam, MK, 'uit'), 429, 'TOO_MANY_ATTEMPTS'));

  console.log('2. Đăng nhập – ca dương, phiên và phân quyền');
  let r = await dangNhap(TK.sv, MK, 'uit');
  kiem('SV đăng nhập → 200, role Student', r.status === 200 && r.data.user?.role === 'Student' && r.data.user.accountId === 9101, r.data);
  kiem('cookie phiên HttpOnly, SameSite=Lax, không ghi nhớ thì không có Max-Age', /HttpOnly/i.test(r.setCookie) && /SameSite=Lax/i.test(r.setCookie) && !/Max-Age/i.test(r.setCookie), r.setCookie);
  const ckSv = r.cookie;
  r = await goi('GET', '/auth/me', { cookie: ckSv });
  kiem('GET /auth/me có phiên → 200 đúng người', r.status === 200 && r.data.user?.email === TK.sv, r.data);
  kiem('GET /auth/me không phiên → 401 UNAUTHENTICATED', la(await goi('GET', '/auth/me'), 401, 'UNAUTHENTICATED'));
  kiem('GET /auth/me cookie giả → 401', la(await goi('GET', '/auth/me', { cookie: 'uitc_session=gia-mao' }), 401, 'UNAUTHENTICATED'));
  kiem('SV gọi API SV → 200', (await goi('GET', '/student-rd-problems', { cookie: ckSv })).status === 200);
  kiem('SV gọi API DN → 403 FORBIDDEN_ROLE', la(await goi('GET', '/business-inbox', { cookie: ckSv }), 403, 'FORBIDDEN_ROLE'));

  r = await dangNhap(TK.dn, MK, 'business', true);
  kiem('DN đăng nhập (ghi nhớ) → 200, role Business, cookie có Max-Age 30 ngày', r.status === 200 && r.data.user?.role === 'Business' && /Max-Age=2592000/i.test(r.setCookie), r.setCookie);
  const ckDn = r.cookie;
  kiem('DN gọi API DN → 200', (await goi('GET', '/business-inbox', { cookie: ckDn })).status === 200);
  kiem('DN gọi API SV → 403 FORBIDDEN_ROLE', la(await goi('GET', '/student-skills', { cookie: ckDn }), 403, 'FORBIDDEN_ROLE'));

  r = await dangNhap(TK.gv, MK, 'uit');
  kiem('GV đăng nhập qua UIT SSO → 200, role Lecturer', r.status === 200 && r.data.user?.role === 'Lecturer', r.data);
  kiem('GV gọi API SV → 403', la(await goi('GET', '/student-skills', { cookie: r.cookie }), 403, 'FORBIDDEN_ROLE'));
  r = await dangNhap(TK.admin, MK, 'uit');
  kiem('Admin đăng nhập qua UIT SSO → 200, role Admin', r.status === 200 && r.data.user?.role === 'Admin' && r.data.user.fullName === 'Quản trị viên UIT Connect', r.data);

  if (config.authMode === 'session') {
    kiem('AUTH_MODE=session: gọi API không phiên → 401 UNAUTHENTICATED', la(await goi('GET', '/student-skills'), 401, 'UNAUTHENTICATED'));
  } else {
    kiem('AUTH_MODE=test: gọi API không phiên → dùng tài khoản thử (200)', (await goi('GET', '/student-skills')).status === 200);
  }

  r = await goi('POST', '/auth/logout', { cookie: ckSv });
  kiem('đăng xuất → 204, xóa cookie', r.status === 204 && /uitc_session=;/.test(r.setCookie), r.setCookie);
  kiem('sau đăng xuất, phiên cũ → 401', la(await goi('GET', '/auth/me', { cookie: ckSv }), 401, 'UNAUTHENTICATED'));

  console.log('3. Quên mật khẩu');
  const { data: tk9102 } = await supabase.from('account').select('password_hash').eq('account_id', 9102).single();
  matKhauGoc9102 = tk9102.password_hash;
  const phienCu = (await dangNhap(TK.svDoiMk, MK, 'uit')).cookie;
  kiem('email DN ở quên mật khẩu UIT → 403 WRONG_PORTAL', la(await goi('POST', '/auth/password-reset/request', { json: { email: TK.dn, portal: 'uit' } }), 403, 'WRONG_PORTAL'));
  r = await goi('POST', '/auth/password-reset/request', { json: { email: '29999998@gm.uit.edu.vn', portal: 'uit' } });
  kiem('email không tồn tại → vẫn 202 (không lộ tài khoản)', r.status === 202 && r.data.resendAfter === 60, r);
  r = await goi('POST', '/auth/password-reset/request', { json: { email: TK.svDoiMk, portal: 'uit' } });
  kiem('gửi mã → 202 { resendAfter: 60 }', r.status === 202 && r.data.resendAfter === 60, r);
  kiem('gửi lại ngay → 429 RESEND_TOO_SOON', la(await goi('POST', '/auth/password-reset/request', { json: { email: TK.svDoiMk, portal: 'uit' } }), 429, 'RESEND_TOO_SOON'));
  kiem('mã sai định dạng → 400 INVALID_INPUT', la(await goi('POST', '/auth/password-reset/verify', { json: { email: TK.svDoiMk, portal: 'uit', code: '12ab' } }), 400, 'INVALID_INPUT'));
  // Chưa có dịch vụ email: đặt mã đã biết vào dòng mã mới nhất để kiểm thử
  const { data: dongMa } = await supabase.from('verification_code').select('code_id')
    .eq('account_id', 9102).eq('purpose', 'Password_Reset').is('consumed_at', null).order('created_at', { ascending: false }).limit(1).single();
  const maThu = '123456';
  const maSai = '654321';
  await supabase.from('verification_code').update({ code_hash: crypto.createHash('sha256').update(`9102:${maThu}`).digest('hex') }).eq('code_id', dongMa.code_id);
  kiem('mã sai → 400 INVALID_CODE', la(await goi('POST', '/auth/password-reset/verify', { json: { email: TK.svDoiMk, portal: 'uit', code: maSai } }), 400, 'INVALID_CODE'));
  r = await goi('POST', '/auth/password-reset/verify', { json: { email: TK.svDoiMk, portal: 'uit', code: maThu } });
  kiem('mã đúng → 200 { resetToken }', r.status === 200 && typeof r.data.resetToken === 'string' && r.data.resetToken.length > 20, r);
  const token = r.data.resetToken;
  kiem('dùng lại mã đã dùng → 410 CODE_EXPIRED', la(await goi('POST', '/auth/password-reset/verify', { json: { email: TK.svDoiMk, portal: 'uit', code: maThu } }), 410, 'CODE_EXPIRED'));
  kiem('mật khẩu yếu → 400 WEAK_PASSWORD', la(await goi('POST', '/auth/password-reset/confirm', { json: { resetToken: token, newPassword: 'yeu12345' } }), 400, 'WEAK_PASSWORD'));
  kiem('token giả → 410 TOKEN_EXPIRED', la(await goi('POST', '/auth/password-reset/confirm', { json: { resetToken: 'gia-mao', newPassword: 'MoiMoi@2026' } }), 410, 'TOKEN_EXPIRED'));
  kiem('đặt mật khẩu mới → 204', (await goi('POST', '/auth/password-reset/confirm', { json: { resetToken: token, newPassword: 'MoiMoi@2026' } })).status === 204);
  kiem('dùng lại token → 410 TOKEN_EXPIRED', la(await goi('POST', '/auth/password-reset/confirm', { json: { resetToken: token, newPassword: 'MoiMoi@2027' } }), 410, 'TOKEN_EXPIRED'));
  kiem('đổi mật khẩu → phiên cũ bị thu hồi (401)', la(await goi('GET', '/auth/me', { cookie: phienCu }), 401, 'UNAUTHENTICATED'));
  kiem('mật khẩu cũ → 401', la(await dangNhap(TK.svDoiMk, MK, 'uit'), 401, 'INVALID_CREDENTIALS'));
  kiem('mật khẩu mới → 200', (await dangNhap(TK.svDoiMk, 'MoiMoi@2026', 'uit')).status === 200);
}

async function donDep() {
  if (matKhauGoc9102) await supabase.from('account').update({ password_hash: matKhauGoc9102 }).eq('account_id', 9102);
  await supabase.from('login_session').delete().gte('account_id', 9001).lte('account_id', 9999).gte('created_at', batDau);
  await supabase.from('verification_code').delete().gte('account_id', 9001).lte('account_id', 9999).gte('created_at', batDau);
  console.log('\nĐã dọn: phiên và mã tạo trong lần chạy, khôi phục mật khẩu tài khoản 9102.');
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
