/* =====================================================================
   UIT CONNECT – DỮ LIỆU THỬ cho ĐĂNG NHẬP THEO VAI TRÒ (auth/01, auth/02, quên mật khẩu)
   Chạy SAU: seed.sql, seed_dn.sql, seed_sv_rd.sql, migrations/007_dang_nhap.sql.
   Cách chạy: Supabase → SQL Editor → dán toàn bộ file → Run. Chạy lại bất cứ lúc nào để đặt lại.

   Toàn bộ là dữ liệu GIẢ. Mật khẩu chung của mọi tài khoản thử: MatKhau@123
   (lưu bản băm scrypt, không lưu mật khẩu gốc).

   | Tài khoản                         | Email                          | Cổng        | Ghi chú                    |
   |-----------------------------------|--------------------------------|-------------|----------------------------|
   | Admin (9001)                      | admin.uitconnect@uit.edu.vn    | UIT SSO     | email Admin quy định       |
   | SV A (9101), SV B (9102)          | 23529101@gm.uit.edu.vn, ...102 | UIT SSO     | MSSV đổi từ TEST0001/0002  |
   | SV chưa xác thực email (9103)     | 23529103@gm.uit.edu.vn         | UIT SSO     | → 403 EMAIL_NOT_VERIFIED   |
   | SV bị khóa (9104)                 | 23529104@gm.uit.edu.vn         | UIT SSO     | → 403 ACCOUNT_DISABLED     |
   | SV của dữ liệu DN (9601–9639)     | <MSSV>@gm.uit.edu.vn           | UIT SSO     | bỏ tiền tố test.dn.        |
   | GV (9201)                         | test.gv@uit.edu.vn             | UIT SSO     |                            |
   | GV (9701–9703)                    | test.dn.gv97xx@uit.edu.vn      | UIT SSO     |                            |
   | DN V-Tech Global (9501)           | test.dn@vtech-global.example   | Email & MK  |                            |
   | DN / Lab khác (9511–9525)         | test.dn95xx@rd-partner.example | Email & MK  |                            |
   Phiên đăng nhập và mã quên mật khẩu cũ của các tài khoản thử bị xóa khi chạy lại file này.
   ===================================================================== */

BEGIN;

-- 0. Chặn sớm nếu thiếu bước trước
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_verification_code_purpose'
                   AND pg_get_constraintdef(oid) LIKE '%Reset_Token%') THEN
        RAISE EXCEPTION 'Chưa chạy database/migrations/007_dang_nhap.sql';
    END IF;
    IF (SELECT count(*) FROM account WHERE account_id IN (9101, 9102, 9201, 9501)) < 4
    OR NOT EXISTS (SELECT 1 FROM account WHERE account_id = 9511) THEN
        RAISE EXCEPTION 'Thiếu dữ liệu thử: chạy seed.sql, seed_dn.sql, seed_sv_rd.sql trước';
    END IF;
END $$;

-- 1. Xóa phiên và mã cũ của tài khoản thử
DELETE FROM login_session WHERE account_id BETWEEN 9001 AND 9999;
DELETE FROM verification_code WHERE account_id BETWEEN 9001 AND 9999;

-- 2. Email SV theo định dạng MSSV 8 chữ số @gm.uit.edu.vn
--    (seed.sql / seed_dn.sql mới đã dùng định dạng này; các lệnh dưới sửa CSDL đã nạp bản cũ)
UPDATE student_profile SET student_code = '23529101' WHERE student_id = 9101 AND student_code <> '23529101';
UPDATE student_profile SET student_code = '23529102' WHERE student_id = 9102 AND student_code <> '23529102';
UPDATE account AS a SET email = sp.student_code || '@gm.uit.edu.vn'
FROM student_profile AS sp
WHERE sp.student_id = a.account_id
  AND (a.account_id IN (9101, 9102) OR a.account_id BETWEEN 9601 AND 9639)
  AND sp.student_code ~ '^[0-9]{8}$'
  AND a.email <> sp.student_code || '@gm.uit.edu.vn';

-- 3. Admin: tài khoản riêng (account 1–1 admin_profile), đăng nhập qua cổng UIT SSO
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES (9001, 'admin.uitconnect@uit.edu.vn', 'dat-o-buoc-5', 'Admin', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;
INSERT INTO admin_profile (admin_id, full_name, department)
VALUES (9001, 'Quản trị viên UIT Connect', 'Ban quản trị UIT Connect')
ON CONFLICT (admin_id) DO UPDATE SET full_name = EXCLUDED.full_name, department = EXCLUDED.department;

-- 4. Hai SV cho ca lỗi: chưa xác thực email (9103), bị khóa (9104)
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES
    (9103, '23529103@gm.uit.edu.vn', NULL, 'Student', true,  NULL,  now()),
    (9104, '23529104@gm.uit.edu.vn', NULL, 'Student', false, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role,
    is_active = EXCLUDED.is_active, email_verified_at = EXCLUDED.email_verified_at;
INSERT INTO student_profile (student_id, full_name, student_code, major_id, class_name, cohort, enrollment_year)
SELECT s.id, s.ten, s.ma, m.major_id, 'KHMT2023', 'K18', 2023
FROM (VALUES (9103, 'Sinh viên Thử C (chưa xác thực email)', '23529103'),
             (9104, 'Sinh viên Thử D (bị khóa)', '23529104')) AS s(id, ten, ma)
JOIN major AS m ON m.name = 'Trí tuệ Nhân tạo & Thị giác máy tính'
ON CONFLICT (student_id) DO UPDATE SET full_name = EXCLUDED.full_name, student_code = EXCLUDED.student_code;

-- 5. Mật khẩu thử chung: MatKhau@123 (scrypt N=16384, r=8, p=1)
UPDATE account
SET password_hash = 'scrypt$16384$8$1$GP3L3gLdpBHvMNjJHcvUgg==$PYpKhmletrhEHteXLFeGAca+gpCUWHc7fVLX+CtAD8YxQ/NKQuNZgnAbaTGEtuhFS6jJfXylITDp3YiYqwjfLQ==',
    email_verified_at = CASE WHEN account_id = 9103 THEN NULL ELSE COALESCE(email_verified_at, now()) END
WHERE account_id IN (9001, 9101, 9102, 9103, 9104, 9201, 9501)
   OR account_id BETWEEN 9511 AND 9525
   OR account_id BETWEEN 9601 AND 9639
   OR account_id BETWEEN 9701 AND 9703;

COMMIT;

-- Kiểm tra nhanh: mọi tài khoản thử đã có mật khẩu, email SV đúng dạng MSSV
-- SELECT role, count(*) AS so_tk, count(*) FILTER (WHERE email ~ '^[0-9]{8}@gm\.uit\.edu\.vn$') AS email_mssv
-- FROM account WHERE password_hash LIKE 'scrypt$%' AND account_id BETWEEN 9001 AND 9999 GROUP BY role ORDER BY role;
