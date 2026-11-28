# Hướng dẫn đóng góp – UIT Connect

Tài liệu dành cho thành viên nhóm. Đọc hết một lần trước khi sửa code.
Chưa quen Git: đọc [HUONGDANGIT.md](HUONGDANGIT.md) trước (các bước bấm trên VS Code).
Chỗ ghi `TBD` là nhóm chưa chốt: hỏi cả nhóm, không tự quyết.

## 1. Cài đặt lần đầu

Cần: Git, VS Code (hoặc trình soạn thảo khác), Node.js 20.6 trở lên.

```bash
git clone https://github.com/seanguyxn35/IE104_UIT_Connect.git
cd IE104_UIT_Connect
git switch develop
```

Chạy máy chủ (PowerShell):

```powershell
cd backend
copy .env.example .env   # rồi điền SUPABASE_URL, SUPABASE_SECRET_KEY; giữ TEST_STUDENT_ID=9101
npm install
npm start                # http://localhost:3000   (npm run dev: tự chạy lại khi sửa code)
```

- Xin giá trị `.env` qua kênh riêng của nhóm. **Không gửi khóa vào issue, PR, commit hay ảnh chụp màn hình.**
- Mở trang có gọi API qua `http://localhost:3000/pages/...`. Không mở bằng cách bấm đúp file (`file://`) hay Live Preview.
- Đăng nhập: trong `.env`, `AUTH_MODE=test` (mặc định) cho phép gọi API không đăng nhập, khi đó máy chủ dùng
  `TEST_STUDENT_ID` / `TEST_BUSINESS_ID`; `AUTH_MODE=session` bắt buộc đăng nhập.
- Tài khoản thử (mật khẩu chung `MatKhau@123`):
  - SV `23529101@gm.uit.edu.vn`, `23529102@gm.uit.edu.vn`: đăng nhập ở `pages/auth/02_dang-nhap-sso-microsoft365.html`.
  - DN `test.dn@vtech-global.example`: đăng nhập ở `pages/auth/01_dang-nhap-email.html`.

Danh sách API: [backend/README.md](backend/README.md).

## 2. Các nhánh

| Nhánh                  | Dùng để                                                                                      | Nhận code từ                                              |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `main`                 | Bản đã kiểm tra, dùng để demo và nộp. Push thay đổi trong `frontend/` sẽ deploy GitHub Pages | PR từ `develop` hoặc `fix/...`                            |
| `develop`              | Ghép phần việc của cả nhóm                                                                   | PR từ `feature/...` hoặc `fix/...`                        |
| `feature/<tên>-<việc>` | Làm một chức năng, ví dụ `feature/an-dang-nhap`                                              | Tạo từ `develop`                                          |
| `fix/<tên>-<lỗi>`      | Sửa một lỗi                                                                                  | Tạo từ `develop` (lỗi trên bản chính thức: tạo từ `main`) |

- **Không push trực tiếp vào `main` hoặc `develop`.**
- Một việc một nhánh, không dùng nhánh theo tên người để làm mãi. Nên xong trong 1–3 ngày; việc lớn thì tách thành nhiều PR.
- Nhánh `thuc-hanh/...` là bài nộp cá nhân: không sửa, không gộp.

## 3. Quy trình làm một việc

```bash
# 1. Lấy bản mới nhất
git switch develop
git pull

# 2. Tạo nhánh
git switch -c feature/<tên>-<việc>

# 3. Làm việc, chạy thử, rồi lưu mốc
git status                     # xem kỹ danh sách file đã đổi
git add <các file cần lưu>
git diff --cached              # xem lại nội dung sắp commit, không được có khóa bí mật
git commit -m "feat(sv): thêm trang kho tài nguyên"

# 4. Cập nhật theo develop (làm hằng ngày và trước khi mở PR)
git fetch origin
git merge origin/develop

# 5. Đưa lên GitHub
git push -u origin feature/<tên>-<việc>
```

Sau đó mở Pull Request trên GitHub, kiểm tra **base là `develop`**.

Sau khi PR đã được gộp:

```bash
git switch develop
git pull
git branch -D feature/<tên>-<việc>   # chỉ xóa khi chắc chắn PR đã gộp
```

(Cần `-D` vì sau khi squash, Git không nhận ra nhánh đã được gộp.)

Dùng VS Code thì thao tác tương ứng nằm ở tên nhánh (góc dưới bên trái) và mục **Source Control**.

## 4. Ghi commit

Dạng `type(scope): mô tả`, viết tiếng Việt, mỗi commit một việc.

| type       | Khi nào                             |
| ---------- | ----------------------------------- |
| `feat`     | Thêm chức năng                      |
| `fix`      | Sửa lỗi                             |
| `docs`     | Sửa tài liệu                        |
| `refactor` | Sắp xếp lại code, không đổi hành vi |
| `test`     | Thêm hoặc sửa kiểm thử              |
| `chore`    | Việc phụ trợ (cấu hình, thư viện)   |

`scope` là phần bị sửa, ví dụ `auth`, `sv`, `gv`, `dn`, `db`. Ví dụ: `fix(sv): nút ứng tuyển không khóa khi đang gửi`.

## 5. Pull Request

**Mô tả PR cần có:** đã làm gì, cách chạy thử, thay đổi CSDL (nếu có), ảnh chụp màn hình nếu sửa giao diện.

**Trước khi mở PR, người làm tự kiểm tra:**

- [ ] Máy chủ khởi động được và chức năng chạy đúng trên máy mình.
- [ ] Đã thử cả trường hợp đúng và trường hợp sai (400 / 401 / 403 / 409). Ca 401 cần `AUTH_MODE=session`.
- [ ] Nếu sửa backend: đã chạy các bộ test ở mục 6 và không có ca trượt.
- [ ] Không có `.env`, khóa, `node_modules/` trong danh sách file.
- [ ] Đã gộp `develop` mới nhất vào nhánh.
- [ ] Đã cập nhật tài liệu liên quan (ví dụ thêm API thì sửa `backend/README.md`).
- [ ] Đã dọn dữ liệu tạo ra khi thử.

**Review và gộp:**

- Cần ít nhất **1 người khác** duyệt.
- Hiện chưa có kiểm tra tự động trên PR và chưa có lệnh `npm test` chạy tất cả, nên người review **kéo nhánh về chạy thử** khi PR đổi hành vi.
- Cần sửa thì commit tiếp trên đúng nhánh đó; PR tự cập nhật.
- `feature/...` hoặc `fix/...` → `develop`: chọn **Squash and merge**.
- `develop` → `main`: chọn **Create a merge commit**, chỉ làm khi `develop` đã chạy ổn.
- Sửa lỗi trực tiếp cho bản chính thức: `fix/...` từ `main` → PR vào `main` (**Squash and merge**) → mở thêm PR `main` → `develop` (**Create a merge commit**) để `develop` cũng có bản sửa.

## 6. Quy ước code

**Chung:** giao diện, chú thích, tài liệu viết bằng tiếng Việt.

**Backend**

Thư mục chia theo **vai trò → màn hình → chức năng** (sơ đồ đầy đủ ở [backend/README.md](backend/README.md)):

| Thư mục trong `backend/src/` | Chứa gì |
| --- | --- |
| `sv/`, `dn/`, sau này `gv/`, `admin/` → `<số>-<tên-màn>/` | API của một màn hình; số trùng số trang trong `frontend/pages/` |
| `auth/` | Đăng nhập, đăng xuất, quên mật khẩu |
| `public/` | API cho khách, không cần đăng nhập |
| `shared/` | Code dùng chung nhiều vai trò |

- Nhiều màn dùng chung một API thì gộp một thư mục, ví dụ `sv/09-13-bai-toan-rd/`, `dn/09-16-dam-phan/`.
- Chỉ tạo thư mục khi đã có code (Git không lưu thư mục rỗng). Hiện chưa có `gv/` và `admin/`.
- Mỗi chức năng thường gồm `<chức-năng>.routes.js` (chỉ kiểm tra đầu vào) và `<chức-năng>.service.js` (nghiệp vụ, truy vấn CSDL).
- Được import service của màn khác; không import file `*.routes.js` của màn khác.
- Lỗi: ném `AppError(status, code, message)`; phản hồi lỗi luôn có dạng `{ code, message }`.
- **Danh tính người dùng lấy ở máy chủ** (`req.user.accountId`). Không nhận `studentId` / `accountId` từ client.
- Secret key chỉ dùng trong backend.

**Thêm chức năng mới**, ví dụ đề tài hướng dẫn của GV (GV-03):

1. Tạo `backend/src/gv/03-de-tai-huong-dan/de-tai.service.js` và `de-tai.routes.js`.
2. Trong hai file đó, import code chung bằng `../../shared/...` và `../../db.js`.
3. Gắn route trong `server.js`, luôn kèm chặn vai trò: `chiSv`, `chiDn` hoặc `chiChoVaiTro('Lecturer')`.
4. Ghi API mới vào `backend/README.md` và thêm thư mục vào sơ đồ ở đó.

**Chạy test khi sửa backend:** mở máy chủ (`npm start`) ở một terminal, chạy lệnh test ở terminal khác trong `backend/`.
Khởi động lại máy chủ trước mỗi lần chạy. `test:public` chỉ đọc; các bộ còn lại ghi vào CSDL chung rồi tự dọn.

| Lệnh | Kiểm tra |
| --- | --- |
| `npm run test:public` | API công khai |
| `npm run test:sv-rd` | Bài toán R&D phía SV (cần `TEST_STUDENT_ID=9101`) |
| `npm run test:auth` | Đăng nhập và phân quyền; **tạm đổi mật khẩu SV 9102**, báo nhóm trước khi chạy |
| `npm run test:team-join` | Duyệt đơn xin vào nhóm (cần migration 009, `seed_auth.sql`); tạo nhóm tạm `9490`, sửa tạm hồ sơ SV 9601 |
| `npm run test:team-profile` | Hồ sơ nhóm, ảnh nhóm, đếm đơn chờ (cần migration 010, 011, `seed_auth.sql`); tạo nhóm tạm `9480` (tin `9480`, đơn `9480`–`9481`, ảnh trong `avatars/team-9480/`), lịch tiếp SV tạm `9480` của GV 9201 |

Các bộ này chưa phủ hết các API; phần còn lại phải thử bằng tay trên giao diện.

**Frontend**

- HTML tĩnh + Tailwind CDN + JavaScript thuần, không có bước build.
- Code gọi API đặt trong `frontend/assets/js/<chức-năng>.js`.
- Luôn dùng đường dẫn tương đối. Tên file chữ thường, không dấu, nối bằng `-`, đánh số theo màn.
- Mỗi trang tự chứa header, sidebar, footer. Sửa khung chung thì sửa **mọi trang cùng vai trò**.
- Khi không có máy chủ, trang vẫn hiển thị được và báo rõ "chưa lưu".
- Giao diện theo [docs/DESIGN.md](docs/DESIGN.md). Không sửa thư mục `archive/`.

**Ngoài phạm vi – không tự thêm:** hợp đồng điện tử, thanh toán online, escrow, chat realtime, gợi ý nâng cao,
thông báo realtime nâng cao, phân tích nâng cao, SSO UIT, xác minh giấy phép kinh doanh nâng cao.

## 7. Cơ sở dữ liệu

Bản chính thức là `database/schema.postgres.sql` cùng `database/migrations/`. `database/schema.sql` là bản SQL Server cũ, không cập nhật.

**Dựng CSDL mới** (project Supabase còn trống): chạy `schema.postgres.sql` rồi `seed.sql` trong SQL Editor.
`seed_student_skills.sql` thêm kỹ năng mẫu (tùy chọn).
`schema.postgres.sql` **chưa gộp đủ** migration `004_dn` – `007`. Các file đó và seed đi kèm xem ở [CLAUDE.md](CLAUDE.md) mục 8
(`TBD`: chưa ai chạy thử trọn quy trình trên một CSDL trống).

> **Nhóm đang dùng chung một Supabase thì không chạy lại `schema.postgres.sql` trên đó.**

**Dữ liệu thử:**

- Dùng ID dải 9xxx, toàn bộ là dữ liệu giả. Không đụng dữ liệu ngoài dải này khi thử.
- Đã dùng: tài khoản `9101`, `9102`, `9111`, `9201`; đề tài `9001`–`9003`;
  tài nguyên học thuật `9301`–`9306` và nhóm `9301` (`seed_showcase.sql`); tin tuyển `9401`–`9402` và đơn `9411`–`9417`
  (`seed_team_applications.sql`); `9490`–`9501` dành cho `test:team-join`, `9480`–`9481` dành cho `test:team-profile`.
- Dải ID riêng cho từng thành viên: `TBD`.
- `reset.sql` đặt lại dữ liệu thử của chức năng ứng tuyển, **kể cả khi người khác đang thử** trên cùng CSDL: báo nhóm trước khi chạy.

## 8. File dùng chung

Đây là nơi dễ conflict nhất. Sửa ít, PR nhỏ, gộp sớm.

| File                                                                | Quy tắc                          |
| ------------------------------------------------------------------- | -------------------------------- |
| `backend/src/server.js`                                             | Chỉ thêm phần gắn route của mình |
| `backend/src/config.js`, `db.js`, thư mục `shared/` và `auth/`      | Báo nhóm trước khi sửa           |
| `database/schema.postgres.sql`                                      | Chỉ sửa kèm migration            |
| `frontend/assets/js/app-shell.js`, `ux-effects.js` và CSS tương ứng | Tách PR riêng                    |

Người phụ trách từng thư mục và từng mảng chức năng: `TBD`.

## 9. Khi gặp sự cố

| Tình huống                      | Cách xử lý                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Push bị từ chối                 | `git pull` rồi push lại. **Không dùng `--force`**                                                                    |
| Nhánh tạo trước khi chia lại backend (còn `backend/src/routes/`, `services/`) | `git merge origin/develop`, kiểm tra thay đổi của mình đã nằm trong file mới (bảng thư mục ở `backend/README.md`), chuyển file mới tạo sang đúng thư mục, sửa `import`, chạy test. Không chắc thì hỏi nhóm |
| Conflict khi merge              | Sửa các đoạn `<<<<<<<` … `>>>>>>>`, chạy thử, `git add <file>`, `git commit`. Không chắc thì hỏi người viết đoạn kia |
| Muốn hủy lần merge đang dở      | `git merge --abort`                                                                                                  |
| Lỡ `git add` nhầm file          | `git restore --staged <file>`                                                                                        |
| Lỡ commit hoặc push khóa bí mật | **Báo nhóm và đổi khóa trên Supabase ngay.** Xóa ở commit sau là chưa đủ                                             |

Cẩn thận với `git restore <file>` và nút **Discard Changes**: phần chưa commit sẽ mất, thường không lấy lại được.
