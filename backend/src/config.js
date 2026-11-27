// Đọc cấu hình từ backend/.env (Node nạp file này qua --env-file, xem package.json).
// Thiếu biến nào thì dừng ngay khi khởi động, báo rõ cần điền gì.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Thiếu biến ${name} trong backend/.env (xem backend/.env.example)`);
  }
  return value;
}

const testStudentId = Number(required('TEST_STUDENT_ID'));
if (!Number.isInteger(testStudentId) || testStudentId <= 0) {
  throw new Error('TEST_STUDENT_ID trong backend/.env phải là số nguyên dương (vd 9101)');
}

// Tài khoản DN thử (database/seed_dn.sql). Tùy chọn để máy chỉ làm phần SV vẫn chạy được; mặc định 9501.
const testBusinessId = Number(process.env.TEST_BUSINESS_ID || 9501);
if (!Number.isInteger(testBusinessId) || testBusinessId <= 0) {
  throw new Error('TEST_BUSINESS_ID trong backend/.env phải là số nguyên dương (vd 9501)');
}

// Chế độ xác thực:
//   test    (mặc định): có phiên đăng nhập thì dùng phiên; gọi API không kèm phiên thì dùng tài khoản thử
//                       TEST_STUDENT_ID / TEST_BUSINESS_ID (script kiểm thử, máy chưa cập nhật vẫn chạy)
//   session           : bắt buộc đăng nhập, không có phiên → 401
const authMode = process.env.AUTH_MODE || 'test';
if (!['test', 'session'].includes(authMode)) {
  throw new Error('AUTH_MODE trong backend/.env phải là test hoặc session');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
  authMode,
  // Cookie phiên chỉ gửi qua HTTPS (bật khi triển khai có HTTPS; chạy http://localhost thì để false)
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Danh tính lấy từ phiên đăng nhập ở máy chủ, KHÔNG lấy từ dữ liệu client gửi lên.
  // Tài khoản thử chỉ dùng khi AUTH_MODE=test và lời gọi API không kèm phiên.
  testStudentId,
  testBusinessId,
};
