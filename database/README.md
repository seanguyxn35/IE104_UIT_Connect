# database/

Lược đồ CSDL của UIT Connect.

```
database/
├── schema.sql            # Bản gốc cho Microsoft SQL Server 2017+ (tên PascalCase: LabApplication.TopicID)
└── schema.postgres.sql   # Bản PostgreSQL đang chạy trên Supabase (tên snake_case: lab_application.topic_id)
```

## Supabase

- Project: `uit-connect` (region Singapore, ref `rhqoitsmiuijefglhdoy`), tổ chức IE104.
- Đã chạy `schema.postgres.sql`: 65 bảng, 3 view, dữ liệu danh mục (khoa, chuyên ngành, lĩnh vực, Lab, tiêu chí thẩm định).
- **RLS bật cho mọi bảng, chưa có policy** → frontend (khóa `anon`) không đọc/ghi được.
  Backend truy cập bằng `service_role key` đặt trong `backend/.env` (không commit).
- Sửa lược đồ: viết thay đổi thành file SQL mới và chạy trong SQL Editor (hoặc Supabase CLI),
  đồng thời cập nhật `schema.postgres.sql` để file này luôn khớp với CSDL.

Yêu cầu nghiệp vụ dùng để thiết kế lược đồ: [docs/datab.pdf](../docs/datab.pdf).
