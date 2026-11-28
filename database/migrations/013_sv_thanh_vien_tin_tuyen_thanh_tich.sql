/* SV-06 các tab "Thành viên", "Tin tuyển quân", "Portfolio & Thành tích" (chốt 27/11/2026).
   Thành viên:
   - Mỗi nhóm có ĐÚNG MỘT Leader: chỉ mục duy nhất chặn hai Leader; Leader phải chuyển quyền trước khi rời.
   - Leader mời thành viên ra khỏi nhóm (bắt buộc lý do, báo cho người đó), chuyển quyền Leader; ai cũng tự rời được.
   Tin tuyển:
   - Chỉ Leader đăng / sửa / đóng / xóa. Tối đa 5 tin đang mở mỗi nhóm. Không giảm chỉ tiêu dưới số đã nhận.
     Tin đã đóng không sửa được ("Mở lại đợt mới" = tạo tin mới). Tin đã có đơn thì không xóa, chỉ đóng.
   Thành tích nhóm: thêm cột mô tả, liên kết https://, người tạo, thời điểm; loại thành tích theo danh sách cố định.
   Các hàm khóa dòng student_team TRƯỚC (cùng thứ tự khóa với migration 009, 012). Chỉ backend (service_role) được gọi.
   Không sửa hay xóa dữ liệu có sẵn. Chạy lại nhiều lần vẫn an toàn.
   LƯU Ý: giới hạn ở đây phải khớp backend/src/sv/06-quan-tri-nhom/thanh-vien.service.js, tin-tuyen.service.js. */

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_team_member_leader ON team_member (team_id) WHERE role_in_team = 'Leader';

ALTER TABLE team_achievement
    ADD COLUMN IF NOT EXISTS detail                VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS external_url          VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS created_by_account_id INT NULL CONSTRAINT fk_team_achievement_creator REFERENCES account(account_id),
    ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ(0) NOT NULL DEFAULT now();
ALTER TABLE team_achievement DROP CONSTRAINT IF EXISTS ck_team_achievement_external_url;
ALTER TABLE team_achievement ADD CONSTRAINT ck_team_achievement_external_url CHECK (external_url LIKE 'https://%');
ALTER TABLE team_achievement DROP CONSTRAINT IF EXISTS ck_team_achievement_category;
ALTER TABLE team_achievement ADD CONSTRAINT ck_team_achievement_category
    CHECK (category IN ('Award','Publication','Patent','Certificate','Other'));
CREATE INDEX IF NOT EXISTS ix_team_achievement_team ON team_achievement (team_id);

-- Gửi thông báo nhóm cho một người (tôn trọng cài đặt tắt thông báo nhóm)
CREATE OR REPLACE FUNCTION thong_bao_nhom(p_account_id INT, p_title TEXT, p_content TEXT)
RETURNS VOID
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    INSERT INTO notification (account_id, category, title, content, link_url)
    SELECT p_account_id, 'Team', p_title, left(p_content, 1000), 'pages/sv/06_quan-tri-nhom-portfolio.html'
     WHERE NOT EXISTS (SELECT 1 FROM notification_setting
                        WHERE account_id = p_account_id AND category = 'Team' AND NOT is_enabled);
$$;

-- ---------- Thành viên ----------

-- Tự rời nhóm. Leader phải chuyển quyền trước. Trả { "error": mã } hoặc { memberCount }.
CREATE OR REPLACE FUNCTION roi_nhom(p_team_id INT, p_actor_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team    student_team%ROWTYPE;
    v_role    team_member.role_in_team%TYPE;
    v_members INT;
    v_leader  INT;
    v_name    TEXT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT count(*) INTO v_members FROM team_member WHERE team_id = p_team_id;
    IF v_role = 'Leader' THEN
        RETURN jsonb_build_object('error', 'LEADER_MUST_TRANSFER', 'memberCount', v_members);
    END IF;

    DELETE FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;

    SELECT full_name INTO v_name FROM student_profile WHERE student_id = p_actor_id;
    SELECT student_id INTO v_leader FROM team_member WHERE team_id = p_team_id AND role_in_team = 'Leader';
    IF v_leader IS NOT NULL THEN
        PERFORM thong_bao_nhom(v_leader, 'Thành viên rời nhóm', format('%s đã rời nhóm "%s".', v_name, v_team.team_name));
    END IF;
    RETURN jsonb_build_object('memberCount', v_members - 1);
END;
$$;

-- Leader mời một thành viên ra khỏi nhóm (lý do 10–500 ký tự do máy chủ kiểm tra).
CREATE OR REPLACE FUNCTION moi_ra_khoi_nhom(p_team_id INT, p_actor_id INT, p_student_id INT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team    student_team%ROWTYPE;
    v_role    team_member.role_in_team%TYPE;
    v_members INT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;
    IF p_student_id = p_actor_id THEN RETURN jsonb_build_object('error', 'CANNOT_REMOVE_SELF'); END IF;
    IF NOT EXISTS (SELECT 1 FROM team_member WHERE team_id = p_team_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('error', 'MEMBER_NOT_FOUND');
    END IF;

    DELETE FROM team_member WHERE team_id = p_team_id AND student_id = p_student_id;
    SELECT count(*) INTO v_members FROM team_member WHERE team_id = p_team_id;
    PERFORM thong_bao_nhom(p_student_id, 'Bạn không còn là thành viên nhóm',
        format('Trưởng nhóm đã mời bạn ra khỏi nhóm "%s". Lý do: %s', v_team.team_name, p_reason));
    RETURN jsonb_build_object('memberCount', v_members);
END;
$$;

-- Leader chuyển quyền cho một thành viên khác; người chuyển trở thành Member.
CREATE OR REPLACE FUNCTION chuyen_quyen_truong_nhom(p_team_id INT, p_actor_id INT, p_student_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team student_team%ROWTYPE;
    v_role team_member.role_in_team%TYPE;
    v_name TEXT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;
    IF p_student_id = p_actor_id THEN RETURN jsonb_build_object('error', 'ALREADY_LEADER'); END IF;
    IF NOT EXISTS (SELECT 1 FROM team_member WHERE team_id = p_team_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('error', 'MEMBER_NOT_FOUND');
    END IF;

    -- Hạ quyền trước rồi mới nâng quyền: chỉ mục ux_team_member_leader không cho hai Leader cùng lúc
    UPDATE team_member SET role_in_team = 'Member' WHERE team_id = p_team_id AND student_id = p_actor_id;
    UPDATE team_member SET role_in_team = 'Leader' WHERE team_id = p_team_id AND student_id = p_student_id;

    SELECT full_name INTO v_name FROM student_profile WHERE student_id = p_actor_id;
    PERFORM thong_bao_nhom(p_student_id, 'Bạn đã trở thành trưởng nhóm',
        format('%s đã chuyển quyền trưởng nhóm "%s" cho bạn.', v_name, v_team.team_name));
    RETURN '{}'::jsonb;
END;
$$;

-- ---------- Tin tuyển ----------

-- Tạo (p_recruit_id NULL) hoặc sửa tin. p_data: title, requirement, slots, deadline, fieldId, isInterdisciplinary,
-- relatedResourceId, skills (mảng tên). Khi sửa chỉ chứa khóa cần đổi. Độ dài, định dạng do máy chủ kiểm tra.
-- Trả { "error": mã } hoặc { recruitId, status }.
CREATE OR REPLACE FUNCTION luu_tin_tuyen(p_team_id INT, p_actor_id INT, p_recruit_id INT, p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team     student_team%ROWTYPE;
    v_role     team_member.role_in_team%TYPE;
    v_post     team_recruitment%ROWTYPE;
    v_id       INT;
    v_accepted INT := 0;
    v_slots    INT;
    v_status   TEXT;
    v_name     TEXT;
    v_skill_id INT;
BEGIN
    SELECT * INTO v_team FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    IF v_team.status <> 'Active' THEN RETURN jsonb_build_object('error', 'TEAM_INACTIVE'); END IF;

    IF p_recruit_id IS NOT NULL THEN
        SELECT * INTO v_post FROM team_recruitment WHERE recruit_id = p_recruit_id AND team_id = p_team_id FOR UPDATE;
        IF NOT FOUND THEN RETURN jsonb_build_object('error', 'POST_NOT_FOUND'); END IF;
        IF v_post.status = 'Closed' THEN RETURN jsonb_build_object('error', 'POST_CLOSED'); END IF;
        SELECT count(*) INTO v_accepted FROM recruitment_application WHERE recruit_id = p_recruit_id AND status = 'Accepted';
    ELSIF (SELECT count(*) FROM team_recruitment
            WHERE team_id = p_team_id AND status = 'Open'
              AND (deadline IS NULL OR deadline >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) >= 5 THEN
        RETURN jsonb_build_object('error', 'POST_LIMIT');
    END IF;

    -- Kiểm tra mã tham chiếu trước khi ghi
    IF p_data ->> 'fieldId' IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM field WHERE field_id = (p_data ->> 'fieldId')::INT) THEN
        RETURN jsonb_build_object('error', 'FIELD_NOT_FOUND');
    END IF;
    IF p_data ->> 'relatedResourceId' IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM academic_resource WHERE resource_id = (p_data ->> 'relatedResourceId')::INT
                          AND owner_team_id = p_team_id AND status NOT IN ('Rejected','Hidden')) THEN
        RETURN jsonb_build_object('error', 'RESOURCE_NOT_FOUND');
    END IF;
    v_slots := COALESCE((p_data ->> 'slots')::INT, v_post.slots, 1);
    IF v_slots < v_accepted THEN
        RETURN jsonb_build_object('error', 'SLOTS_BELOW_ACCEPTED', 'accepted', v_accepted);
    END IF;

    IF p_recruit_id IS NULL THEN
        INSERT INTO team_recruitment (team_id, title, requirement, slots, deadline, field_id, is_interdisciplinary, related_resource_id)
        VALUES (p_team_id, p_data ->> 'title', p_data ->> 'requirement', v_slots, (p_data ->> 'deadline')::DATE,
                (p_data ->> 'fieldId')::INT, COALESCE((p_data ->> 'isInterdisciplinary')::BOOLEAN, false),
                (p_data ->> 'relatedResourceId')::INT)
        RETURNING recruit_id INTO v_id;
        v_status := 'Open';
    ELSE
        v_id := p_recruit_id;
        -- Đủ chỉ tiêu tự chuyển Filled; tăng chỉ tiêu thì tin Filled mở lại
        v_status := CASE WHEN v_accepted >= v_slots THEN 'Filled' ELSE 'Open' END;
        UPDATE team_recruitment SET
            title = CASE WHEN p_data ? 'title' THEN p_data ->> 'title' ELSE title END,
            requirement = CASE WHEN p_data ? 'requirement' THEN p_data ->> 'requirement' ELSE requirement END,
            slots = v_slots,
            deadline = CASE WHEN p_data ? 'deadline' THEN (p_data ->> 'deadline')::DATE ELSE deadline END,
            field_id = CASE WHEN p_data ? 'fieldId' THEN (p_data ->> 'fieldId')::INT ELSE field_id END,
            is_interdisciplinary = CASE WHEN p_data ? 'isInterdisciplinary'
                                        THEN (p_data ->> 'isInterdisciplinary')::BOOLEAN ELSE is_interdisciplinary END,
            related_resource_id = CASE WHEN p_data ? 'relatedResourceId'
                                       THEN (p_data ->> 'relatedResourceId')::INT ELSE related_resource_id END,
            status = v_status
         WHERE recruit_id = v_id;
    END IF;

    IF p_data ? 'skills' THEN
        DELETE FROM recruitment_skill WHERE recruit_id = v_id;
        FOR v_name IN SELECT value FROM jsonb_array_elements_text(p_data -> 'skills') LOOP
            -- Cùng quy tắc với kỹ năng nhóm (migration 010): chưa có trong danh mục thì thêm
            SELECT skill_id INTO v_skill_id FROM skill WHERE lower(name) = lower(v_name) ORDER BY skill_id LIMIT 1;
            IF NOT FOUND THEN
                INSERT INTO skill (name) VALUES (v_name) ON CONFLICT (name) DO NOTHING RETURNING skill_id INTO v_skill_id;
                IF v_skill_id IS NULL THEN
                    SELECT skill_id INTO v_skill_id FROM skill WHERE name = v_name;
                END IF;
            END IF;
            INSERT INTO recruitment_skill (recruit_id, skill_id) VALUES (v_id, v_skill_id) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('recruitId', v_id, 'status', v_status);
END;
$$;

-- Đóng tin (Open / Filled -> Closed). Đơn đã nộp vẫn được xử lý nốt (quy tắc của migration 009).
CREATE OR REPLACE FUNCTION dong_tin_tuyen(p_team_id INT, p_actor_id INT, p_recruit_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role   team_member.role_in_team%TYPE;
    v_status team_recruitment.status%TYPE;
BEGIN
    PERFORM 1 FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    SELECT status INTO v_status FROM team_recruitment WHERE recruit_id = p_recruit_id AND team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'POST_NOT_FOUND'); END IF;
    IF v_status = 'Closed' THEN RETURN jsonb_build_object('error', 'POST_CLOSED'); END IF;
    UPDATE team_recruitment SET status = 'Closed' WHERE recruit_id = p_recruit_id;
    RETURN '{}'::jsonb;
END;
$$;

-- Xóa tin chưa có đơn nào (kể cả đơn đã rút). Tin đã có đơn thì chỉ đóng được.
CREATE OR REPLACE FUNCTION xoa_tin_tuyen(p_team_id INT, p_actor_id INT, p_recruit_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role team_member.role_in_team%TYPE;
BEGIN
    PERFORM 1 FROM student_team WHERE team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    SELECT role_in_team INTO v_role FROM team_member WHERE team_id = p_team_id AND student_id = p_actor_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'TEAM_NOT_FOUND'); END IF;
    IF v_role <> 'Leader' THEN RETURN jsonb_build_object('error', 'NOT_TEAM_LEADER'); END IF;
    PERFORM 1 FROM team_recruitment WHERE recruit_id = p_recruit_id AND team_id = p_team_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'POST_NOT_FOUND'); END IF;
    IF EXISTS (SELECT 1 FROM recruitment_application WHERE recruit_id = p_recruit_id) THEN
        RETURN jsonb_build_object('error', 'POST_HAS_APPLICATIONS');
    END IF;
    DELETE FROM team_recruitment WHERE recruit_id = p_recruit_id;  -- recruitment_skill xóa theo ON DELETE CASCADE
    RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION thong_bao_nhom(INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION roi_nhom(INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION moi_ra_khoi_nhom(INT, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION chuyen_quyen_truong_nhom(INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION luu_tin_tuyen(INT, INT, INT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION dong_tin_tuyen(INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION xoa_tin_tuyen(INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION thong_bao_nhom(INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION roi_nhom(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION moi_ra_khoi_nhom(INT, INT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION chuyen_quyen_truong_nhom(INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION luu_tin_tuyen(INT, INT, INT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION dong_tin_tuyen(INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION xoa_tin_tuyen(INT, INT, INT) TO service_role;

COMMIT;
