# UIT Connect

Nền tảng kết nối Sinh viên – Giảng viên – Doanh nghiệp của UIT (đồ án IE104).
Hiện có prototype giao diện cho 3 vai trò; backend và CSDL đang ở giai đoạn thiết kế.

## Cấu trúc thư mục

```
├── frontend/                  # Giao diện web (HTML + Tailwind CDN + JS thuần)
│   ├── index.html             # Trang vào: chọn vai trò
│   ├── SV.html, GV.html, DN.html   # Lối vào theo vai trò -> màn đăng nhập
│   ├── pages/
│   │   ├── auth/              # Đăng nhập, đăng ký (SV/GV: 03–06, DN: 09–13), quên mật khẩu
│   │   ├── sv/                # Không gian Sinh viên (12 màn)
│   │   ├── gv/                # Không gian Giảng viên (15 màn)
│   │   └── dn/                # Không gian Doanh nghiệp (13 màn)
│   └── assets/
│       ├── css/               # app-shell.css (header, sidebar, footer), ux-effects.css
│       ├── js/                # app-shell.js, ux-effects.js, router.js (điều hướng màn auth theo vai trò)
│       └── img/               # Ảnh dùng trong các màn
├── backend/                   # API server (chưa có mã nguồn)
├── database/                  # Lược đồ CSDL SQL Server
├── docs/
│   ├── DESIGN.md              # Design system "Academic Nexus" (màu, chữ, bo góc, thành phần)
│   └── datab.pdf              # Requirement Draft
├── design/
│   ├── stitch/                # Export gốc từ Google Stitch (code.html + screen.png từng màn)
│   └── screenshots/           # Ảnh chụp các màn (auth, sv, gv)
├── archive/                   # Bản cũ, chỉ để tham khảo – không sửa
│   ├── pages/                 # Prototype trước milestone 1 (main screen, main screen 2, FN-proto cũ)
│   └── academic_corporate_nexus/   # DESIGN.md bản đầu
└── .github/workflows/         # Tự động deploy frontend/ lên GitHub Pages
```

## Chạy trên máy

Không cần cài đặt hay build. Mở `frontend/index.html` bằng trình duyệt, hoặc dùng extension
**Live Server** của VS Code (chuột phải `frontend/index.html` → *Open with Live Server*).

Lối vào trực tiếp:

| Vai trò | File | Sau khi đăng nhập |
|---|---|---|
| Sinh viên | `frontend/SV.html` | `pages/sv/01_trang-chu.html` |
| Giảng viên | `frontend/GV.html` | `pages/gv/01_trang-chu.html` |
| Doanh nghiệp | `frontend/DN.html` | `pages/dn/01_ban-lam-viec.html` |

Vai trò được truyền qua tham số `?role=gv` / `?role=dn` trên các màn trong `pages/auth/`
(không có tham số = sinh viên).

## Deploy (GitHub Pages)

Mỗi lần push lên `main` có thay đổi trong `frontend/`, workflow `.github/workflows/deploy-pages.yml`
sẽ đưa thư mục `frontend/` lên GitHub Pages.
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
