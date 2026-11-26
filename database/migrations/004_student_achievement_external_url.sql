/* Công bố bên ngoài hệ thống (thành tích loại 'Publication' do SV tự cung cấp): lưu liên kết DOI/URL để người xem đối chiếu.
   Chỉ THÊM cột cho phép NULL nên không ảnh hưởng dữ liệu hiện có. Quy tắc "phải có liên kết hoặc tệp minh chứng"
   do máy chủ kiểm tra (tệp được tải lên ở bước sau nên không ràng buộc được ở CSDL). Chạy lại nhiều lần vẫn an toàn. */
ALTER TABLE student_achievement
    ADD COLUMN IF NOT EXISTS external_url VARCHAR(255) NULL;

ALTER TABLE student_achievement
    DROP CONSTRAINT IF EXISTS ck_student_achievement_external_url;
ALTER TABLE student_achievement
    ADD CONSTRAINT ck_student_achievement_external_url CHECK (external_url LIKE 'https://%');
