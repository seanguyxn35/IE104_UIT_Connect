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

export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
  // Bài thực hành không xây chức năng đăng nhập: danh tính SV lấy từ tài khoản thử cấu hình ở máy chủ,
  // KHÔNG lấy từ dữ liệu client gửi lên.
  testStudentId,
};
