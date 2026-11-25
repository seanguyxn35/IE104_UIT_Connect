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
│   └── services/
│       ├── labApplicationService.js    # nghiệp vụ ứng tuyển đề tài: R1, R2, R3
│       ├── studentSkillService.js      # kỹ năng trên hồ sơ SV (skill, student_skill)
│       └── avatarService.js            # ảnh đại diện SV (Supabase Storage + account.avatar_url)
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

Hợp đồng chi tiết (mã phản hồi, body mẫu): xem DESIGN.md trong gói nộp bài, mục 3.3.
