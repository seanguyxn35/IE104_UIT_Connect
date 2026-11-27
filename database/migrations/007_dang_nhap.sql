/* Đăng nhập theo vai trò (phiên phía máy chủ + cookie) và quên mật khẩu.
   Chạy SAU 006_sv_bai_toan_rd.sql, trên Supabase → SQL Editor. Chạy lại nhiều lần vẫn an toàn.
   Dùng lại các bảng sẵn có: account (password_hash, email_verified_at, is_active), login_session, verification_code.

   1. verification_code.purpose thêm 'Reset_Token': mã dùng một lần cấp sau khi nhập đúng mã 6 chữ số,
      để bước "đặt mật khẩu mới" không phải gửi lại mã (chỉ lưu bản băm SHA-256, hết hạn 15 phút).
   2. Chỉ mục cho tra phiên theo tài khoản (thu hồi mọi phiên khi đổi mật khẩu) và tra mã mới nhất của tài khoản.

   Không thêm CHECK định dạng email (MSSV 8 chữ số @gm.uit.edu.vn, GV @uit.edu.vn): dữ liệu cũ chưa khớp thì mọi
   lệnh UPDATE trên dòng đó (kể cả đổi ảnh đại diện) sẽ lỗi. Định dạng được kiểm tra ở backend (backend/src/auth/auth.service.js).
*/

BEGIN;

ALTER TABLE verification_code DROP CONSTRAINT IF EXISTS ck_verification_code_purpose;
ALTER TABLE verification_code ADD CONSTRAINT ck_verification_code_purpose
    CHECK (purpose IN ('Email_Verify','Password_Reset','Reset_Token'));

CREATE INDEX IF NOT EXISTS ix_login_session_account ON login_session (account_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_verification_code_account ON verification_code (account_id, purpose, created_at DESC);

COMMIT;
