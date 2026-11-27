/* SV-06: Leader mời sinh viên vào nhóm (bảng team_invitation).
   Quy tắc (chốt 27/11/2026): chỉ Leader gửi / thu hồi; không ai bị thêm vào nhóm khi chưa đồng ý; lời mời hết hạn
   sau 7 ngày (tính khi đọc, không cần tác vụ nền); bị từ chối thì 7 ngày sau mới mời lại được (đã thu hồi / hết hạn thì
   mời lại ngay); tối đa 10 lời mời đang chờ mỗi nhóm; lời mời không giữ chỗ.
   - Thêm cột message (lời nhắn), response_note (lý do từ chối, không bắt buộc), trạng thái Cancelled.
   - Chỉ mục duy nhất: mỗi nhóm không có 2 lời mời đang chờ cho cùng một người.
   - Trigger: ai đã vào nhóm bằng bất kỳ đường nào thì lời mời đang chờ của nhóm cho người đó tự hủy.
   - 4 hàm chạy trong transaction, đều khóa dòng student_team TRƯỚC (cùng thứ tự khóa với migration 009).
     Chỉ backend (service_role) được gọi.
   Không sửa hay xóa dữ liệu có sẵn. Chạy lại nhiều lần vẫn an toàn.
   LƯU Ý: số ngày và số lời mời tối đa ở đây phải khớp backend/src/sv/06-quan-tri-nhom/loi-moi.service.js. */

BEGIN;

ALTER TABLE team_invitation
    ADD COLUMN IF NOT EXISTS message       VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS response_note VARCHAR(500) NULL;

ALTER TABLE team_invitation DROP CONSTRAINT IF EXISTS ck_team_invitation_status;
ALTER TABLE team_invitation ADD CONSTRAINT ck_team_invitation_status
    CHECK (status IN ('Pending','Accepted','Declined','Expired','Cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_team_invitation_pending ON team_invitation (team_id, student_id) WHERE status = 'Pending';
CREATE INDEX IF NOT EXISTS ix_team_invitation_student ON team_invitation (student_id, status);

CREATE OR REPLACE FUNCTION huy_loi_moi_khi_vao_nhom()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE team_invitation SET status = 'Cancelled', responded_at = now()
     WHERE team_id = NEW.team_id AND student_id = NEW.student_id AND status = 'Pending';
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_team_member_huy_loi_moi
    AFTER INSERT ON team_member
    FOR EACH ROW EXECUTE FUNCTION huy_loi_moi_khi_vao_nhom();

-- Gửi lời mời. p_student_id do máy chủ tìm từ MSSV / email (NULL = không tìm thấy).
-- Trả { "error": mã } hoặc { "invitationId" }.
CREATE OR REPLACE FUNCTION gui_loi_moi_vao_nhom(p_team_id INT, p_actor_id INT, p_student_id INT, p_message TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team     student_team%ROWTYPE;
    v_role     team_member.role_in_team%TYPE;
    v_declined TIMESTAMPTZ;
    v_id       INT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;

    IF NOT EXISTS (SELECT 1 FROM student_profile AS s JOIN account AS a ON a.account_id = s.student_id
                    WHERE s.student_id = p_student_id AND a.is_active AND a.email_verified_at IS NOT NULL) THEN
        RETURN jsonb_build_object('error', 'STUDENT_NOT_FOUND');
    END IF;
    IF EXISTS (SELECT 1 FROM team_member WHERE team_id = p_team_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('error', 'ALREADY_MEMBER');
    END IF;
    IF (SELECT count(*) FROM team_member WHERE team_id = p_team_id) >= v_team.max_members THEN
        RETURN jsonb_build_object('error', 'TEAM_FULL', 'maxMembers', v_team.max_members);
    END IF;

    -- Lời mời quá hạn được ghi nhận Expired, để không chặn chỉ mục duy nhất và không tính vào giới hạn
    UPDATE team_invitation SET status = 'Expired'
     WHERE team_id = p_team_id AND status = 'Pending' AND created_at <= now() - INTERVAL '7 days';

    IF EXISTS (SELECT 1 FROM team_invitation WHERE team_id = p_team_id AND student_id = p_student_id AND status = 'Pending') THEN
        RETURN jsonb_build_object('error', 'ALREADY_INVITED');
    END IF;
    IF EXISTS (SELECT 1 FROM recruitment_application AS a JOIN team_recruitment AS r ON r.recruit_id = a.recruit_id
                WHERE r.team_id = p_team_id AND a.student_id = p_student_id AND a.status = 'Pending') THEN
        RETURN jsonb_build_object('error', 'HAS_PENDING_APPLICATION');
    END IF;
    SELECT max(responded_at) INTO v_declined FROM team_invitation
     WHERE team_id = p_team_id AND student_id = p_student_id AND status = 'Declined';
    IF v_declined > now() - INTERVAL '7 days' THEN
        RETURN jsonb_build_object('error', 'DECLINED_RECENTLY', 'retryAt', v_declined + INTERVAL '7 days');
    END IF;
    IF (SELECT count(*) FROM team_invitation WHERE team_id = p_team_id AND status = 'Pending') >= 10 THEN
        RETURN jsonb_build_object('error', 'INVITE_LIMIT');
    END IF;

    INSERT INTO team_invitation (team_id, student_id, invited_by_account_id, message)
    VALUES (p_team_id, p_student_id, p_actor_id, p_message)
    RETURNING invitation_id INTO v_id;

    INSERT INTO notification (account_id, category, title, content, link_url)
    SELECT p_student_id, 'Team', 'Bạn có lời mời vào nhóm nghiên cứu',
           left(format('Nhóm "%s" mời bạn tham gia. Lời mời có hiệu lực 7 ngày.', v_team.team_name), 1000),
           'pages/sv/06_quan-tri-nhom-portfolio.html'
     WHERE NOT EXISTS (SELECT 1 FROM notification_setting
                        WHERE account_id = p_student_id AND category = 'Team' AND NOT is_enabled);

    RETURN jsonb_build_object('invitationId', v_id);
END;
$$;

-- Người được mời trả lời. p_accept = true: đồng ý. Trả { "error": mã } hoặc kết quả.
CREATE OR REPLACE FUNCTION tra_loi_moi_vao_nhom(p_invitation_id INT, p_actor_id INT, p_accept BOOLEAN, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team      student_team%ROWTYPE;
    v_inv       team_invitation%ROWTYPE;
    v_team_id   INT;
    v_members   INT;
    v_withdrawn INT;
    v_name      TEXT;
BEGIN
    -- Chỉ chính người được mời nhìn thấy lời mời; người khác nhận "không tìm thấy"
    SELECT team_id INTO v_team_id FROM team_invitation WHERE invitation_id = p_invitation_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'INVITATION_NOT_FOUND'); END IF;
    SELECT * INTO v_team FROM student_team WHERE team_id = v_team_id FOR UPDATE;
    SELECT * INTO v_inv FROM team_invitation WHERE invitation_id = p_invitation_id FOR UPDATE;
    IF v_inv.status <> 'Pending' THEN
        RETURN jsonb_build_object('error', 'INVITATION_NOT_PENDING', 'status', v_inv.status);
    END IF;
    IF v_inv.created_at <= now() - INTERVAL '7 days' THEN
        UPDATE team_invitation SET status = 'Expired' WHERE invitation_id = p_invitation_id;
        RETURN jsonb_build_object('error', 'INVITATION_EXPIRED');
    END IF;

    SELECT full_name INTO v_name FROM student_profile WHERE student_id = p_actor_id;

    IF NOT p_accept THEN
        UPDATE team_invitation SET status = 'Declined', responded_at = now(), response_note = p_reason
         WHERE invitation_id = p_invitation_id;
        INSERT INTO notification (account_id, category, title, content, link_url)
        SELECT m.student_id, 'Team', 'Lời mời vào nhóm bị từ chối',
               left(format('%s đã từ chối lời mời vào nhóm "%s".', v_name, v_team.team_name)
                    || COALESCE(' Lý do: ' || p_reason, ''), 1000),
               'pages/sv/06_quan-tri-nhom-portfolio.html'
          FROM team_member AS m
         WHERE m.team_id = v_team_id AND m.role_in_team = 'Leader'
           AND NOT EXISTS (SELECT 1 FROM notification_setting AS s
                            WHERE s.account_id = m.student_id AND s.category = 'Team' AND NOT s.is_enabled);
        RETURN jsonb_build_object('teamId', v_team_id);
    END IF;

    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;
    SELECT count(*) INTO v_members FROM team_member WHERE team_id = v_team_id;
    IF EXISTS (SELECT 1 FROM team_member WHERE team_id = v_team_id AND student_id = p_actor_id) THEN
        RETURN jsonb_build_object('error', 'ALREADY_MEMBER');
    END IF;
    IF v_members >= v_team.max_members THEN
        RETURN jsonb_build_object('error', 'TEAM_FULL', 'maxMembers', v_team.max_members);
    END IF;

    UPDATE team_invitation SET status = 'Accepted', responded_at = now() WHERE invitation_id = p_invitation_id;
    INSERT INTO team_member (team_id, student_id, role_in_team) VALUES (v_team_id, p_actor_id, 'Member');

    -- Đơn xin vào chính nhóm này không còn ý nghĩa: rút, để không treo và không tính vào chỉ tiêu tin tuyển
    UPDATE recruitment_application AS a SET status = 'Withdrawn', responded_at = now()
      FROM team_recruitment AS r
     WHERE r.recruit_id = a.recruit_id AND r.team_id = v_team_id
       AND a.student_id = p_actor_id AND a.status = 'Pending';
    GET DIAGNOSTICS v_withdrawn = ROW_COUNT;

    INSERT INTO notification (account_id, category, title, content, link_url)
    SELECT m.student_id, 'Team', 'Lời mời vào nhóm được chấp nhận',
           left(format('%s đã tham gia nhóm "%s".', v_name, v_team.team_name), 1000),
           'pages/sv/06_quan-tri-nhom-portfolio.html'
      FROM team_member AS m
     WHERE m.team_id = v_team_id AND m.role_in_team = 'Leader'
       AND NOT EXISTS (SELECT 1 FROM notification_setting AS s
                        WHERE s.account_id = m.student_id AND s.category = 'Team' AND NOT s.is_enabled);

    RETURN jsonb_build_object('teamId', v_team_id, 'memberCount', v_members + 1, 'maxMembers', v_team.max_members,
                              'withdrawnApplications', v_withdrawn);
END;
$$;

-- Leader hiện tại thu hồi lời mời của nhóm (kể cả lời mời do Leader trước gửi)
CREATE OR REPLACE FUNCTION thu_hoi_loi_moi_vao_nhom(p_team_id INT, p_invitation_id INT, p_actor_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role team_member.role_in_team%TYPE;
    v_inv  team_invitation%ROWTYPE;
BEGIN
    PERFORM 1 FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;

    SELECT * INTO v_inv FROM team_invitation WHERE invitation_id = p_invitation_id AND team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'INVITATION_NOT_FOUND'); END IF;
    IF v_inv.status <> 'Pending' THEN
        RETURN jsonb_build_object('error', 'INVITATION_NOT_PENDING', 'status', v_inv.status);
    END IF;
    UPDATE team_invitation SET status = 'Cancelled', responded_at = now() WHERE invitation_id = p_invitation_id;
    RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION gui_loi_moi_vao_nhom(INT, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tra_loi_moi_vao_nhom(INT, INT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION thu_hoi_loi_moi_vao_nhom(INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION gui_loi_moi_vao_nhom(INT, INT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION tra_loi_moi_vao_nhom(INT, INT, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION thu_hoi_loi_moi_vao_nhom(INT, INT, INT) TO service_role;

COMMIT;
