// Đăng nhập theo vai trò: phiên phía máy chủ (bảng login_session) + cookie HttpOnly, quên mật khẩu bằng mã 6 chữ số
// (bảng verification_code). Hợp đồng API đầy đủ: frontend/assets/js/auth.js.
//
// Hai cổng đăng nhập (portal):
//   'uit'      : Sinh viên (<MSSV 8 chữ số>@gm.uit.edu.vn), Giảng viên (<tên>@uit.edu.vn), Admin (EMAIL_ADMIN)
//   'business' : Doanh nghiệp (email không thuộc UIT)
// Đăng nhập, kiểm tra theo thứ tự:
//   định dạng email + đúng cổng (400 INVALID_EMAIL / 403 WRONG_PORTAL) → khóa tạm do sai nhiều lần (429)
//   → email + mật khẩu (401 INVALID_CREDENTIALS, không nói rõ sai cái nào) → vai trò thuộc cổng (403 WRONG_PORTAL)
//   → tài khoản bị khóa (403 ACCOUNT_DISABLED) → chưa xác thực email (403 EMAIL_NOT_VERIFIED) → tạo phiên
// Mật khẩu băm bằng scrypt (node:crypto); token phiên / mã chỉ lưu bản băm SHA-256, không lưu bản gốc.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE = 'uitc_session';
export const PHIEN_NGAN_MS = 8 * 60 * 60 * 1000;        // không chọn "Ghi nhớ"
export const PHIEN_DAI_MS = 30 * 24 * 60 * 60 * 1000;   // "Ghi nhớ đăng nhập (30 ngày)"
export const EMAIL_ADMIN = 'admin.uitconnect@uit.edu.vn';
export const PORTALS = ['uit', 'business'];

const SAI_TOI_DA = 5;
const KHOA_SAI_MS = 15 * 60 * 1000;
const GUI_LAI_SAU_S = 60;
const MA_HET_HAN_MS = 10 * 60 * 1000;
const MA_SAI_TOI_DA = 5;
const TOKEN_DAT_LAI_HET_HAN_MS = 15 * 60 * 1000;

// ---------- Định dạng email (khớp frontend/assets/js/auth.js) ----------
const RE_SV = /^\d{8}@gm\.uit\.edu\.vn$/;
const RE_GV = /^[a-z][a-z0-9._-]*@uit\.edu\.vn$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const laDuoiUit = (e) => /@(gm\.)?uit\.edu\.vn$/.test(e);
const CONG_CUA_VAI_TRO = { Student: 'uit', Lecturer: 'uit', Admin: 'uit', Business: 'business' };

export function chuanHoaEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

// Ném lỗi nếu email không dùng được ở cổng này
export function kiemTraEmailCong(email, portal) {
  if (!RE_EMAIL.test(email) || email.length > 150) throw new AppError(400, 'INVALID_INPUT', 'Email không hợp lệ.');
  if (portal === 'uit') {
    if (!laDuoiUit(email)) throw new AppError(403, 'WRONG_PORTAL', 'Vui lòng chuyển sang đăng nhập bằng "Email và mật khẩu".');
    if (email.endsWith('@gm.uit.edu.vn') && !RE_SV.test(email)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Email sinh viên phải là MSSV gồm 8 chữ số, ví dụ 24521228@gm.uit.edu.vn.');
    }
    if (email.endsWith('@uit.edu.vn') && !email.endsWith('@gm.uit.edu.vn') && !RE_GV.test(email)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Email giảng viên phải bắt đầu bằng chữ cái, ví dụ khangtg@uit.edu.vn.');
    }
  } else if (laDuoiUit(email)) {
    throw new AppError(403, 'WRONG_PORTAL', 'Email Sinh viên / Giảng viên UIT vui lòng đăng nhập bằng "UIT SSO".');
  }
}

// ---------- Mật khẩu ----------
const THAM_SO = { N: 16384, r: 8, p: 1 };

export async function bamMatKhau(matKhau) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(matKhau, salt, 64, THAM_SO);
  return ['scrypt', THAM_SO.N, THAM_SO.r, THAM_SO.p, salt.toString('base64'), h.toString('base64')].join('$');
}

async function dungMatKhau(matKhau, daLuu) {
  const p = String(daLuu ?? '').split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const goc = Buffer.from(p[5], 'base64');
  const h = await scrypt(matKhau, Buffer.from(p[4], 'base64'), goc.length, { N: Number(p[1]), r: Number(p[2]), p: Number(p[3]) });
  return h.length === goc.length && crypto.timingSafeEqual(h, goc);
}

// Băm giả để so khi email không tồn tại: thời gian trả lời như nhau, không lộ email nào có tài khoản
let bamGia = null;
async function soVoiBamGia(matKhau) {
  bamGia ??= await bamMatKhau('khong-dung-' + crypto.randomUUID());
  await dungMatKhau(matKhau, bamGia);
}

// Mật khẩu mới: ≥ 8 ký tự, có chữ hoa, chữ thường, chữ số, ký tự đặc biệt
export function matKhauDuManh(mk) {
  return typeof mk === 'string' && mk.length >= 8 && mk.length <= 200 &&
    /[a-z]/.test(mk) && /[A-Z]/.test(mk) && /\d/.test(mk) && /[^A-Za-z0-9]/.test(mk);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const taoToken = () => crypto.randomBytes(32).toString('base64url');

// ---------- Đếm sai (trong bộ nhớ máy chủ; khởi động lại thì xóa) ----------
const saiDangNhap = new Map(); // email → { lan, tu }
function daBiKhoa(email) {
  const s = saiDangNhap.get(email);
  if (!s) return false;
  if (Date.now() - s.tu > KHOA_SAI_MS) { saiDangNhap.delete(email); return false; }
  return s.lan >= SAI_TOI_DA;
}
function ghiSai(email) {
  const s = saiDangNhap.get(email);
  if (!s || Date.now() - s.tu > KHOA_SAI_MS) saiDangNhap.set(email, { lan: 1, tu: Date.now() });
  else s.lan++;
}

// ---------- Tài khoản ----------
async function timTaiKhoan(email) {
  const { data, error } = await supabase
    .from('account')
    .select('account_id, email, role, password_hash, is_active, email_verified_at')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function tenHienThi(accountId, role) {
  const bang = {
    Student: ['student_profile', 'student_id', 'full_name'],
    Lecturer: ['lecturer_profile', 'lecturer_id', 'academic_title, full_name'],
    Business: ['business_profile', 'business_id', 'company_name'],
    Admin: ['admin_profile', 'admin_id', 'full_name'],
  }[role];
  if (!bang) return null;
  const { data, error } = await supabase.from(bang[0]).select(bang[2]).eq(bang[1], accountId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (role === 'Business') return data.company_name;
  if (role === 'Lecturer') return [data.academic_title, data.full_name].filter(Boolean).join('. ');
  return data.full_name;
}

async function nguoiDung(tk) {
  return { accountId: tk.account_id, role: tk.role, email: tk.email, fullName: (await tenHienThi(tk.account_id, tk.role)) ?? tk.email };
}

// ---------- Đăng nhập / phiên ----------
export async function dangNhap({ email, password, remember, portal, deviceInfo }) {
  kiemTraEmailCong(email, portal);
  if (daBiKhoa(email)) throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Bạn đã nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.');

  const tk = await timTaiKhoan(email);
  const dung = tk?.password_hash ? await dungMatKhau(password, tk.password_hash) : (await soVoiBamGia(password), false);
  if (!dung) {
    ghiSai(email);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }
  if (CONG_CUA_VAI_TRO[tk.role] !== portal) {
    throw new AppError(403, 'WRONG_PORTAL', portal === 'uit'
      ? 'Tài khoản Doanh nghiệp vui lòng đăng nhập bằng "Email và mật khẩu".'
      : 'Tài khoản UIT vui lòng đăng nhập bằng "UIT SSO".');
  }
  if (!tk.is_active) throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đang bị khóa. Liên hệ Ban quản trị UIT Connect.');
  if (!tk.email_verified_at) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Tài khoản chưa xác thực email.');
  saiDangNhap.delete(email);

  const token = taoToken();
  const thoiHan = remember ? PHIEN_DAI_MS : PHIEN_NGAN_MS;
  const { error } = await supabase.from('login_session').insert({
    account_id: tk.account_id,
    token_hash: sha256(token),
    is_remembered: !!remember,
    device_info: deviceInfo ? String(deviceInfo).slice(0, 255) : null,
    expires_at: new Date(Date.now() + thoiHan).toISOString(),
  });
  if (error) throw error;
  await supabase.from('account').update({ last_login_at: new Date().toISOString() }).eq('account_id', tk.account_id);
  return { user: await nguoiDung(tk), token, maxAgeMs: remember ? thoiHan : null };
}

// Người dùng của phiên (null nếu token sai / hết hạn / đã thu hồi / tài khoản bị khóa)
export async function layNguoiDungTuToken(token) {
  if (!token || token.length > 200) return null;
  const { data, error } = await supabase
    .from('login_session')
    .select('session_id, expires_at, revoked_at, account:account!fk_login_session_account(account_id, email, role, is_active)')
    .eq('token_hash', sha256(token))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at || new Date(data.expires_at) <= new Date() || !data.account?.is_active) return null;
  return nguoiDung(data.account);
}

export async function dangXuat(token) {
  if (!token) return;
  const { error } = await supabase.from('login_session')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', sha256(token))
    .is('revoked_at', null);
  if (error) throw error;
}

// ---------- Quên mật khẩu ----------
const guiGanNhat = new Map(); // email → lúc gửi (cả email không có tài khoản, để trả lời giống nhau)

// "Gửi" mã: chưa có dịch vụ email (TBD) nên ghi ra log máy chủ
function guiEmailMa(email, ma) {
  console.log(`[Quên mật khẩu] Mã xác thực cho ${email}: ${ma} (hiệu lực 10 phút; chưa có dịch vụ email nên in ra log)`);
}

export async function yeuCauDatLai(email, portal) {
  kiemTraEmailCong(email, portal);
  const truoc = guiGanNhat.get(email);
  if (truoc && Date.now() - truoc < GUI_LAI_SAU_S * 1000) {
    const con = Math.ceil((truoc + GUI_LAI_SAU_S * 1000 - Date.now()) / 1000);
    const e = new AppError(429, 'RESEND_TOO_SOON', `Hãy chờ ${con} giây rồi gửi lại.`);
    e.retryAfter = con;
    throw e;
  }
  guiGanNhat.set(email, Date.now());

  const tk = await timTaiKhoan(email);
  // Email không có tài khoản / sai cổng / bị khóa: vẫn trả 202 như bình thường, không gửi gì
  if (!tk || CONG_CUA_VAI_TRO[tk.role] !== portal || !tk.is_active) return { resendAfter: GUI_LAI_SAU_S };

  const now = new Date().toISOString();
  // Mã cũ chưa dùng hết hiệu lực
  const { error: huyError } = await supabase.from('verification_code').update({ consumed_at: now })
    .eq('account_id', tk.account_id).in('purpose', ['Password_Reset', 'Reset_Token']).is('consumed_at', null);
  if (huyError) throw huyError;
  const ma = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const { error } = await supabase.from('verification_code').insert({
    account_id: tk.account_id,
    purpose: 'Password_Reset',
    code_hash: sha256(`${tk.account_id}:${ma}`),
    expires_at: new Date(Date.now() + MA_HET_HAN_MS).toISOString(),
  });
  if (error) throw error;
  guiEmailMa(email, ma);
  return { resendAfter: GUI_LAI_SAU_S };
}

export async function xacThucMa(email, portal, ma) {
  kiemTraEmailCong(email, portal);
  const tk = await timTaiKhoan(email);
  const hetHan = new AppError(410, 'CODE_EXPIRED', 'Mã xác thực đã hết hạn. Hãy gửi lại email để nhận mã mới.');
  if (!tk || CONG_CUA_VAI_TRO[tk.role] !== portal) throw hetHan;
  const { data: dong, error } = await supabase.from('verification_code')
    .select('code_id, code_hash, expires_at, attempt_count')
    .eq('account_id', tk.account_id).eq('purpose', 'Password_Reset').is('consumed_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!dong || new Date(dong.expires_at) <= new Date()) throw hetHan;
  if (dong.attempt_count >= MA_SAI_TOI_DA) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Nhập sai mã quá nhiều lần. Hãy gửi lại email để nhận mã mới.');
  }
  if (sha256(`${tk.account_id}:${ma}`) !== dong.code_hash) {
    await supabase.from('verification_code').update({ attempt_count: dong.attempt_count + 1 }).eq('code_id', dong.code_id);
    throw new AppError(400, 'INVALID_CODE', 'Mã xác thực không đúng.');
  }
  // Dùng mã: chỉ thành công nếu chưa ai dùng trước (chặn gửi 2 lần cùng lúc)
  const { data: daDung, error: dungError } = await supabase.from('verification_code')
    .update({ consumed_at: new Date().toISOString() }).eq('code_id', dong.code_id).is('consumed_at', null).select('code_id');
  if (dungError) throw dungError;
  if (!daDung.length) throw hetHan;

  const token = taoToken();
  const { error: tokenError } = await supabase.from('verification_code').insert({
    account_id: tk.account_id,
    purpose: 'Reset_Token',
    code_hash: sha256(token),
    expires_at: new Date(Date.now() + TOKEN_DAT_LAI_HET_HAN_MS).toISOString(),
  });
  if (tokenError) throw tokenError;
  return { resetToken: token };
}

export async function datMatKhauMoi(resetToken, matKhauMoi) {
  if (!matKhauDuManh(matKhauMoi)) {
    throw new AppError(400, 'WEAK_PASSWORD', 'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.');
  }
  const hetHan = new AppError(410, 'TOKEN_EXPIRED', 'Phiên đặt lại mật khẩu đã hết hạn. Hãy làm lại từ bước nhập email.');
  if (typeof resetToken !== 'string' || !resetToken || resetToken.length > 200) throw hetHan;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('verification_code')
    .update({ consumed_at: now })
    .eq('code_hash', sha256(resetToken)).eq('purpose', 'Reset_Token').is('consumed_at', null).gt('expires_at', now)
    .select('account_id');
  if (error) throw error;
  if (!data.length) throw hetHan;
  const accountId = data[0].account_id;
  const { error: upError } = await supabase.from('account')
    .update({ password_hash: await bamMatKhau(matKhauMoi) }).eq('account_id', accountId);
  if (upError) throw upError;
  // Đổi mật khẩu thì đăng xuất mọi thiết bị
  await supabase.from('login_session').update({ revoked_at: now }).eq('account_id', accountId).is('revoked_at', null);
}
