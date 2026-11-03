/* =====================================================================
   UIT CONNECT – LƯỢC ĐỒ CSDL (Microsoft SQL Server 2017 trở lên)

   Bản hoàn chỉnh từ datab.pdf, đối chiếu với các màn đang có:
     • index3.html → Login (8 màn) + FN-proto/SV (12 màn sinh viên)
     • index4.html → Login (8 màn) + FN-proto/GV (15 màn giảng viên)

   Nguyên tắc:
     - Giữ đủ 23 bảng của datab.pdf (22 mục; mục 6 gồm StudentTeam + TeamMember), sửa lỗi chính tả tên bảng
       (StudnetTeam → StudentTeam, SholarshipRequest → ScholarshipRequest,
        TeamAchiement → TeamAchievement) và trỏ FK về đúng tên bảng.
     - Bổ sung bảng danh mục mà PDF có nhắc nhưng chưa định nghĩa
       (Faculty, Major, Field) và các bảng / cột mà giao diện cần.
     - Chú thích:  [PDF] bảng có trong datab.pdf   [MỚI] bảng bổ sung
                   (+) cột bổ sung vào bảng của PDF
     - Bảng chưa có màn trên index3/index4 (luồng Doanh nghiệp / Admin)
       vẫn giữ để dùng cho các luồng đó sau này.

   Chạy:  sqlcmd -S . -E -C -I -f 65001 -i schema.sql   (tạo CSDL UITConnect nếu chưa có)
   Chạy trên CSDL trống; script không xoá bảng có sẵn.
   Lưu ý: có index lọc (filtered index) nên mọi kết nối ghi dữ liệu phải bật
   QUOTED_IDENTIFIER (SSMS, .NET, JDBC, Node đều bật sẵn; sqlcmd cần thêm -I).
   ===================================================================== */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID(N'UITConnect') IS NULL
    CREATE DATABASE UITConnect COLLATE Vietnamese_100_CI_AS;   -- sắp xếp "Tên A-Z" đúng tiếng Việt
GO
USE UITConnect;
GO

/* =====================================================================
   NHÓM 0: DANH MỤC DÙNG CHUNG [MỚI]
   PDF có FK → Major, FK → Faculty, FieldID nhưng chưa có bảng.
   ===================================================================== */

-- Khoa: ô chọn "Khoa" khi đăng ký, bộ lọc "Khoa / Lab" ở trang chủ, danh bạ GV
CREATE TABLE dbo.Faculty (
    FacultyID  INT IDENTITY(1,1) CONSTRAINT PK_Faculty PRIMARY KEY,
    Code       VARCHAR(20)   NOT NULL CONSTRAINT UQ_Faculty_Code UNIQUE,   -- 'KHMT', 'KTMT'...
    Name       NVARCHAR(150) NOT NULL CONSTRAINT UQ_Faculty_Name UNIQUE
);

-- Chuyên ngành đào tạo (ô chọn "Chuyên ngành đào tạo" khi đăng ký)
CREATE TABLE dbo.Major (
    MajorID    INT IDENTITY(1,1) CONSTRAINT PK_Major PRIMARY KEY,
    FacultyID  INT NOT NULL CONSTRAINT FK_Major_Faculty REFERENCES dbo.Faculty(FacultyID),
    Name       NVARCHAR(150) NOT NULL,
    CONSTRAINT UQ_Major_Faculty_Name UNIQUE (FacultyID, Name)
);

-- Lĩnh vực nghiên cứu: dropdown "Lĩnh vực" ở trang chủ, bộ lọc kho tài liệu, bài toán DN, học bổng
CREATE TABLE dbo.Field (
    FieldID    INT IDENTITY(1,1) CONSTRAINT PK_Field PRIMARY KEY,
    Name       NVARCHAR(100) NOT NULL CONSTRAINT UQ_Field_Name UNIQUE
);

-- Công nghệ & kỹ năng: thẻ PyTorch, TensorRT... trên CV, nhóm, tài nguyên, tin tuyển, bài toán DN
CREATE TABLE dbo.Skill (
    SkillID    INT IDENTITY(1,1) CONSTRAINT PK_Skill PRIMARY KEY,
    Name       NVARCHAR(100) NOT NULL CONSTRAINT UQ_Skill_Name UNIQUE,
    Category   NVARCHAR(50)  NULL     -- 'Lĩnh vực & Mô hình AI', 'Ngôn ngữ & Frameworks', 'Hạ tầng & Công cụ'
);

-- Phòng thí nghiệm: thay cột LabName (chữ tự do) trong LecturerProfile của PDF,
-- để lọc theo "Khoa / Lab" và gắn Lab cho GV, nhóm, đề tài
CREATE TABLE dbo.Lab (
    LabID           INT IDENTITY(1,1) CONSTRAINT PK_Lab PRIMARY KEY,
    FacultyID       INT NOT NULL CONSTRAINT FK_Lab_Faculty REFERENCES dbo.Faculty(FacultyID),
    Name            NVARCHAR(150) NOT NULL CONSTRAINT UQ_Lab_Name UNIQUE,
    FocusArea       NVARCHAR(255) NULL,   -- 'Thị giác máy tính & Nhận dạng'
    Room            NVARCHAR(50)  NULL,   -- 'E4.12'
    HeadLecturerID  INT NULL,             -- trưởng Lab; FK thêm sau khi tạo LecturerProfile
    IsVerified      BIT NOT NULL CONSTRAINT DF_Lab_IsVerified DEFAULT 0   -- nhãn "Lab Xác thực"
);
GO

/* =====================================================================
   NHÓM 1: XÁC THỰC & HỒ SƠ
   ===================================================================== */

-- 1. [PDF] Account (+ EmailVerifiedAt, TermsAcceptedAt, AvatarURL, LastLoginAt, CreatedAt)
CREATE TABLE dbo.Account (
    AccountID        INT IDENTITY(1,1) CONSTRAINT PK_Account PRIMARY KEY,
    Email            VARCHAR(150) NOT NULL CONSTRAINT UQ_Account_Email UNIQUE,
    PasswordHash     VARCHAR(255) NULL,      -- NULL: SV/GV chỉ đăng nhập qua UIT SSO
    Role             VARCHAR(20)  NOT NULL,
    IsActive         BIT NOT NULL CONSTRAINT DF_Account_IsActive DEFAULT 1,
    EmailVerifiedAt  DATETIME2(0) NULL,      -- (+) đăng ký bước 3: nhập mã 6 chữ số
    TermsAcceptedAt  DATETIME2(0) NULL,      -- (+) cam kết Quy chế SHTT & Liêm chính học thuật
    AvatarURL        VARCHAR(255) NULL,      -- (+) "Đổi ảnh"
    LastLoginAt      DATETIME2(0) NULL,
    CreatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_Account_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_Account_Role CHECK (Role IN ('Student','Lecturer','Business','Admin')),
    -- Màn đăng ký: SV bắt buộc email @gm.uit.edu.vn, GV dùng email @uit.edu.vn
    CONSTRAINT CK_Account_EmailDomain CHECK (
        (Role <> 'Student'  OR Email LIKE '%@gm.uit.edu.vn') AND
        (Role <> 'Lecturer' OR Email LIKE '%@uit.edu.vn')),
    -- Doanh nghiệp / Admin đăng nhập bằng email & mật khẩu nên bắt buộc có mật khẩu
    CONSTRAINT CK_Account_Password CHECK (PasswordHash IS NOT NULL OR Role IN ('Student','Lecturer'))
);

-- [MỚI] Liên kết đăng nhập UIT SSO / Microsoft 365 (màn 02: "MSSV / Mã GV hoặc email @gm.uit.edu.vn")
CREATE TABLE dbo.ExternalLogin (
    Provider     VARCHAR(20)  NOT NULL,
    ProviderKey  VARCHAR(150) NOT NULL,    -- định danh phía SSO (UPN / MSSV / mã GV)
    AccountID    INT NOT NULL CONSTRAINT FK_ExternalLogin_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    LinkedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_ExternalLogin_LinkedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ExternalLogin PRIMARY KEY (Provider, ProviderKey),
    CONSTRAINT UQ_ExternalLogin_Account UNIQUE (AccountID, Provider),
    CONSTRAINT CK_ExternalLogin_Provider CHECK (Provider IN ('UIT_SSO','Microsoft365'))
);

-- [MỚI] Mã xác thực: kích hoạt email (mã 6 số, hạn 10 phút, gửi lại sau 60 giây)
--        và quên mật khẩu (mã 6 số hoặc link, hạn 15 phút)
CREATE TABLE dbo.VerificationCode (
    CodeID        INT IDENTITY(1,1) CONSTRAINT PK_VerificationCode PRIMARY KEY,
    AccountID     INT NOT NULL CONSTRAINT FK_VerificationCode_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    Purpose       VARCHAR(20)  NOT NULL,
    CodeHash      VARCHAR(255) NOT NULL,   -- lưu bản băm của mã / token, không lưu mã gốc
    ExpiresAt     DATETIME2(0) NOT NULL,
    AttemptCount  TINYINT NOT NULL CONSTRAINT DF_VerificationCode_Attempt DEFAULT 0,
    ConsumedAt    DATETIME2(0) NULL,
    CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_VerificationCode_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_VerificationCode_Purpose CHECK (Purpose IN ('Email_Verify','Password_Reset')),
    CONSTRAINT CK_VerificationCode_Expiry CHECK (ExpiresAt > CreatedAt)
);
CREATE INDEX IX_VerificationCode_Account ON dbo.VerificationCode (AccountID, Purpose, CreatedAt DESC);

-- [MỚI] Phiên đăng nhập: "Ghi nhớ đăng nhập trên thiết bị này (30 ngày)", đăng xuất
CREATE TABLE dbo.LoginSession (
    SessionID     BIGINT IDENTITY(1,1) CONSTRAINT PK_LoginSession PRIMARY KEY,
    AccountID     INT NOT NULL CONSTRAINT FK_LoginSession_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    TokenHash     VARCHAR(255) NOT NULL CONSTRAINT UQ_LoginSession_Token UNIQUE,
    IsRemembered  BIT NOT NULL CONSTRAINT DF_LoginSession_Remember DEFAULT 0,
    DeviceInfo    NVARCHAR(255) NULL,
    CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_LoginSession_CreatedAt DEFAULT SYSDATETIME(),
    ExpiresAt     DATETIME2(0) NOT NULL,
    RevokedAt     DATETIME2(0) NULL
);

-- 2. [PDF] StudentProfile (+ lớp, khóa, GPA, ĐRL, liên kết, chế độ hiển thị – màn "Hồ sơ năng lực & CV")
CREATE TABLE dbo.StudentProfile (
    StudentID            INT NOT NULL CONSTRAINT PK_StudentProfile PRIMARY KEY
                         CONSTRAINT FK_StudentProfile_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    FullName             NVARCHAR(150) NOT NULL,
    StudentCode          VARCHAR(20)   NOT NULL CONSTRAINT UQ_StudentProfile_Code UNIQUE,   -- MSSV
    MajorID              INT NOT NULL CONSTRAINT FK_StudentProfile_Major REFERENCES dbo.Major(MajorID),  -- khoa suy ra từ Major
    ClassName            VARCHAR(30)   NULL,    -- (+) 'KHMT2021'
    Cohort               VARCHAR(10)   NULL,    -- (+) 'K18'
    EnrollmentYear       SMALLINT      NULL,    -- (+) 2021
    GraduationYear       SMALLINT      NULL,    -- (+) dự kiến tốt nghiệp
    GPA                  DECIMAL(4,2)  NULL,    -- (+) thang 10 (lọc học bổng, xếp ứng viên)
    TrainingScore        TINYINT       NULL,    -- (+) điểm rèn luyện
    Headline             NVARCHAR(255) NULL,    -- (+) 'Sinh viên KHMT & Nghiên cứu AI'
    GithubURL            VARCHAR(255)  NULL,
    LinkedinURL          VARCHAR(255)  NULL,
    IsOpenToOpportunity  BIT NOT NULL CONSTRAINT DF_StudentProfile_Open DEFAULT 1,   -- (+) "Sẵn sàng nhận Lab / Đề tài DN"
    ProfileVisibility    VARCHAR(20) NOT NULL CONSTRAINT DF_StudentProfile_Visibility DEFAULT 'Public',
    GeneratedCV_URL      VARCHAR(255)  NULL,    -- [PDF] link CV hệ thống tạo tự động
    UpdatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_StudentProfile_UpdatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_StudentProfile_GPA CHECK (GPA BETWEEN 0 AND 10),
    CONSTRAINT CK_StudentProfile_DRL CHECK (TrainingScore BETWEEN 0 AND 100),
    CONSTRAINT CK_StudentProfile_Visibility CHECK (ProfileVisibility IN ('Public','Partners_Only','Private'))
);

-- 3. [PDF] LecturerProfile (LabName → LabID; + mã GV, học hàm/học vị, chỉ số khoa học, suất hướng dẫn)
CREATE TABLE dbo.LecturerProfile (
    LecturerID           INT NOT NULL CONSTRAINT PK_LecturerProfile PRIMARY KEY
                         CONSTRAINT FK_LecturerProfile_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    FullName             NVARCHAR(150) NOT NULL,
    LecturerCode         VARCHAR(20)   NOT NULL CONSTRAINT UQ_LecturerProfile_Code UNIQUE,  -- 'GV01024'
    AcademicTitle        VARCHAR(10)   NULL,    -- (+) 'ThS', 'TS', 'PGS.TS', 'GS.TS'
    FacultyID            INT NOT NULL CONSTRAINT FK_LecturerProfile_Faculty REFERENCES dbo.Faculty(FacultyID),
    LabID                INT NULL CONSTRAINT FK_LecturerProfile_Lab REFERENCES dbo.Lab(LabID),   -- [PDF] LabName
    PositionTitle        NVARCHAR(150) NULL,    -- (+) 'Trưởng Lab CV&PR'
    ResearchArea         NVARCHAR(MAX) NULL,    -- [PDF] giới thiệu hướng nghiên cứu
    GoogleScholarURL     VARCHAR(255)  NULL,
    ORCID                VARCHAR(30)   NULL,
    HIndex               SMALLINT      NULL,    -- (+) danh bạ GV sắp xếp "H-index cao nhất"
    CitationCount        INT           NULL,
    IsAcceptingAdvisees  BIT NOT NULL CONSTRAINT DF_LecturerProfile_Accepting DEFAULT 1,   -- công tắc "Đang nhận hướng dẫn"
    MaxAdvisees          TINYINT NOT NULL CONSTRAINT DF_LecturerProfile_MaxAdvisees DEFAULT 5, -- "Còn 2/5 suất"
    VerifiedAt           DATETIME2(0)  NULL,    -- hồ sơ được Phòng TCCB & KHCN chứng thực
    UpdatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_LecturerProfile_UpdatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_LecturerProfile_Title CHECK (AcademicTitle IN ('CN','ThS','TS','PGS.TS','GS.TS'))
);
ALTER TABLE dbo.Lab ADD CONSTRAINT FK_Lab_HeadLecturer
    FOREIGN KEY (HeadLecturerID) REFERENCES dbo.LecturerProfile(LecturerID);

-- 4. [PDF] BusinessProfile (+ ngành, địa chỉ, logo, giấy phép ĐKKD, đối tác nổi bật)
CREATE TABLE dbo.BusinessProfile (
    BusinessID         INT NOT NULL CONSTRAINT PK_BusinessProfile PRIMARY KEY
                       CONSTRAINT FK_BusinessProfile_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    CompanyName        NVARCHAR(255) NOT NULL,
    TaxCode            VARCHAR(50)   NOT NULL CONSTRAINT UQ_BusinessProfile_TaxCode UNIQUE,  -- mã số thuế / ĐKKD
    Website            VARCHAR(255)  NULL,
    Industry           NVARCHAR(150) NULL,    -- (+) 'Tập đoàn Viễn thông & CNTT'
    Address            NVARCHAR(255) NULL,    -- (+) 'Khu Công nghệ cao TP.HCM'
    LogoURL            VARCHAR(255)  NULL,
    Description        NVARCHAR(MAX) NULL,
    LicenseFileURL     VARCHAR(255)  NULL,    -- (+) bản scan giấy phép ĐKKD để Admin xác minh
    VerifiedStatus     VARCHAR(20) NOT NULL CONSTRAINT DF_BusinessProfile_Status DEFAULT 'Pending',
    IsFeaturedPartner  BIT NOT NULL CONSTRAINT DF_BusinessProfile_Featured DEFAULT 0,   -- "Doanh nghiệp đối tác nổi bật"
    CONSTRAINT CK_BusinessProfile_Status CHECK (VerifiedStatus IN ('Pending','Verified','Rejected'))
);

-- 5. [PDF] AdminProfile
CREATE TABLE dbo.AdminProfile (
    AdminID     INT NOT NULL CONSTRAINT PK_AdminProfile PRIMARY KEY
                CONSTRAINT FK_AdminProfile_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    FullName    NVARCHAR(150) NOT NULL,
    Department  NVARCHAR(100) NULL      -- 'CTSV', 'Đào tạo'
);

-- [MỚI] Học vấn & quá trình công tác
--        (SV: "Học vấn & Quá trình đào tạo"; GV: "Học vấn & Quá trình Công tác")
CREATE TABLE dbo.ProfileTimeline (
    TimelineID    INT IDENTITY(1,1) CONSTRAINT PK_ProfileTimeline PRIMARY KEY,
    AccountID     INT NOT NULL CONSTRAINT FK_ProfileTimeline_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    EntryType     VARCHAR(20)   NOT NULL,
    Title         NVARCHAR(255) NOT NULL,   -- 'Tiến sĩ Khoa học Máy tính'
    Organization  NVARCHAR(255) NOT NULL,   -- 'JAIST - Ishikawa, Nhật Bản'
    StartDate     DATE NULL,
    EndDate       DATE NULL,                -- NULL = đến nay
    Description   NVARCHAR(MAX) NULL,
    SortOrder     SMALLINT NOT NULL CONSTRAINT DF_ProfileTimeline_Sort DEFAULT 0,
    CONSTRAINT CK_ProfileTimeline_Type  CHECK (EntryType IN ('Education','Work','Exchange')),
    CONSTRAINT CK_ProfileTimeline_Dates CHECK (EndDate IS NULL OR StartDate IS NULL OR EndDate >= StartDate)
);

-- [MỚI] Kỹ năng trên CV sinh viên, mức 1-5 ("Chuyên sâu (5/5)" ... "Cơ bản (2/5)")
CREATE TABLE dbo.StudentSkill (
    StudentID   INT NOT NULL CONSTRAINT FK_StudentSkill_Student REFERENCES dbo.StudentProfile(StudentID) ON DELETE CASCADE,
    SkillID     INT NOT NULL CONSTRAINT FK_StudentSkill_Skill REFERENCES dbo.Skill(SkillID),
    SkillLevel  TINYINT NOT NULL,
    CONSTRAINT PK_StudentSkill PRIMARY KEY (StudentID, SkillID),
    CONSTRAINT CK_StudentSkill_Level CHECK (SkillLevel BETWEEN 1 AND 5)
);

-- [MỚI] Thành tích cá nhân SV: giải thưởng, công bố, chứng chỉ – kèm minh chứng chờ xác thực
CREATE TABLE dbo.StudentAchievement (
    AchievementID        INT IDENTITY(1,1) CONSTRAINT PK_StudentAchievement PRIMARY KEY,
    StudentID            INT NOT NULL CONSTRAINT FK_StudentAchievement_Student REFERENCES dbo.StudentProfile(StudentID) ON DELETE CASCADE,
    Category             VARCHAR(20)   NOT NULL,
    Title                NVARCHAR(255) NOT NULL,
    IssuedBy             NVARCHAR(150) NULL,
    IssuedDate           DATE NULL,
    Detail               NVARCHAR(500) NULL,    -- DOI, điểm từng kỹ năng IELTS...
    EvidenceURL          VARCHAR(255)  NULL,    -- tệp minh chứng (PDF/JPG/PNG)
    VerificationStatus   VARCHAR(20) NOT NULL CONSTRAINT DF_StudentAchievement_Status DEFAULT 'Pending',
    VerifiedByAccountID  INT NULL CONSTRAINT FK_StudentAchievement_Verifier REFERENCES dbo.Account(AccountID),
    CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_StudentAchievement_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_StudentAchievement_Category CHECK (Category IN ('Award','Publication','Language_Cert','Tech_Cert')),
    CONSTRAINT CK_StudentAchievement_Status   CHECK (VerificationStatus IN ('Pending','Verified','Rejected'))
);

-- [MỚI] Lĩnh vực & kỹ năng chuyên môn của GV (bộ lọc danh bạ GV, "Lĩnh vực Chuyên môn & Kỹ năng Cốt lõi")
CREATE TABLE dbo.LecturerField (
    LecturerID  INT NOT NULL CONSTRAINT FK_LecturerField_Lecturer REFERENCES dbo.LecturerProfile(LecturerID) ON DELETE CASCADE,
    FieldID     INT NOT NULL CONSTRAINT FK_LecturerField_Field REFERENCES dbo.Field(FieldID),
    CONSTRAINT PK_LecturerField PRIMARY KEY (LecturerID, FieldID)
);
CREATE TABLE dbo.LecturerSkill (
    LecturerID  INT NOT NULL CONSTRAINT FK_LecturerSkill_Lecturer REFERENCES dbo.LecturerProfile(LecturerID) ON DELETE CASCADE,
    SkillID     INT NOT NULL CONSTRAINT FK_LecturerSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_LecturerSkill PRIMARY KEY (LecturerID, SkillID)
);

-- [MỚI] Công bố khoa học của GV (tab "Công bố", "14 bài Q1/Q2 Scopus & IEEE")
CREATE TABLE dbo.Publication (
    PublicationID  INT IDENTITY(1,1) CONSTRAINT PK_Publication PRIMARY KEY,
    LecturerID     INT NOT NULL CONSTRAINT FK_Publication_Lecturer REFERENCES dbo.LecturerProfile(LecturerID) ON DELETE CASCADE,
    Title          NVARCHAR(500) NOT NULL,
    Venue          NVARCHAR(255) NULL,     -- tạp chí / hội nghị
    PublishYear    SMALLINT NULL,
    DOI            VARCHAR(100) NULL,
    IndexedIn      VARCHAR(20)  NULL,      -- 'Scopus', 'ISI', 'IEEE'...
    Quartile       CHAR(2) NULL,
    CONSTRAINT CK_Publication_Quartile CHECK (Quartile IN ('Q1','Q2','Q3','Q4'))
);

-- [MỚI] Lịch tiếp sinh viên của GV ("Thứ Ba hàng tuần 14:00 – 16:00, Phòng E8.12")
CREATE TABLE dbo.OfficeHour (
    OfficeHourID  INT IDENTITY(1,1) CONSTRAINT PK_OfficeHour PRIMARY KEY,
    LecturerID    INT NOT NULL CONSTRAINT FK_OfficeHour_Lecturer REFERENCES dbo.LecturerProfile(LecturerID) ON DELETE CASCADE,
    DayOfWeek     TINYINT NOT NULL,       -- 2 = Thứ Hai ... 8 = Chủ nhật
    StartTime     TIME(0) NOT NULL,
    EndTime       TIME(0) NOT NULL,
    Location      NVARCHAR(150) NULL,
    CONSTRAINT CK_OfficeHour_Day  CHECK (DayOfWeek BETWEEN 2 AND 8),
    CONSTRAINT CK_OfficeHour_Time CHECK (EndTime > StartTime)
);
GO

/* =====================================================================
   NHÓM 2: LUỒNG SINH VIÊN – NHÓM & TÀI NGUYÊN HỌC THUẬT
   ===================================================================== */

-- 6. [PDF] StudentTeam (sửa chính tả "StudnetTeam")
--    Dùng cho "Quản trị nhóm & Portfolio" (SV) và "Nhóm nghiên cứu & Lab" (GV)
CREATE TABLE dbo.StudentTeam (
    TeamID             INT IDENTITY(1,1) CONSTRAINT PK_StudentTeam PRIMARY KEY,
    TeamName           NVARCHAR(150) NOT NULL,
    TeamCode           VARCHAR(30)   NULL,    -- (+) mã định danh 'UIT-TEAM-2024-VLAB01'
    ShortName          VARCHAR(10)   NULL,    -- (+) chữ viết tắt làm logo 'VLAB'
    FieldID            INT NULL CONSTRAINT FK_StudentTeam_Field REFERENCES dbo.Field(FieldID),   -- [PDF] lĩnh vực chính
    FacultyID          INT NULL CONSTRAINT FK_StudentTeam_Faculty REFERENCES dbo.Faculty(FacultyID),
    LabID              INT NULL CONSTRAINT FK_StudentTeam_Lab REFERENCES dbo.Lab(LabID),
    AdvisorLecturerID  INT NULL CONSTRAINT FK_StudentTeam_Advisor REFERENCES dbo.LecturerProfile(LecturerID),  -- (+) cố vấn / bảo trợ
    Description        NVARCHAR(MAX) NULL,    -- (+) tôn chỉ & hướng nghiên cứu
    Semester           VARCHAR(20)   NULL,    -- (+) 'HK1 2024-2025'
    MaxMembers         TINYINT NOT NULL CONSTRAINT DF_StudentTeam_MaxMembers DEFAULT 6,   -- "4 / 6 SV"
    JoinCode           VARCHAR(30)   NULL,    -- (+) link tham gia nhanh
    IsLabVerified      BIT NOT NULL CONSTRAINT DF_StudentTeam_Verified DEFAULT 0,
    Status             VARCHAR(20) NOT NULL CONSTRAINT DF_StudentTeam_Status DEFAULT 'Active',  -- [PDF]
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_StudentTeam_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_StudentTeam_Status CHECK (Status IN ('Active','Inactive','Disbanded')),
    CONSTRAINT CK_StudentTeam_MaxMembers CHECK (MaxMembers BETWEEN 1 AND 50)
);
CREATE UNIQUE INDEX UX_StudentTeam_TeamCode ON dbo.StudentTeam (TeamCode) WHERE TeamCode IS NOT NULL;
CREATE UNIQUE INDEX UX_StudentTeam_JoinCode ON dbo.StudentTeam (JoinCode) WHERE JoinCode IS NOT NULL;

-- [PDF] TeamMember (+ chức danh trong nhóm, đóng góp chính, ngày gia nhập)
CREATE TABLE dbo.TeamMember (
    TeamID         INT NOT NULL CONSTRAINT FK_TeamMember_Team REFERENCES dbo.StudentTeam(TeamID) ON DELETE CASCADE,
    StudentID      INT NOT NULL CONSTRAINT FK_TeamMember_Student REFERENCES dbo.StudentProfile(StudentID),
    RoleInTeam     VARCHAR(10) NOT NULL CONSTRAINT DF_TeamMember_Role DEFAULT 'Member',
    PositionTitle  NVARCHAR(100) NULL,    -- (+) 'Kỹ sư AI (ML Engineer)'
    Contribution   NVARCHAR(255) NULL,    -- (+) 'Huấn luyện mô hình YOLOv10 & TensorRT'
    JoinedAt       DATE NOT NULL CONSTRAINT DF_TeamMember_JoinedAt DEFAULT CAST(SYSDATETIME() AS DATE),
    CONSTRAINT PK_TeamMember PRIMARY KEY (TeamID, StudentID),
    CONSTRAINT CK_TeamMember_Role CHECK (RoleInTeam IN ('Leader','Member'))
);
-- Mỗi nhóm chỉ có một trưởng nhóm
CREATE UNIQUE INDEX UX_TeamMember_Leader ON dbo.TeamMember (TeamID) WHERE RoleInTeam = 'Leader';

-- [MỚI] Bộ công nghệ & kỹ năng chủ lực của nhóm
CREATE TABLE dbo.TeamSkill (
    TeamID   INT NOT NULL CONSTRAINT FK_TeamSkill_Team REFERENCES dbo.StudentTeam(TeamID) ON DELETE CASCADE,
    SkillID  INT NOT NULL CONSTRAINT FK_TeamSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_TeamSkill PRIMARY KEY (TeamID, SkillID)
);

-- [MỚI] Lời mời vào nhóm ("Mời thành viên mới"); người mời là trưởng nhóm hoặc GV phụ trách
CREATE TABLE dbo.TeamInvitation (
    InvitationID        INT IDENTITY(1,1) CONSTRAINT PK_TeamInvitation PRIMARY KEY,
    TeamID              INT NOT NULL CONSTRAINT FK_TeamInvitation_Team REFERENCES dbo.StudentTeam(TeamID) ON DELETE CASCADE,
    StudentID           INT NOT NULL CONSTRAINT FK_TeamInvitation_Student REFERENCES dbo.StudentProfile(StudentID),
    InvitedByAccountID  INT NOT NULL CONSTRAINT FK_TeamInvitation_Inviter REFERENCES dbo.Account(AccountID),
    Status              VARCHAR(20) NOT NULL CONSTRAINT DF_TeamInvitation_Status DEFAULT 'Pending',
    CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_TeamInvitation_CreatedAt DEFAULT SYSDATETIME(),
    RespondedAt         DATETIME2(0) NULL,
    CONSTRAINT CK_TeamInvitation_Status CHECK (Status IN ('Pending','Accepted','Declined','Expired'))
);

-- 7. [PDF] AcademicResource (+ mã, người tạo, lĩnh vực, khoa/lab, TRL, thông tin xuất bản, các bước thẩm định)
--    Kho tài liệu (SV 02 / GV 09), chi tiết tài liệu (SV 03 / GV 10), "Đề tài của tôi" (SV 05)
CREATE TABLE dbo.AcademicResource (
    ResourceID          INT IDENTITY(1,1) CONSTRAINT PK_AcademicResource PRIMARY KEY,
    ResourceCode        VARCHAR(20) NULL,       -- (+) 'BB-2026-089', 'DT-2026-041', 'SP-2026-015'
    OwnerTeamID         INT NULL CONSTRAINT FK_AcademicResource_Team REFERENCES dbo.StudentTeam(TeamID),  -- [PDF]; NULL = tài liệu GV / cá nhân
    CreatedByAccountID  INT NOT NULL CONSTRAINT FK_AcademicResource_Creator REFERENCES dbo.Account(AccountID),  -- (+)
    Type                VARCHAR(20)   NOT NULL,
    Title               NVARCHAR(255) NOT NULL,
    Abstract            NVARCHAR(MAX) NULL,
    Authors             NVARCHAR(500) NULL,     -- (+) dòng tác giả hiển thị (có thể có người ngoài hệ thống)
    Keywords            NVARCHAR(500) NULL,     -- (+)
    FieldID             INT NULL CONSTRAINT FK_AcademicResource_Field REFERENCES dbo.Field(FieldID),
    FacultyID           INT NULL CONSTRAINT FK_AcademicResource_Faculty REFERENCES dbo.Faculty(FacultyID),
    LabID               INT NULL CONSTRAINT FK_AcademicResource_Lab REFERENCES dbo.Lab(LabID),
    LecturerID          INT NULL CONSTRAINT FK_AcademicResource_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),  -- [PDF] GVHD / xác thực
    TRLLevel            TINYINT NULL,           -- (+) mức sẵn sàng công nghệ 1-9
    Venue               NVARCHAR(255) NULL,     -- (+) 'IEEE Access 2026', 'Cấp ĐHQG-HCM'
    DOI                 VARCHAR(100) NULL,
    FileURL             VARCHAR(255) NULL,      -- [PDF] bản mới nhất; các lần nộp lưu ở ResourceSubmission
    SourceCodeURL       VARCHAR(255) NULL,
    DemoURL             VARCHAR(255) NULL,
    PageCount           SMALLINT NULL,
    FileSizeKB          INT NULL,
    Status              VARCHAR(20) NOT NULL CONSTRAINT DF_AcademicResource_Status DEFAULT 'Draft',
    ReviewScore         DECIMAL(5,2) NULL,      -- (+) điểm thẩm định gần nhất (sắp xếp "Điểm thẩm định Hội đồng")
    ViewCount           INT NOT NULL CONSTRAINT DF_AcademicResource_Views DEFAULT 0,
    InterestCount       INT NOT NULL CONSTRAINT DF_AcademicResource_Interest DEFAULT 0,   -- "Lượt quan tâm"
    PublishedAt         DATETIME2(0) NULL,
    CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_AcademicResource_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_AcademicResource_UpdatedAt DEFAULT SYSDATETIME(),
    -- PDF: Project / Product / Paper; thêm luận văn và tài liệu giảng dạy của GV (giáo trình, slide)
    CONSTRAINT CK_AcademicResource_Type CHECK (Type IN ('Project','Product','Paper','Thesis','Textbook','Slide')),
    CONSTRAINT CK_AcademicResource_TRL  CHECK (TRLLevel BETWEEN 1 AND 9),
    -- PDF chỉ có Draft / Published; màn "Đề tài của tôi" và "Thẩm định" cần thêm các bước:
    -- Bản nháp → Chờ thẩm định → Cần bổ sung / Từ chối → Đã thẩm định → Đã công bố (có thể bị ẩn)
    CONSTRAINT CK_AcademicResource_Status CHECK (Status IN
        ('Draft','Pending_Review','Revision_Needed','Approved','Published','Rejected','Hidden'))
);
CREATE UNIQUE INDEX UX_AcademicResource_Code ON dbo.AcademicResource (ResourceCode) WHERE ResourceCode IS NOT NULL;
CREATE INDEX IX_AcademicResource_Catalog ON dbo.AcademicResource (Status, Type, FieldID) INCLUDE (Title, TRLLevel, PublishedAt);
CREATE INDEX IX_AcademicResource_Team ON dbo.AcademicResource (OwnerTeamID);

-- [MỚI] Thẻ công nghệ của tài nguyên (bộ lọc "Công nghệ & Kỹ năng")
CREATE TABLE dbo.ResourceSkill (
    ResourceID  INT NOT NULL CONSTRAINT FK_ResourceSkill_Resource REFERENCES dbo.AcademicResource(ResourceID) ON DELETE CASCADE,
    SkillID     INT NOT NULL CONSTRAINT FK_ResourceSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_ResourceSkill PRIMARY KEY (ResourceID, SkillID)
);

-- [MỚI] Công trình trưng bày trên CV: chọn đề tài, vai trò, kết quả nổi bật, ẩn/hiện, thứ tự
CREATE TABLE dbo.CVShowcaseItem (
    StudentID      INT NOT NULL CONSTRAINT FK_CVShowcaseItem_Student REFERENCES dbo.StudentProfile(StudentID) ON DELETE CASCADE,
    ResourceID     INT NOT NULL CONSTRAINT FK_CVShowcaseItem_Resource REFERENCES dbo.AcademicResource(ResourceID),
    RoleInProject  NVARCHAR(150) NULL,      -- 'Trưởng nhóm (Lead AI Engineer)'
    Highlights     NVARCHAR(MAX) NULL,      -- kết quả định lượng ghi trên CV
    IsShownOnCV    BIT NOT NULL CONSTRAINT DF_CVShowcaseItem_Shown DEFAULT 1,
    DisplayOrder   TINYINT NOT NULL CONSTRAINT DF_CVShowcaseItem_Order DEFAULT 0,
    CONSTRAINT PK_CVShowcaseItem PRIMARY KEY (StudentID, ResourceID)
);
GO

/* =====================================================================
   NHÓM 3: LUỒNG GIẢNG VIÊN – TIN TUYỂN SV VÀO ĐỀ TÀI & LAB
   (GV "Tuyển sinh viên", "Hướng nghiên cứu đang tuyển";
    SV "Chợ ghép nhóm", "Cơ hội mới nhất → Đề tài tốt nghiệp")
   ===================================================================== */

-- 8. [PDF] LabTopic (+ loại đề tài, Lab, lĩnh vực, số vị trí, kinh phí, TRL, hạn nộp)
CREATE TABLE dbo.LabTopic (
    TopicID              INT IDENTITY(1,1) CONSTRAINT PK_LabTopic PRIMARY KEY,
    LecturerID           INT NOT NULL CONSTRAINT FK_LabTopic_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),
    LabID                INT NULL CONSTRAINT FK_LabTopic_Lab REFERENCES dbo.Lab(LabID),
    FieldID              INT NULL CONSTRAINT FK_LabTopic_Field REFERENCES dbo.Field(FieldID),
    TopicType            VARCHAR(20)   NOT NULL,   -- KLTN / NCKH / Đồ án chuyên ngành / Hợp tác R&D Lab
    Title                NVARCHAR(255) NOT NULL,
    Description          NVARCHAR(MAX) NULL,
    RecruitmentCriteria  NVARCHAR(MAX) NULL,       -- [PDF] tiêu chí set nhóm (GPA, kỹ năng...)
    Slots                TINYINT NOT NULL CONSTRAINT DF_LabTopic_Slots DEFAULT 1,   -- "Còn 2/3 vị trí"
    FundingAmount        DECIMAL(18,2) NULL,       -- "Kinh phí NCKH: 45.000.000 đ"
    FundingNote          NVARCHAR(255) NULL,       -- "+ GPU A100"
    TRLLevel             TINYINT NULL,
    PartnerName          NVARCHAR(255) NULL,       -- 'Viện IC-Design ĐHQG'
    IsInterdisciplinary  BIT NOT NULL CONSTRAINT DF_LabTopic_Inter DEFAULT 0,   -- "Ưu tiên liên khoa"
    Deadline             DATE NULL,
    Status               VARCHAR(20) NOT NULL CONSTRAINT DF_LabTopic_Status DEFAULT 'Open',
    CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_LabTopic_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_LabTopic_Type   CHECK (TopicType IN ('Thesis','Student_Research','Major_Project','Lab_RD')),
    -- PDF: Open / Closed; màn GV có thêm "Đã đủ" và "Tạm dừng"
    CONSTRAINT CK_LabTopic_Status CHECK (Status IN ('Open','Filled','Paused','Closed')),
    CONSTRAINT CK_LabTopic_Slots  CHECK (Slots >= 1),
    CONSTRAINT CK_LabTopic_TRL    CHECK (TRLLevel BETWEEN 1 AND 9),
    CONSTRAINT CK_LabTopic_Funding CHECK (FundingAmount >= 0)
);
CREATE INDEX IX_LabTopic_Lecturer ON dbo.LabTopic (LecturerID, Status);

CREATE TABLE dbo.TopicSkill (
    TopicID  INT NOT NULL CONSTRAINT FK_TopicSkill_Topic REFERENCES dbo.LabTopic(TopicID) ON DELETE CASCADE,
    SkillID  INT NOT NULL CONSTRAINT FK_TopicSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_TopicSkill PRIMARY KEY (TopicID, SkillID)
);

-- 9. [PDF] LabApplication (+ thư ngỏ, CV nộp kèm, độ phù hợp, phỏng vấn, thời điểm)
CREATE TABLE dbo.LabApplication (
    ApplicationID  INT IDENTITY(1,1) CONSTRAINT PK_LabApplication PRIMARY KEY,
    TopicID        INT NOT NULL CONSTRAINT FK_LabApplication_Topic REFERENCES dbo.LabTopic(TopicID) ON DELETE CASCADE,
    StudentID      INT NOT NULL CONSTRAINT FK_LabApplication_Student REFERENCES dbo.StudentProfile(StudentID),
    Message        NVARCHAR(MAX) NULL,
    SubmittedCV    VARCHAR(255)  NULL,     -- lấy từ GeneratedCV_URL lúc nộp
    MatchScore     DECIMAL(5,2)  NULL,     -- "96% phù hợp"
    Status         VARCHAR(20) NOT NULL CONSTRAINT DF_LabApplication_Status DEFAULT 'Pending',
    AppliedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_LabApplication_AppliedAt DEFAULT SYSDATETIME(),
    RespondedAt    DATETIME2(0) NULL,
    CONSTRAINT UQ_LabApplication UNIQUE (TopicID, StudentID),
    CONSTRAINT CK_LabApplication_Status CHECK (Status IN ('Pending','Interviewing','Accepted','Rejected','Withdrawn')),
    CONSTRAINT CK_LabApplication_Match  CHECK (MatchScore BETWEEN 0 AND 100)
);
GO

/* =====================================================================
   NHÓM 4: LUỒNG DOANH NGHIỆP
   ===================================================================== */

-- 10. [PDF] BusinessProblem (+ lĩnh vực, loại bài toán, địa điểm, hạn, trạng thái duyệt)
--     SV "Cổng doanh nghiệp & R&D", GV "Bài toán DN & R&D", trang chủ "Đặt hàng doanh nghiệp"
CREATE TABLE dbo.BusinessProblem (
    ProblemID    INT IDENTITY(1,1) CONSTRAINT PK_BusinessProblem PRIMARY KEY,
    BusinessID   INT NOT NULL CONSTRAINT FK_BusinessProblem_Business REFERENCES dbo.BusinessProfile(BusinessID),
    Title        NVARCHAR(255) NOT NULL,
    Requirement  NVARCHAR(MAX) NULL,
    FieldID      INT NULL CONSTRAINT FK_BusinessProblem_Field REFERENCES dbo.Field(FieldID),
    ProblemType  VARCHAR(20) NOT NULL CONSTRAINT DF_BusinessProblem_Type DEFAULT 'Open_Call',  -- 3 tab trên màn
    Funding      DECIMAL(18,2) NULL,      -- [PDF] mức tài trợ R&D
    Location     NVARCHAR(150) NULL,
    Deadline     DATE NULL,
    Status       VARCHAR(20) NOT NULL CONSTRAINT DF_BusinessProblem_Status DEFAULT 'Pending_Approval',
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_BusinessProblem_CreatedAt DEFAULT SYSDATETIME(),
    -- "Đang mở ứng tuyển" / "Dự án hợp tác Lab" / "Doanh nghiệp tài trợ"
    CONSTRAINT CK_BusinessProblem_Type    CHECK (ProblemType IN ('Open_Call','Lab_Collaboration','Sponsored')),
    CONSTRAINT CK_BusinessProblem_Status  CHECK (Status IN ('Pending_Approval','Open','In_Progress','Closed','Rejected')),
    CONSTRAINT CK_BusinessProblem_Funding CHECK (Funding >= 0)
);
CREATE INDEX IX_BusinessProblem_List ON dbo.BusinessProblem (Status, ProblemType, Deadline);

CREATE TABLE dbo.ProblemSkill (
    ProblemID  INT NOT NULL CONSTRAINT FK_ProblemSkill_Problem REFERENCES dbo.BusinessProblem(ProblemID) ON DELETE CASCADE,
    SkillID    INT NOT NULL CONSTRAINT FK_ProblemSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_ProblemSkill PRIMARY KEY (ProblemID, SkillID)
);

-- 11. [PDF] JobPosting (+ địa điểm, hạn, trạng thái) – chưa có màn trên index3/index4 (luồng DN)
CREATE TABLE dbo.JobPosting (
    JobID         INT IDENTITY(1,1) CONSTRAINT PK_JobPosting PRIMARY KEY,
    BusinessID    INT NOT NULL CONSTRAINT FK_JobPosting_Business REFERENCES dbo.BusinessProfile(BusinessID),
    JobTitle      NVARCHAR(255) NOT NULL,
    JobType       VARCHAR(50)   NOT NULL,
    Description   NVARCHAR(MAX) NULL,
    IsCVTesting   BIT NOT NULL CONSTRAINT DF_JobPosting_CVTest DEFAULT 0,   -- 1: có bài test CV
    Location      NVARCHAR(150) NULL,
    Deadline      DATE NULL,
    Status        VARCHAR(20) NOT NULL CONSTRAINT DF_JobPosting_Status DEFAULT 'Pending_Approval',
    CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_JobPosting_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_JobPosting_Type   CHECK (JobType IN ('Internship','Part-time','Full-time')),
    CONSTRAINT CK_JobPosting_Status CHECK (Status IN ('Pending_Approval','Open','Closed','Rejected'))
);

-- 12. [PDF] JobApplication (+ trạng thái 'Rejected', ngày nộp)
CREATE TABLE dbo.JobApplication (
    ApplyID       INT IDENTITY(1,1) CONSTRAINT PK_JobApplication PRIMARY KEY,
    JobID         INT NOT NULL CONSTRAINT FK_JobApplication_Job REFERENCES dbo.JobPosting(JobID) ON DELETE CASCADE,
    StudentID     INT NOT NULL CONSTRAINT FK_JobApplication_Student REFERENCES dbo.StudentProfile(StudentID),
    SubmittedCV   VARCHAR(255) NULL,      -- lấy từ GeneratedCV_URL
    TestScore     DECIMAL(5,2) NULL,      -- điểm test CV (nếu JobPosting.IsCVTesting = 1)
    Status        VARCHAR(20) NOT NULL CONSTRAINT DF_JobApplication_Status DEFAULT 'Under_Review',
    AppliedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_JobApplication_AppliedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_JobApplication UNIQUE (JobID, StudentID),
    CONSTRAINT CK_JobApplication_Status CHECK (Status IN ('Under_Review','Interview','Hired','Rejected')),
    CONSTRAINT CK_JobApplication_Score  CHECK (TestScore BETWEEN 0 AND 100)
);
GO

/* =====================================================================
   NHÓM 5: KIỂM DUYỆT CỦA ADMIN (chưa có màn trên index3/index4)
   ===================================================================== */

-- 13. [PDF] ModerationLog
CREATE TABLE dbo.ModerationLog (
    LogID        INT IDENTITY(1,1) CONSTRAINT PK_ModerationLog PRIMARY KEY,
    AdminID      INT NOT NULL CONSTRAINT FK_ModerationLog_Admin REFERENCES dbo.AdminProfile(AdminID),
    TargetTable  VARCHAR(50) NOT NULL,     -- tên bảng bị duyệt
    TargetID     INT NOT NULL,             -- khoá chính của dòng bị duyệt
    ActionTaken  VARCHAR(20) NOT NULL,
    Reason       NVARCHAR(MAX) NULL,
    CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_ModerationLog_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ModerationLog_Target CHECK (TargetTable IN
        ('Account','BusinessProfile','BusinessProblem','JobPosting','AcademicResource','ScholarshipProgram','ScholarshipRequest')),
    CONSTRAINT CK_ModerationLog_Action CHECK (ActionTaken IN ('Approved','Rejected','Hidden','Banned'))
);
CREATE INDEX IX_ModerationLog_Target ON dbo.ModerationLog (TargetTable, TargetID);
GO

/* =====================================================================
   NHÓM 6: KẾT NỐI, ĐÀM PHÁN & TÀI TRỢ
   ===================================================================== */

-- 14. [PDF] ConnectionRequest (+ GV đứng tên đề xuất – nút "Xem chi tiết & Gửi đề xuất" ở màn GV)
CREATE TABLE dbo.ConnectionRequest (
    RequestID          INT IDENTITY(1,1) CONSTRAINT PK_ConnectionRequest PRIMARY KEY,
    BusinessID         INT NOT NULL CONSTRAINT FK_ConnectionRequest_Business REFERENCES dbo.BusinessProfile(BusinessID),
    TeamID             INT NULL CONSTRAINT FK_ConnectionRequest_Team REFERENCES dbo.StudentTeam(TeamID),
    LecturerID         INT NULL CONSTRAINT FK_ConnectionRequest_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),  -- (+)
    ProblemID          INT NULL CONSTRAINT FK_ConnectionRequest_Problem REFERENCES dbo.BusinessProblem(ProblemID),     -- SV/GV giải bài toán R&D
    TargetResourceID   INT NULL CONSTRAINT FK_ConnectionRequest_Resource REFERENCES dbo.AcademicResource(ResourceID),  -- DN mời cho đồ án
    InitiatedBy        VARCHAR(10) NOT NULL,      -- (+) bên chủ động: DN mời hay nhóm SV / GV đề xuất
    ProposalContent    NVARCHAR(MAX) NULL,
    Status             VARCHAR(20) NOT NULL CONSTRAINT DF_ConnectionRequest_Status DEFAULT 'Submitted',
    StudentConfirmed   BIT NOT NULL CONSTRAINT DF_ConnectionRequest_StuConf DEFAULT 0,  -- [PDF] phía đề xuất (nhóm SV / GV) chốt hợp đồng
    BusinessConfirmed  BIT NOT NULL CONSTRAINT DF_ConnectionRequest_BizConf DEFAULT 0,
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_ConnectionRequest_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_ConnectionRequest_UpdatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ConnectionRequest_Party     CHECK (TeamID IS NOT NULL OR LecturerID IS NOT NULL),
    CONSTRAINT CK_ConnectionRequest_Subject   CHECK (ProblemID IS NOT NULL OR TargetResourceID IS NOT NULL),
    CONSTRAINT CK_ConnectionRequest_Initiator CHECK (InitiatedBy IN ('Business','Team','Lecturer')),
    CONSTRAINT CK_ConnectionRequest_Status    CHECK (Status IN
        ('Submitted','In_Discussion','Contracted','Completed','Declined','Cancelled')),
    -- Chỉ "Contracted" / "Completed" khi cả hai bên đã chốt
    CONSTRAINT CK_ConnectionRequest_Contract  CHECK (Status NOT IN ('Contracted','Completed')
        OR (StudentConfirmed = 1 AND BusinessConfirmed = 1))
);

-- 15. [PDF] PartnerReview
CREATE TABLE dbo.PartnerReview (
    ReviewID           INT IDENTITY(1,1) CONSTRAINT PK_PartnerReview PRIMARY KEY,
    RequestID          INT NOT NULL CONSTRAINT FK_PartnerReview_Request REFERENCES dbo.ConnectionRequest(RequestID),
    ReviewerAccountID  INT NOT NULL CONSTRAINT FK_PartnerReview_Reviewer REFERENCES dbo.Account(AccountID),
    Rating             DECIMAL(2,1) NOT NULL,
    Comment            NVARCHAR(MAX) NULL,
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_PartnerReview_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_PartnerReview UNIQUE (RequestID, ReviewerAccountID),
    CONSTRAINT CK_PartnerReview_Rating CHECK (Rating BETWEEN 1.0 AND 5.0)
);

-- 16. [PDF] ScholarshipRequest (sửa chính tả "SholarshipRequest")
--     Nhóm SV kêu gọi tài trợ – tab "Chiến dịch gây quỹ" ở màn Học bổng & Tài trợ
CREATE TABLE dbo.ScholarshipRequest (
    ScholarshipID  INT IDENTITY(1,1) CONSTRAINT PK_ScholarshipRequest PRIMARY KEY,
    TeamID         INT NOT NULL CONSTRAINT FK_ScholarshipRequest_Team REFERENCES dbo.StudentTeam(TeamID),
    Title          NVARCHAR(255) NOT NULL,
    Description    NVARCHAR(MAX) NULL,       -- mục đích sử dụng vốn
    TargetAmount   DECIMAL(18,2) NOT NULL,
    Deadline       DATE NULL,                -- (+)
    Status         VARCHAR(20) NOT NULL CONSTRAINT DF_ScholarshipRequest_Status DEFAULT 'Open',
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_ScholarshipRequest_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ScholarshipRequest_Status CHECK (Status IN ('Open','Funded','Closed')),
    CONSTRAINT CK_ScholarshipRequest_Amount CHECK (TargetAmount > 0)
);

-- [MỚI] Doanh nghiệp góp tài trợ cho chiến dịch (căn cứ chuyển trạng thái 'Funded')
CREATE TABLE dbo.FundingPledge (
    PledgeID       INT IDENTITY(1,1) CONSTRAINT PK_FundingPledge PRIMARY KEY,
    ScholarshipID  INT NOT NULL CONSTRAINT FK_FundingPledge_Request REFERENCES dbo.ScholarshipRequest(ScholarshipID) ON DELETE CASCADE,
    BusinessID     INT NOT NULL CONSTRAINT FK_FundingPledge_Business REFERENCES dbo.BusinessProfile(BusinessID),
    Amount         DECIMAL(18,2) NOT NULL,
    Message        NVARCHAR(500) NULL,
    PledgedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_FundingPledge_PledgedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_FundingPledge_Amount CHECK (Amount > 0)
);

-- [MỚI] Học bổng & Quỹ tài trợ đề tài do DN / trường / tổ chức quốc tế đưa ra
--        (tab "Học bổng", "Quỹ tài trợ đề tài", banner "Quỹ tài trợ 15 tỷ", trang chủ "Học bổng")
--        PDF chỉ có chiều ngược lại (nhóm SV xin tài trợ) nên không đủ cho màn này.
CREATE TABLE dbo.ScholarshipProgram (
    ProgramID            INT IDENTITY(1,1) CONSTRAINT PK_ScholarshipProgram PRIMARY KEY,
    ProgramCode          VARCHAR(30)   NULL,     -- 'UIT-INOV-2026'
    ProgramType          VARCHAR(20)   NOT NULL,
    ProviderType         VARCHAR(20)   NOT NULL, -- nhãn "Doanh nghiệp" / "Học bổng trường" / "Trao đổi quốc tế"
    ProviderBusinessID   INT NULL CONSTRAINT FK_ScholarshipProgram_Business REFERENCES dbo.BusinessProfile(BusinessID),
    ProviderName         NVARCHAR(255) NOT NULL, -- tên hiển thị: 'Quỹ Phát triển UIT', 'Aura AI Lab'
    Title                NVARCHAR(255) NOT NULL,
    Description          NVARCHAR(MAX) NULL,
    FieldID              INT NULL CONSTRAINT FK_ScholarshipProgram_Field REFERENCES dbo.Field(FieldID),
    Amount               DECIMAL(18,2) NOT NULL,
    AmountUnit           VARCHAR(20) NOT NULL CONSTRAINT DF_ScholarshipProgram_Unit DEFAULT 'Per_Slot',   -- "/ suất", "/ năm", "tối đa"
    Slots                SMALLINT NULL,
    Benefits             NVARCHAR(255) NULL,     -- '+ Cam kết việc làm', '+ Mentor 1-1 SOC'
    -- Điều kiện để hiện "Bạn đủ điều kiện" / "Chưa đủ điều kiện: GPA"
    MinGPA               DECIMAL(4,2) NULL,
    MinTrainingScore     TINYINT NULL,           -- 'ĐRL ≥ 90'
    MinStudyYear         TINYINT NULL,           -- 'Năm 3-4'
    MaxStudyYear         TINYINT NULL,
    LanguageRequirement  NVARCHAR(100) NULL,     -- 'IELTS ≥ 7.0'
    OtherRequirement     NVARCHAR(255) NULL,     -- 'Có bài báo NCKH'
    Deadline             DATE NOT NULL,
    IsFeatured           BIT NOT NULL CONSTRAINT DF_ScholarshipProgram_Featured DEFAULT 0,
    Status               VARCHAR(20) NOT NULL CONSTRAINT DF_ScholarshipProgram_Status DEFAULT 'Open',
    CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_ScholarshipProgram_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ScholarshipProgram_Type     CHECK (ProgramType IN ('Scholarship','Research_Fund')),
    CONSTRAINT CK_ScholarshipProgram_Provider CHECK (ProviderType IN ('Business','University','International')),
    CONSTRAINT CK_ScholarshipProgram_Biz      CHECK (ProviderType <> 'Business' OR ProviderBusinessID IS NOT NULL),
    CONSTRAINT CK_ScholarshipProgram_Unit     CHECK (AmountUnit IN ('Per_Slot','Per_Year','Max_Per_Project','Total')),
    CONSTRAINT CK_ScholarshipProgram_Status   CHECK (Status IN ('Draft','Open','Closed')),
    CONSTRAINT CK_ScholarshipProgram_Amount   CHECK (Amount > 0),
    CONSTRAINT CK_ScholarshipProgram_GPA      CHECK (MinGPA BETWEEN 0 AND 10),
    CONSTRAINT CK_ScholarshipProgram_Years    CHECK (MinStudyYear IS NULL OR MaxStudyYear IS NULL OR MinStudyYear <= MaxStudyYear)
);
CREATE UNIQUE INDEX UX_ScholarshipProgram_Code ON dbo.ScholarshipProgram (ProgramCode) WHERE ProgramCode IS NOT NULL;

-- [MỚI] Khoa được nhận học bổng ('KHMT & KTPM')
CREATE TABLE dbo.ScholarshipEligibleFaculty (
    ProgramID  INT NOT NULL CONSTRAINT FK_ScholarshipEligibleFaculty_Program REFERENCES dbo.ScholarshipProgram(ProgramID) ON DELETE CASCADE,
    FacultyID  INT NOT NULL CONSTRAINT FK_ScholarshipEligibleFaculty_Faculty REFERENCES dbo.Faculty(FacultyID),
    CONSTRAINT PK_ScholarshipEligibleFaculty PRIMARY KEY (ProgramID, FacultyID)
);

-- [MỚI] Hồ sơ ứng tuyển học bổng / đề xuất xin quỹ
--        SV "Ứng tuyển", tab "Đã ứng tuyển"; GV "Đề cử SV", "Nộp đề xuất" (quỹ tài trợ đề tài)
CREATE TABLE dbo.ScholarshipApplication (
    ApplicationID          INT IDENTITY(1,1) CONSTRAINT PK_ScholarshipApplication PRIMARY KEY,
    ProgramID              INT NOT NULL CONSTRAINT FK_ScholarshipApplication_Program REFERENCES dbo.ScholarshipProgram(ProgramID),
    StudentID              INT NULL CONSTRAINT FK_ScholarshipApplication_Student REFERENCES dbo.StudentProfile(StudentID),
    TeamID                 INT NULL CONSTRAINT FK_ScholarshipApplication_Team REFERENCES dbo.StudentTeam(TeamID),
    LecturerID             INT NULL CONSTRAINT FK_ScholarshipApplication_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),   -- GV xin quỹ đề tài
    NominatedByLecturerID  INT NULL CONSTRAINT FK_ScholarshipApplication_Nominator REFERENCES dbo.LecturerProfile(LecturerID),  -- GV đề cử SV
    ProposalTitle          NVARCHAR(255) NULL,
    AttachmentURL          VARCHAR(255)  NULL,
    Message                NVARCHAR(MAX) NULL,
    Status                 VARCHAR(20) NOT NULL CONSTRAINT DF_ScholarshipApplication_Status DEFAULT 'Submitted',
    AppliedAt              DATETIME2(0) NOT NULL CONSTRAINT DF_ScholarshipApplication_AppliedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ScholarshipApplication_Applicant CHECK (StudentID IS NOT NULL OR TeamID IS NOT NULL OR LecturerID IS NOT NULL),
    CONSTRAINT CK_ScholarshipApplication_Status    CHECK (Status IN ('Submitted','Under_Review','Awarded','Rejected','Withdrawn'))
);
CREATE UNIQUE INDEX UX_ScholarshipApplication_Student ON dbo.ScholarshipApplication (ProgramID, StudentID) WHERE StudentID IS NOT NULL;
GO

/* =====================================================================
   NHÓM 7: TUYỂN THÀNH VIÊN NỘI BỘ NHÓM (SV – SV)
   ===================================================================== */

-- 17. [PDF] TeamRecruitment (+ tiêu đề, số slot, đề tài gắn kèm, lĩnh vực, hạn)
CREATE TABLE dbo.TeamRecruitment (
    RecruitID            INT IDENTITY(1,1) CONSTRAINT PK_TeamRecruitment PRIMARY KEY,
    TeamID               INT NOT NULL CONSTRAINT FK_TeamRecruitment_Team REFERENCES dbo.StudentTeam(TeamID) ON DELETE CASCADE,
    Title                NVARCHAR(255) NOT NULL,     -- 'Cần 1 bạn mảng AI & Edge Computing'
    Requirement          NVARCHAR(MAX) NULL,         -- [PDF]
    Slots                TINYINT NOT NULL CONSTRAINT DF_TeamRecruitment_Slots DEFAULT 1,
    RelatedResourceID    INT NULL CONSTRAINT FK_TeamRecruitment_Resource REFERENCES dbo.AcademicResource(ResourceID),  -- "Gắn với đề tài"
    FieldID              INT NULL CONSTRAINT FK_TeamRecruitment_Field REFERENCES dbo.Field(FieldID),
    IsInterdisciplinary  BIT NOT NULL CONSTRAINT DF_TeamRecruitment_Inter DEFAULT 0,
    Deadline             DATE NULL,
    Status               VARCHAR(20) NOT NULL CONSTRAINT DF_TeamRecruitment_Status DEFAULT 'Open',
    CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_TeamRecruitment_CreatedAt DEFAULT SYSDATETIME(),
    -- PDF: Open / Closed; màn có thêm "Đã đóng (Đủ chỉ tiêu)"
    CONSTRAINT CK_TeamRecruitment_Status CHECK (Status IN ('Open','Filled','Closed')),
    CONSTRAINT CK_TeamRecruitment_Slots  CHECK (Slots >= 1)
);

CREATE TABLE dbo.RecruitmentSkill (
    RecruitID  INT NOT NULL CONSTRAINT FK_RecruitmentSkill_Recruit REFERENCES dbo.TeamRecruitment(RecruitID) ON DELETE CASCADE,
    SkillID    INT NOT NULL CONSTRAINT FK_RecruitmentSkill_Skill REFERENCES dbo.Skill(SkillID),
    CONSTRAINT PK_RecruitmentSkill PRIMARY KEY (RecruitID, SkillID)
);

-- 18. [PDF] RecruitmentApplication (+ thời điểm nộp / phản hồi; mỗi SV nộp một lần cho mỗi tin)
CREATE TABLE dbo.RecruitmentApplication (
    ApplyID      INT IDENTITY(1,1) CONSTRAINT PK_RecruitmentApplication PRIMARY KEY,
    RecruitID    INT NOT NULL CONSTRAINT FK_RecruitmentApplication_Recruit REFERENCES dbo.TeamRecruitment(RecruitID) ON DELETE CASCADE,
    StudentID    INT NOT NULL CONSTRAINT FK_RecruitmentApplication_Student REFERENCES dbo.StudentProfile(StudentID),
    Message      NVARCHAR(MAX) NULL,       -- "Thư ngỏ từ sinh viên"
    Status       VARCHAR(20) NOT NULL CONSTRAINT DF_RecruitmentApplication_Status DEFAULT 'Pending',
    AppliedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_RecruitmentApplication_AppliedAt DEFAULT SYSDATETIME(),
    RespondedAt  DATETIME2(0) NULL,
    CONSTRAINT UQ_RecruitmentApplication UNIQUE (RecruitID, StudentID),
    CONSTRAINT CK_RecruitmentApplication_Status CHECK (Status IN ('Pending','Accepted','Rejected','Withdrawn'))
);

-- 19. [PDF] TeamAchievement (sửa chính tả "TeamAchiement"; + loại, mã chứng nhận, DOI)
CREATE TABLE dbo.TeamAchievement (
    AchievementID    INT IDENTITY(1,1) CONSTRAINT PK_TeamAchievement PRIMARY KEY,
    TeamID           INT NOT NULL CONSTRAINT FK_TeamAchievement_Team REFERENCES dbo.StudentTeam(TeamID) ON DELETE CASCADE,
    Title            NVARCHAR(255) NOT NULL,   -- tên giải thưởng / chứng chỉ
    Category         NVARCHAR(50)  NULL,       -- (+) 'Giải thưởng', 'Bài báo', 'Bằng công nghệ'
    IssuedBy         NVARCHAR(150) NULL,
    IssuedDate       DATE NULL,
    CertificateCode  VARCHAR(50)  NULL,        -- (+) 'UIT-NCKH-01'
    DOI              VARCHAR(100) NULL,        -- (+)
    EvidenceURL      VARCHAR(255) NULL
);
GO

/* =====================================================================
   NHÓM 8: CỐ VẤN & THẨM ĐỊNH HỌC THUẬT (SV – GV)
   SV "Danh bạ giảng viên cố vấn"; GV "Yêu cầu hướng dẫn", "Hàng chờ thẩm định",
   "Chi tiết thẩm định", "Lịch sử thẩm định"
   ===================================================================== */

-- 20. [PDF] AdvisorRequest (+ hình thức cá nhân/nhóm, đề tài đề xuất, thư ngỏ, hẹn gặp)
CREATE TABLE dbo.AdvisorRequest (
    RequestID            INT IDENTITY(1,1) CONSTRAINT PK_AdvisorRequest PRIMARY KEY,
    RequestType          VARCHAR(10) NOT NULL CONSTRAINT DF_AdvisorRequest_Type DEFAULT 'Team',   -- "Cá nhân (1 SV)" / "Theo nhóm NCKH"
    StudentID            INT NOT NULL CONSTRAINT FK_AdvisorRequest_Student REFERENCES dbo.StudentProfile(StudentID),   -- (+) người gửi
    TeamID               INT NULL CONSTRAINT FK_AdvisorRequest_Team REFERENCES dbo.StudentTeam(TeamID),        -- [PDF]; NULL khi xin cá nhân
    LecturerID           INT NOT NULL CONSTRAINT FK_AdvisorRequest_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),
    AttachedResourceID   INT NULL CONSTRAINT FK_AdvisorRequest_Resource REFERENCES dbo.AcademicResource(ResourceID),
    ProposedTitle        NVARCHAR(255) NOT NULL,     -- (+) "Tên đề tài / Hướng nghiên cứu đề xuất"
    ProposedDescription  NVARCHAR(MAX) NULL,
    FieldID              INT NULL CONSTRAINT FK_AdvisorRequest_Field REFERENCES dbo.Field(FieldID),
    CoverLetter          NVARCHAR(500) NULL,         -- (+) "Thư ngỏ" tối đa 500 ký tự
    Status               VARCHAR(20) NOT NULL CONSTRAINT DF_AdvisorRequest_Status DEFAULT 'Pending',
    MeetingAt            DATETIME2(0) NULL,          -- (+) "Hẹn gặp phỏng vấn"
    ResponseNote         NVARCHAR(MAX) NULL,
    CreatedAt            DATETIME2(0) NOT NULL CONSTRAINT DF_AdvisorRequest_CreatedAt DEFAULT SYSDATETIME(),
    RespondedAt          DATETIME2(0) NULL,
    CONSTRAINT CK_AdvisorRequest_Type   CHECK (RequestType IN ('Individual','Team')),
    CONSTRAINT CK_AdvisorRequest_Team   CHECK (RequestType = 'Individual' OR TeamID IS NOT NULL),
    -- PDF: Pending / Accepted / Rejected; màn GV có thêm "Đã hẹn gặp"
    CONSTRAINT CK_AdvisorRequest_Status CHECK (Status IN ('Pending','Meeting_Scheduled','Accepted','Rejected','Cancelled'))
);
CREATE INDEX IX_AdvisorRequest_Lecturer ON dbo.AdvisorRequest (LecturerID, Status, CreatedAt DESC);

-- [MỚI] Tệp đính kèm yêu cầu hướng dẫn ("De_cuong_chi_tiet_EdgeVision.pdf · Đề cương NCKH")
CREATE TABLE dbo.AdvisorRequestFile (
    FileID      INT IDENTITY(1,1) CONSTRAINT PK_AdvisorRequestFile PRIMARY KEY,
    RequestID   INT NOT NULL CONSTRAINT FK_AdvisorRequestFile_Request REFERENCES dbo.AdvisorRequest(RequestID) ON DELETE CASCADE,
    FileName    NVARCHAR(255) NOT NULL,
    FileURL     VARCHAR(255)  NOT NULL,
    FileSizeKB  INT NULL,
    Label       NVARCHAR(100) NULL,       -- 'Đề cương NCKH', 'Hồ sơ năng lực'
    CONSTRAINT CK_AdvisorRequestFile_Size CHECK (FileSizeKB <= 25600)   -- tối đa 25MB
);

-- [MỚI] Các lần nộp tài nguyên để thẩm định ("Lần nộp 2", "So sánh với lần nộp trước", phản hồi của nhóm)
CREATE TABLE dbo.ResourceSubmission (
    SubmissionID          INT IDENTITY(1,1) CONSTRAINT PK_ResourceSubmission PRIMARY KEY,
    ResourceID            INT NOT NULL CONSTRAINT FK_ResourceSubmission_Resource REFERENCES dbo.AcademicResource(ResourceID) ON DELETE CASCADE,
    SubmissionNo          TINYINT NOT NULL,
    FileURL               VARCHAR(255) NOT NULL,
    PageCount             SMALLINT NULL,
    FileSizeKB            INT NULL,
    SubmittedByAccountID  INT NOT NULL CONSTRAINT FK_ResourceSubmission_Submitter REFERENCES dbo.Account(AccountID),
    ResponseNote          NVARCHAR(MAX) NULL,   -- phản hồi của nhóm cho góp ý lần trước
    SubmittedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_ResourceSubmission_SubmittedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_ResourceSubmission UNIQUE (ResourceID, SubmissionNo),
    CONSTRAINT CK_ResourceSubmission_No CHECK (SubmissionNo >= 1)
);

-- [MỚI] Phân công thẩm định: hàng chờ, hạn thẩm định, quá hạn, "Chuyển GV khác"
CREATE TABLE dbo.ReviewAssignment (
    AssignmentID  INT IDENTITY(1,1) CONSTRAINT PK_ReviewAssignment PRIMARY KEY,
    SubmissionID  INT NOT NULL CONSTRAINT FK_ReviewAssignment_Submission REFERENCES dbo.ResourceSubmission(SubmissionID) ON DELETE CASCADE,
    LecturerID    INT NOT NULL CONSTRAINT FK_ReviewAssignment_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),
    AssignedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_ReviewAssignment_AssignedAt DEFAULT SYSDATETIME(),
    DueDate       DATE NOT NULL,            -- mặc định 7 ngày làm việc kể từ khi nhận hồ sơ
    Status        VARCHAR(20) NOT NULL CONSTRAINT DF_ReviewAssignment_Status DEFAULT 'Pending',
    TransferNote  NVARCHAR(255) NULL,       -- lý do chuyển cho GV khác
    CONSTRAINT UQ_ReviewAssignment UNIQUE (SubmissionID, LecturerID),
    CONSTRAINT CK_ReviewAssignment_Status CHECK (Status IN ('Pending','In_Review','Completed','Transferred'))
);
CREATE INDEX IX_ReviewAssignment_Queue ON dbo.ReviewAssignment (LecturerID, Status, DueDate);

-- 21. [PDF] AcademicReviewLog (+ lần nộp, điểm, cho phép công bố, TRL được cấp)
CREATE TABLE dbo.AcademicReviewLog (
    LogID         INT IDENTITY(1,1) CONSTRAINT PK_AcademicReviewLog PRIMARY KEY,
    ResourceID    INT NOT NULL CONSTRAINT FK_AcademicReviewLog_Resource REFERENCES dbo.AcademicResource(ResourceID),
    SubmissionID  INT NULL CONSTRAINT FK_AcademicReviewLog_Submission REFERENCES dbo.ResourceSubmission(SubmissionID),  -- (+)
    LecturerID    INT NOT NULL CONSTRAINT FK_AcademicReviewLog_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),
    Decision      VARCHAR(20) NOT NULL,
    Comment       NVARCHAR(MAX) NULL,       -- "Nhận xét chung"
    TotalScore    DECIMAL(5,2) NULL,        -- (+) '88 / 100'
    AllowPublish  BIT NOT NULL CONSTRAINT DF_AcademicReviewLog_Publish DEFAULT 0,  -- (+) "Cho phép công bố lên Kho tài liệu"
    GrantedTRL    TINYINT NULL,             -- (+) TRL được cấp khi duyệt
    ReviewDate    DATETIME2(0) NOT NULL CONSTRAINT DF_AcademicReviewLog_Date DEFAULT SYSDATETIME(),
    CONSTRAINT CK_AcademicReviewLog_Decision CHECK (Decision IN ('Approved','Rejected','Revision_Needed')),
    CONSTRAINT CK_AcademicReviewLog_Score    CHECK (TotalScore BETWEEN 0 AND 100),
    CONSTRAINT CK_AcademicReviewLog_TRL      CHECK (GrantedTRL BETWEEN 1 AND 9),
    CONSTRAINT CK_AcademicReviewLog_Publish  CHECK (Decision = 'Approved' OR AllowPublish = 0)
);
CREATE INDEX IX_AcademicReviewLog_Lecturer ON dbo.AcademicReviewLog (LecturerID, ReviewDate DESC);

-- [MỚI] Tiêu chí phiếu thẩm định (mẫu BM-TĐ-04) và kết quả từng tiêu chí ("4 Đạt · 1 Cần sửa")
CREATE TABLE dbo.ReviewCriterion (
    CriterionID  INT IDENTITY(1,1) CONSTRAINT PK_ReviewCriterion PRIMARY KEY,
    FormCode     NVARCHAR(20)  NOT NULL,
    Name         NVARCHAR(150) NOT NULL,
    SortOrder    TINYINT NOT NULL CONSTRAINT DF_ReviewCriterion_Sort DEFAULT 0,
    CONSTRAINT UQ_ReviewCriterion UNIQUE (FormCode, Name)
);
CREATE TABLE dbo.ReviewCriterionResult (
    LogID        INT NOT NULL CONSTRAINT FK_ReviewCriterionResult_Log REFERENCES dbo.AcademicReviewLog(LogID) ON DELETE CASCADE,
    CriterionID  INT NOT NULL CONSTRAINT FK_ReviewCriterionResult_Criterion REFERENCES dbo.ReviewCriterion(CriterionID),
    Result       VARCHAR(20) NOT NULL,     -- "Đạt" / "Cần sửa" / "Không đạt"
    CONSTRAINT PK_ReviewCriterionResult PRIMARY KEY (LogID, CriterionID),
    CONSTRAINT CK_ReviewCriterionResult CHECK (Result IN ('Pass','Needs_Revision','Fail'))
);

-- [MỚI] Ghi chú của GV trên từng trang tài liệu (khối "Ghi chú trên tài liệu")
CREATE TABLE dbo.ReviewNote (
    NoteID        INT IDENTITY(1,1) CONSTRAINT PK_ReviewNote PRIMARY KEY,
    SubmissionID  INT NOT NULL CONSTRAINT FK_ReviewNote_Submission REFERENCES dbo.ResourceSubmission(SubmissionID) ON DELETE CASCADE,
    LecturerID    INT NOT NULL CONSTRAINT FK_ReviewNote_Lecturer REFERENCES dbo.LecturerProfile(LecturerID),
    PageNo        SMALLINT NULL,            -- NULL = "Toàn bài"
    Content       NVARCHAR(1000) NOT NULL,
    CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_ReviewNote_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ReviewNote_Page CHECK (PageNo >= 1)
);

-- 22. [PDF] ProjectLineage (kế thừa đồ án) – chưa có màn trên index3/index4
CREATE TABLE dbo.ProjectLineage (
    LineageID          INT IDENTITY(1,1) CONSTRAINT PK_ProjectLineage PRIMARY KEY,
    ParentResourceID   INT NOT NULL CONSTRAINT FK_ProjectLineage_Parent REFERENCES dbo.AcademicResource(ResourceID),
    ChildResourceID    INT NOT NULL CONSTRAINT FK_ProjectLineage_Child REFERENCES dbo.AcademicResource(ResourceID),
    ContributionNote   NVARCHAR(MAX) NULL,
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_ProjectLineage_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_ProjectLineage UNIQUE (ParentResourceID, ChildResourceID),
    CONSTRAINT CK_ProjectLineage_Self CHECK (ParentResourceID <> ChildResourceID)
);
GO

/* =====================================================================
   NHÓM 9: ĐỀ TÀI ĐANG HƯỚNG DẪN [MỚI]
   Màn GV "Đề tài & Hướng dẫn": mã đề tài, học kỳ, mốc tiến độ có điểm, lịch họp.
   PDF chưa có chỗ lưu giai đoạn "sau khi GV nhận hướng dẫn".
   ===================================================================== */

CREATE TABLE dbo.ResearchProject (
    ProjectID                INT IDENTITY(1,1) CONSTRAINT PK_ResearchProject PRIMARY KEY,
    ProjectCode              VARCHAR(30)   NULL,    -- 'KLTN-2026-042', 'NCKH-SV-2026-118'
    Title                    NVARCHAR(255) NOT NULL,
    ProjectType              VARCHAR(20)   NOT NULL,
    ProjectLevel             NVARCHAR(100) NULL,    -- 'Cấp Trường trọng điểm'
    SupervisorID             INT NOT NULL CONSTRAINT FK_ResearchProject_Supervisor REFERENCES dbo.LecturerProfile(LecturerID),
    IsPrincipalInvestigator  BIT NOT NULL CONSTRAINT DF_ResearchProject_PI DEFAULT 0,  -- GV là chủ nhiệm (tab "Đề tài chủ nhiệm")
    TeamID                   INT NULL CONSTRAINT FK_ResearchProject_Team REFERENCES dbo.StudentTeam(TeamID),
    TopicID                  INT NULL CONSTRAINT FK_ResearchProject_Topic REFERENCES dbo.LabTopic(TopicID),             -- nguồn: tin tuyển của GV
    AdvisorRequestID         INT NULL CONSTRAINT FK_ResearchProject_Request REFERENCES dbo.AdvisorRequest(RequestID),   -- nguồn: yêu cầu hướng dẫn
    ResourceID               INT NULL CONSTRAINT FK_ResearchProject_Resource REFERENCES dbo.AcademicResource(ResourceID), -- sản phẩm trên Kho tài liệu
    PartnerName              NVARCHAR(255) NULL,    -- 'Hợp tác: Viện IC-Design ĐHQG'
    Semester                 VARCHAR(20)   NULL,    -- 'HK1 2026-2027'
    StartDate                DATE NULL,
    ExpectedEndDate          DATE NULL,             -- "Dự kiến nghiệm thu"
    ProgressStatus           VARCHAR(20) NOT NULL CONSTRAINT DF_ResearchProject_Progress DEFAULT 'On_Track',
    CreatedAt                DATETIME2(0) NOT NULL CONSTRAINT DF_ResearchProject_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_ResearchProject_Type     CHECK (ProjectType IN ('Thesis','Student_Research','Major_Project','Lab_RD')),
    -- "Đúng tiến độ" / "Cần đôn đốc" / "Trễ hạn" / "Chờ duyệt mốc" / "Đã hoàn thành"
    CONSTRAINT CK_ResearchProject_Progress CHECK (ProgressStatus IN
        ('On_Track','Need_Attention','Overdue','Awaiting_Approval','Completed','Cancelled')),
    CONSTRAINT CK_ResearchProject_Dates    CHECK (ExpectedEndDate IS NULL OR StartDate IS NULL OR ExpectedEndDate >= StartDate)
);
CREATE UNIQUE INDEX UX_ResearchProject_Code ON dbo.ResearchProject (ProjectCode) WHERE ProjectCode IS NOT NULL;
CREATE INDEX IX_ResearchProject_Supervisor ON dbo.ResearchProject (SupervisorID, ProgressStatus);

-- Mốc tiến độ: Đề cương → Giữa kỳ → Báo cáo cuối → Bảo vệ
CREATE TABLE dbo.ProjectMilestone (
    MilestoneID  INT IDENTITY(1,1) CONSTRAINT PK_ProjectMilestone PRIMARY KEY,
    ProjectID    INT NOT NULL CONSTRAINT FK_ProjectMilestone_Project REFERENCES dbo.ResearchProject(ProjectID) ON DELETE CASCADE,
    Name         NVARCHAR(100) NOT NULL,
    SortOrder    TINYINT NOT NULL CONSTRAINT DF_ProjectMilestone_Sort DEFAULT 0,
    DueDate      DATE NULL,
    SubmittedAt  DATETIME2(0) NULL,
    Status       VARCHAR(20) NOT NULL CONSTRAINT DF_ProjectMilestone_Status DEFAULT 'Not_Open',
    Score        DECIMAL(4,2) NULL,         -- "Đạt 8.5/10"
    Feedback     NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_ProjectMilestone UNIQUE (ProjectID, Name),
    CONSTRAINT CK_ProjectMilestone_Status CHECK (Status IN ('Not_Open','In_Progress','Submitted','Approved','Late')),
    CONSTRAINT CK_ProjectMilestone_Score  CHECK (Score BETWEEN 0 AND 10)
);

-- Lịch họp nhóm ("Họp tiếp: Thứ 5, 22/10 · 14:00 · Phòng Lab E8.12", "Họp đột xuất")
CREATE TABLE dbo.ProjectMeeting (
    MeetingID   INT IDENTITY(1,1) CONSTRAINT PK_ProjectMeeting PRIMARY KEY,
    ProjectID   INT NOT NULL CONSTRAINT FK_ProjectMeeting_Project REFERENCES dbo.ResearchProject(ProjectID) ON DELETE CASCADE,
    StartAt     DATETIME2(0) NOT NULL,
    Location    NVARCHAR(255) NULL,
    MeetingURL  VARCHAR(255)  NULL,          -- họp trực tuyến (Google Meet...)
    Agenda      NVARCHAR(255) NULL,
    IsAdHoc     BIT NOT NULL CONSTRAINT DF_ProjectMeeting_AdHoc DEFAULT 0
);
CREATE INDEX IX_ProjectMeeting_Next ON dbo.ProjectMeeting (ProjectID, StartAt);
GO

/* =====================================================================
   NHÓM 10: CÁ NHÂN HOÁ & HỆ THỐNG [MỚI]
   Kho tài nguyên đã lưu, nút lưu (bookmark), chuông thông báo, cài đặt thông báo, tin tức
   ===================================================================== */

-- Tài nguyên đã lưu: ghi chú riêng + "Đọc sau" (SV 12 / GV 14)
CREATE TABLE dbo.SavedResource (
    AccountID    INT NOT NULL CONSTRAINT FK_SavedResource_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    ResourceID   INT NOT NULL CONSTRAINT FK_SavedResource_Resource REFERENCES dbo.AcademicResource(ResourceID),
    Note         NVARCHAR(500) NULL,
    IsReadLater  BIT NOT NULL CONSTRAINT DF_SavedResource_ReadLater DEFAULT 0,
    SavedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_SavedResource_SavedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_SavedResource PRIMARY KEY (AccountID, ResourceID)
);

-- Bộ sưu tập ("Đồ án Computer Vision", "Tài liệu giảng dạy"...) – một tài nguyên có thể ở nhiều bộ
CREATE TABLE dbo.Collection (
    CollectionID  INT IDENTITY(1,1) CONSTRAINT PK_Collection PRIMARY KEY,
    AccountID     INT NOT NULL CONSTRAINT FK_Collection_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    Name          NVARCHAR(100) NOT NULL,
    CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Collection_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Collection_Name UNIQUE (AccountID, Name)
);
CREATE TABLE dbo.CollectionItem (
    CollectionID  INT NOT NULL CONSTRAINT FK_CollectionItem_Collection REFERENCES dbo.Collection(CollectionID) ON DELETE CASCADE,
    ResourceID    INT NOT NULL CONSTRAINT FK_CollectionItem_Resource REFERENCES dbo.AcademicResource(ResourceID),
    AddedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_CollectionItem_AddedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_CollectionItem PRIMARY KEY (CollectionID, ResourceID)
);

-- Lưu cơ hội: bài toán DN, học bổng / quỹ, đề tài Lab, tin tuyển nhóm ("Đề tài đã lưu", nút bookmark)
CREATE TABLE dbo.SavedOpportunity (
    SavedID    INT IDENTITY(1,1) CONSTRAINT PK_SavedOpportunity PRIMARY KEY,
    AccountID  INT NOT NULL CONSTRAINT FK_SavedOpportunity_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    ProblemID  INT NULL CONSTRAINT FK_SavedOpportunity_Problem REFERENCES dbo.BusinessProblem(ProblemID),
    ProgramID  INT NULL CONSTRAINT FK_SavedOpportunity_Program REFERENCES dbo.ScholarshipProgram(ProgramID),
    TopicID    INT NULL CONSTRAINT FK_SavedOpportunity_Topic REFERENCES dbo.LabTopic(TopicID),
    RecruitID  INT NULL CONSTRAINT FK_SavedOpportunity_Recruit REFERENCES dbo.TeamRecruitment(RecruitID),
    SavedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_SavedOpportunity_SavedAt DEFAULT SYSDATETIME(),
    -- Mỗi dòng lưu đúng một cơ hội
    CONSTRAINT CK_SavedOpportunity_One CHECK (
          CASE WHEN ProblemID IS NULL THEN 0 ELSE 1 END
        + CASE WHEN ProgramID IS NULL THEN 0 ELSE 1 END
        + CASE WHEN TopicID   IS NULL THEN 0 ELSE 1 END
        + CASE WHEN RecruitID IS NULL THEN 0 ELSE 1 END = 1)
);
CREATE UNIQUE INDEX UX_SavedOpportunity_Problem ON dbo.SavedOpportunity (AccountID, ProblemID) WHERE ProblemID IS NOT NULL;
CREATE UNIQUE INDEX UX_SavedOpportunity_Program ON dbo.SavedOpportunity (AccountID, ProgramID) WHERE ProgramID IS NOT NULL;
CREATE UNIQUE INDEX UX_SavedOpportunity_Topic   ON dbo.SavedOpportunity (AccountID, TopicID)   WHERE TopicID   IS NOT NULL;
CREATE UNIQUE INDEX UX_SavedOpportunity_Recruit ON dbo.SavedOpportunity (AccountID, RecruitID) WHERE RecruitID IS NOT NULL;

-- Thông báo (chuông trên header). Category trùng 4 nhóm trong "Cài đặt tài khoản → Thông báo":
-- Connection = Kết nối, Review = Thẩm định, Team = Nhóm, System = Hệ thống
CREATE TABLE dbo.Notification (
    NotificationID  BIGINT IDENTITY(1,1) CONSTRAINT PK_Notification PRIMARY KEY,
    AccountID       INT NOT NULL CONSTRAINT FK_Notification_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    Category        VARCHAR(20)    NOT NULL,
    Title           NVARCHAR(255)  NOT NULL,
    Content         NVARCHAR(1000) NULL,
    LinkURL         VARCHAR(255)   NULL,
    IsRead          BIT NOT NULL CONSTRAINT DF_Notification_IsRead DEFAULT 0,
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Notification_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT CK_Notification_Category CHECK (Category IN ('Connection','Review','Team','System'))
);
CREATE INDEX IX_Notification_Unread ON dbo.Notification (AccountID, IsRead, CreatedAt DESC);

-- Công tắc bật/tắt từng loại thông báo
CREATE TABLE dbo.NotificationSetting (
    AccountID  INT NOT NULL CONSTRAINT FK_NotificationSetting_Account REFERENCES dbo.Account(AccountID) ON DELETE CASCADE,
    Category   VARCHAR(20) NOT NULL,
    IsEnabled  BIT NOT NULL CONSTRAINT DF_NotificationSetting_Enabled DEFAULT 1,
    CONSTRAINT PK_NotificationSetting PRIMARY KEY (AccountID, Category),
    CONSTRAINT CK_NotificationSetting_Category CHECK (Category IN ('Connection','Review','Team','System'))
);

-- Tin tức & cơ hội nổi bật (trang chủ SV / GV)
CREATE TABLE dbo.News (
    NewsID           INT IDENTITY(1,1) CONSTRAINT PK_News PRIMARY KEY,
    Category         NVARCHAR(100) NOT NULL,   -- 'VI MẠCH & BÁN DẪN'
    Title            NVARCHAR(255) NOT NULL,
    Summary          NVARCHAR(500) NULL,
    Content          NVARCHAR(MAX) NULL,
    ThumbnailURL     VARCHAR(255)  NULL,
    AuthorAccountID  INT NULL CONSTRAINT FK_News_Author REFERENCES dbo.Account(AccountID),
    ViewCount        INT NOT NULL CONSTRAINT DF_News_Views DEFAULT 0,
    CommentCount     INT NOT NULL CONSTRAINT DF_News_Comments DEFAULT 0,
    IsFeatured       BIT NOT NULL CONSTRAINT DF_News_Featured DEFAULT 0,
    PublishedAt      DATETIME2(0) NULL
);
CREATE INDEX IX_News_Published ON dbo.News (PublishedAt DESC);
GO

/* =====================================================================
   VIEW phục vụ các số liệu hiển thị trên giao diện
   ===================================================================== */

-- Suất hướng dẫn của GV: "Còn 2/5 suất" (danh bạ GV), "Suất hướng dẫn: 3/5 đã nhận" (GV 05)
CREATE VIEW dbo.vw_LecturerAdvisingSlot AS
SELECT  l.LecturerID,
        l.FullName,
        l.IsAcceptingAdvisees,
        l.MaxAdvisees,
        COUNT(p.ProjectID) AS ActiveProjects,
        CASE WHEN l.MaxAdvisees > COUNT(p.ProjectID)
             THEN l.MaxAdvisees - COUNT(p.ProjectID) ELSE 0 END AS RemainingSlots
FROM dbo.LecturerProfile AS l
LEFT JOIN dbo.ResearchProject AS p
       ON p.SupervisorID = l.LecturerID
      AND p.IsPrincipalInvestigator = 0
      AND p.ProgressStatus NOT IN ('Completed','Cancelled')
GROUP BY l.LecturerID, l.FullName, l.IsAcceptingAdvisees, l.MaxAdvisees;
GO

-- "Việc cần xử lý" trên trang chủ GV: yêu cầu hướng dẫn, đề tài chờ thẩm định, đơn xin vào Lab
CREATE VIEW dbo.vw_LecturerPendingTask AS
SELECT  l.LecturerID,
        (SELECT COUNT(*) FROM dbo.AdvisorRequest AS r
          WHERE r.LecturerID = l.LecturerID AND r.Status = 'Pending') AS PendingAdvisorRequests,
        (SELECT COUNT(*) FROM dbo.ReviewAssignment AS a
          WHERE a.LecturerID = l.LecturerID AND a.Status IN ('Pending','In_Review')) AS PendingReviews,
        (SELECT COUNT(*) FROM dbo.LabApplication AS ap
           JOIN dbo.LabTopic AS t ON t.TopicID = ap.TopicID
          WHERE t.LecturerID = l.LecturerID AND ap.Status = 'Pending') AS PendingLabApplications
FROM dbo.LecturerProfile AS l;
GO

-- Kho tài liệu (SV 02 / GV 09): tài nguyên đã công bố kèm tên lĩnh vực, khoa, nhóm, GVHD
CREATE VIEW dbo.vw_ResourceCatalog AS
SELECT  r.ResourceID, r.ResourceCode, r.Type, r.Title, r.Abstract, r.TRLLevel,
        r.ReviewScore, r.InterestCount, r.ViewCount, r.PublishedAt,
        f.Name  AS FieldName,
        fa.Name AS FacultyName,
        lb.Name AS LabName,
        t.TeamName,
        l.AcademicTitle AS LecturerTitle,
        l.FullName      AS LecturerName
FROM dbo.AcademicResource AS r
LEFT JOIN dbo.Field           AS f  ON f.FieldID     = r.FieldID
LEFT JOIN dbo.Faculty         AS fa ON fa.FacultyID  = r.FacultyID
LEFT JOIN dbo.Lab             AS lb ON lb.LabID      = r.LabID
LEFT JOIN dbo.StudentTeam     AS t  ON t.TeamID      = r.OwnerTeamID
LEFT JOIN dbo.LecturerProfile AS l  ON l.LecturerID  = r.LecturerID
WHERE r.Status = 'Published';
GO

/* =====================================================================
   DỮ LIỆU DANH MỤC (lấy đúng các lựa chọn đang hiện trên giao diện)
   ===================================================================== */

INSERT INTO dbo.Faculty (Code, Name) VALUES
    ('KHMT',    N'Khoa Khoa học Máy tính'),
    ('KTMT',    N'Khoa Kỹ thuật Máy tính'),
    ('HTTT',    N'Khoa Hệ thống Thông tin'),
    ('CNPM',    N'Khoa Công nghệ Phần mềm'),
    ('MMT&TT',  N'Khoa Mạng máy tính & Truyền thông'),
    ('KH&KTTT', N'Khoa Khoa học & Kỹ thuật Thông tin');

-- Chuyên ngành ở màn đăng ký bước 2
INSERT INTO dbo.Major (FacultyID, Name)
SELECT f.FacultyID, m.Name
FROM (VALUES
    ('KHMT',    N'Trí tuệ Nhân tạo & Thị giác máy tính'),
    ('KH&KTTT', N'Khoa học Dữ liệu'),
    ('KTMT',    N'Kỹ thuật Phần mềm nhúng'),
    ('MMT&TT',  N'An toàn Thông tin & Mật mã học')
) AS m(FacultyCode, Name)
JOIN dbo.Faculty AS f ON f.Code = m.FacultyCode;

-- 12 lĩnh vực ở dropdown "Lĩnh vực" trên trang chủ
INSERT INTO dbo.Field (Name) VALUES
    (N'Trí tuệ nhân tạo & Học máy'),
    (N'Thị giác máy tính'),
    (N'Xử lý ngôn ngữ tự nhiên'),
    (N'Thiết kế vi mạch & Bán dẫn'),
    (N'Hệ thống nhúng & IoT'),
    (N'An toàn thông tin'),
    (N'Khoa học dữ liệu & Big Data'),
    (N'Robot & Xe tự hành'),
    (N'Mạng & Điện toán đám mây'),
    (N'Blockchain & Fintech'),
    (N'Y tế số & Tin sinh học'),
    (N'Công nghệ phần mềm');

-- Phòng thí nghiệm ở dropdown "Khoa / Lab" trên trang chủ
INSERT INTO dbo.Lab (FacultyID, Name, FocusArea, Room, IsVerified)
SELECT f.FacultyID, x.Name, x.FocusArea, x.Room, 1
FROM (VALUES
    ('KHMT',   N'Lab CV&PR',                        N'Thị giác máy tính & Nhận dạng', N'E4.12'),
    ('KHMT',   N'Lab AI & Xử lý ngôn ngữ',          N'NLP / LLM tiếng Việt',          N'B2.10'),
    ('KTMT',   N'Lab Vi mạch số (IC Design)',       N'RISC-V, FPGA, ASIC',            N'C3.12'),
    ('MMT&TT', N'Lab An toàn thông tin (InSecLab)', N'Pentest, SOC, Malware',         N'A2.05'),
    ('KTMT',   N'Lab Robotics & IoT',               N'ROS2, LiDAR SLAM',              N'E8.2'),
    ('HTTT',   N'Lab Khai phá dữ liệu',             N'Data Mining & Graph',           N'B4.08')
) AS x(FacultyCode, Name, FocusArea, Room)
JOIN dbo.Faculty AS f ON f.Code = x.FacultyCode;

-- 5 tiêu chí của phiếu thẩm định BM-TĐ-04 (màn Chi tiết thẩm định)
INSERT INTO dbo.ReviewCriterion (FormCode, Name, SortOrder) VALUES
    (N'BM-TĐ-04', N'Tính mới & đóng góp',             1),
    (N'BM-TĐ-04', N'Phương pháp nghiên cứu',          2),
    (N'BM-TĐ-04', N'Kết quả thực nghiệm',             3),
    (N'BM-TĐ-04', N'Trình bày & cấu trúc',            4),
    (N'BM-TĐ-04', N'Trích dẫn & tài liệu tham khảo',  5);
GO
