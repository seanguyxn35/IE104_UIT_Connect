# UIT Connect

Nền tảng kết nối Sinh viên – Giảng viên – Doanh nghiệp của UIT, phạm vi một Khoa (đồ án IE104).

Hiện trạng:

- Frontend: prototype giao diện đủ 3 vai trò (SV, GV, DN). Chưa có màn hình Admin.
- Backend: Node.js + Express + Supabase (PostgreSQL). Trang đã gọi API: SV-04, SV-05, SV-07, SV-09, SV-13
  và DN-01, DN-08, DN-09, DN-16; trang tổng quan công khai `index.html`. Các trang GV còn dữ liệu tĩnh.
- Đã có đăng nhập theo vai trò (phiên phía máy chủ). Với `AUTH_MODE=test` (mặc định), gọi API không kèm phiên
  thì máy chủ dùng tài khoản thử `TEST_STUDENT_ID` / `TEST_BUSINESS_ID` trong `backend/.env`.

Hướng dẫn cho thành viên nhóm:

- Mới dùng Git: [HUONGDANGIT.md](HUONGDANGIT.md) (các bước trên VS Code, từ clone đến Pull Request).
- Quy ước đầy đủ (nhánh, Pull Request, code, CSDL): [CONTRIBUTING.md](CONTRIBUTING.md).

## Cấu trúc thư mục

```
├── frontend/                  # Giao diện web (HTML + Tailwind CDN + JS thuần, không build)
│   ├── index.html             # Trang tổng quan công khai (không cần đăng nhập)
│   ├── SV.html, GV.html, DN.html   # Lối vào theo vai trò -> màn đăng nhập
│   ├── pages/
│   │   ├── auth/              # Đăng nhập, đăng ký (SV/GV: 03–06, DN: 09–13), quên mật khẩu (15 màn)
│   │   ├── sv/                # Không gian Sinh viên (13 màn)
│   │   ├── gv/                # Không gian Giảng viên (15 màn)
│   │   ├── dn/                # Không gian Doanh nghiệp (16 màn)
│   │   └── khach/             # Trang cho khách chưa đăng nhập: chi tiết bài toán R&D (1 màn)
│   └── assets/
│       ├── css/               # app-shell.css, ux-effects.css, cv-preview.css, dn-bai-toan.css
│       ├── js/                # app-shell.js, ux-effects.js, router.js (màn auth) và các file gọi API theo chức năng
│       └── img/               # Ảnh dùng trong các màn
├── backend/                   # API server (Express 5 + Supabase), đồng thời phục vụ frontend/ – xem backend/README.md
│   ├── src/                   # chia theo vai trò → màn hình → chức năng: sv/, dn/, auth/, public/, shared/
│   └── scripts/               # kiểm thử API và nạp tệp minh họa
├── database/                  # Lược đồ PostgreSQL (Supabase), migration, dữ liệu thử – xem database/README.md
├── docs/
│   ├── DESIGN.md              # Design system "Academic Nexus" (màu, chữ, bo góc, thành phần)
│   └── datab.pdf              # Requirement Draft (yêu cầu dữ liệu)
├── design/
│   ├── stitch/                # Export gốc từ Google Stitch (code.html + screen.png từng màn)
│   └── screenshots/           # Ảnh chụp các màn (auth, sv, gv)
├── archive/                   # Bản cũ, chỉ để tham khảo – không sửa
└── .github/workflows/         # Tự động deploy frontend/ lên GitHub Pages
```

## Chạy trên máy

Cần Node.js 20.6 trở lên.

```powershell
cd backend
copy .env.example .env   # lần đầu: điền SUPABASE_URL, SUPABASE_SECRET_KEY, giữ TEST_STUDENT_ID=9101
npm install
npm start                # http://localhost:3000   (npm run dev: tự chạy lại khi sửa code)
```

- Giá trị `.env` xin qua kênh riêng của nhóm, **không commit**.
- Trang có gọi API phải mở qua máy chủ, ví dụ `http://localhost:3000/pages/sv/04_ho-so-nang-luc-cv.html`.
  Mở bằng `file://` hay Live Server thì trang vẫn hiển thị nhưng không lưu được dữ liệu.
- Xuất CV ra PDF cần Microsoft Edge hoặc Google Chrome cài trên máy chạy máy chủ (xem `backend/README.md`).
- CSDL và dữ liệu thử: xem [database/README.md](database/README.md).

Trang chính: `http://localhost:3000/` (trang tổng quan công khai). Lối vào đăng nhập theo vai trò:

| Vai trò | Lối vào | Màn đăng nhập | Trang chủ của vai trò |
|---|---|---|---|
| Sinh viên | `frontend/SV.html` | `pages/auth/02_...` (UIT SSO) | `pages/sv/01_trang-chu.html` |
| Giảng viên | `frontend/GV.html` | `pages/auth/02_...` (UIT SSO) | `pages/gv/01_trang-chu.html` |
| Doanh nghiệp | `frontend/DN.html` | `pages/auth/01_...` (email và mật khẩu) | `pages/dn/01_ban-lam-viec.html` |

- Đăng nhập xong, trang đích theo **vai trò của tài khoản do máy chủ trả về**, không theo tham số `?role=`.
  Tham số `?role=gv` / `?role=dn` trên các màn `pages/auth/` chỉ dùng cho giao diện (không có tham số = sinh viên).
- Đăng nhập (auth/01, auth/02) và quên mật khẩu đã gọi API; màn đăng ký vẫn là giả lập.
- Tài khoản thử: xem [CONTRIBUTING.md](CONTRIBUTING.md) mục 1.

Kiểm thử API (máy chủ đang chạy, chạy ở terminal khác trong `backend/`): `npm run test:public`,
`npm run test:sv-rd`, `npm run test:auth`. Đọc [CONTRIBUTING.md](CONTRIBUTING.md) mục 6 trước khi chạy,
vì hai bộ sau ghi vào CSDL dùng chung.

## Deploy (GitHub Pages)

Mỗi lần push lên `main` có thay đổi trong `frontend/`, workflow `.github/workflows/deploy-pages.yml`
sẽ đưa thư mục `frontend/` lên GitHub Pages. Backend không chạy trên GitHub Pages, nên bản deploy
chỉ xem được giao diện.
Bật một lần: **Settings → Pages → Source: GitHub Actions**.

## Quy ước

- Đường dẫn giữa các trang luôn là **đường dẫn tương đối** (`../../assets/css/app-shell.css`),
  không dùng đường dẫn tuyệt đối `/...`.
- Thư mục và trang trong `pages/` đặt tên **chữ thường, không dấu, nối bằng `-`**; trang đánh số theo thứ tự màn
  (`05_dang-bai-toan-moi.html`). GitHub Pages phân biệt chữ hoa/thường, Windows thì không –
  sai chữ hoa/thường sẽ chạy được trên máy nhưng lỗi khi deploy.
- Phần nội dung của mỗi trang SV / GV / DN nằm giữa `<!-- ===== NỘI DUNG TRANG ... ===== -->` và
  `<!-- ===== HẾT NỘI DUNG TRANG ===== -->`; header, sidebar, footer dùng chung giữa các trang
  cùng vai trò, sửa ở một trang thì sửa đồng loạt.
- Code gọi API đặt trong `frontend/assets/js/<chức-năng>.js`, không viết thẳng trong HTML.
