# backend/

API server của UIT Connect (Node.js 20.6+, Express 5, Supabase). Đồng thời phục vụ thư mục `frontend/`.

```
backend/
├── src/
│   ├── server.js                       # khởi động, gắn route, phục vụ frontend/, xử lý lỗi chung
│   ├── config.js                       # đọc biến môi trường
│   ├── db.js                           # kết nối Supabase (secret key – chỉ dùng ở máy chủ)
│   ├── errors.js                       # AppError(status, code, message)
│   ├── routes/labApplications.js       # POST /api/lab-applications
│   ├── routes/studentSkills.js         # GET/POST/DELETE /api/student-skills
│   ├── routes/studentAvatar.js         # GET/POST /api/student-avatar
│   ├── routes/profileVisibility.js     # GET/PUT /api/profile-visibility, /mode
│   ├── routes/studentProfile.js        # GET/PUT /api/student-profile/links
│   ├── routes/studentCv.js             # GET /api/student-cv
│   ├── routes/studentShowcase.js       # /api/student-showcase (công trình trưng bày trên CV)
│   ├── routes/studentAchievements.js   # /api/student-achievements (thành tích tự khai, minh chứng)
│   └── services/
│       ├── labApplicationService.js    # nghiệp vụ ứng tuyển đề tài: R1, R2, R3
│       ├── studentSkillService.js      # kỹ năng trên hồ sơ SV (skill, student_skill)
│       ├── avatarService.js            # ảnh đại diện SV (Supabase Storage + account.avatar_url)
│       ├── profileVisibilityService.js # ẩn/công khai chỉ số và chế độ hiển thị hồ sơ (student_profile)
│       ├── studentProfileService.js    # liên kết GitHub, LinkedIn trên hồ sơ (student_profile)
│       ├── studentCvService.js         # gom dữ liệu CV từ các bảng hồ sơ
│       ├── studentCvPdfService.js      # dựng tệp PDF của CV bằng trình duyệt chạy ẩn
│       ├── studentShowcaseService.js   # chọn công trình đã thẩm định để trưng bày (cv_showcase_item)
│       └── studentAchievementService.js # thành tích, chứng chỉ SV tự khai (student_achievement, Storage "evidence")
├── .env.example                        # mẫu biến môi trường (file .env thật không commit)
└── package.json
```

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
| `POST` | `/api/lab-applications` | SV (tài khoản thử `TEST_STUDENT_ID`) ứng tuyển đề tài `{ "topicId": 9001 }` |
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
| `PATCH` | `/api/student-achievements/:id` | Đổi chế độ hiển thị `{ "visibility" }` → 200; không phải mục của mình → 404 `ACHIEVEMENT_NOT_FOUND` |
| `DELETE` | `/api/student-achievements/:id` | Xóa mục và tệp minh chứng → 204; 404 |
| `PUT` | `/api/student-achievements/:id/evidence` | Tải / thay minh chứng: thân là tệp PDF/JPG/PNG ≤ 5 MB → 200; sai loại → 415, quá lớn → 413; mục `Pending`/`Verified` → 409 `ACHIEVEMENT_LOCKED` |
| `GET` | `/api/student-achievements/:id/evidence` | Chuyển hướng 302 tới liên kết ký tạm (60 giây) trong bucket riêng tư `evidence`; chưa có tệp → 404 `EVIDENCE_NOT_FOUND` |
| `POST` | `/api/student-achievements/:id/verification-request` | Gửi xác minh (tùy chọn): `Self_Declared`/`Rejected` → `Pending`; chưa có tệp → 409 `EVIDENCE_REQUIRED`; trạng thái khác → 409 `INVALID_STATUS` |
| `GET` | `/api/student-showcase` | Công trình SV trưng bày trên CV, theo thứ tự: `{ items: [{ resourceId, type, title, venue, trlLevel, reviewerName, reviewedAt, reviewScore, role, highlights, isShownOnCv, displayOrder, eligible }] }` |
| `GET` | `/api/student-showcase/available` | Tài nguyên chọn được (của SV hoặc nhóm SV, đã được GV thẩm định đạt) mà chưa chọn: `{ resources }` |
| `POST` | `/api/student-showcase` | Thêm `{ "resourceId", "role"?, "highlights"?, "isShownOnCv"? }` → 201; không phải của mình → 404 `RESOURCE_NOT_FOUND`; chưa thẩm định đạt → 409 `NOT_REVIEWED`; đã chọn → 409 `ALREADY_EXISTS` |
| `PATCH` | `/api/student-showcase/:resourceId` | Đổi `role`, `highlights`, `isShownOnCv` → 200; 404 `SHOWCASE_NOT_FOUND` |
| `DELETE` | `/api/student-showcase/:resourceId` | Gỡ khỏi danh sách (giữ nguyên tài nguyên gốc) → 204; 404 `SHOWCASE_NOT_FOUND` |
| `PUT` | `/api/student-showcase/order` | Sắp xếp `{ "resourceIds": [...] }` (đúng đủ các mục đang chọn) → 200 `{ items }`; sai → 400 |
| `GET` | `/api/student-cv/pdf` | Tải CV dạng tệp PDF A4, giống bản xem trước (cùng quy tắc ẩn / riêng tư) → 200 `application/pdf`; đang tạo quá nhiều tệp → 429 `PDF_BUSY`; máy chủ thiếu thư viện hoặc trình duyệt → 503 `PDF_UNAVAILABLE` |

**Xuất PDF cần:** thư viện `playwright-core` (đã khai báo trong `package.json`: chạy `npm install` sau khi pull; thư viện này không tải kèm trình duyệt) và Microsoft Edge hoặc Google Chrome cài sẵn trên máy chạy máy chủ (đặt `PDF_BROWSER_CHANNEL` trong `.env` nếu muốn chỉ định). Máy chủ cũng cần Internet để tải phông chữ. Thiếu thư viện thì các API khác vẫn chạy, người dùng dùng nút "In" trong bản xem trước.

Hợp đồng chi tiết (mã phản hồi, body mẫu): xem DESIGN.md trong gói nộp bài, mục 3.3.
