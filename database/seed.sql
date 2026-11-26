/* =====================================================================
   UIT CONNECT – DỮ LIỆU THỬ cho chức năng "SV ứng tuyển đề tài Lab"
   (Bài thực hành Web – Bước 2). Chạy SAU schema.postgres.sql.
   Cách chạy: Supabase → SQL Editor → dán toàn bộ file → Run.
   Chạy lại nhiều lần vẫn được (upsert theo ID cố định).

   Toàn bộ là dữ liệu GIẢ, không phải SV/GV thật. ID cố định trong dải 9xxx
   để backend, Postman và TEST_REPORT.md tham chiếu ổn định:

   | Dữ liệu                         | ID                 | Dùng cho   |
   |---------------------------------|--------------------|------------|
   | SV A – tài khoản thử (đăng nhập) | account_id = 9101  | Mọi ca     |
   | SV B                            | account_id = 9102  | TC03       |
   | GV ra đề                        | account_id = 9201  | Mọi ca     |
   | Đề tài 1: slots 3, Open, 0 đơn  | topic_id   = 9001  | TC01 → R1  |
   | Đề tài 2: SV A đã có đơn Pending | topic_id   = 9002  | TC02 → R2  |
   | Đề tài 3: slots 1, SV B Accepted | topic_id   = 9003  | TC03 → R3  |

   Ràng buộc sẵn có phải thỏa:
     - ck_account_email_domain: SV đuôi @gm.uit.edu.vn, GV đuôi @uit.edu.vn
     - student_profile.major_id NOT NULL, lecturer_profile.faculty_id NOT NULL
     - ck_account_password: SV/GV được để password_hash NULL (đăng nhập SSO)
     - uq_lab_application (topic_id, student_id): DB chặn đơn trùng (R2)

   Lưu ý: ID được chèn tường minh nên sequence IDENTITY không tăng theo.
   Dữ liệu thật sinh tự động bắt đầu từ 1, còn rất xa dải 9xxx.
   ===================================================================== */

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Tài khoản: 2 SV + 1 GV
-- ---------------------------------------------------------------------
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES
    (9101, 'test.sv.a@gm.uit.edu.vn', NULL, 'Student',  true, now(), now()),
    (9102, 'test.sv.b@gm.uit.edu.vn', NULL, 'Student',  true, now(), now()),
    (9201, 'test.gv@uit.edu.vn',      NULL, 'Lecturer', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET
    email     = EXCLUDED.email,
    role      = EXCLUDED.role,
    is_active = true;

-- ---------------------------------------------------------------------
-- 2. Hồ sơ SV (bắt buộc major_id), lấy chuyên ngành có sẵn ở dữ liệu danh mục
-- ---------------------------------------------------------------------
INSERT INTO student_profile (student_id, full_name, student_code, major_id, class_name, cohort, enrollment_year, gpa)
SELECT s.student_id, s.full_name, s.student_code, m.major_id, 'KHMT2023', 'K18', 2023, s.gpa
FROM (VALUES
    (9101, 'Sinh viên Thử A', 'TEST0001', 8.20),
    (9102, 'Sinh viên Thử B', 'TEST0002', 8.50)
) AS s(student_id, full_name, student_code, gpa)
JOIN major AS m ON m.name = 'Trí tuệ Nhân tạo & Thị giác máy tính'
ON CONFLICT (student_id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    student_code = EXCLUDED.student_code,
    major_id     = EXCLUDED.major_id;

-- ---------------------------------------------------------------------
-- 3. Hồ sơ GV (bắt buộc faculty_id)
-- ---------------------------------------------------------------------
INSERT INTO lecturer_profile (lecturer_id, full_name, lecturer_code, academic_title, faculty_id, lab_id, is_accepting_advisees)
SELECT 9201, 'Giảng viên Thử', 'TESTGV01', 'TS', f.faculty_id, l.lab_id, true
FROM faculty AS f
LEFT JOIN lab AS l ON l.name = 'Lab CV&PR'
WHERE f.code = 'KHMT'
ON CONFLICT (lecturer_id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    faculty_id = EXCLUDED.faculty_id,
    lab_id     = EXCLUDED.lab_id;

-- ---------------------------------------------------------------------
-- 4. Ba đề tài, cả 3 đều 'Open' và còn hạn nộp.
--    Đề tài 3 cố ý để status = 'Open' dù đã đủ người: R3 phải do máy chủ
--    đếm số đơn Accepted so với slots, không dựa vào cột status.
--    Upsert đưa slots/status/deadline về đúng giá trị ban đầu.
-- ---------------------------------------------------------------------
INSERT INTO lab_topic (topic_id, lecturer_id, lab_id, field_id, topic_type, title, description, slots, deadline, status)
SELECT t.topic_id, 9201, l.lab_id, f.field_id, 'Student_Research', t.title, t.description, t.slots,
       current_date + 30, 'Open'
FROM (VALUES
    (9001, '[TEST] Đề tài 1 – Còn 3 chỗ, chưa có đơn',
           'Dữ liệu thử cho TC01 (R1): SV A ứng tuyển thành công.', 3),
    (9002, '[TEST] Đề tài 2 – SV A đã ứng tuyển',
           'Dữ liệu thử cho TC02 (R2): SV A ứng tuyển lại bị từ chối vì trùng.', 3),
    (9003, '[TEST] Đề tài 3 – Đã đủ 1/1 chỗ',
           'Dữ liệu thử cho TC03 (R3): SV A ứng tuyển bị từ chối vì hết chỗ.', 1)
) AS t(topic_id, title, description, slots)
LEFT JOIN lab   AS l ON l.name = 'Lab CV&PR'
LEFT JOIN field AS f ON f.name = 'Thị giác máy tính'
ON CONFLICT (topic_id) DO UPDATE SET
    lecturer_id = EXCLUDED.lecturer_id,
    title       = EXCLUDED.title,
    description = EXCLUDED.description,
    slots       = EXCLUDED.slots,
    deadline    = EXCLUDED.deadline,
    status      = 'Open';

-- ---------------------------------------------------------------------
-- 5. Đơn ứng tuyển có sẵn
--    - Đề tài 2: SV A Pending   → TC02 bị chặn vì trùng
--    - Đề tài 3: SV B Accepted  → 1/1 chỗ, TC03 bị chặn vì hết chỗ
--    Đề tài 1 không có đơn nào.
--    Xóa trước mọi đơn thuộc phạm vi thử (vd đơn TC01 tạo ở lần chạy trước).
-- ---------------------------------------------------------------------
DELETE FROM lab_application
WHERE topic_id IN (9001, 9002, 9003)
   OR student_id IN (9101, 9102);

INSERT INTO lab_application (topic_id, student_id, message, status, responded_at)
VALUES
    (9002, 9101, '[TEST] Đơn có sẵn của SV A', 'Pending',  NULL),
    (9003, 9102, '[TEST] Đơn có sẵn của SV B', 'Accepted', now())
ON CONFLICT (topic_id, student_id) DO UPDATE SET
    status       = EXCLUDED.status,
    responded_at = EXCLUDED.responded_at;

COMMIT;

-- ---------------------------------------------------------------------
-- Kiểm tra nhanh (kết quả mong đợi):
--   9001 | slots 3 | 0 đơn | 0 Accepted
--   9002 | slots 3 | 1 đơn | 0 Accepted  (SV A Pending)
--   9003 | slots 1 | 1 đơn | 1 Accepted  (SV B)
-- ---------------------------------------------------------------------
SELECT t.topic_id, t.title, t.slots, t.status,
       count(a.application_id)                                AS so_don,
       count(a.application_id) FILTER (WHERE a.status = 'Accepted') AS so_accepted,
       string_agg(a.student_id || ':' || a.status, ', ')      AS chi_tiet
FROM lab_topic AS t
LEFT JOIN lab_application AS a ON a.topic_id = t.topic_id
WHERE t.topic_id IN (9001, 9002, 9003)
GROUP BY t.topic_id, t.title, t.slots, t.status
ORDER BY t.topic_id;
