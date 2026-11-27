/* Bài toán R&D phía Sinh viên (SV-09 danh sách, SV-13 chi tiết & nộp proposal).
   Chạy SAU 004_dn_hop_thu_ket_noi.sql và 005_dn_khong_gian_dam_phan.sql, trên Supabase → SQL Editor.
   Chạy lại nhiều lần vẫn an toàn (IF NOT EXISTS, xóa rồi tạo lại CHECK). Chỉ THÊM cột / bảng / chỉ mục.

   1. business_problem: các trường đề bài DN soạn ở DN-05 mà SV cần xem trước khi ứng tuyển
      - summary: tóm tắt ngắn trên thẻ danh sách
      - funding_min: kinh phí tối thiểu (funding sẵn có = mức tối đa)
      - accepted_partners: đối tượng nhận  Student (SV cá nhân) | Team (nhóm SV) | Lab (nhóm có GV hướng dẫn)
      - team_size_min / team_size_max: quy mô nhóm DN yêu cầu (tính cả trưởng nhóm, không tính GV)
      - trl_level (1–9), deliverables (sản phẩm bàn giao), selection_criteria (tiêu chí chọn đối tác)
      - nda_required: SV phải cam kết ký NDA khi nộp
      - start_date, duration_weeks, work_mode  Onsite | At_UIT | Remote | Hybrid
      - approved_at: lúc Admin duyệt công khai (ngày "đăng" hiển thị cho SV)
   2. problem_milestone: kế hoạch & mốc nghiệm thu của bài toán
   3. connection_request
      - submitted_by_account_id: người bấm gửi proposal (chỉ người này được rút)
      - Mỗi SV / nhóm chỉ có MỘT proposal đang hiệu lực cho một bài toán (proposal đã rút = 'Cancelled' không tính)
   4. saved_opportunity: mỗi tài khoản lưu một bài toán tối đa một lần
*/

BEGIN;

-- 1. business_problem ---------------------------------------------------
ALTER TABLE business_problem
    ADD COLUMN IF NOT EXISTS summary            VARCHAR(500)   NULL,
    ADD COLUMN IF NOT EXISTS funding_min        DECIMAL(18,2)  NULL,
    ADD COLUMN IF NOT EXISTS accepted_partners  VARCHAR(10)[]  NOT NULL DEFAULT '{Team}',
    ADD COLUMN IF NOT EXISTS team_size_min      SMALLINT       NULL,
    ADD COLUMN IF NOT EXISTS team_size_max      SMALLINT       NULL,
    ADD COLUMN IF NOT EXISTS trl_level          SMALLINT       NULL,
    ADD COLUMN IF NOT EXISTS deliverables       VARCHAR(60)[]  NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS selection_criteria TEXT           NULL,
    ADD COLUMN IF NOT EXISTS nda_required       BOOLEAN        NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS start_date         DATE           NULL,
    ADD COLUMN IF NOT EXISTS duration_weeks     SMALLINT       NULL,
    ADD COLUMN IF NOT EXISTS work_mode          VARCHAR(10)    NULL,
    ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ(0) NULL;

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_partners;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_partners
    CHECK (cardinality(accepted_partners) >= 1 AND accepted_partners <@ ARRAY['Student','Team','Lab']::VARCHAR(10)[]);

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_team_size;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_team_size
    CHECK ((team_size_min IS NULL OR team_size_min BETWEEN 1 AND 20)
       AND (team_size_max IS NULL OR team_size_max BETWEEN 1 AND 20)
       AND (team_size_min IS NULL OR team_size_max IS NULL OR team_size_min <= team_size_max));

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_trl;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_trl
    CHECK (trl_level IS NULL OR trl_level BETWEEN 1 AND 9);

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_funding_range;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_funding_range
    CHECK (funding_min IS NULL OR (funding_min >= 0 AND (funding IS NULL OR funding_min <= funding)));

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_duration;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_duration
    CHECK (duration_weeks IS NULL OR duration_weeks BETWEEN 1 AND 104);

ALTER TABLE business_problem DROP CONSTRAINT IF EXISTS ck_business_problem_work_mode;
ALTER TABLE business_problem ADD CONSTRAINT ck_business_problem_work_mode
    CHECK (work_mode IS NULL OR work_mode IN ('Onsite','At_UIT','Remote','Hybrid'));

-- Danh sách SV đọc theo trạng thái công khai
CREATE INDEX IF NOT EXISTS ix_business_problem_status ON business_problem (status, approved_at DESC);

-- 2. problem_milestone --------------------------------------------------
CREATE TABLE IF NOT EXISTS problem_milestone (
    problem_id      INT NOT NULL CONSTRAINT fk_problem_milestone_problem
                        REFERENCES business_problem(problem_id) ON DELETE CASCADE,
    seq             SMALLINT NOT NULL,
    name            VARCHAR(150) NOT NULL,
    due_week        SMALLINT NOT NULL,
    budget_percent  SMALLINT NULL,
    CONSTRAINT pk_problem_milestone PRIMARY KEY (problem_id, seq),
    CONSTRAINT ck_problem_milestone_week    CHECK (due_week BETWEEN 1 AND 104),
    CONSTRAINT ck_problem_milestone_percent CHECK (budget_percent IS NULL OR budget_percent BETWEEN 0 AND 100)
);

-- 3. connection_request -------------------------------------------------
ALTER TABLE connection_request
    ADD COLUMN IF NOT EXISTS submitted_by_account_id INT NULL;
ALTER TABLE connection_request DROP CONSTRAINT IF EXISTS fk_connection_request_submitter;
ALTER TABLE connection_request ADD CONSTRAINT fk_connection_request_submitter
    FOREIGN KEY (submitted_by_account_id) REFERENCES account(account_id);

-- Chặn nộp trùng ở tầng CSDL (máy chủ kiểm tra trước và trả 409 ALREADY_APPLIED)
CREATE UNIQUE INDEX IF NOT EXISTS ux_connection_request_student_problem
    ON connection_request (problem_id, student_id)
    WHERE student_id IS NOT NULL AND problem_id IS NOT NULL AND status <> 'Cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS ux_connection_request_team_problem
    ON connection_request (problem_id, team_id)
    WHERE team_id IS NOT NULL AND problem_id IS NOT NULL AND status <> 'Cancelled';

-- 4. saved_opportunity --------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_saved_opportunity_problem
    ON saved_opportunity (account_id, problem_id) WHERE problem_id IS NOT NULL;

ALTER TABLE problem_milestone ENABLE ROW LEVEL SECURITY;

COMMIT;
