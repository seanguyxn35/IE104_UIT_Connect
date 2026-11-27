# database/

Lược đồ CSDL của UIT Connect.

```
database/
├── schema.postgres.sql   # BẢN CHÍNH THỨC: PostgreSQL đang chạy trên Supabase (tên snake_case: lab_application.topic_id)
├── schema.sql            # Bản SQL Server cũ (PascalCase), chỉ tham khảo, KHÔNG cập nhật – đã lệch bản PostgreSQL
├── seed.sql              # Dữ liệu thử cho chức năng "SV ứng tuyển đề tài Lab" (TC01–TC03)
├── reset.sql             # Đặt lại dữ liệu thử trước mỗi ca kiểm thử
├── seed_student_skills.sql  # 15 kỹ năng mẫu cho hồ sơ SV 9101 (trang SV-04)
├── seed_showcase.sql        # tài nguyên đã / chưa thẩm định (ID 9301–9306) cho mục "Công trình trưng bày trên CV"
├── seed_team_applications.sql  # đơn xin vào nhóm 9301 (tin 9401–9402, đơn 9411–9417); chạy SAU seed_dn, seed_showcase, migration 009
├── seed_team_profile.sql    # hồ sơ nhóm 9301: tôn chỉ, khoa, 3 lĩnh vực, kỹ năng, cố vấn GV 9201; chạy SAU migration 010
├── seed_dn.sql              # Dữ liệu thử luồng Doanh nghiệp (DN 9501, 5 bài toán, 15 proposal); chạy lại để đặt lại
├── seed_auth.sql            # Đăng nhập: Admin 9001, mật khẩu thử MatKhau@123, email SV dạng MSSV; chạy SAU seed_sv_rd.sql
├── seed_sv_rd.sql           # Bài toán R&D phía SV (SV-09/13): 15 bài của DN/Lab khác, chi tiết đề bài V-Tech, nhóm thử 9821–9823; chạy SAU seed_dn.sql
├── migrations/           # Thay đổi lược đồ sau bản đầu (chạy trên Supabase rồi gộp vào schema.postgres.sql)
│   ├── 001_student_profile_visibility.sql      # ẩn/công khai GPA, DRL, đề tài; chế độ hiển thị hồ sơ
│   ├── 002_student_achievement_self_declared.sql  # thành tích tự khai: Self_Declared, visibility từng mục
│   ├── 003_student_section_visibility.sql      # ẩn/công khai mục Học vấn, Kỹ năng
│   ├── 004_dn_hop_thu_ket_noi.sql      # Hộp thư kết nối DN: proposal SV cá nhân, lịch hẹn, tệp đính kèm
│   ├── 005_dn_khong_gian_dam_phan.sql  # Phòng đàm phán: 3 bước xác nhận hai bên, trao đổi theo lượt
│   ├── 006_sv_bai_toan_rd.sql          # Bài toán R&D phía SV: chi tiết đề bài, mốc, chặn nộp trùng, lưu bài
│   ├── 007_dang_nhap.sql               # Đăng nhập: mã đặt lại mật khẩu (Reset_Token), chỉ mục phiên
│   ├── 008_student_achievement_external_url.sql  # Công bố bên ngoài hệ thống: cột external_url
│   ├── 009_sv_don_gia_nhap_nhom.sql    # Duyệt đơn xin vào nhóm: cột share_gpa, lý do từ chối; 2 hàm chạy trong transaction
│   ├── 010_sv_ho_so_nhom.sql           # Hồ sơ nhóm: bảng team_field (tối đa 3 lĩnh vực), hàm cập nhật hồ sơ
│   ├── 011_sv_anh_nhom.sql             # Ảnh nhóm: cột student_team.avatar_url
│   └── 012_sv_loi_moi_vao_nhom.sql     # Lời mời vào nhóm: cột lời nhắn / lý do, trạng thái Cancelled, hàm và trigger
└── test_supabase.sql     # Kiểm thử ở tầng CSDL (bảng PASS/FAIL), không thay đổi dữ liệu
```

## Dữ liệu thử (bài thực hành: SV ứng tuyển đề tài Lab)

Chạy một lần `seed.sql`, sau đó chạy `reset.sql` **trước mỗi ca** kiểm thử (Supabase → SQL Editor → Run).
Toàn bộ là dữ liệu giả, ID cố định trong dải 9xxx:

| Dữ liệu | ID | Ca |
|---|---|---|
| SV A – tài khoản thử (`23529101@gm.uit.edu.vn`) | `account_id = 9101` | Mọi ca |
| SV B (`23529102@gm.uit.edu.vn`) | `account_id = 9102` | TC03 |
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
  Backend truy cập bằng secret key (`SUPABASE_SECRET_KEY`) đặt trong `backend/.env` (không commit).
- Storage: bucket công khai `avatars` (ảnh đại diện) và bucket riêng tư `evidence` (minh chứng thành tích,
  chỉ đọc qua liên kết ký tạm). Backend tự tạo bucket ở lần dùng đầu tiên.
- Sửa lược đồ: viết thay đổi thành file SQL mới và chạy trong SQL Editor (hoặc Supabase CLI),
  đồng thời cập nhật `schema.postgres.sql` để file này luôn khớp với CSDL.

Yêu cầu nghiệp vụ dùng để thiết kế lược đồ: [docs/datab.pdf](../docs/datab.pdf).
