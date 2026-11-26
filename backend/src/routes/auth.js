// API đăng nhập theo vai trò (hợp đồng chi tiết: frontend/assets/js/auth.js).
//   POST /api/auth/login   { email, password, remember?, portal: 'uit'|'business' }
//        → 200 { user } + cookie uitc_session (HttpOnly, SameSite=Lax)
//        | 400 INVALID_INPUT / INVALID_EMAIL | 401 INVALID_CREDENTIALS
//        | 403 WRONG_PORTAL / ACCOUNT_DISABLED / EMAIL_NOT_VERIFIED | 429 TOO_MANY_ATTEMPTS
//   GET  /api/auth/me      → 200 { user } | 401 UNAUTHENTICATED
//   POST /api/auth/logout  → 204 (thu hồi phiên, xóa cookie)
//   POST /api/auth/password-reset/request { email, portal }          → 202 { resendAfter } | 400 | 403 | 429 RESEND_TOO_SOON
//   POST /api/auth/password-reset/verify  { email, portal, code }    → 200 { resetToken } | 400 INVALID_CODE | 410 CODE_EXPIRED | 429
//   POST /api/auth/password-reset/confirm { resetToken, newPassword } → 204 | 400 WEAK_PASSWORD | 410 TOKEN_EXPIRED
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { docCookie } from '../authMiddleware.js';
import {
  SESSION_COOKIE, PORTALS, chuanHoaEmail, dangNhap, layNguoiDungTuToken, dangXuat,
  yeuCauDatLai, xacThucMa, datMatKhauMoi,
} from '../services/authService.js';

export const authRouter = Router();

// Không lưu cache câu trả lời có thông tin phiên
authRouter.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function docEmailCong(body) {
  const email = chuanHoaEmail(body?.email);
  if (!email) throw new AppError(400, 'INVALID_INPUT', 'Nhập email.');
  if (!PORTALS.includes(body?.portal)) throw new AppError(400, 'INVALID_INPUT', 'Cổng đăng nhập phải là uit hoặc business.');
  return { email, portal: body.portal };
}

function tuyChonCookie(maxAgeMs) {
  const o = { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' };
  if (maxAgeMs) o.maxAge = maxAgeMs;   // không có maxAge: cookie hết khi đóng trình duyệt (phiên 8 giờ ở máy chủ)
  return o;
}

authRouter.post('/login', async (req, res) => {
  const { email, portal } = docEmailCong(req.body);
  const password = req.body?.password;
  if (typeof password !== 'string' || !password || password.length > 200) {
    throw new AppError(400, 'INVALID_INPUT', 'Nhập mật khẩu.');
  }
  if (req.body.remember !== undefined && typeof req.body.remember !== 'boolean') {
    throw new AppError(400, 'INVALID_INPUT', 'remember phải là true hoặc false.');
  }
  const kq = await dangNhap({ email, password, remember: req.body.remember === true, portal, deviceInfo: req.get('user-agent') });
  res.cookie(SESSION_COOKIE, kq.token, tuyChonCookie(kq.maxAgeMs));
  res.json({ user: kq.user });
});

authRouter.get('/me', async (req, res) => {
  const user = await layNguoiDungTuToken(docCookie(req, SESSION_COOKIE));
  if (!user) {
    if (docCookie(req, SESSION_COOKIE)) res.clearCookie(SESSION_COOKIE, tuyChonCookie());
    throw new AppError(401, 'UNAUTHENTICATED', 'Chưa đăng nhập hoặc phiên đã hết hạn.');
  }
  res.json({ user });
});

authRouter.post('/logout', async (req, res) => {
  await dangXuat(docCookie(req, SESSION_COOKIE));
  res.clearCookie(SESSION_COOKIE, tuyChonCookie());
  res.status(204).end();
});

authRouter.post('/password-reset/request', async (req, res) => {
  const { email, portal } = docEmailCong(req.body);
  res.status(202).json(await yeuCauDatLai(email, portal));
});

authRouter.post('/password-reset/verify', async (req, res) => {
  const { email, portal } = docEmailCong(req.body);
  const code = req.body?.code;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new AppError(400, 'INVALID_INPUT', 'Mã xác thực gồm 6 chữ số.');
  res.json(await xacThucMa(email, portal, code));
});

authRouter.post('/password-reset/confirm', async (req, res) => {
  await datMatKhauMoi(req.body?.resetToken, req.body?.newPassword);
  res.status(204).end();
});
