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
│   └── services/labApplicationService.js   # nghiệp vụ ứng tuyển đề tài: R1, R2, R3
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

Hợp đồng chi tiết (mã phản hồi, body mẫu): [thuc-hanh/DESIGN.md](../thuc-hanh/DESIGN.md), mục 3.3.
