/* =====================================================================
   UIT CONNECT – DỮ LIỆU THỬ cho luồng Doanh nghiệp (DN-04/08/09/16, DN-01)
   Sinh từ dữ liệu mẫu của giao diện (frontend/assets/js/dn-bai-toan-data.js) để
   giao diện có máy chủ và không có máy chủ hiển thị cùng nội dung.

   Chạy SAU schema.postgres.sql + migrations/004_dn_hop_thu_ket_noi.sql.
   Cách chạy: Supabase → SQL Editor → dán toàn bộ file → Run.
   Chạy lại bất cứ lúc nào để ĐẶT LẠI dữ liệu thử DN (xóa rồi nạp lại trong dải ID cố định).
   Sau khi chạy: cd backend && npm run seed:dn-files  (tải tệp PDF minh họa lên bucket "rd-files").

   Toàn bộ là dữ liệu GIẢ. ID cố định trong dải 9xxx:
   | Dữ liệu                              | ID          |
   |--------------------------------------|-------------|
   | Doanh nghiệp V-Tech Global (TEST_BUSINESS_ID) | 9501 |
   | Chuyên ngành HTTT (danh mục thiếu)   | 9050        |
   | Sinh viên                            | 9601–9639   |
   | Giảng viên                           | 9701–9703   |
   | Nhóm                                 | 9801–9813   |
   | Bài toán R&D (084, 079, 071, 091, nháp 904) | 9084, 9079, 9071, 9091, 9904 |
   | Proposal (connection_request)        | 9901–9915   |
   | Lịch hẹn mẫu                         | 9951–9952   |
   | Tệp đính kèm                         | 9961–9981   |
   ===================================================================== */

BEGIN;

-- 0. Chặn sớm nếu chưa chạy migration 004
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'connection_request' AND column_name = 'student_id') THEN
        RAISE EXCEPTION 'Chưa chạy database/migrations/004_dn_hop_thu_ket_noi.sql';
    END IF;
END $$;

-- 1. Xóa dữ liệu thử DN cũ (kể cả dữ liệu ca kiểm thử tạo thêm trên các proposal thử)
DELETE FROM rd_attachment WHERE attachment_id BETWEEN 9961 AND 9999
    OR (owner_type = 'Request' AND owner_id BETWEEN 9901 AND 9950);
DELETE FROM connection_meeting WHERE request_id BETWEEN 9901 AND 9950;
DELETE FROM connection_request WHERE request_id BETWEEN 9901 AND 9950 OR business_id = 9501;
DELETE FROM team_member WHERE team_id BETWEEN 9801 AND 9850;
DELETE FROM student_team WHERE team_id BETWEEN 9801 AND 9850;
DELETE FROM business_problem WHERE business_id = 9501 OR problem_id IN (9084, 9079, 9071, 9091, 9904);

-- 2. Tài khoản & hồ sơ doanh nghiệp (DN bắt buộc có mật khẩu: giá trị giả, không đăng nhập được)
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES (9501, 'test.dn@vtech-global.example', 'seed-khong-dang-nhap', 'Business', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;
INSERT INTO business_profile (business_id, company_name, tax_code, website, industry, address, verified_status)
VALUES (9501, 'V-Tech Global', 'TEST-9501', 'https://vtech-global.example', 'Công nghệ thông tin', 'Khu Công nghệ cao TP.HCM', 'Pending')
ON CONFLICT (business_id) DO UPDATE SET company_name = EXCLUDED.company_name, verified_status = EXCLUDED.verified_status;

-- 3. Chuyên ngành cho khoa HTTT (danh mục gốc chưa có)
INSERT INTO major (major_id, faculty_id, name)
SELECT 9050, faculty_id, 'Hệ thống Thông tin (dữ liệu thử)' FROM faculty WHERE code = 'HTTT'
ON CONFLICT (major_id) DO NOTHING;

-- 4. Sinh viên
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES
    (9601, 'test.dn.21521544@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9602, 'test.dn.21521560@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9603, 'test.dn.21521602@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9604, 'test.dn.21521619@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9605, 'test.dn.21520733@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9606, 'test.dn.21520781@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9607, 'test.dn.21522210@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9608, 'test.dn.21522245@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9609, 'test.dn.21522288@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9610, 'test.dn.20520412@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9611, 'test.dn.21520530@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9612, 'test.dn.21520561@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9613, 'test.dn.21520890@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9614, 'test.dn.21521415@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9615, 'test.dn.21521877@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9616, 'test.dn.21520001@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9617, 'test.dn.21520342@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9618, 'test.dn.21520678@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9619, 'test.dn.21521960@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9620, 'test.dn.21521977@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9621, 'test.dn.22520845@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9622, 'test.dn.21521655@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9623, 'test.dn.21521802@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9624, 'test.dn.21520915@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9625, 'test.dn.21522040@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9626, 'test.dn.21522118@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9627, 'test.dn.21522231@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9628, 'test.dn.21522306@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9629, 'test.dn.20521140@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9630, 'test.dn.21521322@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9631, 'test.dn.22521077@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9632, 'test.dn.22521090@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9633, 'test.dn.22521104@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9634, 'test.dn.21521789@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9635, 'test.dn.21521811@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9636, 'test.dn.21521836@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9637, 'test.dn.20521560@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9638, 'test.dn.20521588@gm.uit.edu.vn', NULL, 'Student', true, now(), now()),
    (9639, 'test.dn.20521603@gm.uit.edu.vn', NULL, 'Student', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;

INSERT INTO student_profile (student_id, full_name, student_code, major_id, class_name, cohort, gpa, training_score)
VALUES
    (9601, 'Phạm Thùy Linh', '21521544', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'MMTT2021', 'K19', 8.64, 91),
    (9602, 'Đoàn Minh Khoa', '21521560', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'MMTT2021', 'K19', 8.21, NULL),
    (9603, 'Lương Bảo Ngọc', '21521602', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'MMTT2021', 'K19', 8.40, NULL),
    (9604, 'Tạ Quang Huy', '21521619', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'MMTT2021', 'K19', 7.95, NULL),
    (9605, 'Hồ Quang Vinh', '21520733', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2021', 'K19', 8.35, 87),
    (9606, 'Kiều Anh Thư', '21520781', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2021', 'K19', 8.18, NULL),
    (9607, 'Bùi Thanh Tâm', '21522210', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHTN2021', 'K19', 9.02, 93),
    (9608, 'Mạc Hải Đăng', '21522245', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHTN2021', 'K19', 8.77, NULL),
    (9609, 'Quách Ngọc Hân', '21522288', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHTN2021', 'K19', 8.69, NULL),
    (9610, 'Hà Minh Tuấn', '20520412', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), NULL, NULL, 8.50, NULL),
    (9611, 'Phan Thị Diệu', '21520530', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), NULL, NULL, 8.88, NULL),
    (9612, 'Trần Đức Lộc', '21520561', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), NULL, NULL, 8.10, NULL),
    (9613, 'Trần Minh Quân', '21520890', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'ATTT2021', 'K19', 8.71, 90),
    (9614, 'Lý Gia Huy', '21521415', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'ATTT2021', 'K19', 8.30, NULL),
    (9615, 'Ngô Bảo Trâm', '21521877', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'ATTT2021', 'K19', 8.55, NULL),
    (9616, 'Nguyễn Văn An', '21520001', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.92, 94),
    (9617, 'Đặng Hoàng Nam', '21520342', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.45, NULL),
    (9618, 'Vũ Thảo Nhi', '21520678', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.60, NULL),
    (9619, 'Ngô Đức Huy', '21521960', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'ATTT2021', 'K19', 8.05, 85),
    (9620, 'Châu Gia Phúc', '21521977', (SELECT major_id FROM major WHERE name = 'An toàn Thông tin & Mật mã học'), 'ATTT2021', 'K19', 7.88, NULL),
    (9621, 'Lâm Nhật Minh', '22520845', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2022', 'K20', 7.90, 82),
    (9622, 'Đinh Mai Phương', '21521655', 9050, 'HTTT2021', 'K19', 8.50, 88),
    (9623, 'Trương Gia Bảo', '21521802', 9050, 'HTTT2021', 'K19', 8.12, NULL),
    (9624, 'Phạm Quốc Bảo', '21520915', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHTN2021', 'K19', 9.10, 96),
    (9625, 'Lê Hoàng Yến', '21522040', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.80, 92),
    (9626, 'Huỳnh Đức Toàn', '21522118', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.42, NULL),
    (9627, 'Mai Khánh Linh', '21522231', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.65, NULL),
    (9628, 'Võ Minh Trí', '21522306', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), 'KHMT2021', 'K19', 8.20, NULL),
    (9629, 'Phan Lê Khánh', '20521140', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), NULL, NULL, 8.90, NULL),
    (9630, 'Nguyễn Khôi', '21521322', (SELECT major_id FROM major WHERE name = 'Trí tuệ Nhân tạo & Thị giác máy tính'), NULL, NULL, 8.74, NULL),
    (9631, 'Vương Thảo My', '22521077', 9050, 'HTTT2022', 'K20', 8.02, 86),
    (9632, 'Đặng Tú Anh', '22521090', 9050, 'HTTT2022', 'K20', 7.85, NULL),
    (9633, 'Lê Phước Thịnh', '22521104', 9050, 'HTTT2022', 'K20', 7.70, NULL),
    (9634, 'Đỗ Mai Anh', '21521789', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2021', 'K19', 8.83, 92),
    (9635, 'Trần Thanh Hải', '21521811', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2021', 'K19', 8.47, NULL),
    (9636, 'Phan Anh', '21521836', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2021', 'K19', 8.30, NULL),
    (9637, 'Cao Tuấn Kiệt', '20521560', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2020', 'K18', 8.10, 84),
    (9638, 'Đào Nhật Nam', '20521588', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2020', 'K18', 7.92, NULL),
    (9639, 'Lý Thanh Trúc', '20521603', (SELECT major_id FROM major WHERE name = 'Kỹ thuật Phần mềm nhúng'), 'KTMT2020', 'K18', 8.00, NULL)
ON CONFLICT (student_id) DO UPDATE SET full_name = EXCLUDED.full_name, student_code = EXCLUDED.student_code,
    major_id = EXCLUDED.major_id, class_name = EXCLUDED.class_name, cohort = EXCLUDED.cohort,
    gpa = EXCLUDED.gpa, training_score = EXCLUDED.training_score;

-- 5. Giảng viên
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES
    (9701, 'test.dn.gv9701@uit.edu.vn', NULL, 'Lecturer', true, now(), now()),
    (9702, 'test.dn.gv9702@uit.edu.vn', NULL, 'Lecturer', true, now(), now()),
    (9703, 'test.dn.gv9703@uit.edu.vn', NULL, 'Lecturer', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;

INSERT INTO lecturer_profile (lecturer_id, full_name, lecturer_code, academic_title, faculty_id, lab_id, position_title)
SELECT v.id, v.ten, v.ma, v.hoc_ham, f.faculty_id, l.lab_id, v.chuc_vu
FROM (VALUES
    (9701, 'Trịnh Gia Khang', 'TESTGV9701', 'TS', 'MMT&TT', 'Lab An toàn thông tin (InSecLab)', 'Trưởng nhóm nghiên cứu CyberLab'),
    (9702, 'Trần Quốc Dũng', 'TESTGV9702', 'PGS.TS', 'KHMT', 'Lab AI & Xử lý ngôn ngữ', 'Trưởng NLP Lab UIT'),
    (9703, 'Nguyễn Hoàng Long', 'TESTGV9703', 'TS', 'KTMT', 'Lab Robotics & IoT', 'Giảng viên Lab Robotics & IoT')
) AS v(id, ten, ma, hoc_ham, khoa, lab, chuc_vu)
JOIN faculty AS f ON f.code = v.khoa
LEFT JOIN lab AS l ON l.name = v.lab
ON CONFLICT (lecturer_id) DO UPDATE SET full_name = EXCLUDED.full_name, academic_title = EXCLUDED.academic_title,
    faculty_id = EXCLUDED.faculty_id, lab_id = EXCLUDED.lab_id, position_title = EXCLUDED.position_title;

-- 6. Nhóm sinh viên / nhóm của Lab
INSERT INTO student_team (team_id, team_name, field_id, faculty_id, lab_id, advisor_lecturer_id, status)
SELECT v.id, v.ten, fd.field_id, f.faculty_id, l.lab_id, v.co_van, 'Active'
FROM (VALUES
    (9801, 'NetGuard UIT', 'An toàn thông tin', 'MMT&TT', NULL, NULL::int),
    (9802, 'Edge Sentinel', 'An toàn thông tin', 'KTMT', NULL, NULL::int),
    (9803, 'AI Researchers Group', 'An toàn thông tin', 'KHMT', NULL, NULL::int),
    (9804, 'CyberLab UIT', 'An toàn thông tin', 'MMT&TT', 'Lab An toàn thông tin (InSecLab)', 9701),
    (9805, 'SecLab Fellows UIT', 'An toàn thông tin', 'MMT&TT', NULL, NULL::int),
    (9806, 'VisionLab UIT', 'An toàn thông tin', 'KHMT', NULL, NULL::int),
    (9807, 'Blue Team UIT', 'An toàn thông tin', 'MMT&TT', NULL, NULL::int),
    (9808, 'Data Science Club', 'Trí tuệ nhân tạo & Học máy', 'HTTT', NULL, NULL::int),
    (9809, 'Nhóm AI HealthTech', 'Trí tuệ nhân tạo & Học máy', 'KHMT', NULL, NULL::int),
    (9810, 'NLP Lab UIT', 'Trí tuệ nhân tạo & Học máy', 'KHMT', 'Lab AI & Xử lý ngôn ngữ', 9702),
    (9811, 'MedAI Club', 'Trí tuệ nhân tạo & Học máy', 'HTTT', NULL, NULL::int),
    (9812, 'Lab Robotics & IoT UIT', 'Robot & Xe tự hành', 'KTMT', 'Lab Robotics & IoT', 9703),
    (9813, 'Nhóm AGV K18', 'Robot & Xe tự hành', 'KTMT', NULL, NULL::int)
) AS v(id, ten, linh_vuc, khoa, lab, co_van)
LEFT JOIN field AS fd ON fd.name = v.linh_vuc
LEFT JOIN faculty AS f ON f.code = v.khoa
LEFT JOIN lab AS l ON l.name = v.lab;

INSERT INTO team_member (team_id, student_id, role_in_team, position_title)
VALUES
    (9801, 9601, 'Leader', 'Mô hình autoencoder'),
    (9801, 9602, 'Member', 'eBPF / XDP'),
    (9801, 9603, 'Member', 'Đo hiệu năng trên Jetson'),
    (9801, 9604, 'Member', 'Dashboard giám sát'),
    (9802, 9605, 'Leader', 'Mô hình & sinh mã C'),
    (9802, 9606, 'Member', 'Tích hợp Jetson'),
    (9803, 9607, 'Leader', 'Kiến trúc mô hình'),
    (9803, 9608, 'Member', 'Chưng cất & lượng tử hóa'),
    (9803, 9609, 'Member', 'Dữ liệu & đánh giá'),
    (9804, 9610, 'Leader', 'Học viên cao học · eBPF'),
    (9804, 9611, 'Member', 'Mô hình phát hiện'),
    (9804, 9612, 'Member', 'Testbed & tái hiện tấn công'),
    (9805, 9613, 'Leader', 'eBPF / XDP & thu thập dữ liệu'),
    (9805, 9614, 'Member', 'Mô hình GNN'),
    (9805, 9615, 'Member', 'Kiểm thử & báo cáo'),
    (9806, 9616, 'Leader', 'Xử lý mô hình AI & Pipeline tối ưu hóa'),
    (9806, 9617, 'Member', 'Nhúng phần cứng & NVIDIA Jetson Edge SDK'),
    (9806, 9618, 'Member', 'Thu thập dữ liệu giao thông & Dashboard Web'),
    (9807, 9619, 'Leader', 'Mô hình & WAF'),
    (9807, 9620, 'Member', 'Triển khai máy chủ'),
    (9808, 9622, 'Leader', 'Hạ tầng & đo hiệu năng'),
    (9808, 9623, 'Member', 'Lượng tử hóa mô hình'),
    (9809, 9625, 'Leader', 'Fine-tune & đánh giá mô hình'),
    (9809, 9626, 'Member', 'RAG & vector database'),
    (9809, 9627, 'Member', 'Chuẩn hóa dữ liệu y tế'),
    (9809, 9628, 'Member', 'Triển khai vLLM'),
    (9810, 9629, 'Leader', 'Nghiên cứu sinh · RAG'),
    (9810, 9630, 'Member', 'Fine-tune mô hình'),
    (9811, 9631, 'Leader', 'Thiết kế hội thoại'),
    (9811, 9632, 'Member', 'Tích hợp API'),
    (9811, 9633, 'Member', 'Giao diện'),
    (9812, 9634, 'Leader', 'SLAM & định vị'),
    (9812, 9635, 'Member', 'ROS2 & điều khiển AGV'),
    (9812, 9636, 'Member', 'Sensor Fusion & kiểm thử'),
    (9813, 9637, 'Leader', 'Thị giác máy tính'),
    (9813, 9638, 'Member', 'Điều khiển AGV'),
    (9813, 9639, 'Member', 'Kiểm thử');

-- 7. Bài toán R&D (mã hiển thị giữ như giao diện: RD-2026-084...; hạn nộp tính theo ngày chạy seed)
INSERT INTO business_problem (problem_id, business_id, problem_code, title, requirement, field_id, problem_type, funding, location, deadline, status, created_at)
SELECT v.id, 9501, v.ma, v.tieu_de, v.mo_ta, fd.field_id, v.loai, v.kinh_phi, v.dia_diem, v.han, v.trang_thai, v.tao
FROM (VALUES
    (9084, 'RD-2026-084', 'Hệ thống Edge-AI phát hiện bất thường & tấn công DDoS tầng ứng dụng trên thiết bị biên', '<p>V-Tech Global vận hành hệ thống cổng thanh toán và API cho hơn 200 đối tác bán lẻ. Các đợt tấn công DDoS tầng ứng dụng (HTTP flood, slowloris) ngày càng khó phân biệt với lưu lượng thật.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Phát hiện bất thường ngay tại thiết bị biên (NVIDIA Jetson Orin Nano), độ trễ suy luận dưới 15 ms.</li><li>Thu thập và trích xuất đặc trưng gói tin bằng eBPF, không làm nghẽn luồng mạng.</li><li>Mô hình nén (quantization / pruning) nhưng F1-score không thấp hơn 95%.</li></ol><p><b>Đầu ra mong đợi:</b> mã nguồn pipeline, mô hình đã huấn luyện, báo cáo đánh giá trên tập CIC-DDoS2019 và dữ liệu thật đã ẩn danh do doanh nghiệp cung cấp.</p>', 'An toàn thông tin', 'Open_Call', 300000000, 'TP. Thủ Đức, TP.HCM', current_date + 4, 'Open', TIMESTAMPTZ '2026-10-05 09:00+07'),
    (9079, 'RD-2026-079', 'Tối ưu hóa mô hình LLM chuyên biệt tiếng Việt phục vụ y tế dự phòng trên hạ tầng Hybrid-Cloud', '<p>Ban Công nghệ Y tế V-Tech đang xây dựng trợ lý tư vấn y tế dự phòng cho các trạm y tế phường. Mô hình cần trả lời bằng tiếng Việt, dẫn nguồn từ tài liệu của Bộ Y tế.</p><ul><li>Fine-tune mô hình mở cỡ 7B trên kho hướng dẫn chuyên môn đã chuẩn hóa.</li><li>Xây dựng RAG đa tầng: truy hồi theo chủ đề, sau đó theo đoạn văn bản.</li><li>Nén mô hình để chạy suy luận trên cụm GPU tại chỗ, phần huấn luyện chạy trên đám mây.</li></ul><blockquote>Dữ liệu bệnh nhân không rời hạ tầng của doanh nghiệp. Lab hợp tác làm việc trên dữ liệu đã ẩn danh.</blockquote>', 'Trí tuệ nhân tạo & Học máy', 'Lab_Collaboration', 450000000, 'Ban Công nghệ Y tế V-Tech', current_date + 19, 'Open', TIMESTAMPTZ '2026-09-28 09:00+07'),
    (9071, 'RD-2026-071', 'Phát triển thuật toán SLAM 3D và định vị chính xác cho AGV vận chuyển nhà xưởng thông minh', '<p>Nhà xưởng của V-Tech dùng 12 xe tự hành (AGV) dẫn đường bằng vạch từ. Doanh nghiệp muốn chuyển sang định vị không cần vạch để thay đổi tuyến linh hoạt.</p><ol><li>SLAM 3D bằng LiDAR kết hợp IMU, sai số định vị dưới 2 cm.</li><li>Chạy trên máy tính nhúng của AGV (Embedded Linux, ROS2).</li><li>Kiểm thử trong mô phỏng Gazebo trước khi chạy tại xưởng.</li></ol>', 'Robot & Xe tự hành', 'Sponsored', 350000000, 'Xưởng V-Tech, KCN Tân Bình', DATE '2026-08-15', 'In_Progress', TIMESTAMPTZ '2026-07-10 09:00+07'),
    (9091, 'RD-2026-091', 'Hệ thống kiểm thử vi mạch tự động ứng dụng AI phát hiện lỗi vật lý trên wafer bán dẫn', '<p>Dây chuyền kiểm thử wafer hiện phân loại khuyết tật thủ công từ ảnh SEM, mỗi ca cần 3 kỹ sư.</p><ul><li>Phân loại 9 nhóm khuyết tật vật lý trên ảnh SEM.</li><li>F1-score trên 98.5%, thời gian xử lý dưới 200 ms mỗi ảnh.</li><li>Giải thích được vùng khuyết tật (heatmap) để kỹ sư kiểm tra lại.</li></ul>', 'Thiết kế vi mạch & Bán dẫn', 'Open_Call', 350000000, 'UIT, TP. Thủ Đức', current_date + 94, 'Pending_Approval', TIMESTAMPTZ '2026-10-20 09:00+07'),
    (9904, 'DRAFT-904', 'Nghiên cứu kiến trúc Blockchain Layer-2 tối ưu phí gas cho giao dịch chứng chỉ tín chỉ carbon sinh viên', '<p>Doanh nghiệp muốn thử nghiệm phát hành chứng chỉ tín chỉ carbon cho hoạt động xanh của sinh viên trên mạng Layer-2, giảm phí gas so với Ethereum mainnet.</p><ul><li>So sánh Optimistic Rollup và ZK-Rollup cho bài toán này.</li><li>Thiết kế smart contract phát hành và thu hồi chứng chỉ.</li></ul>', 'Blockchain & Fintech', 'Lab_Collaboration', NULL::numeric, NULL, NULL::date, 'Draft', TIMESTAMPTZ '2026-10-15 09:00+07')
) AS v(id, ma, tieu_de, mo_ta, linh_vuc, loai, kinh_phi, dia_diem, han, trang_thai, tao)
LEFT JOIN field AS fd ON fd.name = v.linh_vuc;

-- 8. Proposal (thời điểm gửi tính lùi từ lúc chạy seed: "2 giờ trước"...; read_at NULL = proposal mới)
INSERT INTO connection_request (request_id, business_id, team_id, lecturer_id, student_id, problem_id, initiated_by,
    title, proposal_content, cover_letter, tags, trl_label, fit_score, status, decline_reason,
    student_confirmed, business_confirmed, read_at, created_at, updated_at)
VALUES
    (9901, 9501, 9801, NULL, NULL, 9084, 'Team',
     'Proposal: Autoencoder nhẹ kết hợp luật eBPF phát hiện HTTP flood trên Jetson', 'Hai tầng phát hiện: luật eBPF lọc nhanh các mẫu tấn công đã biết, autoencoder 1,2 triệu tham số phát hiện bất thường còn lại. Đã thử trên Jetson Orin Nano: độ trễ 9 ms, F1-score 95,4% trên CIC-DDoS2019. Kế hoạch 15 tuần.', 'Nhóm NetGuard UIT gồm 4 sinh viên ngành Mạng máy tính, đã vận hành phòng lab mạng của Khoa trong 2 năm.

Nhóm mong được dùng thử dữ liệu lưu lượng đã ẩn danh của doanh nghiệp để hiệu chỉnh ngưỡng phát hiện.', ARRAY['eBPF', 'Autoencoder', 'NVIDIA Jetson', 'Network Security']::varchar[], 'TRL 3 (Proof of Concept)', 88, 'Submitted', NULL,
     false, false, NULL, now() - interval '120 minutes', now() - interval '120 minutes'),
    (9902, 9501, 9802, NULL, NULL, 9084, 'Team',
     'Proposal: Edge Sentinel – phân loại lưu lượng bằng mô hình cây tăng cường lượng tử hóa', 'Dùng LightGBM đã chuyển sang mã C chạy trực tiếp trên CPU của Jetson, không cần GPU; độ trễ dưới 5 ms. Phù hợp làm tầng lọc đầu, có thể ghép với mô hình học sâu của nhóm khác.', 'Nhóm Edge Sentinel gồm 2 sinh viên Kỹ thuật Máy tính, quan tâm tới tối ưu mô hình trên phần cứng nhúng.', ARRAY['LightGBM', 'Edge AI', 'C/C++']::varchar[], 'TRL 2 (Ý tưởng công nghệ)', 74, 'Submitted', NULL,
     false, false, NULL, now() - interval '300 minutes', now() - interval '300 minutes'),
    (9903, 9501, 9803, NULL, NULL, 9084, 'Team',
     'Proposal: Transformer rút gọn phát hiện tấn công tầng ứng dụng theo chuỗi request', 'Mô hình transformer 4 lớp đọc chuỗi request HTTP theo phiên, chưng cất tri thức từ mô hình lớn rồi lượng tử hóa INT8. F1-score 97,1% trên tập thử, độ trễ 14 ms trên Jetson Orin Nano.', 'AI Researchers Group đã có 2 bài báo hội nghị trong nước về phát hiện xâm nhập bằng học sâu.

Nhóm sẵn sàng trình bày demo trực tuyến khi doanh nghiệp thuận tiện.', ARRAY['Transformer', 'Knowledge Distillation', 'PyTorch', 'TensorRT']::varchar[], 'TRL 3 (Proof of Concept)', 81, 'Submitted', NULL,
     false, false, NULL, now() - interval '1440 minutes', now() - interval '1440 minutes'),
    (9904, 9501, 9804, 9701, NULL, 9084, 'Lecturer',
     'Proposal: Hợp tác CyberLab – nền tảng phát hiện DDoS biên có giải thích', 'CyberLab đề xuất nền tảng gồm bộ thu eBPF, mô hình phát hiện và mô-đun giải thích (SHAP) để kỹ sư vận hành hiểu vì sao lưu lượng bị chặn. Có sẵn testbed 40 máy để tái hiện tấn công.', 'CyberLab UIT đã thực hiện 3 dự án an toàn mạng với doanh nghiệp trong 2 năm gần đây.

Lab đề xuất một buổi trao đổi để thống nhất phạm vi dữ liệu và hạ tầng thử nghiệm.', ARRAY['eBPF', 'Explainable AI', 'Testbed', 'Network Security']::varchar[], 'TRL 4 (Lab Prototype)', 90, 'Scheduled', NULL,
     false, false, now() - interval '4320 minutes' + interval '1 hour', now() - interval '4320 minutes', now() - interval '4320 minutes'),
    (9905, 9501, 9805, NULL, NULL, 9084, 'Team',
     'Proposal: Phát hiện bất thường DDoS bằng eBPF và học sâu đồ thị', 'Biểu diễn luồng kết nối thành đồ thị theo thời gian, dùng GNN nhẹ để phát hiện HTTP flood và slowloris. Bộ thu thập eBPF chạy ở chế độ XDP, mô hình lượng tử hóa INT8 bằng TensorRT. Kế hoạch 14 tuần, có buổi demo trên dữ liệu ẩn danh của doanh nghiệp ở tuần 8.', 'Nhóm SecLab Fellows gồm 3 sinh viên ngành An toàn thông tin, đã đạt giải Nhì cuộc thi ATTT sinh viên 2026 với đề tài phát hiện tấn công bằng eBPF.

Nhóm mong được trao đổi thêm về dữ liệu thật của doanh nghiệp để điều chỉnh kế hoạch kiểm thử.', ARRAY['Network Security', 'eBPF', 'Graph Neural Network', 'TensorRT']::varchar[], 'TRL 3 (Proof of Concept)', 84, 'In_Discussion', NULL,
     false, false, now() - interval '20160 minutes' + interval '1 hour', now() - interval '20160 minutes', now() - interval '20160 minutes'),
    (9906, 9501, 9806, NULL, NULL, 9084, 'Team',
     'Edge-AI phát hiện bất thường & tấn công DDoS tầng ứng dụng trên thiết bị biên', 'Đề xuất pipeline eBPF thu thập lưu lượng kết hợp mô hình phân loại hành vi đã nén chạy trên NVIDIA Jetson Orin Nano: độ trễ suy luận < 12ms, F1-score 96,8% trên tập CIC-DDoS2019. Bàn giao mã nguồn, mô hình và báo cáo kỹ thuật sau 16 tuần.', 'Em là Nguyễn Văn An, trưởng nhóm VisionLab UIT. Nhóm đã có mô hình mẫu (TRL 4) phát hiện bất thường lưu lượng mạng chạy trên thiết bị biên và rất mong được đồng hành cùng V-Tech Global giải quyết bài toán RD-2026-084, hướng tới triển khai thử nghiệm trên hạ tầng thực tế của doanh nghiệp.

Chúng em xin gửi kèm proposal kỹ thuật và hồ sơ năng lực của nhóm để Quý doanh nghiệp xem xét.', ARRAY['Network Security', 'Edge AI', 'eBPF', 'NVIDIA Jetson']::varchar[], 'TRL 4 (Lab Prototype)', 92, 'In_Discussion', NULL,
     false, false, now() - interval '30240 minutes' + interval '1 hour', now() - interval '30240 minutes', now() - interval '30240 minutes'),
    (9907, 9501, 9807, NULL, NULL, 9084, 'Team',
     'Proposal: Hệ thống WAF học máy triển khai trên máy chủ trung tâm', 'Tường lửa ứng dụng web (WAF) dùng học máy, chạy trên máy chủ trung tâm thay vì thiết bị biên.', 'Nhóm Blue Team UIT xin gửi proposal cho bài toán RD-2026-084.', ARRAY['WAF', 'Machine Learning']::varchar[], 'TRL 2 (Ý tưởng công nghệ)', 52, 'Declined', 'Giải pháp chạy trên máy chủ trung tâm, không đáp ứng yêu cầu xử lý tại thiết bị biên.',
     false, false, now() - interval '10080 minutes' + interval '1 hour', now() - interval '10080 minutes', now() - interval '10080 minutes'),
    (9908, 9501, NULL, NULL, 9621, 9084, 'Student',
     'Proposal: Phát hiện DDoS bằng thống kê entropy lưu lượng', 'Dùng độ đo entropy của địa chỉ nguồn và URL để phát hiện bất thường, không dùng học sâu.', 'Em xin gửi ý tưởng ban đầu và mong nhận góp ý của doanh nghiệp.', ARRAY['Entropy', 'Thống kê']::varchar[], 'TRL 2 (Ý tưởng công nghệ)', 45, 'Declined', 'Phương pháp chưa phát hiện được tấn công tầng ứng dụng (slowloris), chưa có kết quả thử nghiệm.',
     false, false, now() - interval '12960 minutes' + interval '1 hour', now() - interval '12960 minutes', now() - interval '12960 minutes'),
    (9909, 9501, 9808, NULL, NULL, 9079, 'Team',
     'Proposal: Nén mô hình LLM 7B chạy suy luận trên hạ tầng Hybrid-Cloud', 'Tập trung vào phần hạ tầng: huấn luyện trên đám mây, suy luận tại chỗ bằng mô hình lượng tử hóa 4-bit; đo độ trễ và chi phí cho 3 cấu hình GPU. Không bao gồm phần đánh giá lâm sàng.', 'Nhóm Data Science Club xin gửi proposal cho phần hạ tầng của bài toán RD-2026-079 và sẵn sàng phối hợp với nhóm khác phụ trách phần mô hình.', ARRAY['LLM', 'Hybrid-Cloud', 'Quantization']::varchar[], 'TRL 3 (Proof of Concept)', 76, 'Submitted', NULL,
     false, false, NULL, now() - interval '180 minutes', now() - interval '180 minutes'),
    (9910, 9501, NULL, NULL, 9624, 9079, 'Business',
     'Phản hồi lời mời: Đồng ý trao đổi về bài toán LLM y tế', 'Đồng ý trao đổi về bài toán RD-2026-079 theo lời mời doanh nghiệp gửi ngày 12/10. Có kinh nghiệm nén mô hình bằng AWQ / GPTQ và triển khai vLLM trên cụm GPU nhỏ; mong muốn tham gia phần nén mô hình và triển khai suy luận.', 'Em cảm ơn Quý doanh nghiệp đã gửi lời mời. Em có thể trao đổi trực tuyến vào chiều thứ 3 hoặc thứ 5 hằng tuần.', ARRAY['LLM', 'vLLM', 'Model Compression']::varchar[], 'Phản hồi lời mời', 79, 'Scheduled', NULL,
     false, false, now() - interval '2880 minutes' + interval '1 hour', now() - interval '2880 minutes', now() - interval '2880 minutes'),
    (9911, 9501, 9809, NULL, NULL, 9079, 'Team',
     'Proposal: LLM tiếng Việt cho y tế dự phòng với RAG đa tầng', 'Fine-tune mô hình 7B bằng LoRA trên 40.000 cặp hỏi đáp y tế dự phòng đã chuẩn hóa; RAG hai tầng (chủ đề → đoạn văn) có trích dẫn nguồn Bộ Y tế. Đánh giá với 2 bác sĩ cộng tác theo bộ câu hỏi mẫu của doanh nghiệp.', 'Nhóm AI HealthTech đang làm khóa luận về hỏi đáp y khoa tiếng Việt dưới sự hướng dẫn của NLP Lab UIT.

Nhóm gửi kèm proposal và kết quả thử nghiệm ban đầu trên bộ câu hỏi mẫu.', ARRAY['LLM', 'RAG', 'NLP Tiếng Việt', 'LoRA']::varchar[], 'TRL 3 (Proof of Concept)', 87, 'In_Discussion', NULL,
     false, false, now() - interval '21600 minutes' + interval '1 hour', now() - interval '21600 minutes', now() - interval '21600 minutes'),
    (9912, 9501, 9810, 9702, NULL, 9079, 'Lecturer',
     'Proposal: NLP Lab UIT – trợ lý y tế dự phòng tiếng Việt có kiểm chứng nguồn', 'NLP Lab đảm nhận trọn gói: xây kho tri thức y tế dự phòng, fine-tune mô hình 7B, RAG có kiểm chứng nguồn và đánh giá cùng bác sĩ. Lab có sẵn cụm 8 GPU A100 cho giai đoạn huấn luyện.', 'NLP Lab UIT đã công bố bộ dữ liệu hỏi đáp y khoa tiếng Việt và có kinh nghiệm hợp tác với 2 bệnh viện.

Lab đề xuất mở phòng đàm phán để thống nhất phạm vi dữ liệu và điều khoản sở hữu trí tuệ.', ARRAY['LLM', 'RAG', 'NLP Tiếng Việt', 'Healthcare AI']::varchar[], 'TRL 4 (Lab Prototype)', 93, 'In_Discussion', NULL,
     false, false, now() - interval '43200 minutes' + interval '1 hour', now() - interval '43200 minutes', now() - interval '43200 minutes'),
    (9913, 9501, 9811, NULL, NULL, 9079, 'Team',
     'Proposal: Chatbot y tế dùng API mô hình thương mại', 'Xây chatbot gọi API mô hình ngôn ngữ thương mại, bổ sung kho câu hỏi thường gặp.', 'MedAI Club xin gửi proposal cho bài toán RD-2026-079.', ARRAY['Chatbot', 'API']::varchar[], 'TRL 2 (Ý tưởng công nghệ)', 40, 'Declined', 'Gửi dữ liệu y tế ra API bên ngoài, không đáp ứng yêu cầu dữ liệu không rời hạ tầng doanh nghiệp.',
     false, false, now() - interval '14400 minutes' + interval '1 hour', now() - interval '14400 minutes', now() - interval '14400 minutes'),
    (9914, 9501, 9812, NULL, NULL, 9071, 'Team',
     'Proposal: SLAM 3D LiDAR–IMU và định vị cm cho AGV nhà xưởng', 'SLAM 3D kết hợp LiDAR và IMU trên ROS2, kiểm thử trong Gazebo trước khi chạy trên AGV VT200. Sai số định vị mục tiêu dưới 2 cm. Proposal đã được chấp nhận và đang thực hiện theo thỏa thuận HĐ-2026-042.', 'Nhóm thuộc Lab Robotics & IoT UIT, dưới sự hướng dẫn của TS. Nguyễn Hoàng Long.', ARRAY['ROS2', 'LiDAR SLAM', 'Sensor Fusion', 'Gazebo']::varchar[], 'TRL 4 (Lab Prototype)', 95, 'Contracted', NULL,
     true, true, now() - interval '172800 minutes' + interval '1 hour', now() - interval '172800 minutes', now() - interval '172800 minutes'),
    (9915, 9501, 9813, NULL, NULL, 9071, 'Team',
     'Proposal: Định vị AGV bằng camera và mã QR dán sàn', 'Dán mã QR trên sàn và dùng camera hướng xuống để định vị AGV.', 'Nhóm AGV K18 xin gửi proposal cho bài toán RD-2026-071.', ARRAY['Computer Vision', 'QR Code']::varchar[], 'TRL 3 (Proof of Concept)', 58, 'Declined', 'Doanh nghiệp đã chọn phương án SLAM không cần dán mốc của Lab Robotics & IoT UIT.',
     false, false, now() - interval '175000 minutes' + interval '1 hour', now() - interval '175000 minutes', now() - interval '175000 minutes');

-- 9. Lịch hẹn trao đổi mẫu (tab "Đã hẹn trao đổi"), tính theo ngày chạy seed, giờ Việt Nam
INSERT INTO connection_meeting (meeting_id, request_id, start_at, mode, agenda, created_by_account_id)
VALUES
    (9951, 9904, ((current_date + 2) + TIME '14:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'Trực tuyến (Google Meet)', 'Thống nhất phạm vi dữ liệu thử nghiệm', 9501),
    (9952, 9910, ((current_date + 6) + TIME '15:30') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'Trực tuyến (MS Teams)', 'Trao đổi kinh nghiệm nén mô hình', 9501);

-- 10. Tệp đính kèm của proposal (nội dung tệp: npm run seed:dn-files tải PDF minh họa lên bucket "rd-files")
INSERT INTO rd_attachment (attachment_id, owner_type, owner_id, file_name, storage_path, size_bytes, doc_type, uploaded_by_account_id)
VALUES
    (9961, 'Request', 9901, 'Proposal_NetGuard_DDoS.pdf', 'requests/9901/Proposal_NetGuard_DDoS.pdf', 2202010, 'Proposal kỹ thuật', 9601),
    (9962, 'Request', 9901, 'Ket_qua_Jetson_NetGuard.pdf', 'requests/9901/Ket_qua_Jetson_NetGuard.pdf', 734003, 'Kết quả thử nghiệm', 9601),
    (9963, 'Request', 9902, 'Proposal_EdgeSentinel.pdf', 'requests/9902/Proposal_EdgeSentinel.pdf', 1363149, 'Proposal kỹ thuật', 9605),
    (9964, 'Request', 9903, 'Proposal_TransformerIDS_ARG.pdf', 'requests/9903/Proposal_TransformerIDS_ARG.pdf', 2726298, 'Proposal kỹ thuật', 9607),
    (9965, 'Request', 9903, 'Ho_so_nang_luc_ARG.pdf', 'requests/9903/Ho_so_nang_luc_ARG.pdf', 1153434, 'Hồ sơ năng lực', 9607),
    (9966, 'Request', 9904, 'Proposal_CyberLab_DDoS.pdf', 'requests/9904/Proposal_CyberLab_DDoS.pdf', 3565158, 'Proposal kỹ thuật', 9701),
    (9967, 'Request', 9904, 'Ho_so_nang_luc_CyberLab.pdf', 'requests/9904/Ho_so_nang_luc_CyberLab.pdf', 2097152, 'Hồ sơ năng lực', 9701),
    (9968, 'Request', 9905, 'Proposal_GNN_eBPF_SecLabFellows.pdf', 'requests/9905/Proposal_GNN_eBPF_SecLabFellows.pdf', 3250586, 'Proposal kỹ thuật', 9613),
    (9969, 'Request', 9906, 'Proposal_DDoS_EdgeAI_VisionLab.pdf', 'requests/9906/Proposal_DDoS_EdgeAI_VisionLab.pdf', 2516582, 'Proposal kỹ thuật', 9616),
    (9970, 'Request', 9906, 'Ho_so_nang_luc_VisionLab.pdf', 'requests/9906/Ho_so_nang_luc_VisionLab.pdf', 1887437, 'Hồ sơ năng lực', 9616),
    (9971, 'Request', 9907, 'Proposal_WAF_BlueTeam.pdf', 'requests/9907/Proposal_WAF_BlueTeam.pdf', 943718, 'Proposal kỹ thuật', 9619),
    (9972, 'Request', 9908, 'Y_tuong_Entropy_DDoS.pdf', 'requests/9908/Y_tuong_Entropy_DDoS.pdf', 524288, 'Proposal kỹ thuật', 9621),
    (9973, 'Request', 9909, 'Proposal_HybridCloud_DSClub.pdf', 'requests/9909/Proposal_HybridCloud_DSClub.pdf', 1677722, 'Proposal kỹ thuật', 9622),
    (9974, 'Request', 9910, 'CV_PhamQuocBao.pdf', 'requests/9910/CV_PhamQuocBao.pdf', 419430, 'Hồ sơ năng lực', 9624),
    (9975, 'Request', 9911, 'Proposal_LLM_YTe_AIHealthTech.pdf', 'requests/9911/Proposal_LLM_YTe_AIHealthTech.pdf', 2306867, 'Proposal kỹ thuật', 9625),
    (9976, 'Request', 9911, 'Ket_qua_thu_nghiem_ban_dau.pdf', 'requests/9911/Ket_qua_thu_nghiem_ban_dau.pdf', 838861, 'Kết quả thử nghiệm', 9625),
    (9977, 'Request', 9912, 'Proposal_NLPLab_YTeDuPhong.pdf', 'requests/9912/Proposal_NLPLab_YTeDuPhong.pdf', 4404019, 'Proposal kỹ thuật', 9702),
    (9978, 'Request', 9912, 'Ho_so_nang_luc_NLPLab.pdf', 'requests/9912/Ho_so_nang_luc_NLPLab.pdf', 2621440, 'Hồ sơ năng lực', 9702),
    (9979, 'Request', 9913, 'Proposal_Chatbot_MedAI.pdf', 'requests/9913/Proposal_Chatbot_MedAI.pdf', 838861, 'Proposal kỹ thuật', 9631),
    (9980, 'Request', 9914, 'Proposal_SLAM3D_RoboticsLab.pdf', 'requests/9914/Proposal_SLAM3D_RoboticsLab.pdf', 3984589, 'Proposal kỹ thuật', 9634),
    (9981, 'Request', 9915, 'Proposal_QR_AGV_K18.pdf', 'requests/9915/Proposal_QR_AGV_K18.pdf', 1258291, 'Proposal kỹ thuật', 9637);

COMMIT;

-- Kiểm tra nhanh (kết quả mong đợi): Submitted 4 | Scheduled 2 | In_Discussion 4 | Contracted 1 | Declined 4
-- SELECT status, count(*) FROM connection_request WHERE business_id = 9501 GROUP BY status ORDER BY status;
