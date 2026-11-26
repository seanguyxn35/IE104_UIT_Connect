/* =====================================================================
   UIT CONNECT – DỮ LIỆU THỬ cho "Bài toán DN & R&D" phía Sinh viên (SV-09, SV-13)
   Sinh từ dữ liệu mẫu của giao diện (frontend/assets/js/sv-bai-toan-rd-data.js, dn-bai-toan-data.js)
   để giao diện có máy chủ và không có máy chủ hiển thị cùng nội dung.

   Chạy SAU: seed.sql, seed_dn.sql, migrations/006_sv_bai_toan_rd.sql.
   Cách chạy: Supabase → SQL Editor → dán toàn bộ file → Run.
   Chạy lại bất cứ lúc nào để ĐẶT LẠI dữ liệu thử (xóa rồi nạp lại trong dải ID cố định).
   Chạy lại seed_dn.sql thì phải chạy lại file này (seed_dn.sql nạp lại 4 bài V-Tech nhưng không có phần chi tiết đề bài).
   Sau khi chạy: cd backend && npm run seed:dn-files  (tải PDF minh họa cho tệp đề bài 9931–9950).

   Toàn bộ là dữ liệu GIẢ. ID cố định trong dải 9xxx:
   | Dữ liệu                                         | ID          |
   |-------------------------------------------------|-------------|
   | Doanh nghiệp / Lab đăng bài mẫu                 | 9511–9525   |
   | Bài toán của DN / Lab khác (RD-2026-101..115)   | 9301–9315   |
   | Chi tiết đề bài 4 bài V-Tech (cập nhật)         | 9084, 9079, 9071, 9091 |
   | Nhóm thử của SV A (9101 trưởng nhóm, 3 người)   | 9821        |
   | Nhóm thử SV A là thành viên (không nộp được)    | 9822        |
   | Nhóm thử 5 người của SV A (sai quy mô nhóm)     | 9823        |
   | Tệp đề bài (rd_attachment, owner Problem)       | 9931–9950   |
   Proposal SV tạo khi thử (connection_request của SV 9101 / nhóm 9821, 9822) bị xóa khi chạy lại file này.
   ===================================================================== */

BEGIN;

-- 0. Chặn sớm nếu thiếu bước trước
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'business_problem' AND column_name = 'accepted_partners') THEN
        RAISE EXCEPTION 'Chưa chạy database/migrations/006_sv_bai_toan_rd.sql';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM business_problem WHERE problem_id = 9084)
    OR (SELECT count(*) FROM student_profile WHERE student_id IN (9101, 9102, 9603, 9605, 9606, 9607, 9608, 9609, 9610, 9611)) < 10 THEN
        RAISE EXCEPTION 'Thiếu dữ liệu thử: chạy database/seed.sql và database/seed_dn.sql trước';
    END IF;
END $$;

-- 1. Xóa dữ liệu thử cũ của phần này
DELETE FROM rd_attachment WHERE owner_type = 'Request' AND owner_id IN (
    SELECT request_id FROM connection_request
    WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315) OR (problem_id IS NOT NULL AND (student_id IN (9101, 9102) OR team_id IN (9821, 9822, 9823))));
DELETE FROM connection_request
    WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315) OR (problem_id IS NOT NULL AND (student_id IN (9101, 9102) OR team_id IN (9821, 9822, 9823)));
DELETE FROM rd_attachment WHERE attachment_id BETWEEN 9931 AND 9950
    OR (owner_type = 'Problem' AND owner_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315, 9084, 9079, 9071, 9091));
DELETE FROM saved_opportunity WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315, 9084, 9079, 9071, 9091) OR (account_id IN (9101, 9102) AND problem_id IS NOT NULL);
DELETE FROM problem_milestone WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315, 9084, 9079, 9071, 9091);
DELETE FROM problem_skill WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315, 9084, 9079, 9071, 9091);
DELETE FROM business_problem WHERE problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315);
DELETE FROM team_member WHERE team_id IN (9821, 9822, 9823);
DELETE FROM student_team WHERE team_id IN (9821, 9822, 9823);

-- 2. Tài khoản & hồ sơ DN / Lab đăng bài (DN bắt buộc có mật khẩu: giá trị giả, không đăng nhập được)
INSERT INTO account (account_id, email, password_hash, role, is_active, email_verified_at, terms_accepted_at)
VALUES
    (9511, 'test.dn9511@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9512, 'test.dn9512@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9513, 'test.dn9513@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9514, 'test.dn9514@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9515, 'test.dn9515@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9516, 'test.dn9516@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9517, 'test.dn9517@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9518, 'test.dn9518@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9519, 'test.dn9519@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9520, 'test.dn9520@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9521, 'test.dn9521@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9522, 'test.dn9522@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9523, 'test.dn9523@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9524, 'test.dn9524@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now()),
    (9525, 'test.dn9525@rd-partner.example', 'seed-khong-dang-nhap', 'Business', true, now(), now())
ON CONFLICT (account_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;

INSERT INTO business_profile (business_id, company_name, tax_code, industry, address, logo_url, description, verified_status)
VALUES
    (9511, 'FPT Software AIC', 'TEST-9511', 'Phần mềm & Trí tuệ nhân tạo', 'Khu Công nghệ cao TP.HCM', '/assets/img/img-08.jpg', 'Quy mô: Trên 10.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9512, 'Viettel Cyber Security', 'TEST-9512', 'An ninh mạng', 'Quận 10, TP.HCM', '/assets/img/img-06.jpg', 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9513, 'Bosch Global Software', 'TEST-9513', 'Phần mềm ô tô & IoT', 'Tân Bình, TP.HCM', '/assets/img/img-09.jpg', 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9514, 'MoMo Innovation Hub', 'TEST-9514', 'Công nghệ tài chính (FinTech)', 'Quận 7, TP.HCM', '/assets/img/img-16.jpg', 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9515, 'VinBrain Healthcare AI', 'TEST-9515', 'AI trong y tế', 'Hà Nội & Từ xa', '/assets/img/img-17.jpg', 'Quy mô: 100 – 500 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9516, 'KMS Technology', 'TEST-9516', 'Phần mềm & Kiểm thử', 'Phú Nhuận, TP.HCM', '/assets/img/img-05.jpg', 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9517, 'Lab CV&PR – UIT', 'TEST-9517', 'Thị giác máy tính & Nhận dạng', 'Phòng E4.12, UIT', NULL, 'Quy mô: Phòng thí nghiệm UIT. Dữ liệu thử UIT Connect.', 'Verified'),
    (9518, 'Lab Vi mạch số (IC Design)', 'TEST-9518', 'Thiết kế vi mạch', 'Phòng C3.12, UIT', NULL, 'Quy mô: Phòng thí nghiệm UIT. Dữ liệu thử UIT Connect.', 'Verified'),
    (9519, 'InSecLab – An toàn thông tin', 'TEST-9519', 'An toàn thông tin', 'Phòng A2.05, UIT', NULL, 'Quy mô: Phòng thí nghiệm UIT. Dữ liệu thử UIT Connect.', 'Verified'),
    (9520, 'Samsung SVMC', 'TEST-9520', 'Nghiên cứu & phát triển di động', 'Hà Nội & TP.HCM', NULL, 'Quy mô: Trên 1.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9521, 'VNG Corporation', 'TEST-9521', 'Internet & Nền tảng số', 'Quận 7, TP.HCM', NULL, 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9522, 'TMA Solutions', 'TEST-9522', 'Gia công phần mềm & Viễn thông', 'Quận 12, TP.HCM', NULL, 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9523, 'NashTech Vietnam', 'TEST-9523', 'Dịch vụ phần mềm', 'Tân Bình, TP.HCM', NULL, 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9524, 'VNPT AI', 'TEST-9524', 'Trí tuệ nhân tạo & Viễn thông', 'Hà Nội', NULL, 'Quy mô: 500 – 1.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified'),
    (9525, 'Rikkeisoft', 'TEST-9525', 'Gia công phần mềm', 'Hà Nội & Đà Nẵng', NULL, 'Quy mô: 1.000 – 5.000 nhân sự. Dữ liệu thử UIT Connect.', 'Verified')
ON CONFLICT (business_id) DO UPDATE SET company_name = EXCLUDED.company_name, industry = EXCLUDED.industry,
    address = EXCLUDED.address, logo_url = EXCLUDED.logo_url, description = EXCLUDED.description, verified_status = EXCLUDED.verified_status;

UPDATE business_profile SET description = 'V-Tech Global nghiên cứu và phát triển giải pháp công nghệ cho thanh toán số, y tế và nhà máy thông minh; đối tác R&D của UIT trên UIT Connect.',
    industry = 'Giải pháp thanh toán, AI & tự động hóa'
WHERE business_id = 9501;

-- 3. Bài toán của DN / Lab khác (đã được duyệt công khai; hạn nộp tính theo ngày chạy seed)
INSERT INTO business_problem (problem_id, business_id, problem_code, title, summary, requirement, field_id, problem_type,
    funding, funding_min, location, deadline, status, accepted_partners, team_size_min, team_size_max, trl_level,
    deliverables, selection_criteria, nda_required, start_date, duration_weeks, work_mode, approved_at, created_at)
SELECT v.id, v.dn, v.ma, v.tieu_de, v.tom_tat, v.mo_ta, fd.field_id, v.loai, v.kinh_phi, v.kinh_phi_min, v.dia_diem,
    v.han, 'Open', v.doi_tuong, v.nhom_min, v.nhom_max, v.trl, v.san_pham, v.tieu_chi, v.nda, v.bat_dau, v.tuan, v.hinh_thuc,
    now() - make_interval(days => v.dang_truoc), now() - make_interval(days => v.dang_truoc + 1)
FROM (VALUES
    (9301, 9511, 'RD-2026-101', 'Tối ưu hóa mô hình Large Language Model (LLM) phục vụ tra cứu văn bản pháp luật nội bộ', 'Đề tài hướng tới việc tinh chỉnh (fine-tuning) và áp dụng kỹ thuật RAG trên mô hình mã nguồn mở để giải bài toán hỏi đáp văn bản quy phạm pháp luật với độ chính xác trên 92%.', '<p>Bộ phận pháp chế cần trợ lý hỏi đáp trên kho hơn 20.000 văn bản quy phạm và quy định nội bộ, trả lời bằng tiếng Việt và luôn dẫn nguồn.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Fine-tune mô hình mở 7B trên dữ liệu pháp luật tiếng Việt.</li><li>Xây dựng RAG truy hồi theo điều, khoản, có xử lý văn bản hết hiệu lực.</li><li>Độ chính xác trên bộ câu hỏi đánh giá ≥ 92%.</li></ol><p><b>Đầu ra mong đợi:</b> mã nguồn pipeline RAG, mô hình đã tinh chỉnh, báo cáo đánh giá.</p>', 'Trí tuệ nhân tạo & Học máy', 'Open_Call', 60000000, 60000000, 'Khu Công nghệ cao TP.HCM', current_date + 24, ARRAY['Team', 'Student']::varchar[], 1, 4, 3, ARRAY['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật']::varchar[], 'Kinh nghiệm NLP tiếng Việt; kết quả thử nghiệm sơ bộ trên bộ câu hỏi mẫu.', true, current_date + 40, 16, 'Hybrid', 4),
    (9302, 9512, 'RD-2026-102', 'Phát hiện bất thường và tấn công DDoS tầng ứng dụng bằng thuật toán phân loại hành vi', 'Xây dựng giải pháp giám sát lưu lượng mạng thời gian thực, tự động trích xuất đặc trưng và nhận diện các chiến dịch tấn công HTTP-Flood tinh vi với độ trễ dưới 2 giây.', '<p>Trung tâm giám sát an ninh mạng cần lớp phát hiện sớm các chiến dịch HTTP-Flood giả dạng người dùng thật.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Trích xuất đặc trưng hành vi phiên bằng eBPF.</li><li>Phân loại hành vi với độ trễ cảnh báo dưới 2 giây.</li><li>Giảm cảnh báo giả xuống dưới 1%.</li></ol><p><b>Đầu ra mong đợi:</b> mô-đun phát hiện, bộ dữ liệu đã gán nhãn, báo cáo kỹ thuật.</p>', 'An toàn thông tin', 'Open_Call', 45000000, 45000000, 'Quận 10, TP.HCM', current_date + 45, ARRAY['Team']::varchar[], 2, 4, 3, ARRAY['Mã nguồn', 'Bộ dữ liệu', 'Báo cáo kỹ thuật']::varchar[], 'Hiểu biết về giao thức HTTP và các kiểu tấn công DDoS; kinh nghiệm học máy.', true, current_date + 67, 14, 'Onsite', 6),
    (9303, 9513, 'RD-2026-103', 'Hệ thống Edge-AI tích hợp cảm biến LiDAR cho xe tự hành cỡ nhỏ trong nhà máy thông minh', 'Phối hợp cùng phòng thí nghiệm UIT Embedded Lab để thiết kế thuật toán SLAM 3D và điều hướng chính xác cao chạy trên kit NVIDIA Jetson Orin Nano.', '<p>Doanh nghiệp cần nguyên mẫu xe tự hành cỡ nhỏ vận chuyển linh kiện giữa các trạm trong nhà máy, không dùng vạch từ.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>SLAM 3D kết hợp LiDAR và IMU, sai số dưới 3 cm.</li><li>Điều hướng tránh vật cản động chạy trên Jetson Orin Nano.</li><li>Kiểm thử trong mô phỏng trước khi chạy thật.</li></ol><p><b>Đầu ra mong đợi:</b> mã nguồn ROS 2, bản demo trên xe mẫu, báo cáo kỹ thuật.</p>', 'Robot & Xe tự hành', 'Lab_Collaboration', 80000000, 80000000, 'Tân Bình, TP.HCM', current_date + 55, ARRAY['Lab', 'Team']::varchar[], 3, 6, 4, ARRAY['Mã nguồn', 'Bản demo / prototype', 'Báo cáo kỹ thuật']::varchar[], 'Có GV hướng dẫn mảng robot; kinh nghiệm ROS 2.', true, current_date + 81, 24, 'Hybrid', 8),
    (9304, 9514, 'RD-2026-104', 'Phát hiện gian lận thanh toán trực tuyến sử dụng mô hình học đồ thị (Graph Neural Network)', 'Mô hình hóa lịch sử chuyển tiền thành cấu trúc đồ thị không đồng nhất, huấn luyện mô hình GNN phân biệt các tài khoản rửa tiền và mạng lưới gian lận có tổ chức.', '<p>Ví điện tử cần phát hiện các nhóm tài khoản phối hợp gian lận mà mô hình theo từng giao dịch đơn lẻ bỏ sót.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Xây dựng đồ thị không đồng nhất từ dữ liệu giao dịch đã ẩn danh.</li><li>Huấn luyện GNN phát hiện cụm tài khoản bất thường.</li><li>Suy luận theo lô hằng giờ trên luồng Kafka.</li></ol><p><b>Đầu ra mong đợi:</b> mã nguồn, mô hình đã huấn luyện, báo cáo đánh giá trên dữ liệu thật đã ẩn danh.</p>', 'Khoa học dữ liệu & Big Data', 'Open_Call', 50000000, 50000000, 'Quận 7, TP.HCM', current_date + 35, ARRAY['Team', 'Student']::varchar[], 1, 4, 3, ARRAY['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật']::varchar[], 'Kiến thức học sâu trên đồ thị; kinh nghiệm xử lý dữ liệu lớn.', true, current_date + 50, 16, 'Hybrid', 11),
    (9305, 9515, 'RD-2026-105', 'Phân đoạn tự động tổn thương phổi trên ảnh chụp cắt lớp vi tính (CT scan) đa lát cắt', 'Đề tài tài trợ 100% kinh phí tính toán GPU trên cloud, hỗ trợ sinh viên và giảng viên công bố bài báo quốc tế tại các hội nghị chuẩn mực IEEE / MICCAI.', '<p>Doanh nghiệp tài trợ toàn bộ chi phí GPU và dữ liệu CT đã ẩn danh cho nhóm nghiên cứu phân đoạn tổn thương phổi.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Phân đoạn 3D trên ảnh CT đa lát cắt với Dice ≥ 0,85.</li><li>Xử lý dữ liệu không cân bằng giữa các loại tổn thương.</li><li>Đối sánh kết quả với bác sĩ chẩn đoán hình ảnh.</li></ol><p><b>Đầu ra mong đợi:</b> mô hình, mã nguồn và một bài báo gửi hội nghị quốc tế.</p>', 'Trí tuệ nhân tạo & Học máy', 'Sponsored', 75000000, 75000000, 'Hà Nội & Từ xa', current_date + 81, ARRAY['Lab', 'Team']::varchar[], 2, 5, 2, ARRAY['Mô hình đã huấn luyện', 'Mã nguồn', 'Bài báo khoa học']::varchar[], 'Có định hướng công bố khoa học; kinh nghiệm xử lý ảnh y tế là lợi thế.', true, current_date + 95, 28, 'Remote', 14),
    (9306, 9516, 'RD-2026-106', 'Tự động sinh kịch bản kiểm thử API thông minh dựa trên phân tích đặc tả OpenAPI và Swagger', 'Áp dụng kỹ thuật kiểm thử đột biến (mutation testing) và heuristic search để tự động phát hiện các lỗ hổng logic nghiệp vụ trong các microservices phức tạp.', '<p>Đội kiểm thử cần công cụ sinh kịch bản kiểm thử API tự động từ đặc tả OpenAPI cho hơn 300 microservice.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Phân tích đặc tả OpenAPI, suy ra ràng buộc giữa các tham số.</li><li>Sinh dữ liệu kiểm thử bằng tìm kiếm heuristic.</li><li>Tích hợp vào pipeline CI/CD.</li></ol><p><b>Đầu ra mong đợi:</b> công cụ dòng lệnh mã nguồn mở nội bộ và báo cáo đánh giá trên 3 dịch vụ thật.</p>', 'Mạng & Điện toán đám mây', 'Open_Call', 40000000, 40000000, 'Phú Nhuận, TP.HCM', current_date + 19, ARRAY['Student', 'Team']::varchar[], 1, 3, 3, ARRAY['Mã nguồn', 'Báo cáo kỹ thuật']::varchar[], 'Kinh nghiệm viết kiểm thử tự động; hiểu REST API.', false, current_date + 39, 12, 'Hybrid', 16),
    (9307, 9517, 'RD-2026-107', 'Nhận dạng biển số và hành vi phương tiện cho camera giao thông thông minh', 'Phối hợp cùng Sở GTVT xây dựng mô-đun nhận dạng chạy thời gian thực trên thiết bị biên, xử lý đồng thời 16 luồng camera Full HD tại các nút giao trọng điểm.', '<p>Lab CV&PR tuyển sinh viên tham gia dự án hợp tác với Sở GTVT về camera giao thông thông minh.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Nhận dạng biển số trong điều kiện thiếu sáng, mưa.</li><li>Phát hiện vượt đèn đỏ, đi sai làn theo thời gian thực.</li><li>Xử lý 16 luồng Full HD trên một thiết bị Jetson Orin.</li></ol><p><b>Đầu ra mong đợi:</b> mô-đun nhận dạng triển khai thử tại 2 nút giao.</p>', 'Trí tuệ nhân tạo & Học máy', 'Lab_Collaboration', 45000000, 45000000, 'Phòng E4.12, UIT', current_date + 47, ARRAY['Lab', 'Team']::varchar[], 2, 5, 4, ARRAY['Mã nguồn', 'Bản demo / prototype']::varchar[], 'Đã học môn Thị giác máy tính; ưu tiên SV năm 3, 4.', false, current_date + 67, 20, 'At_UIT', 18),
    (9308, 9518, 'RD-2026-108', 'Thiết kế lõi tăng tốc suy luận AI trên FPGA cho thiết bị biên công suất thấp', 'Hiện thực bộ nhân ma trận lượng tử hóa INT8 tích hợp vào SoC RISC-V, mục tiêu đạt 2 TOPS/W và kiểm chứng trên bo mạch Xilinx Kria KV260.', '<p>Lab Vi mạch số hợp tác với doanh nghiệp bán dẫn phát triển lõi tăng tốc AI cho thiết bị biên.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Thiết kế bộ nhân ma trận INT8 dạng systolic array.</li><li>Tích hợp vào SoC RISC-V qua bus AXI.</li><li>Đạt hiệu suất 2 TOPS/W trên Kria KV260.</li></ol><p><b>Đầu ra mong đợi:</b> mã RTL, bản demo trên bo mạch, báo cáo kỹ thuật.</p>', 'Thiết kế vi mạch & Bán dẫn', 'Lab_Collaboration', 70000000, 70000000, 'Phòng C3.12, UIT', current_date + 60, ARRAY['Lab']::varchar[], 2, 4, 3, ARRAY['Mã nguồn', 'Bản demo / prototype', 'Báo cáo kỹ thuật']::varchar[], 'Có GV hướng dẫn mảng vi mạch; đã học Thiết kế hệ thống số.', true, current_date + 86, 24, 'At_UIT', 21),
    (9309, 9519, 'RD-2026-109', 'Phát hiện xâm nhập dựa trên học sâu đồ thị cho mạng IoT công nghiệp', 'Xây dựng bộ dữ liệu lưu lượng Modbus/OPC-UA và mô hình GNN phát hiện tấn công theo thời gian thực, tích hợp với hệ thống SOC của đối tác sản xuất.', '<p>InSecLab hợp tác với một nhà máy sản xuất xây dựng hệ thống phát hiện xâm nhập cho mạng điều khiển công nghiệp.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Thu thập và gán nhãn lưu lượng Modbus/OPC-UA.</li><li>Mô hình GNN phát hiện tấn công theo thời gian thực.</li><li>Tích hợp cảnh báo vào SOC của đối tác.</li></ol><p><b>Đầu ra mong đợi:</b> bộ dữ liệu, mô hình, mô-đun tích hợp SOC.</p>', 'An toàn thông tin', 'Lab_Collaboration', 55000000, 55000000, 'Phòng A2.05, UIT', current_date + 71, ARRAY['Lab', 'Team']::varchar[], 2, 5, 3, ARRAY['Bộ dữ liệu', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật']::varchar[], 'Kiến thức mạng công nghiệp là lợi thế.', true, current_date + 95, 20, 'At_UIT', 23),
    (9310, 9520, 'RD-2026-110', 'Tối ưu hiệu năng mô hình ngôn ngữ chạy trực tiếp trên thiết bị di động', 'Gói tài trợ R&D toàn phần kèm suất thực tập: nén và lượng tử hóa LLM tiếng Việt dưới 2 tỷ tham số để chạy mượt trên chip Exynos thế hệ mới.', '<p>Gói tài trợ R&D toàn phần kèm suất thực tập cho nhóm sinh viên nén mô hình ngôn ngữ tiếng Việt chạy trên điện thoại.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Lượng tử hóa INT4 mô hình dưới 2 tỷ tham số.</li><li>Tốc độ sinh ≥ 15 token/giây trên chip di động.</li><li>Giữ chất lượng trả lời tiếng Việt so với mô hình gốc.</li></ol><p><b>Đầu ra mong đợi:</b> mô hình đã nén, ứng dụng demo Android, báo cáo kỹ thuật.</p>', 'Trí tuệ nhân tạo & Học máy', 'Sponsored', 120000000, 120000000, 'Hà Nội & TP.HCM', current_date + 50, ARRAY['Team', 'Lab']::varchar[], 2, 4, 3, ARRAY['Mô hình đã huấn luyện', 'Bản demo / prototype', 'Báo cáo kỹ thuật']::varchar[], 'Kinh nghiệm tối ưu mô hình; ưu tiên nhóm có thành viên lập trình Android.', true, current_date + 76, 24, 'Hybrid', 25),
    (9311, 9521, 'RD-2026-111', 'Nhận dạng tiếng nói tiếng Việt đa vùng miền cho trợ lý ảo trên ứng dụng nhắn tin', 'Cải thiện độ chính xác nhận dạng giọng nói giọng Trung và Nam Bộ, giảm tỉ lệ lỗi từ (WER) dưới 8% trong môi trường nhiễu.', '<p>Trợ lý ảo trên ứng dụng nhắn tin nhận dạng kém với giọng địa phương và môi trường ồn.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Thu thập và làm sạch dữ liệu giọng nói đa vùng miền.</li><li>Tinh chỉnh mô hình ASR với tăng cường dữ liệu nhiễu.</li><li>WER dưới 8% trên bộ thử của doanh nghiệp.</li></ol><p><b>Đầu ra mong đợi:</b> mô hình ASR, bộ dữ liệu đã chuẩn hóa, báo cáo đánh giá.</p>', 'Trí tuệ nhân tạo & Học máy', 'Open_Call', 65000000, 65000000, 'Quận 7, TP.HCM', current_date + 40, ARRAY['Team', 'Student']::varchar[], 1, 4, 4, ARRAY['Mô hình đã huấn luyện', 'Bộ dữ liệu', 'Báo cáo kỹ thuật']::varchar[], 'Kinh nghiệm xử lý âm thanh hoặc NLP.', true, current_date + 55, 16, 'Hybrid', 27),
    (9312, 9522, 'RD-2026-112', 'Tự động hóa kiểm thử chức năng mạng lõi 5G trên môi trường mô phỏng mã nguồn mở', 'Dựng môi trường mạng lõi 5G bằng Open5GS và UERANSIM, viết bộ kiểm thử tự động cho các luồng đăng ký, phiên dữ liệu và chuyển giao.', '<p>Trung tâm viễn thông cần môi trường mô phỏng 5G để kiểm thử hồi quy trước mỗi lần phát hành.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Dựng mạng lõi 5G trên Kubernetes.</li><li>Viết kịch bản kiểm thử cho 20 luồng chức năng chính.</li><li>Báo cáo kết quả tự động trên CI.</li></ol><p><b>Đầu ra mong đợi:</b> Helm chart, bộ kiểm thử, tài liệu vận hành.</p>', 'Mạng & Điện toán đám mây', 'Open_Call', 35000000, 35000000, 'Công viên phần mềm Quang Trung, TP.HCM', current_date + 14, ARRAY['Student', 'Team']::varchar[], 1, 3, 4, ARRAY['Mã nguồn', 'Báo cáo kỹ thuật']::varchar[], 'Kiến thức mạng di động; kinh nghiệm Docker/Kubernetes.', false, current_date + 39, 12, 'Onsite', 29),
    (9313, 9523, 'RD-2026-113', 'Trợ lý AI rà soát mã nguồn (code review) tự động cho quy trình phát triển phần mềm', 'Tài trợ nghiên cứu mô hình ngôn ngữ đề xuất nhận xét review cho pull request, phát hiện lỗi bảo mật và vi phạm quy chuẩn mã nguồn.', '<p>Doanh nghiệp tài trợ nhóm nghiên cứu xây dựng trợ lý review mã nguồn chạy trong mạng nội bộ.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Thu thập dữ liệu review đã ẩn danh từ các dự án nội bộ.</li><li>Tinh chỉnh mô hình mã nguồn mở sinh nhận xét review.</li><li>Đánh giá với kỹ sư thật: ≥ 60% nhận xét được chấp nhận.</li></ol><p><b>Đầu ra mong đợi:</b> mô hình, tiện ích tích hợp Git, báo cáo đánh giá.</p>', 'Trí tuệ nhân tạo & Học máy', 'Sponsored', 90000000, 90000000, 'Tân Bình, TP.HCM & Từ xa', current_date + 95, ARRAY['Team', 'Lab']::varchar[], 2, 5, 2, ARRAY['Mô hình đã huấn luyện', 'Mã nguồn', 'Báo cáo kỹ thuật']::varchar[], 'Kinh nghiệm học sâu cho mã nguồn; định hướng công bố.', true, current_date + 114, 20, 'Remote', 32),
    (9314, 9524, 'RD-2026-114', 'eKYC chống giả mạo khuôn mặt (liveness detection) trên ứng dụng di động', 'Phát hiện tấn công giả mạo bằng ảnh in, video phát lại và mặt nạ 3D khi định danh khách hàng điện tử, chạy trực tiếp trên điện thoại tầm trung.', '<p>Nền tảng định danh điện tử cần lớp chống giả mạo khuôn mặt nhẹ, chạy ngay trên thiết bị.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>Phát hiện ảnh in, video phát lại, mặt nạ 3D.</li><li>Mô hình dưới 5 MB, suy luận dưới 100 ms trên điện thoại tầm trung.</li><li>APCER/BPCER dưới 3%.</li></ol><p><b>Đầu ra mong đợi:</b> mô hình, SDK demo, báo cáo đánh giá.</p>', 'Trí tuệ nhân tạo & Học máy', 'Open_Call', 55000000, 55000000, 'Hà Nội & Từ xa', current_date - 6, ARRAY['Team', 'Student']::varchar[], 1, 4, 3, ARRAY['Mô hình đã huấn luyện', 'Bản demo / prototype']::varchar[], 'Kinh nghiệm thị giác máy tính.', true, current_date + 14, 14, 'Remote', 37),
    (9315, 9525, 'RD-2026-115', 'Trích xuất thông tin hóa đơn VAT và chứng từ kế toán bằng OCR và mô hình hiểu tài liệu', 'Nhận dạng và trích xuất các trường mã số thuế, số tiền, ngày lập từ ảnh chụp hóa đơn với độ chính xác trường ≥ 95%, xuất về định dạng JSON chuẩn.', '<p>Bộ phận kế toán xử lý hàng nghìn hóa đơn giấy mỗi tháng và cần tự động hóa khâu nhập liệu.</p><p><b>Thách thức kỹ thuật:</b></p><ol><li>OCR tiếng Việt trên ảnh chụp nghiêng, mờ.</li><li>Trích xuất trường bằng mô hình hiểu bố cục tài liệu.</li><li>Độ chính xác từng trường ≥ 95%.</li></ol><p><b>Đầu ra mong đợi:</b> dịch vụ API trích xuất và báo cáo đánh giá.</p>', 'Khoa học dữ liệu & Big Data', 'Open_Call', 30000000, 30000000, 'Hà Nội & Đà Nẵng', current_date + 65, ARRAY['Student', 'Team']::varchar[], 1, 3, 4, ARRAY['Mã nguồn', 'Mô hình đã huấn luyện']::varchar[], 'Kinh nghiệm Python; biết xử lý ảnh là lợi thế.', false, current_date + 86, 10, 'Remote', 39)
) AS v(id, dn, ma, tieu_de, tom_tat, mo_ta, linh_vuc, loai, kinh_phi, kinh_phi_min, dia_diem, han, doi_tuong, nhom_min, nhom_max,
       trl, san_pham, tieu_chi, nda, bat_dau, tuan, hinh_thuc, dang_truoc)
LEFT JOIN field AS fd ON fd.name = v.linh_vuc;

-- 4. Chi tiết đề bài cho 4 bài V-Tech (seed_dn.sql chỉ có phần cơ bản)
UPDATE business_problem SET summary = 'Yêu cầu xây dựng mô hình nén chạy trên Jetson Orin Nano, độ trễ < 15ms, hỗ trợ phân tích gói tin eBPF thời gian thực.', funding_min = 150000000,
    accepted_partners = ARRAY['Team', 'Lab']::varchar[], team_size_min = 2, team_size_max = 5,
    trl_level = 3, deliverables = ARRAY['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật']::varchar[], selection_criteria = 'Độ trễ suy luận đo trên Jetson Orin Nano; F1-score trên tập kiểm thử của doanh nghiệp; kinh nghiệm eBPF của nhóm.', nda_required = true,
    start_date = current_date + 19, duration_weeks = 16, work_mode = 'Hybrid', approved_at = TIMESTAMPTZ '2026-10-06 10:00+07'
WHERE problem_id = 9084;
UPDATE business_problem SET summary = 'Fine-tune và nén mô hình ngôn ngữ lớn (7B parameters) với cơ chế RAG đa tầng, kiểm thử đối sánh lâm sàng.', funding_min = 250000000,
    accepted_partners = ARRAY['Lab']::varchar[], team_size_min = 3, team_size_max = 8,
    trl_level = 4, deliverables = ARRAY['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật', 'Bài báo khoa học']::varchar[], selection_criteria = 'Kinh nghiệm NLP tiếng Việt của Lab; phương án đánh giá với bác sĩ; kế hoạch bảo mật dữ liệu.', nda_required = true,
    start_date = current_date + 45, duration_weeks = 24, work_mode = 'Hybrid', approved_at = TIMESTAMPTZ '2026-09-29 10:00+07'
WHERE problem_id = 9079;
UPDATE business_problem SET summary = 'Đang phối hợp cùng Lab Robotics & IoT UIT. Hợp đồng MoA đã ký kết, tiến độ Milestone 2.', funding_min = 350000000,
    accepted_partners = ARRAY['Lab', 'Team']::varchar[], team_size_min = 3, team_size_max = 5,
    trl_level = 4, deliverables = ARRAY['Mã nguồn', 'Báo cáo kỹ thuật', 'Bản demo / prototype']::varchar[], selection_criteria = 'Kinh nghiệm ROS2; có AGV hoặc robot thử nghiệm tại Lab.', nda_required = true,
    start_date = DATE '2026-09-01', duration_weeks = 30, work_mode = 'Onsite', approved_at = TIMESTAMPTZ '2026-07-12 10:00+07'
WHERE problem_id = 9071;
UPDATE business_problem SET summary = 'Tự động phân loại khuyết tật hình ảnh SEM wafer với độ chính xác F1-score > 98.5%.', funding_min = 200000000,
    accepted_partners = ARRAY['Team', 'Student']::varchar[], team_size_min = 1, team_size_max = 4,
    trl_level = 2, deliverables = ARRAY['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật']::varchar[], selection_criteria = 'Kết quả thử nghiệm sơ bộ trên tập ảnh mẫu do doanh nghiệp cung cấp.', nda_required = true,
    start_date = current_date + 109, duration_weeks = 20, work_mode = 'At_UIT', approved_at = NULL::timestamptz
WHERE problem_id = 9091;

-- 5. Kỹ năng yêu cầu (thêm vào danh mục nếu chưa có)
INSERT INTO skill (name)
SELECT DISTINCT unnest(ARRAY['PyTorch', 'LangChain', 'Vector DB', 'RAG', 'LLM', 'Network Security', 'eBPF', 'Scikit-learn', 'Python', 'ROS2', 'NVIDIA Jetson', 'C/C++', 'LiDAR SLAM', 'PyTorch Geometric', 'Kafka', 'SQL', 'Medical Imaging', 'MONAI', '3D U-Net', 'Software Testing', 'TypeScript', 'OpenAPI', 'Docker', 'YOLO', 'DeepStream', 'Computer Vision', 'Verilog', 'FPGA', 'Vivado HLS', 'RISC-V', 'Zeek', 'GNN', 'Suricata', 'On-device AI', 'TFLite', 'Model Compression', 'Speech Recognition', 'NLP Tiếng Việt', 'Kubernetes', '5G Core', 'Static Analysis', 'Git', 'Face Anti-Spoofing', 'OCR', 'Document AI', 'FastAPI', 'Edge AI', 'vLLM', 'Healthcare AI', 'C++', 'Sensor Fusion', 'Embedded Linux', 'Semiconductor', 'Deep Learning', 'Defect Detection'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO problem_skill (problem_id, skill_id)
SELECT v.id, s.skill_id
FROM (VALUES
    (9301, 'PyTorch'),
    (9301, 'LangChain'),
    (9301, 'Vector DB'),
    (9301, 'RAG'),
    (9301, 'LLM'),
    (9302, 'Network Security'),
    (9302, 'eBPF'),
    (9302, 'Scikit-learn'),
    (9302, 'Python'),
    (9303, 'ROS2'),
    (9303, 'NVIDIA Jetson'),
    (9303, 'C/C++'),
    (9303, 'LiDAR SLAM'),
    (9304, 'PyTorch Geometric'),
    (9304, 'Kafka'),
    (9304, 'Python'),
    (9304, 'SQL'),
    (9305, 'Medical Imaging'),
    (9305, 'MONAI'),
    (9305, '3D U-Net'),
    (9305, 'PyTorch'),
    (9306, 'Software Testing'),
    (9306, 'TypeScript'),
    (9306, 'OpenAPI'),
    (9306, 'Docker'),
    (9307, 'YOLO'),
    (9307, 'DeepStream'),
    (9307, 'NVIDIA Jetson'),
    (9307, 'Computer Vision'),
    (9308, 'Verilog'),
    (9308, 'FPGA'),
    (9308, 'Vivado HLS'),
    (9308, 'RISC-V'),
    (9309, 'Zeek'),
    (9309, 'GNN'),
    (9309, 'Suricata'),
    (9309, 'Network Security'),
    (9310, 'On-device AI'),
    (9310, 'TFLite'),
    (9310, 'Model Compression'),
    (9310, 'LLM'),
    (9311, 'Speech Recognition'),
    (9311, 'PyTorch'),
    (9311, 'NLP Tiếng Việt'),
    (9311, 'Python'),
    (9312, 'Kubernetes'),
    (9312, 'Docker'),
    (9312, '5G Core'),
    (9312, 'Python'),
    (9313, 'LLM'),
    (9313, 'Python'),
    (9313, 'Static Analysis'),
    (9313, 'Git'),
    (9314, 'Computer Vision'),
    (9314, 'PyTorch'),
    (9314, 'TFLite'),
    (9314, 'Face Anti-Spoofing'),
    (9315, 'OCR'),
    (9315, 'Python'),
    (9315, 'Document AI'),
    (9315, 'FastAPI'),
    (9084, 'Edge AI'),
    (9084, 'eBPF'),
    (9084, 'NVIDIA Jetson'),
    (9084, 'Network Security'),
    (9084, 'PyTorch'),
    (9079, 'LLM'),
    (9079, 'RAG'),
    (9079, 'NLP Tiếng Việt'),
    (9079, 'vLLM'),
    (9079, 'Healthcare AI'),
    (9071, 'ROS2'),
    (9071, 'LiDAR SLAM'),
    (9071, 'C++'),
    (9071, 'Sensor Fusion'),
    (9071, 'Embedded Linux'),
    (9091, 'Computer Vision'),
    (9091, 'Semiconductor'),
    (9091, 'Deep Learning'),
    (9091, 'Defect Detection')
) AS v(id, ten)
JOIN skill AS s ON s.name = v.ten
ON CONFLICT DO NOTHING;

-- 6. Kế hoạch & mốc nghiệm thu
INSERT INTO problem_milestone (problem_id, seq, name, due_week, budget_percent)
VALUES
    (9301, 1, 'Khảo sát & thiết kế giải pháp', 4, 30),
    (9301, 2, 'Hiện thực & thử nghiệm', 12, 40),
    (9301, 3, 'Hoàn thiện & bàn giao', 16, 30),
    (9302, 1, 'Khảo sát & thiết kế giải pháp', 4, 30),
    (9302, 2, 'Hiện thực & thử nghiệm', 11, 40),
    (9302, 3, 'Hoàn thiện & bàn giao', 14, 30),
    (9303, 1, 'Khảo sát & thiết kế giải pháp', 6, 30),
    (9303, 2, 'Hiện thực & thử nghiệm', 18, 40),
    (9303, 3, 'Hoàn thiện & bàn giao', 24, 30),
    (9304, 1, 'Khảo sát & thiết kế giải pháp', 4, 30),
    (9304, 2, 'Hiện thực & thử nghiệm', 12, 40),
    (9304, 3, 'Hoàn thiện & bàn giao', 16, 30),
    (9305, 1, 'Khảo sát & thiết kế giải pháp', 7, 30),
    (9305, 2, 'Hiện thực & thử nghiệm', 21, 40),
    (9305, 3, 'Hoàn thiện & bàn giao', 28, 30),
    (9306, 1, 'Khảo sát & thiết kế giải pháp', 3, 30),
    (9306, 2, 'Hiện thực & thử nghiệm', 9, 40),
    (9306, 3, 'Hoàn thiện & bàn giao', 12, 30),
    (9307, 1, 'Khảo sát & thiết kế giải pháp', 5, 30),
    (9307, 2, 'Hiện thực & thử nghiệm', 15, 40),
    (9307, 3, 'Hoàn thiện & bàn giao', 20, 30),
    (9308, 1, 'Khảo sát & thiết kế giải pháp', 6, 30),
    (9308, 2, 'Hiện thực & thử nghiệm', 18, 40),
    (9308, 3, 'Hoàn thiện & bàn giao', 24, 30),
    (9309, 1, 'Khảo sát & thiết kế giải pháp', 5, 30),
    (9309, 2, 'Hiện thực & thử nghiệm', 15, 40),
    (9309, 3, 'Hoàn thiện & bàn giao', 20, 30),
    (9310, 1, 'Khảo sát & thiết kế giải pháp', 6, 30),
    (9310, 2, 'Hiện thực & thử nghiệm', 18, 40),
    (9310, 3, 'Hoàn thiện & bàn giao', 24, 30),
    (9311, 1, 'Khảo sát & thiết kế giải pháp', 4, 30),
    (9311, 2, 'Hiện thực & thử nghiệm', 12, 40),
    (9311, 3, 'Hoàn thiện & bàn giao', 16, 30),
    (9312, 1, 'Khảo sát & thiết kế giải pháp', 3, 30),
    (9312, 2, 'Hiện thực & thử nghiệm', 9, 40),
    (9312, 3, 'Hoàn thiện & bàn giao', 12, 30),
    (9313, 1, 'Khảo sát & thiết kế giải pháp', 5, 30),
    (9313, 2, 'Hiện thực & thử nghiệm', 15, 40),
    (9313, 3, 'Hoàn thiện & bàn giao', 20, 30),
    (9314, 1, 'Khảo sát & thiết kế giải pháp', 4, 30),
    (9314, 2, 'Hiện thực & thử nghiệm', 11, 40),
    (9314, 3, 'Hoàn thiện & bàn giao', 14, 30),
    (9315, 1, 'Khảo sát & thiết kế giải pháp', 3, 30),
    (9315, 2, 'Hiện thực & thử nghiệm', 8, 40),
    (9315, 3, 'Hoàn thiện & bàn giao', 10, 30),
    (9084, 1, 'Thu thập dữ liệu & pipeline eBPF', 4, 30),
    (9084, 2, 'Mô hình phát hiện bất thường', 10, 40),
    (9084, 3, 'Tối ưu trên Jetson & bàn giao', 16, 30),
    (9079, 1, 'Chuẩn hóa kho tri thức & RAG', 8, 30),
    (9079, 2, 'Fine-tune & đánh giá lâm sàng', 18, 40),
    (9079, 3, 'Nén mô hình & triển khai thử', 24, 30),
    (9071, 1, 'Mô phỏng Gazebo', 6, 40),
    (9071, 2, 'SLAM 3D trên AGV mẫu', 14, 20),
    (9071, 3, 'Định vị chính xác & tích hợp', 22, 20),
    (9071, 4, 'Nghiệm thu tại nhà xưởng', 30, 20),
    (9091, 1, 'Tiền xử lý & gán nhãn dữ liệu', 6, 30),
    (9091, 2, 'Mô hình phân loại & heatmap', 14, 40),
    (9091, 3, 'Tích hợp dây chuyền thử', 20, 30);

-- 7. Nhóm thử của SV A (9101): nộp theo nhóm (9821), ca 403 "không phải trưởng nhóm" (9822), ca 409 "sai quy mô nhóm" (9823)
INSERT INTO student_team (team_id, team_name, faculty_id, status)
SELECT v.id, v.ten, f.faculty_id, 'Active'
FROM (VALUES (9821, 'Nhóm thử SV A – Edge AI'), (9822, 'Nhóm thử AI Club (SV A là thành viên)'), (9823, 'Nhóm thử 5 người (SV A trưởng nhóm)')) AS v(id, ten)
LEFT JOIN faculty AS f ON f.code = 'KHMT';

INSERT INTO team_member (team_id, student_id, role_in_team, position_title)
VALUES
    (9821, 9101, 'Leader', 'Mô hình AI & tối ưu suy luận'),
    (9821, 9102, 'Member', 'Thu thập & xử lý dữ liệu'),
    (9821, 9603, 'Member', 'Triển khai trên thiết bị biên'),
    (9822, 9605, 'Leader', 'Kiến trúc hệ thống'),
    (9822, 9101, 'Member', 'Huấn luyện mô hình'),
    (9822, 9606, 'Member', 'Tích hợp phần cứng'),
    (9822, 9607, 'Member', 'Đánh giá & báo cáo'),
    (9823, 9101, 'Leader', 'Điều phối'),
    (9823, 9608, 'Member', 'Mô hình'),
    (9823, 9609, 'Member', 'Dữ liệu'),
    (9823, 9610, 'Member', 'Hạ tầng'),
    (9823, 9611, 'Member', 'Kiểm thử');

-- 8. Tệp đề bài (chỉ PDF; nội dung: npm run seed:dn-files)
INSERT INTO rd_attachment (attachment_id, owner_type, owner_id, file_name, storage_path, size_bytes, doc_type, uploaded_by_account_id)
VALUES
    (9931, 'Problem', 9301, 'De_bai_RD_2026_101.pdf', 'problems/9301/De_bai_RD_2026_101.pdf', 1258291, 'Đề bài', 9511),
    (9932, 'Problem', 9302, 'De_bai_RD_2026_102.pdf', 'problems/9302/De_bai_RD_2026_102.pdf', 1258291, 'Đề bài', 9512),
    (9933, 'Problem', 9303, 'De_bai_RD_2026_103.pdf', 'problems/9303/De_bai_RD_2026_103.pdf', 1258291, 'Đề bài', 9513),
    (9934, 'Problem', 9304, 'De_bai_RD_2026_104.pdf', 'problems/9304/De_bai_RD_2026_104.pdf', 1258291, 'Đề bài', 9514),
    (9935, 'Problem', 9305, 'De_bai_RD_2026_105.pdf', 'problems/9305/De_bai_RD_2026_105.pdf', 1258291, 'Đề bài', 9515),
    (9936, 'Problem', 9306, 'De_bai_RD_2026_106.pdf', 'problems/9306/De_bai_RD_2026_106.pdf', 1258291, 'Đề bài', 9516),
    (9937, 'Problem', 9307, 'De_bai_RD_2026_107.pdf', 'problems/9307/De_bai_RD_2026_107.pdf', 1258291, 'Đề bài', 9517),
    (9938, 'Problem', 9308, 'De_bai_RD_2026_108.pdf', 'problems/9308/De_bai_RD_2026_108.pdf', 1258291, 'Đề bài', 9518),
    (9939, 'Problem', 9309, 'De_bai_RD_2026_109.pdf', 'problems/9309/De_bai_RD_2026_109.pdf', 1258291, 'Đề bài', 9519),
    (9940, 'Problem', 9310, 'De_bai_RD_2026_110.pdf', 'problems/9310/De_bai_RD_2026_110.pdf', 1258291, 'Đề bài', 9520),
    (9941, 'Problem', 9311, 'De_bai_RD_2026_111.pdf', 'problems/9311/De_bai_RD_2026_111.pdf', 1258291, 'Đề bài', 9521),
    (9942, 'Problem', 9312, 'De_bai_RD_2026_112.pdf', 'problems/9312/De_bai_RD_2026_112.pdf', 1258291, 'Đề bài', 9522),
    (9943, 'Problem', 9313, 'De_bai_RD_2026_113.pdf', 'problems/9313/De_bai_RD_2026_113.pdf', 1258291, 'Đề bài', 9523),
    (9944, 'Problem', 9314, 'De_bai_RD_2026_114.pdf', 'problems/9314/De_bai_RD_2026_114.pdf', 1258291, 'Đề bài', 9524),
    (9945, 'Problem', 9315, 'De_bai_RD_2026_115.pdf', 'problems/9315/De_bai_RD_2026_115.pdf', 1258291, 'Đề bài', 9525),
    (9946, 'Problem', 9084, 'Specs_EdgeAI_DDoS_VTech_2026.pdf', 'problems/9084/Specs_EdgeAI_DDoS_VTech_2026.pdf', 2936013, 'Đề bài', 9501),
    (9947, 'Problem', 9079, 'RFP_LLM_YTe_DuPhong.pdf', 'problems/9079/RFP_LLM_YTe_DuPhong.pdf', 1992294, 'Đề bài', 9501),
    (9948, 'Problem', 9071, 'Ban_ve_mat_bang_xuong.pdf', 'problems/9071/Ban_ve_mat_bang_xuong.pdf', 4299162, 'Đề bài', 9501),
    (9949, 'Problem', 9071, 'Thong_so_AGV_VT200.pdf', 'problems/9071/Thong_so_AGV_VT200.pdf', 943718, 'Đề bài', 9501),
    (9950, 'Problem', 9091, 'Mo_ta_bai_toan_Wafer_SEM.pdf', 'problems/9091/Mo_ta_bai_toan_Wafer_SEM.pdf', 3355443, 'Đề bài', 9501);

COMMIT;

-- Kiểm tra nhanh (kết quả mong đợi): SV thấy 18 bài (Open 17 | In_Progress 1)
-- SELECT status, count(*) FROM business_problem WHERE status IN ('Open','In_Progress') AND problem_id IN (9301, 9302, 9303, 9304, 9305, 9306, 9307, 9308, 9309, 9310, 9311, 9312, 9313, 9314, 9315, 9084, 9079, 9071, 9091) GROUP BY status;
