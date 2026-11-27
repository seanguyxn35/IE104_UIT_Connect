/* Ẩn / công khai hai mục trên hồ sơ SV (trang SV-04: Học vấn, Kỹ năng).
   Chỉ THÊM cột, mặc định công khai nên không ảnh hưởng dữ liệu hiện có. Chạy lại nhiều lần vẫn an toàn. */
ALTER TABLE student_profile
    ADD COLUMN IF NOT EXISTS is_education_public BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_skills_public    BOOLEAN NOT NULL DEFAULT true;
