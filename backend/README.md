# backend/

Chưa có mã nguồn. Thư mục này dành cho API server của UIT Connect.

Cấu trúc đề xuất (chỉnh theo framework nhóm chọn):

```
backend/
├── src/
│   ├── config/        # kết nối CSDL, đọc biến môi trường
│   ├── routes/        # khai báo API: /api/auth, /api/sv, /api/gv, /api/dn, ...
│   ├── controllers/   # nhận request, trả response
│   ├── services/      # nghiệp vụ (ghép nhóm, thẩm định, đàm phán, ...)
│   ├── models/        # truy vấn CSDL / ORM, khớp với database/
│   └── middlewares/   # xác thực, phân quyền theo vai trò SV / GV / DN
├── tests/
├── .env.example       # mẫu biến môi trường (file .env thật không commit)
└── README.md
```
