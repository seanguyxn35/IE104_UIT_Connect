/* =====================================================================
   DỮ LIỆU THỬ cho "Công trình & Project trưng bày trên CV" (trang SV-04)
   Chạy SAU seed.sql: Supabase -> SQL Editor -> dán -> Run. Chạy lại nhiều lần được.
   Toàn bộ là dữ liệu GIẢ, ID cố định dải 9301–9306.

   SV nhận dữ liệu: sửa số ở dòng "v_student := 9111" thành TEST_STUDENT_ID của bạn.

   | resource_id | Tình huống                                              | Chọn được? |
   |-------------|---------------------------------------------------------|------------|
   | 9301        | SV tạo, Approved, có phiếu thẩm định đạt                | Có         |
   | 9302        | SV tạo, Published, có phiếu thẩm định đạt               | Có         |
   | 9303        | SV tạo, đang chờ thẩm định (Pending_Review)             | Không      |
   | 9304        | SV tạo, Approved nhưng KHÔNG có phiếu thẩm định         | Không      |
   | 9305        | Của SV khác (9102), đã thẩm định đạt                    | Không      |
   | 9306        | Của nhóm 9301 (SV là thành viên), đã thẩm định đạt      | Có         |

   Xóa dữ liệu thử: xem khối "DỌN DỮ LIỆU" ở cuối file.
   ===================================================================== */

DO $$
DECLARE
    v_student  INT := 9111;
    v_lecturer INT := 9201;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM student_profile WHERE student_id = v_student)
       OR NOT EXISTS (SELECT 1 FROM student_profile WHERE student_id = 9102)
       OR NOT EXISTS (SELECT 1 FROM lecturer_profile WHERE lecturer_id = v_lecturer) THEN
        RAISE EXCEPTION 'Thiếu tài khoản thử: chạy seed.sql và tạo SV % trước', v_student;
    END IF;

    INSERT INTO student_team (team_id, team_name, short_name)
    VALUES (9301, '[TEST] Nhóm Edge Vision', 'EVT')
    ON CONFLICT (team_id) DO NOTHING;

    INSERT INTO team_member (team_id, student_id, role_in_team)
    VALUES (9301, v_student, 'Member')
    ON CONFLICT (team_id, student_id) DO NOTHING;

    INSERT INTO academic_resource
        (resource_id, created_by_account_id, owner_team_id, type, title, venue, trl_level, status, lecturer_id, published_at)
    VALUES
        (9301, v_student, NULL, 'Product', '[TEST] Hệ thống Edge AI giám sát an toàn giao thông', 'Lab CV&PR', 6, 'Approved',       v_lecturer, NULL),
        (9302, v_student, NULL, 'Paper',   '[TEST] Tối ưu mô hình phát hiện vật thể trên thiết bị biên', 'Hội nghị thử nghiệm 2025', 4, 'Published', v_lecturer, '2025-10-01'),
        (9303, v_student, NULL, 'Project', '[TEST] Chatbot tra cứu quy chế (đang chờ thẩm định)', NULL, 3, 'Pending_Review', v_lecturer, NULL),
        (9304, v_student, NULL, 'Project', '[TEST] Trạng thái Approved nhưng không có phiếu thẩm định', NULL, NULL, 'Approved', v_lecturer, NULL),
        (9305, 9102,      NULL, 'Product', '[TEST] Công trình của sinh viên khác', NULL, 5, 'Approved', v_lecturer, NULL),
        (9306, 9102,      9301, 'Project', '[TEST] Đồ án nhóm: nền tảng gán nhãn dữ liệu', 'Đồ án chuyên ngành', 5, 'Approved', v_lecturer, NULL)
    ON CONFLICT (resource_id) DO UPDATE SET
        created_by_account_id = EXCLUDED.created_by_account_id,
        owner_team_id         = EXCLUDED.owner_team_id,
        title                 = EXCLUDED.title,
        status                = EXCLUDED.status;

    INSERT INTO academic_review_log (log_id, resource_id, lecturer_id, decision, comment, total_score, allow_publish, review_date)
    VALUES
        (9301, 9301, v_lecturer, 'Approved', '[TEST] Đạt', 88, false, '2025-11-10'),
        (9302, 9302, v_lecturer, 'Approved', '[TEST] Đạt', 91, true,  '2025-09-20'),
        (9305, 9305, v_lecturer, 'Approved', '[TEST] Đạt', 80, false, '2025-08-15'),
        (9306, 9306, v_lecturer, 'Approved', '[TEST] Đạt', 85, false, '2025-12-05')
    ON CONFLICT (log_id) DO NOTHING;
END $$;

/* ---------- DỌN DỮ LIỆU (bỏ dấu chú thích rồi chạy riêng khi cần) ----------
BEGIN;
DELETE FROM cv_showcase_item    WHERE resource_id BETWEEN 9301 AND 9306;
DELETE FROM academic_review_log WHERE resource_id BETWEEN 9301 AND 9306;
DELETE FROM academic_resource   WHERE resource_id BETWEEN 9301 AND 9306;
DELETE FROM team_member         WHERE team_id = 9301;
DELETE FROM student_team        WHERE team_id = 9301;
COMMIT;
--------------------------------------------------------------------------- */
