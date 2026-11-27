/* SV-06 Quản trị nhóm: trưởng nhóm duyệt đơn xin gia nhập (bảng recruitment_application, trạng thái chờ là 'Pending').
   - share_gpa: người nộp đồng ý cho nhóm xem GPA trên CHÍNH đơn này (mặc định không), độc lập với công tắc GPA trên hồ sơ.
   - response_note: lý do từ chối (bắt buộc khi 'Rejected', 10–500 ký tự).
   - responded_by_account_id: trưởng nhóm đã xử lý đơn.
   - Hai hàm chấp nhận / từ chối chạy trong MỘT transaction. Hàm khóa dòng student_team (FOR UPDATE) nên các lần
     chấp nhận cùng lúc của một nhóm phải xếp hàng, không thể vượt số thành viên tối đa hay chỉ tiêu của tin.
     Chỉ backend (service_role) được gọi.
   Chỉ thêm cột, ràng buộc và hàm; không sửa hay xóa dữ liệu. Chạy lại nhiều lần vẫn an toàn. */

BEGIN;

ALTER TABLE recruitment_application
    ADD COLUMN IF NOT EXISTS share_gpa               BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS response_note           VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS responded_by_account_id INT          NULL;

ALTER TABLE recruitment_application DROP CONSTRAINT IF EXISTS fk_recruitment_application_responder;
ALTER TABLE recruitment_application ADD CONSTRAINT fk_recruitment_application_responder
    FOREIGN KEY (responded_by_account_id) REFERENCES account(account_id);

-- COALESCE: CHECK coi kết quả NULL là đạt, nên thiếu lý do phải được quy về chuỗi rỗng
ALTER TABLE recruitment_application DROP CONSTRAINT IF EXISTS ck_recruitment_application_reject_note;
ALTER TABLE recruitment_application ADD CONSTRAINT ck_recruitment_application_reject_note
    CHECK (status <> 'Rejected' OR length(btrim(COALESCE(response_note, ''))) >= 10);

-- Chấp nhận đơn. Trả { "error": mã } hoặc { "memberCount", "maxMembers", "recruitmentStatus" }.
CREATE OR REPLACE FUNCTION chap_nhan_don_gia_nhap(p_team_id INT, p_apply_id INT, p_actor_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team     student_team%ROWTYPE;
    v_app      recruitment_application%ROWTYPE;
    v_post     team_recruitment%ROWTYPE;
    v_role     team_member.role_in_team%TYPE;
    v_members  INT;
    v_accepted INT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;

    -- Quyền xét theo vai trò trong nhóm; người ngoài nhóm coi như không thấy nhóm
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;

    -- Khóa cả đơn: người nộp rút đơn cùng lúc phải đợi
    SELECT a.* INTO v_app
      FROM recruitment_application AS a
      JOIN team_recruitment AS r ON r.recruit_id = a.recruit_id
     WHERE a.apply_id = p_apply_id AND r.team_id = p_team_id
       FOR UPDATE OF a;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'APPLICATION_NOT_FOUND'); END IF;
    IF v_app.status <> 'Pending' THEN
        RETURN jsonb_build_object('error', 'APPLICATION_NOT_PENDING', 'status', v_app.status);
    END IF;
    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;

    SELECT count(*) INTO v_members FROM team_member WHERE team_id = p_team_id;
    IF v_members >= v_team.max_members THEN
        RETURN jsonb_build_object('error', 'TEAM_FULL', 'maxMembers', v_team.max_members);
    END IF;
    IF EXISTS (SELECT 1 FROM team_member WHERE team_id = p_team_id AND student_id = v_app.student_id) THEN
        RETURN jsonb_build_object('error', 'ALREADY_MEMBER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM account WHERE account_id = v_app.student_id AND is_active) THEN
        RETURN jsonb_build_object('error', 'APPLICANT_INACTIVE');
    END IF;

    -- Chỉ tiêu của tin. Tin đã đóng hoặc quá hạn vẫn xử lý nốt đơn đã nộp; chỉ chặn khi đã đủ chỉ tiêu.
    SELECT * INTO v_post FROM team_recruitment WHERE recruit_id = v_app.recruit_id FOR UPDATE;
    SELECT count(*) INTO v_accepted
      FROM recruitment_application WHERE recruit_id = v_post.recruit_id AND status = 'Accepted';
    IF v_post.status = 'Filled' OR v_accepted >= v_post.slots THEN
        RETURN jsonb_build_object('error', 'POST_FILLED');
    END IF;

    UPDATE recruitment_application
       SET status = 'Accepted', responded_at = now(), responded_by_account_id = p_actor_id
     WHERE apply_id = p_apply_id;
    INSERT INTO team_member (team_id, student_id, role_in_team) VALUES (p_team_id, v_app.student_id, 'Member');

    IF v_accepted + 1 >= v_post.slots AND v_post.status = 'Open' THEN
        UPDATE team_recruitment SET status = 'Filled' WHERE recruit_id = v_post.recruit_id;
        v_post.status := 'Filled';
    END IF;

    INSERT INTO notification (account_id, category, title, content, link_url)
    SELECT v_app.student_id, 'Team', 'Đơn xin gia nhập nhóm đã được chấp nhận',
           left(format('Bạn đã là thành viên của nhóm "%s" (tin tuyển "%s").', v_team.team_name, v_post.title), 1000),
           'pages/sv/06_quan-tri-nhom-portfolio.html'
     WHERE NOT EXISTS (SELECT 1 FROM notification_setting
                        WHERE account_id = v_app.student_id AND category = 'Team' AND NOT is_enabled);

    RETURN jsonb_build_object('memberCount', v_members + 1, 'maxMembers', v_team.max_members,
                              'recruitmentStatus', v_post.status);
END;
$$;

-- Từ chối đơn (lý do đã được máy chủ kiểm tra; ràng buộc CHECK ở trên chặn thêm). Trả { "error": mã } hoặc {}.
CREATE OR REPLACE FUNCTION tu_choi_don_gia_nhap(p_team_id INT, p_apply_id INT, p_actor_id INT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team  student_team%ROWTYPE;
    v_app   recruitment_application%ROWTYPE;
    v_role  team_member.role_in_team%TYPE;
    v_title team_recruitment.title%TYPE;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;

    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;

    SELECT a.* INTO v_app
      FROM recruitment_application AS a
      JOIN team_recruitment AS r ON r.recruit_id = a.recruit_id
     WHERE a.apply_id = p_apply_id AND r.team_id = p_team_id
       FOR UPDATE OF a;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'APPLICATION_NOT_FOUND'); END IF;
    IF v_app.status <> 'Pending' THEN
        RETURN jsonb_build_object('error', 'APPLICATION_NOT_PENDING', 'status', v_app.status);
    END IF;

    UPDATE recruitment_application
       SET status = 'Rejected', response_note = p_reason, responded_at = now(), responded_by_account_id = p_actor_id
     WHERE apply_id = p_apply_id;

    SELECT title INTO v_title FROM team_recruitment WHERE recruit_id = v_app.recruit_id;
    INSERT INTO notification (account_id, category, title, content, link_url)
    SELECT v_app.student_id, 'Team', 'Đơn xin gia nhập nhóm không được chấp nhận',
           left(format('Nhóm "%s" (tin tuyển "%s") đã từ chối đơn của bạn. Lý do: %s', v_team.team_name, v_title, p_reason), 1000),
           'pages/sv/07_cho-ghep-nhom.html'
     WHERE NOT EXISTS (SELECT 1 FROM notification_setting
                        WHERE account_id = v_app.student_id AND category = 'Team' AND NOT is_enabled);

    RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION chap_nhan_don_gia_nhap(INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tu_choi_don_gia_nhap(INT, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION chap_nhan_don_gia_nhap(INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION tu_choi_don_gia_nhap(INT, INT, INT, TEXT) TO service_role;

COMMIT;
