# CLAUDE.md – Bối cảnh cố định cho UIT Connect

Đọc file này trước mọi việc. Viết code, chú thích, tài liệu, giao diện bằng **tiếng Việt**.
Chỗ ghi `TBD` là chưa chốt: hỏi nhóm, không tự quyết.
Quy trình nhánh, Pull Request, cách cài đặt và quy tắc dữ liệu dùng chung: [CONTRIBUTING.md](CONTRIBUTING.md).

## 1. Tổng quan

- UIT Connect: cổng kết nối Sinh viên – Giảng viên – Doanh nghiệp của UIT, phạm vi **một Khoa**.
- Yêu cầu dữ liệu gốc: `docs/datab.pdf` (Requirement Draft, 8 nhóm luồng, 22 bảng).
- Hiện trạng: frontend prototype đủ 3 vai trò; backend mới nối một phần trang SV (xem mục 5).

## 2. Vai trò và phạm vi

- Actor: **SV** (Student), **GV** (Lecturer), **DN** (Business), **Admin**. Giá trị `account.role`: `Student|Lecturer|Business|Admin`.
- Danh sách UC (suy ra từ `datab.pdf` + màn hình trong `frontend/pages/`; mã UC chính thức: `TBD`):
  - Chung: đăng nhập email, đăng ký (SV/GV: auth 03–06, DN: auth 09–13), xác thực email, quên mật khẩu (auth 07–08), cài đặt tài khoản.
  - SV: xem/tìm tài nguyên học thuật (sv/02–03), hồ sơ năng lực & CV (sv/04), đề tài của tôi (sv/05), quản trị nhóm & portfolio (sv/06), chợ ghép nhóm + ứng tuyển đề tài Lab (sv/07), xin GV cố vấn (sv/08), cổng DN & bài toán R&D (sv/09), học bổng & tài trợ (sv/10), kho đã lưu (sv/12).
  - GV: hồ sơ khoa học (gv/02), đăng đề tài & hướng dẫn (gv/03), tuyển SV vào đề tài (gv/04), xử lý yêu cầu hướng dẫn (gv/05), thẩm định tài nguyên học thuật (gv/06–08), kho tài liệu (gv/09–10), nhóm nghiên cứu & Lab (gv/11), bài toán DN (gv/12), học bổng (gv/13), kho đã lưu (gv/14).
  - DN: hồ sơ DN + giấy tờ xác minh (dn/02–03), đăng/quản lý bài toán R&D (dn/04–05), săn nhân tài + gửi lời mời (dn/06–07), hộp thư kết nối + không gian đàm phán (dn/08–09), học bổng & tài trợ (dn/10), kho đã lưu (dn/11).
  - Admin: duyệt hồ sơ DN, bài toán R&D, tin tuyển dụng, tài nguyên bị báo cáo; ghi `moderation_log` (theo `datab.pdf`). **Chưa có màn hình Admin** – `TBD`.
- **Out-of-scope – KHÔNG tự thêm:** hợp đồng điện tử, thanh toán online, escrow, chat realtime, recommendation nâng cao,
  thông báo realtime nâng cao, analytics nâng cao, SSO UIT, xác minh GPKD nâng cao.

## 3. Quy tắc nghiệp vụ cốt lõi

- Email: SV bắt buộc `@gm.uit.edu.vn`, GV bắt buộc `@uit.edu.vn` (CHECK `ck_account_email_domain`). DN/Admin bắt buộc có mật khẩu.
- Một `account` ↔ đúng một profile theo vai trò (quan hệ 1-1).
- DN có `verified_status` `Pending|Verified|Rejected`, do Admin duyệt. Việc DN chưa duyệt bị chặn những gì: `TBD`.
- Ứng tuyển đề tài Lab (đã làm, `labApplicationService.js`):
  - R1: còn chỗ và chưa ứng tuyển → tạo một đơn `Pending` (201).
  - R2: đã có đơn cho đề tài (mọi trạng thái) → 409 `ALREADY_APPLIED`; CSDL chặn thêm bằng `uq_lab_application`.
  - R3: số đơn `Accepted` ≥ `slots` → 409 `TOPIC_FULL`. CSDL không chặn R3, server phải chặn.
  - Kiểm tra theo thứ tự: tồn tại → R2 → R3 → mới ghi.
- Kết nối DN: chỉ sang `Contracted`/`Completed` khi **cả hai bên** xác nhận. Chỉ là trạng thái, không làm hợp đồng điện tử.
- Đánh giá đối tác chỉ khi kết nối `Completed`, điểm 1.0–5.0.
- Tài nguyên học thuật: GV thẩm định `Approved|Rejected|Revision_Needed`; mọi quyết định của Admin ghi vào `moderation_log`.
- Hồ sơ SV: GPA 0–10, điểm rèn luyện 0–100, kỹ năng mức 1–5, ẩn/công khai riêng GPA / DRL / Đề tài (`is_*_public`).
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
├── frontend/   pages/{auth,sv,gv,dn}/, assets/{css,js,img}/
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
- Mọi lệnh gọi CSDL có timeout 10 s (`db.js`).
- Backend dùng **secret key**, nên bỏ qua RLS. RLS bật trên mọi bảng nhưng chưa có policy, nên frontend không gọi Supabase trực tiếp.
- **Chưa có đăng nhập**: danh tính lấy từ `TEST_STUDENT_ID` trong `.env`. Cơ chế xác thực thật: `TBD`.
- API hiện có:
  - `POST /api/lab-applications`
  - `GET|POST /api/student-skills`, `DELETE /api/student-skills/:skillId`
  - `GET|POST /api/student-avatar`
  - `GET|PUT /api/profile-visibility`
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
  - Hiện chưa có đăng nhập nên chưa kiểm thử được 401/403 – `TBD`.
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
- Test tự động: chưa có script `npm test` – `TBD`.

## 9. Việc đang mở / lưu ý

- Trạng thái nhánh (26/11/2026): code backend nằm ở `feature/hai-ho-so-sv`, **chưa gộp vào `develop`**
  (`develop` và `main` chưa có backend). Cập nhật dòng này sau khi PR được gộp.
- Nhánh `thuc-hanh/ung-tuyen-de-tai` (commit `bea23cb`) là bản nộp bài cá nhân: không sửa, không gộp.
- `README.md` gốc đã cũ: vẫn ghi "backend chưa có mã nguồn", "CSDL SQL Server", chạy bằng Live Server. Cần cập nhật.
- `schema.sql` (SQL Server) đã lệch `schema.postgres.sql` (ví dụ thiếu các cột của migration 001).
- CSDL chung đã có các cột của migration 001.
- Chưa có xác thực, phân quyền, policy RLS.
- Chưa có màn hình và API cho Admin.
- Chỉ trang SV-04 và SV-07 gọi API (SV-05 mới lọc tab trên giao diện); các trang GV/DN còn dữ liệu tĩnh.
- Code gọi `/api/student-skills` đang viết thẳng trong HTML của SV-04, trái quy ước ở mục 6. Cần tách ra `assets/js/`.
- Mâu thuẫn cần nhóm chốt:
  - Schema có `external_login` (`UIT_SSO`, `Microsoft365`) và màn auth 02 "SSO Microsoft 365", nhưng SSO UIT nằm ngoài phạm vi.
  - `account.password_hash` cho phép NULL với SV/GV vì giả định có SSO.
- Ô "Xem trước CV A4" ở SV-04 chưa lấy dữ liệu thật (kỹ năng, ảnh).
- Chủ sở hữu thư mục, mã UC chính thức, tiêu chí chặn DN chưa xác minh: `TBD`.
