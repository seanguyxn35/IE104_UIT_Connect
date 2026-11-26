# UIT Connect

Nền tảng kết nối Sinh viên – Giảng viên – Doanh nghiệp của UIT, phạm vi một Khoa (đồ án IE104).

Hiện trạng:

- Frontend: prototype giao diện đủ 3 vai trò (SV, GV, DN). Chưa có màn hình Admin.
- Backend: Node.js + Express + Supabase (PostgreSQL). Đã nối một phần trang Sinh viên:
  SV-04 (hồ sơ năng lực & CV) và SV-07 (ứng tuyển đề tài Lab). Các trang GV/DN còn dữ liệu tĩnh.
- Chưa có đăng nhập: máy chủ coi người dùng là sinh viên thử `TEST_STUDENT_ID` trong `backend/.env`.

Hướng dẫn cho thành viên nhóm:

- Mới dùng Git: [HUONGDANGIT.md](HUONGDANGIT.md) (các bước trên VS Code, từ clone đến Pull Request).
- Quy ước đầy đủ (nhánh, Pull Request, code, CSDL): [CONTRIBUTING.md](CONTRIBUTING.md).

## Cấu trúc thư mục

```
├── frontend/                  # Giao diện web (HTML + Tailwind CDN + JS thuần, không build)
│   ├── index.html             # Trang vào: chọn vai trò
│   ├── SV.html, GV.html, DN.html   # Lối vào theo vai trò -> màn đăng nhập
│   ├── pages/
│   │   ├── auth/              # Đăng nhập, đăng ký (SV/GV: 03–06, DN: 09–13), quên mật khẩu
│   │   ├── sv/                # Không gian Sinh viên (12 màn)
│   │   ├── gv/                # Không gian Giảng viên (15 màn)
│   │   └── dn/                # Không gian Doanh nghiệp (13 màn)
│   └── assets/
│       ├── css/               # app-shell.css, ux-effects.css, cv-preview.css
│       ├── js/                # app-shell.js, ux-effects.js, router.js (màn auth) và các file gọi API theo chức năng
│       └── img/               # Ảnh dùng trong các màn
├── backend/                   # API server (Express 5 + Supabase), đồng thời phục vụ frontend/ – xem backend/README.md
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

Lối vào trực tiếp:

| Vai trò | File | Sau khi đăng nhập |
|---|---|---|
| Sinh viên | `frontend/SV.html` | `pages/sv/01_trang-chu.html` |
| Giảng viên | `frontend/GV.html` | `pages/gv/01_trang-chu.html` |
| Doanh nghiệp | `frontend/DN.html` | `pages/dn/01_ban-lam-viec.html` |

Vai trò được truyền qua tham số `?role=gv` / `?role=dn` trên các màn trong `pages/auth/`
(không có tham số = sinh viên). Màn đăng nhập hiện chỉ là giao diện, chưa xác thực thật.

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
- Phần nội dung của mỗi trang nằm giữa `<!-- ===== NỘI DUNG TRANG ... ===== -->` và
  `<!-- ===== HẾT NỘI DUNG TRANG ===== -->`; header, sidebar, footer dùng chung giữa các trang
  cùng vai trò, sửa ở một trang thì sửa đồng loạt.
- Code gọi API đặt trong `frontend/assets/js/<chức-năng>.js`, không viết thẳng trong HTML.
