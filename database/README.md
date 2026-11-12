# database/

Lược đồ CSDL của UIT Connect.

```
database/
├── schema.sql            # Bản gốc cho Microsoft SQL Server 2017+ (tên PascalCase: LabApplication.TopicID)
├── schema.postgres.sql   # Bản PostgreSQL đang chạy trên Supabase (tên snake_case: lab_application.topic_id)
├── seed.sql              # Dữ liệu thử cho chức năng "SV ứng tuyển đề tài Lab" (TC01–TC03)
└── reset.sql             # Đặt lại dữ liệu thử trước mỗi ca kiểm thử
```

## Dữ liệu thử (bài thực hành: SV ứng tuyển đề tài Lab)

Chạy một lần `seed.sql`, sau đó chạy `reset.sql` **trước mỗi ca** kiểm thử (Supabase → SQL Editor → Run).
Toàn bộ là dữ liệu giả, ID cố định trong dải 9xxx:

| Dữ liệu | ID | Ca |
|---|---|---|
| SV A – tài khoản thử (`test.sv.a@gm.uit.edu.vn`) | `account_id = 9101` | Mọi ca |
| SV B (`test.sv.b@gm.uit.edu.vn`) | `account_id = 9102` | TC03 |
| GV (`test.gv@uit.edu.vn`) | `account_id = 9201` | Mọi ca |
| Đề tài 1: slots = 3, Open, chưa có đơn | `topic_id = 9001` | TC01 → R1 |
| Đề tài 2: SV A đã có đơn Pending | `topic_id = 9002` | TC02 → R2 |
| Đề tài 3: slots = 1, SV B đã có đơn Accepted | `topic_id = 9003` | TC03 → R3 |

`reset.sql` chỉ xóa đơn ứng tuyển của đề tài 9001–9003 / SV 9101–9102, đưa 3 đề tài về trạng thái ban đầu
rồi nạp lại 2 đơn có sẵn; không đụng dữ liệu khác. Câu `SELECT` cuối file dùng làm minh chứng dữ liệu "trước".

## Supabase

- Project: `uit-connect` (region Singapore, ref `rhqoitsmiuijefglhdoy`), tổ chức IE104.
- Đã chạy `schema.postgres.sql`: 65 bảng, 3 view, dữ liệu danh mục (khoa, chuyên ngành, lĩnh vực, Lab, tiêu chí thẩm định).
- **RLS bật cho mọi bảng, chưa có policy** → frontend (khóa `anon`) không đọc/ghi được.
  Backend truy cập bằng `service_role key` đặt trong `backend/.env` (không commit).
- Sửa lược đồ: viết thay đổi thành file SQL mới và chạy trong SQL Editor (hoặc Supabase CLI),
  đồng thời cập nhật `schema.postgres.sql` để file này luôn khớp với CSDL.

Yêu cầu nghiệp vụ dùng để thiết kế lược đồ: [docs/datab.pdf](../docs/datab.pdf).
