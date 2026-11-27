/* =====================================================================
   DỮ LIỆU THỬ cho "Quản trị nhóm – Thông tin nhóm" (SV-06)
   Chạy SAU: seed.sql, seed_showcase.sql, migrations/010_sv_ho_so_nhom.sql.
   Supabase -> SQL Editor -> dán -> Run. Chạy lại để đặt lại hồ sơ nhóm 9301.
   Toàn bộ là dữ liệu GIẢ. Chỉ động tới nhóm 9301: tôn chỉ, khoa, 3 lĩnh vực, kỹ năng, cố vấn (GV thử 9201).
   Kỹ năng lấy từ danh mục có sẵn theo tên, tên nào không có thì bỏ qua.
   ===================================================================== */

BEGIN;

UPDATE student_team SET
    description = '[TEST] Nhóm nghiên cứu Thị giác máy tính tại biên: nén mô hình học sâu và triển khai trên thiết bị nhúng cho bài toán đô thị thông minh.',
    faculty_id = (SELECT faculty_id FROM faculty WHERE code = 'KHMT'),
    field_id = (SELECT field_id FROM field WHERE name = 'Thị giác máy tính'),
    advisor_lecturer_id = 9201
WHERE team_id = 9301;

DELETE FROM team_field WHERE team_id = 9301;
INSERT INTO team_field (team_id, field_id)
SELECT 9301, field_id FROM field WHERE name IN ('Thị giác máy tính', 'Hệ thống nhúng & IoT', 'Robot & Xe tự hành');

DELETE FROM team_skill WHERE team_id = 9301;
INSERT INTO team_skill (team_id, skill_id)
SELECT 9301, skill_id FROM skill WHERE name IN ('PyTorch', 'C++', 'NVIDIA Jetson', 'DeepStream', 'ROS2', 'Edge AI');

COMMIT;
