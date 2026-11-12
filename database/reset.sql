/* =====================================================================
   UIT CONNECT – ĐẶT LẠI DỮ LIỆU THỬ trước MỖI ca kiểm thử (TC01–TC03)
   Đề bài: "Chuẩn bị lại dữ liệu trước mỗi ca để có thể lặp lại kết quả."

   Điều kiện: đã chạy seed.sql ít nhất một lần (để có tài khoản 9101, 9102, 9201).
   Cách chạy: Supabase → SQL Editor → dán toàn bộ file → Run.

   Việc file này làm (trong 1 transaction, lỗi thì không đổi gì):
     1. Xóa MỌI đơn ứng tuyển thuộc phạm vi thử (đề tài 9001–9003, SV 9101–9102).
        Không đụng tới dữ liệu khác trong CSDL.
     2. Đưa 3 đề tài thử về trạng thái ban đầu (slots, status 'Open', hạn nộp).
     3. Nạp lại 2 đơn có sẵn của seed:
          - Đề tài 9002: SV A (9101) Pending
          - Đề tài 9003: SV B (9102) Accepted
   Tài khoản và hồ sơ SV/GV không bị ca kiểm thử nào thay đổi nên không nạp lại.
   Cần dựng lại từ đầu thì chạy seed.sql (seed.sql cũng tự xóa đơn cũ).
   ===================================================================== */

BEGIN;

-- 0. Chặn sớm với thông báo dễ hiểu nếu chưa chạy seed.sql
DO $$
BEGIN
    IF (SELECT count(*) FROM student_profile  WHERE student_id  IN (9101, 9102)) < 2
    OR NOT EXISTS (SELECT 1 FROM lecturer_profile WHERE lecturer_id = 9201)
    OR (SELECT count(*) FROM lab_topic WHERE topic_id IN (9001, 9002, 9003)) < 3 THEN
        RAISE EXCEPTION 'Thiếu dữ liệu thử: hãy chạy database/seed.sql trước rồi mới chạy reset.sql';
    END IF;
END $$;

-- 1. Xóa đơn ứng tuyển trong phạm vi thử
DELETE FROM lab_application
WHERE topic_id IN (9001, 9002, 9003)
   OR student_id IN (9101, 9102);

-- 2. Đưa đề tài về trạng thái ban đầu
UPDATE lab_topic AS t
SET slots    = v.slots,
    status   = 'Open',
    deadline = current_date + 30
FROM (VALUES (9001, 3), (9002, 3), (9003, 1)) AS v(topic_id, slots)
WHERE t.topic_id = v.topic_id;

-- 3. Nạp lại đơn có sẵn
INSERT INTO lab_application (topic_id, student_id, message, status, responded_at)
VALUES
    (9002, 9101, '[TEST] Đơn có sẵn của SV A', 'Pending',  NULL),
    (9003, 9102, '[TEST] Đơn có sẵn của SV B', 'Accepted', now());

COMMIT;

-- ---------------------------------------------------------------------
-- Ảnh chụp kết quả này làm minh chứng "dữ liệu TRƯỚC" của mỗi ca.
-- Mong đợi:
--   9001 | slots 3 | 0 đơn | 0 Accepted
--   9002 | slots 3 | 1 đơn | 0 Accepted  (9101:Pending)
--   9003 | slots 1 | 1 đơn | 1 Accepted  (9102:Accepted)
-- ---------------------------------------------------------------------
SELECT t.topic_id, t.title, t.slots, t.status,
       count(a.application_id)                                      AS so_don,
       count(a.application_id) FILTER (WHERE a.status = 'Accepted') AS so_accepted,
       string_agg(a.student_id || ':' || a.status, ', ')            AS chi_tiet
FROM lab_topic AS t
LEFT JOIN lab_application AS a ON a.topic_id = t.topic_id
WHERE t.topic_id IN (9001, 9002, 9003)
GROUP BY t.topic_id, t.title, t.slots, t.status
ORDER BY t.topic_id;
