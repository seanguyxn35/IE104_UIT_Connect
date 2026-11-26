/* =====================================================================
   UIT CONNECT – KIỂM THỬ Ở TẦNG CSDL cho chức năng "SV ứng tuyển đề tài Lab"
   Chạy: Supabase → SQL Editor → dán toàn bộ file → Run. Kết quả là 1 bảng PASS/FAIL.

   KHÔNG làm thay đổi dữ liệu: mọi lệnh INSERT thử đều nằm trong khối có bắt lỗi
   và luôn bị hoàn tác (chỉ số tự tăng application_id có thể nhảy số – vô hại).
   Bảng/hàm phụ tạo trong schema tạm pg_temp, tự mất khi hết phiên.

   Điều kiện: đã chạy seed.sql, và chạy reset.sql ngay trước (nhóm 2–3 kiểm tra
   đúng trạng thái ban đầu; nếu vừa demo TC01 thì 9001 sẽ có 1 đơn -> FAIL nhóm 2).

   Nhóm kiểm tra:
     1. Lược đồ: bảng, ràng buộc UNIQUE (R2), RLS
     2. Dữ liệu thử đúng như seed/reset
     3. Logic R2, R3 – cùng câu đếm mà máy chủ dùng (labApplicationService.js)
     4. Ràng buộc CSDL khi chèn trực tiếp (bỏ qua máy chủ)
     5. Script không để lại thay đổi
   ===================================================================== */

DROP TABLE IF EXISTS pg_temp.kq_test;
CREATE TEMP TABLE kq_test (
    stt       serial,
    nhom      text,
    kiem_tra  text,
    mong_doi  text,
    thuc_te   text,
    ket_qua   text
);

DROP TABLE IF EXISTS pg_temp.so_don_truoc;
CREATE TEMP TABLE so_don_truoc AS SELECT count(*) AS n FROM lab_application;

-- Ghi một dòng kết quả: PASS khi thực tế = mong đợi
CREATE OR REPLACE FUNCTION pg_temp.ghi(p_nhom text, p_kiem_tra text, p_mong_doi text, p_thuc_te text)
RETURNS void LANGUAGE sql AS $f$
    INSERT INTO kq_test (nhom, kiem_tra, mong_doi, thuc_te, ket_qua)
    VALUES (p_nhom, p_kiem_tra, p_mong_doi, coalesce(p_thuc_te, 'NULL'),
            CASE WHEN p_mong_doi = coalesce(p_thuc_te, 'NULL') THEN 'PASS' ELSE 'FAIL' END);
$f$;

-- Thử chèn một đơn rồi LUÔN hoàn tác; trả về điều CSDL phản hồi
CREATE OR REPLACE FUNCTION pg_temp.thu_chen(p_topic int, p_student int, p_status text)
RETURNS text LANGUAGE plpgsql AS $f$
BEGIN
    BEGIN
        INSERT INTO lab_application (topic_id, student_id, status, message)
        VALUES (p_topic, p_student, p_status, '[TEST] test_supabase.sql – luôn hoàn tác');
        -- Chèn được: ném lỗi để hoàn tác lệnh INSERT vừa chạy
        RAISE EXCEPTION 'chen_duoc' USING ERRCODE = 'P0001';
    EXCEPTION
        WHEN unique_violation      THEN RETURN '23505 unique_violation';
        WHEN check_violation       THEN RETURN '23514 check_violation';
        WHEN foreign_key_violation THEN RETURN '23503 foreign_key_violation';
        WHEN raise_exception       THEN RETURN 'chèn được (đã hoàn tác)';
    END;
END $f$;

-- ---------------------------------------------------------------------
-- 1. Lược đồ
-- ---------------------------------------------------------------------
SELECT pg_temp.ghi('1. Lược đồ', 'Có bảng lab_topic', 'true',
    (to_regclass('public.lab_topic') IS NOT NULL)::text);
SELECT pg_temp.ghi('1. Lược đồ', 'Có bảng lab_application', 'true',
    (to_regclass('public.lab_application') IS NOT NULL)::text);
SELECT pg_temp.ghi('1. Lược đồ', 'Ràng buộc uq_lab_application UNIQUE (topic_id, student_id) – lớp chặn R2', 'true',
    EXISTS (SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_lab_application' AND contype = 'u'
              AND conrelid = 'public.lab_application'::regclass)::text);
SELECT pg_temp.ghi('1. Lược đồ', 'RLS bật trên lab_topic và lab_application', 'true',
    (SELECT bool_and(relrowsecurity) FROM pg_class
     WHERE oid IN ('public.lab_topic'::regclass, 'public.lab_application'::regclass))::text);

-- ---------------------------------------------------------------------
-- 2. Dữ liệu thử (trạng thái sau reset.sql)
-- ---------------------------------------------------------------------
SELECT pg_temp.ghi('2. Dữ liệu thử', 'Có SV 9101, SV 9102, GV 9201', '3',
    ((SELECT count(*) FROM student_profile  WHERE student_id  IN (9101, 9102))
   + (SELECT count(*) FROM lecturer_profile WHERE lecturer_id = 9201))::text);
SELECT pg_temp.ghi('2. Dữ liệu thử', 'Slots của đề tài 9001 / 9002 / 9003', '3/3/1',
    (SELECT string_agg(slots::text, '/' ORDER BY topic_id) FROM lab_topic WHERE topic_id IN (9001, 9002, 9003)));
SELECT pg_temp.ghi('2. Dữ liệu thử', 'Đề tài 9001: số đơn (TC01 chưa chạy)', '0',
    (SELECT count(*) FROM lab_application WHERE topic_id = 9001)::text);
SELECT pg_temp.ghi('2. Dữ liệu thử', 'Đề tài 9002: đơn có sẵn (SV:trạng thái)', '9101:Pending',
    (SELECT string_agg(student_id || ':' || status, ', ') FROM lab_application WHERE topic_id = 9002));
SELECT pg_temp.ghi('2. Dữ liệu thử', 'Đề tài 9003: đơn có sẵn (SV:trạng thái)', '9102:Accepted',
    (SELECT string_agg(student_id || ':' || status, ', ') FROM lab_application WHERE topic_id = 9003));

-- ---------------------------------------------------------------------
-- 3. Logic R2, R3 (giống câu đếm ở bước 6, 7 của máy chủ)
-- ---------------------------------------------------------------------
-- R2: đếm đơn theo cặp (topic_id, student_id); > 0 thì chặn
SELECT pg_temp.ghi('3. Logic R2', 'TC01 – cặp (9001, 9101): R2 cho qua?', 'cho qua',
    (SELECT CASE WHEN count(*) > 0 THEN 'chặn' ELSE 'cho qua' END
     FROM lab_application WHERE topic_id = 9001 AND student_id = 9101));
SELECT pg_temp.ghi('3. Logic R2', 'TC02 – cặp (9002, 9101): R2 chặn?', 'chặn',
    (SELECT CASE WHEN count(*) > 0 THEN 'chặn' ELSE 'cho qua' END
     FROM lab_application WHERE topic_id = 9002 AND student_id = 9101));
-- R3: số đơn Accepted >= slots thì hết chỗ
SELECT pg_temp.ghi('3. Logic R3', 'TC01 – đề tài 9001 (0 Accepted / 3 slots)', 'còn chỗ',
    (SELECT CASE WHEN count(a.application_id) FILTER (WHERE a.status = 'Accepted') >= t.slots
                 THEN 'hết chỗ' ELSE 'còn chỗ' END
     FROM lab_topic t LEFT JOIN lab_application a ON a.topic_id = t.topic_id
     WHERE t.topic_id = 9001 GROUP BY t.slots));
SELECT pg_temp.ghi('3. Logic R3', 'TC03 – đề tài 9003 (1 Accepted / 1 slot)', 'hết chỗ',
    (SELECT CASE WHEN count(a.application_id) FILTER (WHERE a.status = 'Accepted') >= t.slots
                 THEN 'hết chỗ' ELSE 'còn chỗ' END
     FROM lab_topic t LEFT JOIN lab_application a ON a.topic_id = t.topic_id
     WHERE t.topic_id = 9003 GROUP BY t.slots));
SELECT pg_temp.ghi('3. Logic R3', 'Đề tài 9003 vẫn status = Open (R3 phải do máy chủ đếm, không dựa vào status)', 'Open',
    (SELECT status FROM lab_topic WHERE topic_id = 9003));

-- ---------------------------------------------------------------------
-- 4. Ràng buộc CSDL khi chèn trực tiếp (mỗi lần thử đều được hoàn tác)
-- ---------------------------------------------------------------------
SELECT pg_temp.ghi('4. Ràng buộc', 'Chèn đơn hợp lệ (9001, 9101, Pending) – dạng dữ liệu R1', 'chèn được (đã hoàn tác)',
    pg_temp.thu_chen(9001, 9101, 'Pending'));
SELECT pg_temp.ghi('4. Ràng buộc', 'Chèn trùng (9002, 9101) – CSDL chặn R2 (lớp thứ hai)', '23505 unique_violation',
    pg_temp.thu_chen(9002, 9101, 'Pending'));
SELECT pg_temp.ghi('4. Ràng buộc', 'Chèn vào đề tài 9003 đã đủ người – CSDL KHÔNG chặn R3, máy chủ phải chặn', 'chèn được (đã hoàn tác)',
    pg_temp.thu_chen(9003, 9101, 'Pending'));
SELECT pg_temp.ghi('4. Ràng buộc', 'Trạng thái không hợp lệ (''Approved'')', '23514 check_violation',
    pg_temp.thu_chen(9001, 9101, 'Approved'));
SELECT pg_temp.ghi('4. Ràng buộc', 'SV không tồn tại (999999)', '23503 foreign_key_violation',
    pg_temp.thu_chen(9001, 999999, 'Pending'));
SELECT pg_temp.ghi('4. Ràng buộc', 'Đề tài không tồn tại (999999)', '23503 foreign_key_violation',
    pg_temp.thu_chen(999999, 9101, 'Pending'));

-- ---------------------------------------------------------------------
-- 5. Script không để lại thay đổi
-- ---------------------------------------------------------------------
SELECT pg_temp.ghi('5. Hoàn tác', 'Tổng số đơn lab_application trước = sau', 'true',
    ((SELECT n FROM so_don_truoc) = (SELECT count(*) FROM lab_application))::text);

-- ---------------------------------------------------------------------
-- Kết quả
-- ---------------------------------------------------------------------
SELECT stt, nhom, kiem_tra, mong_doi, thuc_te, ket_qua
FROM (
    SELECT stt, nhom, kiem_tra, mong_doi, thuc_te, ket_qua FROM kq_test
    UNION ALL
    SELECT 999, 'TỔNG', count(*) FILTER (WHERE ket_qua = 'PASS') || '/' || count(*) || ' PASS',
           '', '', CASE WHEN bool_and(ket_qua = 'PASS') THEN 'PASS' ELSE 'FAIL' END
    FROM kq_test
) AS r
ORDER BY stt;
