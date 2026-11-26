/* Ẩn / công khai từng chỉ số trên hồ sơ SV (trang SV-04: GPA, Điểm rèn luyện, Đề tài & Công bố).
   Chỉ THÊM cột, mặc định công khai nên không ảnh hưởng dữ liệu hiện có. Chạy lại nhiều lần vẫn an toàn. */
ALTER TABLE student_profile
    ADD COLUMN IF NOT EXISTS is_gpa_public           BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_training_score_public BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_achievements_public   BOOLEAN NOT NULL DEFAULT true;
