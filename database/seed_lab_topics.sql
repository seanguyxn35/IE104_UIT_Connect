/* Dữ liệu mẫu cho SV-07 "Chợ ghép nhóm": 12 đề tài Lab (topic_id 9011–9022) để thử tìm kiếm và bộ lọc.
   - Chạy SAU seed.sql và seed_dn.sql (cần giảng viên 9201, 9701–9703, các Lab 1–6, lĩnh vực, kỹ năng có sẵn).
   - Không đụng đề tài thử 9001–9003 của chức năng ứng tuyển (reset.sql).
   - Chạy lại được: xóa rồi tạo lại đúng dải 9011–9022 (đơn ứng tuyển vào các đề tài này bị xóa theo).
   - Kỹ năng gắn theo TÊN có sẵn trong bảng skill; tên không có thì bỏ qua, không thêm vào danh mục.
   - 9021 ở trạng thái Filled ("Đã đủ chỗ"), 9022 ở trạng thái Paused (không hiện ở chợ). */

BEGIN;

DELETE FROM topic_skill WHERE topic_id BETWEEN 9011 AND 9022;
DELETE FROM lab_topic WHERE topic_id BETWEEN 9011 AND 9022;

INSERT INTO lab_topic (topic_id, lecturer_id, lab_id, field_id, topic_type, title, description, recruitment_criteria,
                       slots, funding_amount, funding_note, trl_level, partner_name, is_interdisciplinary, deadline, status, created_at)
VALUES
 (9011, 9703, 5, 2, 'Lab_RD', 'Hệ thống giám sát và phân loại khuyết tật bán dẫn bằng Edge AI và thị giác máy tính',
  'Hợp tác cùng Viện Vi điện tử ĐHQG-HCM: tối ưu đường truyền dữ liệu quang học và phân loại mẫu wafer silicon với độ trễ dưới 15 ms trên thiết bị biên.',
  'GPA từ 7.5, đã học Thị giác máy tính hoặc Học sâu.', 3, 45000000, '+ GPU A100', 4, 'Viện Vi điện tử ĐHQG-HCM', true, CURRENT_DATE + 30, 'Open', now() - INTERVAL '2 days'),
 (9012, 9703, 3, 4, 'Student_Research', 'Thiết kế vi kiến trúc RISC-V tùy biến tăng tốc mật mã hậu lượng tử',
  'Hiện thực và mô phỏng trên FPGA Xilinx UltraScale+, tối ưu thuật toán Kyber / Dilithium cho thiết bị nhúng hạn chế năng lượng.',
  'Đã học Thiết kế luận lý số, biết Verilog.', 2, NULL, NULL, 3, NULL, false, CURRENT_DATE + 45, 'Open', now() - INTERVAL '5 days'),
 (9013, 9703, 5, 8, 'Lab_RD', 'Robot AGV trong kho vận thông minh kết hợp SLAM đa cảm biến LiDAR – Camera',
  'Xây dựng robot tự hành chở hàng trong kho, định vị bằng SLAM kết hợp LiDAR và camera, điều phối nhiều robot qua ROS2.',
  'Ưu tiên sinh viên Kỹ thuật Máy tính hoặc Khoa học Máy tính.', 3, 30000000, NULL, 5, 'Công ty Logistics Tân Cảng', true, CURRENT_DATE + 21, 'Open', now() - INTERVAL '1 day'),
 (9014, 9701, 4, 6, 'Student_Research', 'Phát hiện xâm nhập trên hạ tầng 5G Core bằng eBPF và học máy',
  'Thu thập luồng sự kiện mạng ở tầng nhân bằng eBPF, huấn luyện mô hình phát hiện bất thường cho các thành phần 5G Core.',
  'Đã học Mạng máy tính; biết Linux.', 2, NULL, NULL, 4, NULL, false, CURRENT_DATE + 40, 'Open', now() - INTERVAL '8 days'),
 (9015, 9702, 2, 3, 'Thesis', 'Trợ lý hỏi đáp quy chế đào tạo bằng mô hình ngôn ngữ lớn tiếng Việt',
  'Khóa luận tốt nghiệp: xây dựng hệ thống truy xuất tăng cường (RAG) trên văn bản quy chế UIT, đánh giá độ chính xác câu trả lời.',
  'Sinh viên năm cuối, GPA từ 7.0.', 2, NULL, NULL, 3, NULL, false, CURRENT_DATE + 14, 'Open', now() - INTERVAL '3 days'),
 (9016, 9702, 2, 11, 'Student_Research', 'Phân đoạn khối u não trên ảnh MRI 3D phục vụ hỗ trợ chẩn đoán',
  'Huấn luyện mô hình 3D U-Net trên dữ liệu MRI đã ẩn danh, phối hợp bác sĩ đánh giá kết quả phân đoạn.',
  'Ưu tiên liên ngành: sinh viên có quan tâm Y tế số.', 3, 20000000, NULL, 3, 'Bệnh viện Chợ Rẫy', true, CURRENT_DATE + 60, 'Open', now() - INTERVAL '10 days'),
 (9017, 9201, 1, 2, 'Major_Project', 'Chống giả mạo khuôn mặt trên thiết bị di động',
  'Đồ án chuyên ngành: mô hình phát hiện ảnh in, video phát lại và mặt nạ 3D, chạy trực tiếp trên điện thoại.',
  NULL, 2, NULL, NULL, 5, NULL, false, CURRENT_DATE + 20, 'Open', now() - INTERVAL '4 days'),
 (9018, 9201, 1, 1, 'Lab_RD', 'Trích xuất thông tin hóa đơn và chứng từ tiếng Việt bằng Document AI',
  'Nhận dạng ký tự và trích xuất trường thông tin trên hóa đơn điện tử, phiếu chi; triển khai thành dịch vụ API.',
  'Biết Python, đã làm dự án Học máy.', 2, 45000000, NULL, 6, 'Công ty FinTech Sài Gòn', false, CURRENT_DATE + 25, 'Open', now() - INTERVAL '6 days'),
 (9019, 9201, 6, 7, 'Thesis', 'Phân tích luồng sự kiện thời gian thực với Kafka cho thương mại điện tử',
  'Khóa luận: xử lý luồng nhấp chuột, gợi ý sản phẩm gần thời gian thực, đánh giá độ trễ và thông lượng.',
  NULL, 1, NULL, NULL, 4, NULL, false, CURRENT_DATE + 35, 'Open', now() - INTERVAL '12 days'),
 (9020, 9201, NULL, 12, 'Student_Research', 'Sinh ca kiểm thử phần mềm tự động bằng phân tích tĩnh và LLM',
  'Kết hợp phân tích tĩnh mã nguồn TypeScript với mô hình ngôn ngữ lớn để sinh và chọn lọc ca kiểm thử.',
  NULL, 2, NULL, NULL, 3, NULL, false, CURRENT_DATE + 50, 'Open', now() - INTERVAL '7 days'),
 (9021, 9701, 4, 9, 'Major_Project', 'Hạ tầng Kubernetes tự co giãn cho dịch vụ suy luận AI',
  'Đồ án: tự động co giãn dịch vụ suy luận mô hình theo tải, đo chi phí và độ trễ.',
  NULL, 1, NULL, NULL, 5, NULL, false, CURRENT_DATE + 15, 'Filled', now() - INTERVAL '20 days'),
 (9022, 9703, 5, 5, 'Student_Research', 'Nhận dạng giọng nói tiếng Việt trên thiết bị nhúng',
  'Tạm dừng tuyển: chờ kinh phí đợt sau.', NULL, 2, NULL, NULL, 3, NULL, false, CURRENT_DATE + 30, 'Paused', now() - INTERVAL '30 days');

INSERT INTO topic_skill (topic_id, skill_id)
SELECT v.topic_id, s.skill_id
  FROM (VALUES
    (9011, 'PyTorch'), (9011, 'Defect Detection'), (9011, 'NVIDIA Jetson'), (9011, 'Edge AI'), (9011, 'Computer Vision'),
    (9012, 'RISC-V'), (9012, 'Verilog'), (9012, 'FPGA'), (9012, 'Vivado HLS'),
    (9013, 'ROS2'), (9013, 'LiDAR SLAM'), (9013, 'Sensor Fusion'), (9013, 'C++'),
    (9014, 'eBPF'), (9014, '5G Core'), (9014, 'Zeek'), (9014, 'Suricata'), (9014, 'Network Security'),
    (9015, 'LLM'), (9015, 'LangChain'), (9015, 'NLP Tiếng Việt'), (9015, 'Vector DB'),
    (9016, 'MONAI'), (9016, '3D U-Net'), (9016, 'Medical Imaging'), (9016, 'PyTorch'),
    (9017, 'Face Anti-Spoofing'), (9017, 'TFLite'), (9017, 'On-device AI'), (9017, 'Model Compression'),
    (9018, 'OCR'), (9018, 'Document AI'), (9018, 'FastAPI'), (9018, 'Docker'),
    (9019, 'Kafka'), (9019, 'SQL'), (9019, 'Python'), (9019, 'Scikit-learn'),
    (9020, 'Static Analysis'), (9020, 'Software Testing'), (9020, 'LLM'), (9020, 'TypeScript'),
    (9021, 'Kubernetes'), (9021, 'Docker'), (9021, 'vLLM'),
    (9022, 'Speech Recognition'), (9022, 'Embedded Linux'), (9022, 'TFLite'), (9022, 'C/C++')
  ) AS v(topic_id, skill_name)
  JOIN skill AS s ON s.name = v.skill_name
ON CONFLICT DO NOTHING;

COMMIT;

-- Kiểm tra nhanh: số đề tài theo trạng thái và số kỹ năng đã gắn
SELECT t.status, count(*) AS so_de_tai,
       (SELECT count(*) FROM topic_skill WHERE topic_id BETWEEN 9011 AND 9022) AS so_ky_nang
  FROM lab_topic AS t WHERE t.topic_id BETWEEN 9011 AND 9022 GROUP BY t.status ORDER BY t.status;
