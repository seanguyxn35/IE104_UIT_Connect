# backend/

API server của UIT Connect (Node.js 20.6+, Express 5, Supabase). Đồng thời phục vụ thư mục `frontend/`.

Code chia theo **vai trò → màn hình → chức năng**. Mỗi chức năng có hai file:
`<chức-năng>.routes.js` (kiểm tra đầu vào, gọi service) và `<chức-năng>.service.js` (nghiệp vụ, truy vấn Supabase).
Thư mục màn hình đặt theo số trang trong `frontend/pages/<vai trò>/`; nhiều màn dùng chung một API thì gộp (vd `09-13-bai-toan-rd`).

```
backend/
├── src/
│   ├── server.js                  # khởi động, gắn route, phục vụ frontend/, xử lý lỗi chung
│   ├── config.js                  # đọc biến môi trường
│   ├── db.js                      # kết nối Supabase (secret key – chỉ dùng ở máy chủ)
│   ├── shared/                    # dùng chung mọi vai trò
│   │   ├── authMiddleware.js      # napPhien (đọc phiên), chiChoVaiTro (chặn sai vai trò)
│   │   ├── errors.js              # AppError(status, code, message)
│   │   ├── validation.js          # kiểm tra số nguyên, chuỗi, lịch hẹn
│   │   ├── resourceOwnership.js   # quy tắc SV sở hữu tài nguyên (nhóm đang tham gia / cá nhân)
│   │   └── rdFiles.js             # bucket "rd-files" của bài toán R&D, thời hạn liên kết ký tạm
│   ├── auth/                      # /api/auth – đăng nhập, đăng xuất, quên mật khẩu (auth/01, 02, 07, 08, 14, 15)
│   ├── public/                    # /api/public – trang tổng quan, trang khách (không cần đăng nhập)
│   ├── sv/
│   │   ├── 04-ho-so-nang-luc-cv/
│   │   │   ├── ky-nang.*              # /api/student-skills
│   │   │   ├── anh-dai-dien.*         # /api/student-avatar (Storage "avatars")
│   │   │   ├── che-do-hien-thi.*      # /api/profile-visibility, /mode
│   │   │   ├── lien-ket.*             # /api/student-profile/links (GitHub, LinkedIn)
│   │   │   ├── thanh-tich.*           # /api/student-achievements (Storage "evidence")
│   │   │   ├── cong-trinh-trung-bay.* # /api/student-showcase
│   │   │   ├── cv.*                   # /api/student-cv (gom dữ liệu CV)
│   │   │   └── cv-pdf.service.js      # dựng PDF của CV bằng trình duyệt chạy ẩn
│   │   ├── 05-de-tai-cua-toi/         # de-tai.* – /api/student-projects
│   │   ├── 07-cho-ghep-nhom/          # ung-tuyen-lab.* – /api/lab-applications (R1, R2, R3)
│   │   └── 09-13-bai-toan-rd/         # bai-toan-rd.* – /api/student-rd-problems
│   └── dn/
│       ├── 01-ban-lam-viec/           # ban-lam-viec.* – /api/business-dashboard
│       ├── 08-hop-thu-ket-noi/        # hop-thu.* – /api/business-inbox
│       └── 09-16-dam-phan/            # dam-phan.* – /api/business-negotiations
├── scripts/                       # test:public, test:sv-rd, test:auth, seed:dn-files
├── .env.example                   # mẫu biến môi trường (file .env thật không commit)
└── package.json
```

Chưa có backend: các màn SV khác, DN 02–07 và 10–15 (DN-04/05/14/15 đang lưu tạm ở trình duyệt), toàn bộ GV và Admin.
Thư mục của vai trò / màn hình chỉ tạo khi có code.

**Thêm chức năng mới:** tạo `src/<vai trò>/<số>-<tên-màn>/<chức-năng>.routes.js` và `.service.js`,
rồi gắn route trong `server.js` kèm `chiSv` / `chiDn` (hoặc `chiChoVaiTro(...)`). Code dùng cho nhiều vai trò đặt ở `shared/`.
Service của màn khác được phép import (vd DN-01 dùng hộp thư và đàm phán), nhưng không import file `*.routes.js` của màn khác.

## Chạy

```powershell
cd backend
copy .env.example .env   # lần đầu, rồi điền SUPABASE_URL và SUPABASE_SECRET_KEY
npm install              # lần đầu
npm start                # http://localhost:3000   (npm run dev: tự khởi động lại khi sửa code)
```

## API

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/public/overview` | **Không cần đăng nhập.** Trang tổng quan: `{ stats: { openProblems, inProgressProblems, partners, totalFunding }, problems, partners }`. Chỉ bài Open / In_Progress; không có dữ liệu sinh viên, tệp đính kèm, dữ liệu riêng của người xem. Lưu đệm 60 giây |
| `GET` | `/api/public/problems/:code` | **Không cần đăng nhập.** Chi tiết đề bài (mô tả, mốc, quy mô nhóm...) không có tệp đính kèm → 200; chưa công khai / không có → 404 `PROBLEM_NOT_FOUND`; mã sai → 400 |
| `POST` | `/api/auth/login` | Đăng nhập `{ email, password, remember?, portal: "uit"|"business" }` → 200 `{ user }` + cookie HttpOnly `uitc_session`. 400 `INVALID_INPUT` / `INVALID_EMAIL` (SV phải là MSSV 8 số @gm.uit.edu.vn), 401 `INVALID_CREDENTIALS`, 403 `WRONG_PORTAL` / `ACCOUNT_DISABLED` / `EMAIL_NOT_VERIFIED`, 429 `TOO_MANY_ATTEMPTS` (sai 5 lần / 15 phút) |
| `GET` / `POST` | `/api/auth/me`, `/api/auth/logout` | Người dùng của phiên → 200 `{ user }` / 401 `UNAUTHENTICATED`; đăng xuất → 204 (thu hồi phiên) |
| `POST` | `/api/auth/password-reset/request|verify|confirm` | Quên mật khẩu: gửi mã 6 số (202, gửi lại sau 60 giây, mã in ra log máy chủ vì chưa có dịch vụ email) → xác thực mã (200 `{ resetToken }`, 400 `INVALID_CODE`, 410 `CODE_EXPIRED`) → đặt mật khẩu mới (204, 400 `WEAK_PASSWORD`, 410 `TOKEN_EXPIRED`; thu hồi mọi phiên cũ) |
| `POST` | `/api/lab-applications` | SV (người đăng nhập; `AUTH_MODE=test` không kèm phiên thì dùng `TEST_STUDENT_ID`) ứng tuyển đề tài `{ "topicId": 9001 }` |
| `GET` | `/api/student-skills` | Danh sách kỹ năng trên hồ sơ SV: `{ skills: [{ skillId, name, level, category }] }` |
| `POST` | `/api/student-skills` | Thêm kỹ năng `{ "name", "level": 1-5, "category": "ai"\|"lang"\|"infra" }` → 201; trùng → 409 `ALREADY_EXISTS` |
| `DELETE` | `/api/student-skills/:skillId` | Xóa kỹ năng khỏi hồ sơ → 204; không có → 404 `SKILL_NOT_FOUND` |
| `GET` | `/api/student-avatar` | Ảnh đại diện hiện tại: `{ avatarUrl }` (`null` nếu chưa đặt) |
| `POST` | `/api/student-avatar` | Đổi ảnh: body là nội dung ảnh, `Content-Type: image/jpeg\|png\|webp`, ≤ 2 MB → 200 `{ avatarUrl }`; sai loại → 415, quá lớn → 413 |
| `GET` | `/api/profile-visibility` | Ẩn/công khai từng chỉ số và mục: `{ gpa, drl, projects, education, skills }` (`true` = công khai) |
| `PUT` | `/api/profile-visibility` | Đổi một mục `{ "field": "gpa"\|"drl"\|"projects"\|"education"\|"skills", "isPublic": true\|false }` → 200; sai dữ liệu → 400 `INVALID_INPUT` |
| `GET` | `/api/profile-visibility/mode` | Chế độ hiển thị cả hồ sơ: `{ visibility }` |
| `PUT` | `/api/profile-visibility/mode` | Đổi chế độ `{ "visibility": "Public"\|"Partners_Only"\|"Private" }` → 200; giá trị khác → 400 `INVALID_INPUT` |
| `GET` | `/api/student-profile/links` | Liên kết trên hồ sơ: `{ githubUrl, linkedinUrl }` (`null` = chưa có) |
| `PUT` | `/api/student-profile/links` | Đổi `{ "githubUrl"?, "linkedinUrl"? }` → 200; `null` hoặc `""` để xóa. Chỉ nhận `https` đúng tên miền GitHub / LinkedIn, tối đa 255 ký tự; sai → 400 `INVALID_INPUT` |
| `GET` | `/api/student-cv` | Dữ liệu xem trước CV (hồ sơ, học vấn, kỹ năng, dự án trên CV, kinh nghiệm, giải thưởng, chứng chỉ). Chỉ số và mục đang ẩn không được trả về, tên của chúng nằm ở `hiddenFields`; thành tích bị từ chối không được trả về |
| `GET` | `/api/student-achievements` | Thành tích của SV: `{ achievements: [{ achievementId, category, title, issuedBy, issuedDate, detail, visibility, status, hasEvidence }] }` |
| `POST` | `/api/student-achievements` | Thêm `{ "category": "Award"\|"Publication"\|"Language_Cert"\|"Tech_Cert", "title", "issuedBy", "issuedDate": "YYYY-MM-DD", "detail"?, "visibility"? }` → 201, luôn ở trạng thái `Self_Declared`; sai dữ liệu → 400; trùng tên + tổ chức + ngày → 409 `ALREADY_EXISTS` |
| | | Loại `Publication` (công bố bên ngoài hệ thống) cần `externalUrl` (URL `https://` hoặc mã DOI) hoặc `hasEvidenceFile: true` khi sẽ tải tệp ngay sau đó; thiếu cả hai → 400 `PROOF_REQUIRED`. Phản hồi có `externalUrl`, `missingProof`; mục `missingProof` không lên CV (cần migration 008) |
| `PATCH` | `/api/student-achievements/:id` | Đổi chế độ hiển thị `{ "visibility" }` → 200; không phải mục của mình → 404 `ACHIEVEMENT_NOT_FOUND` |
| `DELETE` | `/api/student-achievements/:id` | Xóa mục và tệp minh chứng → 204; 404 |
| `PUT` | `/api/student-achievements/:id/evidence` | Tải / thay minh chứng: thân là tệp PDF/JPG/PNG ≤ 5 MB → 200; sai loại → 415, quá lớn → 413; mục `Pending`/`Verified` → 409 `ACHIEVEMENT_LOCKED` |
| `GET` | `/api/student-achievements/:id/evidence` | Chuyển hướng 302 tới liên kết ký tạm (60 giây) trong bucket riêng tư `evidence`; chưa có tệp → 404 `EVIDENCE_NOT_FOUND` |
| `POST` | `/api/student-achievements/:id/verification-request` | Gửi xác minh (tùy chọn): `Self_Declared`/`Rejected` → `Pending`; chưa có tệp → 409 `EVIDENCE_REQUIRED`; trạng thái khác → 409 `INVALID_STATUS` |
| `GET` | `/api/student-showcase` | Công trình SV trưng bày trên CV, theo thứ tự: `{ items: [{ resourceId, type, title, venue, trlLevel, reviewerName, reviewedAt, reviewScore, role, highlights, isShownOnCv, displayOrder, eligible, ineligibleReason }] }`. `ineligibleReason`: `NOT_MEMBER` (đã rời nhóm; chỉ còn tên và loại), `NOT_PUBLISHED` (chưa / không còn công khai) hoặc `NOT_REVIEWED` (không có phiếu thẩm định đạt) |
| `GET` | `/api/student-showcase/available` | Công trình chọn được mà chưa chọn: của nhóm SV đang tham gia hoặc tài nguyên cá nhân của SV, trạng thái `Published` và có phiếu thẩm định đạt: `{ resources }` |
| `POST` | `/api/student-showcase` | Thêm `{ "resourceId", "role"?, "highlights"?, "isShownOnCv"? }` → 201; không phải của mình → 404 `RESOURCE_NOT_FOUND`; chưa công khai (kể cả `Approved`) → 409 `NOT_PUBLISHED`; không có phiếu thẩm định đạt → 409 `NOT_REVIEWED`; đã chọn → 409 `ALREADY_EXISTS` |
| `PATCH` | `/api/student-showcase/:resourceId` | Đổi `role`, `highlights`, `isShownOnCv` → 200; đã rời nhóm sở hữu → 403 `NOT_TEAM_MEMBER`; 404 `SHOWCASE_NOT_FOUND` |
| `DELETE` | `/api/student-showcase/:resourceId` | Gỡ khỏi danh sách (giữ nguyên tài nguyên gốc) → 204; 404 `SHOWCASE_NOT_FOUND` |
| `PUT` | `/api/student-showcase/order` | Sắp xếp `{ "resourceIds": [...] }` (đúng đủ các mục đang chọn) → 200 `{ items }`; sai → 400 |
| `GET` | `/api/student-projects` | Đề tài cá nhân của SV và đề tài của nhóm SV đang tham gia (`Project`/`Product`/`Paper`/`Thesis`), mới cập nhật trước: `{ projects: [{ resourceId, type, status, title, abstract, authors, keywords, venue, doi, fieldId, field, team, lecturer, role, hasFile, fileSizeKb, latestReview, canEdit, canDelete, ... }] }`. `role` là vai trò trong nhóm (`Leader`/`Member`); đề tài cá nhân là `Leader` |
| `GET` | `/api/student-projects/options` | Lựa chọn cho biểu mẫu: `{ fields, teams: [{ teamId, name, role }] }` (chỉ nhóm đang hoạt động) |
| `POST` | `/api/student-projects` | Tạo bản nháp `{ "type", "title" (5–255), "teamId"? (bắt buộc với `Paper`), "abstract"?, "authors"?, "keywords"?, "venue"?, "doi"?, "fieldId"?, "sourceCodeUrl"?, "demoUrl"? (https) }` → 201, luôn ở `Draft`; sai dữ liệu → 400 `INVALID_INPUT`; không thuộc nhóm → 403 `NOT_TEAM_MEMBER`; nhóm ngừng hoạt động → 409 `TEAM_INACTIVE` |
| `PATCH` | `/api/student-projects/:id` | Sửa các trường ở trên (trừ `type`, `teamId`; `status` bị bỏ qua) → 200; chỉ khi `Draft`/`Revision_Needed`, ngoài ra → 409 `PROJECT_LOCKED`; không được xem → 404 `PROJECT_NOT_FOUND` |
| `PUT` | `/api/student-projects/:id/file` | Thân yêu cầu là tệp PDF (`Content-Type: application/pdf`) ≤ 10 MB → 200; 404; 409 `PROJECT_LOCKED`; 413 `FILE_TOO_LARGE`; 415 `UNSUPPORTED_TYPE`; mạng quá chậm → 504 `UPLOAD_TIMEOUT` (máy chủ chờ kho tối đa 180 giây) |
| `GET` | `/api/student-projects/:id/file` | 302 sang đường dẫn ký có hạn 60 giây (thành viên nhóm); 404 `PROJECT_NOT_FOUND` / `FILE_NOT_FOUND` |
| `DELETE` | `/api/student-projects/:id` | Leader xóa bản nháp (kèm tệp) → 204; Member → 403 `NOT_TEAM_LEADER`; không được xem → 404; không còn là bản nháp → 409 `NOT_DRAFT` |
| `GET` | `/api/student-cv/pdf` | Tải CV dạng tệp PDF A4, giống bản xem trước (cùng quy tắc ẩn / riêng tư) → 200 `application/pdf`; đang tạo quá nhiều tệp → 429 `PDF_BUSY`; máy chủ thiếu thư viện hoặc trình duyệt → 503 `PDF_UNAVAILABLE` |
| `GET` | `/api/student-rd-problems` | Bài toán R&D đã được duyệt công khai (Open / In_Progress) cho SV-09: `{ problems: [{ id, code, title, summary, type, fieldName, status, isOpen, funding, fundingMin, deadline, acceptedPartners, skills, business, saved, myProposal, fitScore }], saved: [problemId] }` |
| `GET` | `/api/student-rd-problems/:code` | Chi tiết cho SV-13 (thêm mô tả, quy mô nhóm, TRL, sản phẩm, NDA, mốc, tệp đề bài, proposal của tôi, nhóm & GV để chọn) → 200; chưa công khai / không có → 404 `PROBLEM_NOT_FOUND` |
| `PUT` / `DELETE` | `/api/student-rd-problems/:code/saved` | Lưu → 200 `{ saved: true }` (lưu lại vẫn 200) / bỏ lưu → 204; 404 |
| `POST` | `/api/student-rd-problems/proposal-files` | Bước 1: tải tệp proposal, thân là tệp PDF ≤ 10 MB, header `X-File-Name` → 201 `{ uploadId, fileName, sizeBytes }`; không phải PDF (kiểm tra nội dung) → 415; quá lớn → 413 |
| `POST` | `/api/student-rd-problems/:code/proposals` | Bước 2: nộp `{ partnerType: "Student"\|"Team"\|"Lab", teamId?, lecturerId?, title, content, trlLabel, durationWeeks?, coverLetter?, ndaAccepted, confirmed: true, uploadId }` → 201. Thứ tự kiểm tra: 404 `PROBLEM_NOT_FOUND` → 409 `PROBLEM_CLOSED` → 409 `PARTNER_TYPE_NOT_ACCEPTED` → 404 `TEAM_NOT_FOUND` / 403 `NOT_TEAM_LEADER` / 409 `TEAM_SIZE_MISMATCH` / 400 `LECTURER_NOT_FOUND` → 409 `ALREADY_APPLIED` → 400 `NDA_REQUIRED` → 400 `UPLOAD_NOT_FOUND`. Proposal hiện ngay trong `/api/business-inbox` của DN |
| `POST` | `/api/student-rd-problems/:code/proposals/:id/withdraw` | Rút proposal (chỉ người gửi, chỉ khi `Submitted`) → 200 `Cancelled`; không phải của mình → 404; DN đã phản hồi → 409 `INVALID_STATE`. Proposal đã rút không hiện trong hộp thư DN và SV nộp lại được |
| `GET` | `/api/student-rd-problems/:code/attachments/:attachmentId`, `.../proposals/:id/attachments/:attachmentId` | Liên kết ký tạm 60 giây (`?download=1` để tải về) cho tệp đề bài / tệp proposal của mình |

**Xuất PDF cần:** thư viện `playwright-core` (đã khai báo trong `package.json`: chạy `npm install` sau khi pull; thư viện này không tải kèm trình duyệt) và Microsoft Edge hoặc Google Chrome cài sẵn trên máy chạy máy chủ (đặt `PDF_BROWSER_CHANNEL` trong `.env` nếu muốn chỉ định). Máy chủ cũng cần Internet để tải phông chữ. Thiếu thư viện thì các API khác vẫn chạy, người dùng dùng nút "In" trong bản xem trước.

Phân quyền: `/api/student-*`, `/api/lab-applications`, `/api/profile-visibility` chỉ cho vai trò `Student`, `/api/business-*` chỉ cho `Business` (sai vai trò → 403 `FORBIDDEN_ROLE`; không có phiên và `AUTH_MODE=session` → 401 `UNAUTHENTICATED`). Kiểm thử API công khai: `npm run test:public` (chỉ đọc). Kiểm thử đăng nhập: `npm run test:auth` (cần migration 007 + `database/seed_auth.sql`; khởi động lại máy chủ trước mỗi lần).

Kiểm thử API bài toán R&D phía SV (cần máy chủ đang chạy, đã chạy migration 006 + `database/seed_sv_rd.sql`): `npm run test:sv-rd` (tự dọn dữ liệu đã tạo).

Hợp đồng chi tiết (mã phản hồi, body mẫu): xem DESIGN.md trong gói nộp bài, mục 3.3.
