/* =====================================================================
   DỮ LIỆU THỬ cho "Quản trị nhóm – Đơn xin gia nhập" (SV-06)
   Chạy SAU: seed_dn.sql, seed_showcase.sql, migrations/009_sv_don_gia_nhap_nhom.sql.
   Supabase -> SQL Editor -> dán -> Run. Chạy lại để đặt lại từ đầu (thời điểm nộp tính theo lúc chạy).
   Toàn bộ là dữ liệu GIẢ. Nhóm nhận dữ liệu: 9301 (trưởng nhóm là SV trong seed_showcase.sql, mặc định 9111).

   Tin tuyển: 9401 đang mở (3 chỉ tiêu, đã nhận 1) · 9402 đã đủ chỉ tiêu (1/1)
   | apply_id | SV   | tin  | Tình huống                                                 |
   |----------|------|------|------------------------------------------------------------|
   | 9411     | 9101 | 9401 | Chờ duyệt, nộp 4 giờ trước, CÓ chia sẻ GPA                 |
   | 9412     | 9102 | 9401 | Chờ duyệt, nộp 60 giờ trước (gấp), KHÔNG chia sẻ GPA       |
   | 9413     | 9601 | 9401 | Chờ duyệt, nộp 80 giờ trước (quá hạn 72 giờ)               |
   | 9414     | 9603 | 9402 | Chờ duyệt vào tin đã đủ chỉ tiêu (không chấp nhận được)    |
   | 9415     | 9602 | 9401 | Đã từ chối, có lý do                                       |
   | 9416     | 9604 | 9402 | Đã chấp nhận, nay đã rời nhóm                              |
   | 9417     | 9605 | 9401 | Đã chấp nhận, đang là thành viên                           |
   ===================================================================== */

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'recruitment_application' AND column_name = 'share_gpa') THEN
        RAISE EXCEPTION 'Chưa chạy database/migrations/009_sv_don_gia_nhap_nhom.sql';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM team_member WHERE team_id = 9301 AND role_in_team = 'Leader') THEN
        RAISE EXCEPTION 'Thiếu nhóm 9301: chạy seed_showcase.sql trước';
    END IF;
    IF (SELECT count(*) FROM student_profile WHERE student_id IN (9101, 9102, 9601, 9602, 9603, 9604, 9605)) < 7 THEN
        RAISE EXCEPTION 'Thiếu sinh viên thử: chạy seed.sql, seed_dn.sql trước';
    END IF;
END $$;

-- 1. Đặt lại: chỉ động tới tin tuyển 9401–9402, các SV nộp đơn ở bảng trên và thông báo do việc duyệt đơn tạo ra
DELETE FROM team_recruitment WHERE recruit_id IN (9401, 9402) AND team_id = 9301;  -- kéo theo đơn của hai tin
DELETE FROM team_member WHERE team_id = 9301 AND role_in_team = 'Member'
    AND student_id IN (9101, 9102, 9601, 9602, 9603, 9604, 9605);
DELETE FROM notification WHERE category = 'Team'
    AND account_id IN (9101, 9102, 9601, 9602, 9603, 9604, 9605)
    AND link_url IN ('pages/sv/06_quan-tri-nhom-portfolio.html', 'pages/sv/07_cho-ghep-nhom.html');

UPDATE student_team SET semester = 'HK1 2026-2027' WHERE team_id = 9301 AND semester IS NULL;

-- 2. Thành viên đã được nhận qua đơn 9417
INSERT INTO team_member (team_id, student_id, role_in_team) VALUES (9301, 9605, 'Member');

-- 3. Tin tuyển
INSERT INTO team_recruitment (recruit_id, team_id, title, requirement, slots, deadline, status, created_at)
VALUES
    (9401, 9301, '[TEST] Cần bạn mảng AI & Edge Computing', 'Biết PyTorch, C++; ưu tiên đã làm đồ án Thị giác máy tính.',
     3, CURRENT_DATE + 30, 'Open', now() - INTERVAL '10 days'),
    (9402, 9301, '[TEST] Cần 1 bạn Thiết kế FPGA', 'Verilog / VHDL.', 1, NULL, 'Filled', now() - INTERVAL '40 days');

-- 4. Đơn xin gia nhập
INSERT INTO recruitment_application
    (apply_id, recruit_id, student_id, message, status, applied_at, responded_at, share_gpa, response_note, responded_by_account_id)
SELECT v.id, v.tin, v.sv, v.thu, v.tt, now() - make_interval(hours => v.nop), now() - make_interval(hours => v.xu_ly),
       v.gpa, v.ly_do,
       CASE WHEN v.tt = 'Pending' THEN NULL
            ELSE (SELECT student_id FROM team_member WHERE team_id = 9301 AND role_in_team = 'Leader') END
FROM (VALUES
    (9411, 9401, 9101, '[TEST] Em đã làm đồ án phát hiện vật thể, có thể dành 20 giờ mỗi tuần.', 'Pending',    4, NULL::int, true,  NULL),
    (9412, 9401, 9102, '[TEST] Em muốn tham gia mảng tối ưu mô hình trên thiết bị biên.',       'Pending',   60, NULL,      false, NULL),
    (9413, 9401, 9601, '[TEST] Em quan tâm đề tài của nhóm.',                                   'Pending',   80, NULL,      false, NULL),
    (9414, 9402, 9603, '[TEST] Em đang học thiết kế vi mạch.',                                  'Pending',   30, NULL,      true,  NULL),
    (9415, 9401, 9602, '[TEST] Em muốn xin vào nhóm.',                                          'Rejected', 200, 170,       false, '[TEST] Nhóm đang cần người đã dùng C++.'),
    (9416, 9402, 9604, '[TEST] Em từng làm đồ án FPGA.',                                        'Accepted', 900, 860,       false, NULL),
    (9417, 9401, 9605, '[TEST] Em có kinh nghiệm gán nhãn dữ liệu.',                            'Accepted', 150, 120,       false, NULL)
) AS v(id, tin, sv, thu, tt, nop, xu_ly, gpa, ly_do);

COMMIT;

/* ---------- DỌN DỮ LIỆU: chạy riêng khối "1. Đặt lại" ở trên. ---------- */
