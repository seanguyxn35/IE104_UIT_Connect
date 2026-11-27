# CLAUDE.md – Bối cảnh cố định cho UIT Connect

Đọc file này trước mọi việc. Viết code, chú thích, tài liệu, giao diện bằng **tiếng Việt**.
Chỗ ghi `TBD` là chưa chốt: hỏi nhóm, không tự quyết.
Quy trình nhánh, Pull Request, cách cài đặt và quy tắc dữ liệu dùng chung: [CONTRIBUTING.md](CONTRIBUTING.md).

## 1. Tổng quan

- UIT Connect: cổng kết nối Sinh viên – Giảng viên – Doanh nghiệp của UIT, phạm vi **một Khoa**.
- Yêu cầu dữ liệu gốc: `docs/datab.pdf` (Requirement Draft, 8 nhóm luồng, 22 bảng).
- Hiện trạng: frontend prototype đủ 3 vai trò; backend đã có đăng nhập và nối một phần trang SV, DN (xem mục 5).

## 2. Vai trò và phạm vi

- Actor: **SV** (Student), **GV** (Lecturer), **DN** (Business), **Admin**. Giá trị `account.role`: `Student|Lecturer|Business|Admin`.
- Danh sách UC (suy ra từ `datab.pdf` + màn hình trong `frontend/pages/`; mã UC chính thức: `TBD`):
  - Chung: đăng nhập email, đăng ký (SV/GV: auth 03–06, DN: auth 09–13), xác thực email, quên mật khẩu (auth 07–08), cài đặt tài khoản.
  - SV: xem/tìm tài nguyên học thuật (sv/02–03), hồ sơ năng lực & CV (sv/04), đề tài của tôi (sv/05), quản trị nhóm & portfolio (sv/06), chợ ghép nhóm + ứng tuyển đề tài Lab (sv/07), xin GV cố vấn (sv/08), cổng DN & bài toán R&D (sv/09, chi tiết + nộp proposal sv/13), học bổng & tài trợ (sv/10), kho đã lưu (sv/12).
  - GV: hồ sơ khoa học (gv/02), đăng đề tài & hướng dẫn (gv/03), tuyển SV vào đề tài (gv/04), xử lý yêu cầu hướng dẫn (gv/05), thẩm định tài nguyên học thuật (gv/06–08), kho tài liệu (gv/09–10), nhóm nghiên cứu & Lab (gv/11), bài toán DN (gv/12), học bổng (gv/13), kho đã lưu (gv/14).
  - DN: hồ sơ DN + giấy tờ xác minh (dn/02–03), đăng/quản lý bài toán R&D (dn/04–05, biểu mẫu đề bài dn/14, chi tiết bài toán + hồ sơ dự án dn/15), săn nhân tài + gửi lời mời (dn/06–07), hộp thư kết nối + không gian đàm phán (dn/08–09, trong phòng đàm phán dn/16), học bổng & tài trợ (dn/10), kho đã lưu (dn/11).
  - Admin: duyệt hồ sơ DN, bài toán R&D, tin tuyển dụng, tài nguyên bị báo cáo; ghi `moderation_log` (theo `datab.pdf`). **Chưa có màn hình Admin** – `TBD`.
- **Out-of-scope – KHÔNG tự thêm:** hợp đồng điện tử, thanh toán online, escrow, chat realtime, recommendation nâng cao,
  thông báo realtime nâng cao, analytics nâng cao, SSO UIT, xác minh GPKD nâng cao.

## 3. Quy tắc nghiệp vụ cốt lõi

- Email: SV bắt buộc `@gm.uit.edu.vn`, GV bắt buộc `@uit.edu.vn` (CHECK `ck_account_email_domain`). DN/Admin bắt buộc có mật khẩu.
- Một `account` ↔ đúng một profile theo vai trò (quan hệ 1-1).
- DN có `verified_status` `Pending|Verified|Rejected`, do Admin duyệt. DN chưa xác minh **không bị chặn** thêm chức năng nào trong luồng DN (chốt 26/11/2026).
- Bài toán R&D của DN (chốt 26/11/2026):
  - Sửa bài đã được duyệt → quay về chờ Admin duyệt, gắn nhãn "Đã sửa".
  - Xóa bài chưa từng được duyệt: chỉ cần xác nhận. Xóa bài đã được duyệt: bắt buộc nêu lý do (≥ 10 ký tự). Bài đang thực hiện (đã ký thỏa thuận): không xóa được.
  - Proposal của SV cá nhân: thêm cột `student_id` vào `connection_request` (không coi là nhóm 1 người).
- Ứng tuyển đề tài Lab (đã làm, `labApplicationService.js`):
  - R1: còn chỗ và chưa ứng tuyển → tạo một đơn `Pending` (201).
  - R2: đã có đơn cho đề tài (mọi trạng thái) → 409 `ALREADY_APPLIED`; CSDL chặn thêm bằng `uq_lab_application`.
  - R3: số đơn `Accepted` ≥ `slots` → 409 `TOPIC_FULL`. CSDL không chặn R3, server phải chặn.
  - Kiểm tra theo thứ tự: tồn tại → R2 → R3 → mới ghi.
- Kết nối DN: chỉ sang `Contracted`/`Completed` khi **cả hai bên** xác nhận. Chỉ là trạng thái, không làm hợp đồng điện tử.
- Đánh giá đối tác chỉ khi kết nối `Completed`, điểm 1.0–5.0.
- Tài nguyên học thuật: GV thẩm định `Approved|Rejected|Revision_Needed`; mọi quyết định của Admin ghi vào `moderation_log`.
- Hồ sơ SV: GPA 0–10, điểm rèn luyện 0–100, kỹ năng mức 1–5, ẩn/công khai riêng GPA / DRL / Đề tài và mục Học vấn / Kỹ năng (`is_*_public`). Phần đang ẩn không đưa lên CV; GPA và DRL có công tắc riêng, không phụ thuộc mục Học vấn.
- Thành tích / chứng chỉ: SV tự khai, lưu ở `Self_Declared` và hiện ngay, không cần duyệt. Xác minh là tùy chọn (cần tệp minh chứng): `Self_Declared`/`Rejected` → `Pending` → `Verified`/`Rejected`. Mỗi mục có chế độ hiển thị riêng; mục `Private` và mục bị từ chối không đưa lên CV. Minh chứng PDF/JPG/PNG ≤ 5 MB, lưu riêng tư.
- Loại `Publication` là **"Công bố bên ngoài hệ thống"** (SV tự cung cấp, ví dụ bài ở hội nghị / tạp chí ngoài): **bắt buộc** có liên kết DOI/URL `https://` hoặc tệp minh chứng; thiếu cả hai thì không lên CV. CV xếp ở mục "Thành tích", luôn gắn nhãn "SV tự cung cấp", tách khỏi công trình đã thẩm định.
- Công trình trưng bày trên CV: SV chỉ chọn từ `academic_resource` có sẵn của nhóm SV **đang là thành viên**, hoặc tài nguyên cá nhân (không nhóm) do SV tạo. SV đã rời nhóm không được ghi sở hữu / tác quyền trên hồ sơ và CV, kể cả khi là người tạo: mục đã chọn không lên CV, không sửa được, chỉ gỡ được (quy tắc dùng chung ở `backend/src/services/resourceOwnership.js`). **CV chỉ nhận công trình `Published`** (và có phiếu `Approved` trong `academic_review_log`); `Approved` nghĩa là đạt nhưng không cho công bố nên không được chọn (409 `NOT_PUBLISHED`) và không lên CV. Khi đọc CV, lọc `Published` ngay trong truy vấn. Mục đã chọn mà không còn `Published` vẫn hiện (mờ, nhãn "Chưa công khai") cho chủ hồ sơ. CV xếp ở mục "Công trình & Project trưng bày", ghi "Đã thẩm định bởi" GV.
- "Đề tài của tôi" (SV-05): quyền theo **vai trò trong nhóm** (`team_member.role_in_team`), không theo người tạo. Mọi thành viên được xem, tạo, sửa, tải PDF; chỉ **Leader** được xóa bản nháp và gửi thẩm định. Đề tài cá nhân (không nhóm) chỉ người tạo thấy và có quyền như Leader. Bài báo (`Paper`) bắt buộc thuộc một nhóm.
- Luồng thẩm định bài báo (đã chốt): `Draft` → `Pending_Review` → `Published` hoặc `Revision_Needed` (nộp lại → `Pending_Review`). SV chọn GV khi gửi. GV từ chối → `Rejected`; duyệt nhưng không cho công bố → `Approved`. **Chỉ GV thẩm định được cho công khai**, SV không có đường tự đổi trạng thái. Chỉ sửa / thay tệp khi `Draft` hoặc `Revision_Needed`. Tệp PDF ≤ 10 MB, lưu riêng tư (bucket `papers`), server kiểm tra nội dung tệp; tệp đã nằm trong một lần nộp không được xóa.
- Ảnh đại diện: JPG/PNG/WebP ≤ 2 MB, server kiểm tra nội dung tệp, không tin `Content-Type`.
- **Danh tính lấy ở server**, không bao giờ nhận `studentId`/`accountId` từ client.

## 4. Công nghệ và cấu trúc

- Frontend: HTML tĩnh + Tailwind Play CDN + JS thuần, không build.
- Backend: Node ≥ 20.6, Express 5, `@supabase/supabase-js` 2, ESM.
- CSDL: Supabase (PostgreSQL 17), project `uit-connect`, ref `rhqoitsmiuijefglhdoy`.
  - **Bản chính thức: `database/schema.postgres.sql` + `database/migrations/`.**
  - `database/schema.sql` là bản SQL Server cũ, chỉ tham khảo, không cập nhật.
  - `archive/` chỉ tham khảo, không sửa.
- Deploy: GitHub Actions đưa `frontend/` lên GitHub Pages khi push `main` (không chạy backend).

```
prototyp@/                 (chủ sở hữu từng thư mục: TBD)
├── frontend/   index.html (trang tổng quan công khai), pages/{auth,sv,gv,dn,khach}/, assets/{css,js,img}/
├── backend/    src/{server,config,db,errors}.js, routes/, services/
├── database/   schema.postgres.sql, migrations/, seed*.sql, reset.sql, test_supabase.sql
├── docs/       DESIGN.md (design system), datab.pdf (yêu cầu dữ liệu)
├── design/     export Google Stitch + ảnh chụp màn (tham khảo)
├── archive/    prototype cũ (không sửa)
├── .github/workflows/deploy-pages.yml
├── CONTRIBUTING.md
└── README.md
```

## 5. Kiến trúc backend

- `server.js` phục vụ cả API (`/api/...`) và thư mục `frontend/` trên cùng cổng, nên không vướng CORS.
- Tách lớp: `routes/` kiểm tra đầu vào → `services/` nghiệp vụ + truy vấn Supabase. Không truy vấn CSDL trong route.
- Lỗi: ném `AppError(status, code, message)`; trả về luôn có dạng `{ code, message }`.
- Mọi lệnh gọi CSDL có timeout 10 s; riêng đẩy tệp lên kho lưu trữ 180 s (`db.js`).
- Backend dùng **secret key**, nên bỏ qua RLS. RLS bật trên mọi bảng nhưng chưa có policy, nên frontend không gọi Supabase trực tiếp.
- **Đăng nhập theo vai trò** (nhánh `feature/nhan-dang-nhap` giao diện, `feature/nhan-backend-dang-nhap` backend):
  - Phiên phía máy chủ: cookie HttpOnly `uitc_session` + bảng `login_session` (chỉ lưu SHA-256 của token). Mật khẩu băm scrypt.
  - `services/authService.js`, `routes/auth.js` (`/api/auth/*`), `authMiddleware.js` (`napPhien`, `chiChoVaiTro`). Hợp đồng ở đầu `frontend/assets/js/auth.js`.
  - Route lấy danh tính từ `req.user.accountId`. `/api/student-*`, `/api/lab-applications`, `/api/profile-visibility` chỉ cho `Student`; `/api/business-*` chỉ cho `Business`.
  - `AUTH_MODE=test` (mặc định): gọi API không kèm phiên thì dùng `TEST_STUDENT_ID` / `TEST_BUSINESS_ID` (script test cũ vẫn chạy). `AUTH_MODE=session`: bắt buộc đăng nhập (401).
  - Quên mật khẩu: mã 6 số trong `verification_code` (`Password_Reset`), sau đó `Reset_Token`. Chưa có dịch vụ email nên mã **in ra log máy chủ** – `TBD`.
  - Đếm "sai 5 lần / 15 phút" và "gửi lại sau 60 giây" nằm trong bộ nhớ máy chủ (khởi động lại thì xóa).
  - Hai cổng đăng nhập:
    - auth/02 "UIT SSO": chỉ email UIT.
      - SV: đúng 8 chữ số MSSV + `@gm.uit.edu.vn` (vd `24521228@gm.uit.edu.vn`).
      - GV: `@uit.edu.vn`, phần trước `@` bắt đầu bằng chữ cái, không toàn số.
      - Admin: dùng cổng này.
      - Sai định dạng: 400 `INVALID_EMAIL`.
    - Email SV thử đã đổi sang dạng MSSV: 9101 → `23529101@gm.uit.edu.vn`, 9102 → `23529102@…`, 9601–9639 → `<student_code>@gm.uit.edu.vn`. `seed_auth.sql` tự sửa CSDL đã nạp bản cũ.
    - auth/01 "Email và mật khẩu": Doanh nghiệp, email không thuộc UIT.
    - Email sai cổng thì báo chuyển cổng; máy chủ trả 403 `WRONG_PORTAL`.
  - Admin là tài khoản riêng `admin.uitconnect@uit.edu.vn` (role `Admin`, đăng nhập qua UIT SSO). CSDL chưa có tài khoản này, backend phải seed.
- API hiện có:
  - `POST /api/lab-applications`
  - `GET|POST /api/student-skills`, `DELETE /api/student-skills/:skillId`
  - `GET|POST /api/student-avatar`
  - `GET|PUT /api/profile-visibility`, `GET|PUT /api/profile-visibility/mode`
  - `GET|PUT /api/student-profile/links`
  - `GET /api/student-cv`, `GET /api/student-cv/pdf` (cần `playwright-core` và Edge/Chrome trên máy chủ)
  - `GET|POST /api/student-showcase`, `GET .../available`, `PUT .../order`, `PATCH|DELETE /api/student-showcase/:resourceId`
  - `GET|POST /api/student-projects`, `GET .../options`, `PATCH|DELETE /api/student-projects/:id`, `GET|PUT .../:id/file`
  - `GET|POST /api/student-achievements`, `PATCH|DELETE /api/student-achievements/:id`, `GET|PUT .../:id/evidence`, `POST .../:id/verification-request`
  - DN-08 Hộp thư kết nối (danh tính DN từ phiên đăng nhập; `AUTH_MODE=test` thì dùng `TEST_BUSINESS_ID`):
    - `GET /api/business-inbox`
    - `POST /api/business-inbox/:id/decline|reopen|accept`, `POST .../:id/meetings`
    - `GET .../:id/attachments/:attachmentId[?download=1]` (liên kết ký tạm 60 s, bucket riêng tư `rd-files`)
    - `accept` mở phòng đàm phán (id phòng = id proposal).
  - DN-09 / DN-16 Không gian đàm phán:
    - `GET /api/business-negotiations`, `GET .../:id` (đánh dấu đã đọc mục Trao đổi)
    - `POST|DELETE .../:id/steps/:step/confirm` (`step` = `Technical|NDA_IP|Contract`)
    - `POST .../:id/messages`, `POST .../:id/meetings`, `GET .../:id/documents/:attachmentId[?download=1]`
  - DN-01 Bàn làm việc: `GET /api/business-dashboard`.
  - Công khai, không cần đăng nhập (`routes/public.js`, `services/publicService.js`): `GET /api/public/overview`, `GET /api/public/problems/:code`.
    Chỉ bài Open/In_Progress; không trả tệp đính kèm, dữ liệu sinh viên, dữ liệu riêng của người xem. Dùng chung `tomTatCongKhai` / `chiTietCongKhai` với API SV.
  - SV-09 / SV-13 Bài toán R&D phía SV (`studentRdProblemService.js`):
    - `GET /api/student-rd-problems`, `GET .../:code`, `PUT|DELETE .../:code/saved`
    - `POST .../proposal-files` (tải PDF, bước 1) → `POST .../:code/proposals` (nộp, bước 2), `POST .../:code/proposals/:id/withdraw`
    - `GET .../:code/attachments/:id`, `GET .../:code/proposals/:id/attachments/:aid`
    - SV chỉ thấy bài `Open`/`In_Progress`. Proposal ghi vào `connection_request` nên hiện ngay ở `/api/business-inbox`; proposal đã rút (`Cancelled`) bị ẩn khỏi hộp thư DN.
    - Frontend gọi qua `sv-bai-toan-rd-data.js`; không có máy chủ thì dùng dữ liệu mẫu và báo "chưa lưu".
  - Frontend gọi các API DN qua `assets/js/dn-api.js`. Mở bằng `file://` hoặc máy chủ lỗi thì dùng dữ liệu mẫu và báo "chưa lưu".
    DN-04/05/14/15 (bài toán R&D) chưa có API.
- Đổi lược đồ: viết file mới trong `database/migrations/NNN_*.sql`, chạy trên Supabase, rồi cập nhật `schema.postgres.sql`.

## 6. Giao diện

- Không có template: mỗi trang trong `pages/{sv,gv,dn}/` là HTML đầy đủ, tự chứa header, sidebar, footer và `tailwind.config`.
  - Sửa khung chung thì sửa **mọi trang cùng vai trò**.
  - Mục sidebar đang chọn được viết cứng ở từng trang.
- Design system "Academic Nexus" ở `docs/DESIGN.md`, màu chính `#1F4E78`.
  - Trước khi dùng token màu tùy biến, kiểm tra nó có trong config **của trang đó**.
- Asset dùng chung:
  - `app-shell.js/.css`: sidebar, modal đăng xuất, `data-href`.
  - `ux-effects.js/.css`: hiệu ứng ripple; tắt bằng `data-no-ripple`.
  - `router.js`: chỉ dùng cho `pages/auth/`.
  - `auth.js` + `auth-guard.js`: nạp trong `<head>` của **mọi** trang SV/GV/DN (trang mới phải thêm).
    - Chặn người chưa đăng nhập hoặc sai vai trò; nút trong hộp thoại đăng xuất gọi `dangXuat()`, đăng xuất xong về `index.html`.
    - Không có máy chủ đăng nhập: chế độ xem thử, vai trò suy ra từ đuôi email, hiện dải báo "Chế độ xem thử".
  - `dang-nhap.js`: màn auth/01 và auth/02 (`<form data-cong="business|uit">`). Đăng nhập xong vào trang theo vai trò máy chủ trả về, không theo `?role=`.
  - `quen-mat-khau.js`: quên mật khẩu UIT (auth/07 → 08) và DN (auth/14 → 15).
  - Trang công khai cho khách (không gắn `auth-guard.js`), dùng `cong-khai.js`:
    - `index.html` (`tong-quan.js`): giới thiệu, số liệu, tiêu điểm, bài toán R&D công khai (lọc khi bấm "Lọc"), cách hoạt động, đối tác, tin tức.
    - `pages/khach/01_chi-tiet-bai-toan-rd.html` (`khach-chi-tiet-bai-toan-rd.js`): xem đề bài; ẩn tệp đính kèm và nút nộp; "Đăng nhập để ứng tuyển" → UIT SSO rồi vào thẳng SV-13.
    - Đã đăng nhập: thanh trên cùng có "Vào trang của tôi". Không hiện thông tin cá nhân (tên, MSSV, điểm SV, proposal, email liên hệ).
    - Gọi `/api/public/overview`, `/api/public/problems/:code` (hợp đồng ở đầu `cong-khai.js`); không có máy chủ thì dùng dữ liệu mẫu và báo "dữ liệu minh họa".
    - Mã 6 chữ số; nút "Gửi lại email (60s)" đếm ngược, hết giờ mới gửi lại được.
- JS gọi API đặt ở file riêng `assets/js/<chức-năng>.js` (ví dụ `lab-application.js`, `student-avatar.js`), không nhét vào HTML.
- Khi không có máy chủ (`file://`, GitHub Pages), trang phải hiển thị được và báo rõ "chưa lưu".
- Luôn dùng **đường dẫn tương đối**. Tên file chữ thường, không dấu, nối bằng `-`, đánh số theo màn (`05_dang-bai-toan-moi.html`).
- Ảnh dùng file trong `assets/img/`, không dùng URL Stitch (`_map.json`).

## 7. Quy ước làm việc

- Nhánh:
  - `main` không push trực tiếp; `main` ← `develop` ← `feature/<tên>-<việc>` hoặc `fix/<tên>-<lỗi>`.
  - `feature/...`, `fix/...` tạo từ `develop`, gộp bằng PR (**Squash and merge**). `develop` → `main`: **Create a merge commit**.
  - Sửa lỗi cho bản chính thức: xem `CONTRIBUTING.md` mục 5.
- Chưa có kiểm tra tự động trên PR.
- Commit `type(scope): mô tả` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`). PR cần ít nhất 1 người review.
- Không commit `.env`, khóa Supabase, `node_modules/`.
- Mỗi chức năng phải có test case dương và âm (400 / 401 / 403 / 409).
  - 401/403: kiểm thử bằng phiên đăng nhập thật (`npm run test:auth`); ca 401 của API cần `AUTH_MODE=session`.
- Dữ liệu thử dùng ID dải 9xxx; không đụng dữ liệu ngoài dải khi test. Test xong phải dọn dữ liệu đã tạo.
- Đặt lại dữ liệu thử của chức năng ứng tuyển bằng `database/reset.sql` trước khi test hoặc demo.

## 8. Lệnh thường dùng

```powershell
cd backend
copy .env.example .env   # lần đầu: điền SUPABASE_URL, SUPABASE_SECRET_KEY, TEST_STUDENT_ID=9101
npm install
npm start                # http://localhost:3000  (npm run dev: tự chạy lại khi sửa code)
```

- Mở trang có gọi API qua `http://localhost:3000/pages/...`, không mở bằng `file://` hay Live Preview.
- CSDL: chạy trong Supabase → SQL Editor:
  - `seed.sql` (lần đầu)
  - `reset.sql` (trước mỗi ca test)
  - `seed_student_skills.sql` (kỹ năng mẫu SV 9101)
  - `test_supabase.sql` (bảng PASS/FAIL tầng CSDL)
  - Luồng DN: `migrations/004_dn_hop_thu_ket_noi.sql` → `005_dn_khong_gian_dam_phan.sql` (một lần) → `seed_dn.sql` (lần đầu và mỗi khi cần đặt lại dữ liệu thử DN) → `cd backend && npm run seed:dn-files` (tải PDF minh họa cho tệp đính kèm).
  - Bài toán R&D phía SV: `migrations/006_sv_bai_toan_rd.sql` (một lần) → `seed_sv_rd.sql` (sau `seed_dn.sql`; chạy lại `seed_dn.sql` thì chạy lại file này) → `npm run seed:dn-files`.
  - Đăng nhập: `migrations/007_dang_nhap.sql` (một lần) → `seed_auth.sql` (sau `seed_sv_rd.sql`; chạy lại seed khác thì chạy lại file này).
    Mật khẩu chung các tài khoản thử: `MatKhau@123`. Admin 9001 `admin.uitconnect@uit.edu.vn`; SV 9103 chưa xác thực email, 9104 bị khóa.
    ID: DN/Lab khác 9511–9525; bài toán 9301–9315 (RD-2026-101..115); nhóm thử 9821 (SV 9101 trưởng nhóm), 9822 (9101 là thành viên), 9823 (5 người); tệp đề bài 9931–9950.
    `seed_dn.sql` được sinh từ dữ liệu mẫu của giao diện (`dn-bai-toan-data.js`). ID dùng:
    - DN 9501; SV 9601–9639; GV 9701–9703; nhóm 9801–9813
    - Bài toán 9084/9079/9071/9091/9904; proposal 9901–9915
    - Lịch 9951–9957; tin 9001–9014; tệp 9961–9989
- Test tự động: chưa có script `npm test` – `TBD`. Riêng bài toán R&D phía SV: `cd backend && npm run test:sv-rd`; đăng nhập: `npm run test:auth`; API công khai: `npm run test:public` (máy chủ đang chạy, khởi động lại trước mỗi lần; tự dọn dữ liệu).

## 9. Việc đang mở / lưu ý

- Trạng thái nhánh (27/11/2026): backend được ghép trên `develop`; `main` chưa có backend.
- Nhánh `thuc-hanh/ung-tuyen-de-tai` (commit `bea23cb`) là bản nộp bài cá nhân: không sửa, không gộp.
- `README.md` gốc đã cũ: vẫn ghi "backend chưa có mã nguồn", "CSDL SQL Server", chạy bằng Live Server. Cần cập nhật.
- `schema.sql` (SQL Server) đã lệch `schema.postgres.sql` (ví dụ thiếu các cột của migration 001).
- CSDL chung đã có các cột / bảng chính của migration 001, 003 – 008.
- Đã có đăng nhập + phân quyền theo vai trò ở backend (mục 5); chưa có policy RLS, chưa có API đăng ký tài khoản, chưa có dịch vụ gửi email.
- Màn đăng ký (03–06, 09–13) vẫn là giả lập, chưa gọi API. "UIT SSO" thực chất là đăng nhập email + mật khẩu giới hạn email UIT (SSO thật nằm ngoài phạm vi).
- Chưa có màn hình và API cho Admin.
- Trang gọi API: SV-04, SV-05, SV-07, SV-09, SV-13 và DN-01, DN-08, DN-09, DN-16; trang GV còn dữ liệu tĩnh.
- SV-05: đã có tạo, xem, sửa bản nháp và tải PDF. **Chưa có** chọn GV, gửi thẩm định, lịch sử nộp và API thẩm định cho GV (GV-06, GV-07).
- Nhóm trang Bài toán R&D của DN (dn/04, 05, 08, 09, 14, 15, 16): dn/08, 09, 16 đã có API (mục 5), còn dn/04, 05, 14, 15 **chưa có API**:
  - Phòng đàm phán (dn/16): 3 bước Trao đổi kỹ thuật → NDA & IP → Hợp đồng, mỗi bước xong khi cả hai bên xác nhận. "Hợp đồng" chỉ ghi nhận đã ký ngoài hệ thống. "Nhắn tin" là trao đổi theo lượt, không phải chat realtime.
  - Chưa có phía đối tác (SV/GV) để xác nhận, nên phòng mới mở sẽ dừng ở "Chờ đối tác".
  - Dữ liệu mẫu dùng chung ở `assets/js/dn-bai-toan-data.js` (5 bài toán, 15 proposal).
  - Bài DN tạo / sửa và thao tác Từ chối / Hẹn / Chấp nhận proposal chỉ lưu tạm trong `localStorage`; trang báo "chưa lưu lên máy chủ".
  - Chỉ bài toán đã công khai (Đang mở, Đang thực hiện) mới có proposal; tệp đính kèm là PDF minh họa tạo trên trình duyệt.
  - Sửa / xóa bài đăng theo quy tắc ở mục 3. Proposal và phòng đàm phán của bài đã xóa bị ẩn.
- Bài toán R&D phía SV (sv/09, sv/13) đã có API (mục 5). Khi không có máy chủ:
  - Dữ liệu mẫu: bài DN (`dn-bai-toan-data.js`) ở trạng thái Đang mở / Đang thực hiện cộng 15 bài của DN/Lab khác (`sv-bai-toan-rd-data.js`).
  - Lưu bài và proposal lưu tạm trong `localStorage` (`uitc.sv.baiToanDaLuu.v1`, `uitc.sv.proposal.v1`), hiện trong Hộp thư DN-08 cùng trình duyệt.
  - Bài DN mới đăng ở DN-05 chưa lên CSDL (DN-05 chưa có API) và cần Admin duyệt (chưa có màn Admin) mới hiện cho SV.
  - Chỉ trưởng nhóm nộp proposal thay nhóm (403 `NOT_TEAM_LEADER`).
- `schema.postgres.sql` chưa gộp các bảng, chỉ mục của migration `004_dn`, `005`, `006`, `007` (đã có đến 003 và cột `external_url` của `008`).
- Code gọi `/api/student-skills` đang viết thẳng trong HTML của SV-04, trái quy ước ở mục 6. Cần tách ra `assets/js/`.
- Mâu thuẫn cần nhóm chốt:
  - Schema có `external_login` (`UIT_SSO`, `Microsoft365`) và màn auth 02 "SSO Microsoft 365", nhưng SSO UIT nằm ngoài phạm vi.
  - `account.password_hash` cho phép NULL với SV/GV vì giả định có SSO.
- Popup "Xem trước CV" ở SV-04 đã lấy dữ liệu thật (`/api/student-cv`); chưa có API thêm học vấn, kinh nghiệm nên các mục đó còn trống.
- Công trình trưng bày: chưa có chức năng SV nộp tài nguyên và GV thẩm định, nên dữ liệu thử lấy từ `database/seed_showcase.sql`.
- Thành tích: SV gửi xác minh được nhưng **chưa có ai duyệt** (chưa có API/màn hình duyệt; người duyệt: `TBD`).
- Chủ sở hữu thư mục, mã UC chính thức: `TBD`.
