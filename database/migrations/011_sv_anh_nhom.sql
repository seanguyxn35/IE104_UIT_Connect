/* SV-06: ảnh nhóm. Đường dẫn công khai của ảnh trong bucket "avatars" (thư mục team-<id>/); NULL = chưa có ảnh.
   Chỉ THÊM cột cho phép NULL nên không ảnh hưởng dữ liệu và truy vấn hiện có. Chạy lại nhiều lần vẫn an toàn. */
ALTER TABLE student_team
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL;
