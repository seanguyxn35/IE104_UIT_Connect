// Xác thực và phân quyền theo vai trò cho các API.
//   napPhien            : đọc cookie phiên (uitc_session) → req.user = { accountId, role, email, fullName } hoặc null
//   chiChoVaiTro(...vt) : chỉ cho vai trò trong danh sách
//       không có phiên → 401 UNAUTHENTICATED   (AUTH_MODE=test: dùng tài khoản thử TEST_STUDENT_ID / TEST_BUSINESS_ID)
//       sai vai trò    → 403 FORBIDDEN_ROLE    (cả ở AUTH_MODE=test)
// Danh tính chỉ lấy từ phiên ở máy chủ, không nhận accountId / studentId từ client.
import { config } from './config.js';
import { AppError } from './errors.js';
import { SESSION_COOKIE, layNguoiDungTuToken } from './services/authService.js';

export function docCookie(req, ten) {
  for (const phan of (req.headers.cookie || '').split(';')) {
    const i = phan.indexOf('=');
    if (i > 0 && phan.slice(0, i).trim() === ten) {
      try { return decodeURIComponent(phan.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export async function napPhien(req, res, next) {
  req.user = await layNguoiDungTuToken(docCookie(req, SESSION_COOKIE));
  next();
}

// Tài khoản thử khi chưa đăng nhập (chỉ AUTH_MODE=test, để script kiểm thử và máy chưa cập nhật vẫn chạy)
const TAI_KHOAN_THU = {
  Student: () => ({ accountId: config.testStudentId, role: 'Student', thu: true }),
  Business: () => ({ accountId: config.testBusinessId, role: 'Business', thu: true }),
};

export function chiChoVaiTro(...vaiTro) {
  return (req, res, next) => {
    if (!req.user) {
      const thu = config.authMode === 'test' && TAI_KHOAN_THU[vaiTro[0]];
      if (!thu) throw new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập để dùng chức năng này.');
      req.user = thu();
    }
    if (!vaiTro.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Tài khoản của bạn không có quyền dùng chức năng này.');
    }
    next();
  };
}
