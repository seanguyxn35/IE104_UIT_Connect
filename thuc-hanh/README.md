# Bài thực hành Web – Sinh viên ứng tuyển đề tài Lab

| Mục       | Nội dung                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Họ tên    | Nguyễn Thanh Hải                                                                                                 |
| MSSV      | 24520440                                                                                                         |
| Đồ án     | UIT Connect – nền tảng kết nối Sinh viên, Giảng viên, Doanh nghiệp (IE104)                                       |
| Chức năng | Sinh viên ứng tuyển đề tài nghiên cứu của Lab (màn SV-07 Chợ ghép nhóm, nút "Ứng tuyển ngay")                    |
| Kho mã    | https://github.com/seanguyxn35/IE104_UIT_Connect – nhánh `thuc-hanh/ung-tuyen-de-tai`, commit _(điền mã commit)_ |

Tài liệu: [DESIGN.md](DESIGN.md) (yêu cầu, R1–R3, CSDL, luồng, API, vị trí mã nguồn) ·
[TEST_REPORT.md](TEST_REPORT.md) (TC01–TC03, kết quả thực tế) · [evidence/](evidence/) (minh chứng).

## Cách chạy

Yêu cầu: Node.js 20.6 trở lên, Chrome/Edge, một project Supabase đã chạy `database/schema.postgres.sql`.

```powershell
# 1. Cấu hình (lần đầu)
cd backend
copy .env.example .env      # điền SUPABASE_URL, SUPABASE_SECRET_KEY (Supabase → Project Settings → API Keys)
npm install

# 2. Dữ liệu thử: Supabase → SQL Editor → chạy database/seed.sql (lần đầu)

# 3. Chạy máy chủ (API + giao diện)
npm start                   # http://localhost:3000
```

Mở **http://localhost:3000/pages/sv/07_cho-ghep-nhom.html**. Ba nút "Ứng tuyển ngay" đầu tiên nối với đề tài thử
9001 / 9002 / 9003 (rê chuột lên nút để xem mã). Không mở trang bằng cách bấm đúp file (`file://`).

## Dữ liệu thử và đặt lại

Toàn bộ là dữ liệu giả, ID cố định dải 9xxx ([database/seed.sql](../database/seed.sql)):

| Dữ liệu                                                                | Thiết lập                              | Ca        |
| ---------------------------------------------------------------------- | -------------------------------------- | --------- |
| SV A `9101` (tài khoản thử, `TEST_STUDENT_ID`), SV B `9102`, GV `9201` | –                                      | –         |
| Đề tài 9001                                                            | `slots = 3`, chưa có đơn               | TC01 → R1 |
| Đề tài 9002                                                            | SV A đã có đơn `Pending`               | TC02 → R2 |
| Đề tài 9003                                                            | `slots = 1`, SV B đã có đơn `Accepted` | TC03 → R3 |

**Đặt lại trước mỗi ca:** Supabase → SQL Editor → chạy [database/reset.sql](../database/reset.sql). File chỉ xóa đơn
ứng tuyển của đề tài 9001–9003 / SV 9101–9102 rồi nạp lại 2 đơn có sẵn; câu `SELECT` cuối file là minh chứng
dữ liệu "trước".

Kiểm thử giao diện tự động (tùy chọn): `node thuc-hanh/tests/run_ui_tests.mjs` khi máy chủ đang chạy.
Kiểm thử tầng CSDL (tùy chọn): chạy `reset.sql`, rồi chạy `database/test_supabase.sql` trong SQL Editor → bảng PASS/FAIL
(21 điểm: lược đồ, dữ liệu thử, logic R2/R3, ràng buộc UNIQUE/CHECK/FK). Script không thay đổi dữ liệu.

## Các tệp do tôi tạo / sửa

| Tệp                                                                         | Thay đổi                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `backend/package.json`, `backend/package-lock.json`, `backend/.env.example` | Mới – cấu hình máy chủ                                         |
| `backend/src/server.js`, `config.js`, `db.js`, `errors.js`                  | Mới – khởi động, cấu hình, kết nối Supabase, xử lý lỗi         |
| `backend/src/routes/labApplications.js`                                     | Mới – `POST /api/lab-applications`                             |
| `backend/src/services/labApplicationService.js`                             | Mới – nghiệp vụ R1, R2, R3                                     |
| `frontend/assets/js/lab-application.js`                                     | Mới – gửi yêu cầu, trạng thái nút, hộp thông báo               |
| `frontend/pages/sv/07_cho-ghep-nhom.html`                                   | Sửa – thêm `data-topic-id` cho 3 nút, nạp `lab-application.js` |
| `database/seed.sql`, `database/reset.sql`, `database/test_supabase.sql` | Mới – dữ liệu thử, đặt lại dữ liệu, kiểm thử tầng CSDL |
| `database/README.md`, `backend/README.md`                                   | Sửa – mô tả                                                    |
| `thuc-hanh/`                                                                | Mới – DESIGN.md, TEST_REPORT.md, evidence/, tests/             |

## Giới hạn

- **Không có đăng nhập:** danh tính SV lấy từ `TEST_STUDENT_ID` cấu hình ở máy chủ (đề bài cho phép); client không gửi
  được mã SV.
- **Nội dung thẻ đề tài trên SV-07 là dữ liệu mẫu tĩnh** của prototype; chỉ nút của 3 thẻ đầu được nối với đề tài thử,
  3 nút còn lại chưa nối.
- **R3 không có ràng buộc ở CSDL** và `supabase-js` không mở transaction qua nhiều lệnh (xem DESIGN.md mục 3.2).
  Rủi ro thấp vì đơn mới luôn `Pending`, không làm tăng số đơn `Accepted` mà R3 đếm.
- Dữ liệu lưu trên Supabase (không phải mô phỏng); cần mạng để chạy. Mỗi lệnh gọi CSDL chờ tối đa 10 giây.
- `backend/.env` chứa secret key, **không nộp** (đã nằm trong `.gitignore`); bài nộp chỉ kèm `.env.example`.
