/* =====================================================================
   Migration 002 – Thành tích / chứng chỉ SV tự khai (trang SV-04)

   Luồng: SV thêm thành tích -> lưu ở trạng thái "Tự khai" (Self_Declared), hiện ngay,
   không cần duyệt trước. Xác minh là tùy chọn:
   Self_Declared -> (SV gửi xác minh) Pending -> Verified / Rejected.

   Thay đổi trên bảng student_achievement:
     1. Thêm cột visibility: chế độ hiển thị của TỪNG mục (cùng bộ giá trị với profile_visibility).
     2. verification_status nhận thêm 'Self_Declared' và lấy làm mặc định.
     3. Chặn nhập trùng: cùng SV, cùng tên + tổ chức cấp (không phân biệt hoa thường) + ngày cấp.

   Cách chạy: Supabase -> SQL Editor -> dán toàn bộ file -> Run. Chạy lại nhiều lần vẫn an toàn.
   Dữ liệu có sẵn được giữ nguyên (mục cũ nhận visibility = 'Public').
   ===================================================================== */

BEGIN;

ALTER TABLE student_achievement
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'Public';

ALTER TABLE student_achievement DROP CONSTRAINT IF EXISTS ck_student_achievement_visibility;
ALTER TABLE student_achievement ADD CONSTRAINT ck_student_achievement_visibility
    CHECK (visibility IN ('Public','Partners_Only','Private'));

ALTER TABLE student_achievement DROP CONSTRAINT IF EXISTS ck_student_achievement_status;
ALTER TABLE student_achievement ADD CONSTRAINT ck_student_achievement_status
    CHECK (verification_status IN ('Self_Declared','Pending','Verified','Rejected'));

ALTER TABLE student_achievement ALTER COLUMN verification_status SET DEFAULT 'Self_Declared';

CREATE UNIQUE INDEX IF NOT EXISTS ux_student_achievement_entry
    ON student_achievement (student_id, lower(title), lower(coalesce(issued_by, '')), issued_date)
    NULLS NOT DISTINCT;

COMMIT;
