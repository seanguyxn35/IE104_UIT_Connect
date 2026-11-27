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
- Chưa có đăng nhập: máy chủ coi người dùng là sinh viên có mã `TEST_STUDENT_ID`.

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
- [ ] Đã thử cả trường hợp đúng và trường hợp sai (400 / 409...). Lỗi 401 / 403: `TBD` vì chưa có đăng nhập.
- [ ] Không có `.env`, khóa, `node_modules/` trong danh sách file.
- [ ] Đã gộp `develop` mới nhất vào nhánh.
- [ ] Đã cập nhật tài liệu liên quan (ví dụ thêm API thì sửa `backend/README.md`).
- [ ] Đã dọn dữ liệu tạo ra khi thử.

**Review và gộp:**

- Cần ít nhất **1 người khác** duyệt.
- Hiện chưa có kiểm tra tự động trên PR và chưa có `npm test`, nên người review **kéo nhánh về chạy thử** khi PR đổi hành vi.
- Cần sửa thì commit tiếp trên đúng nhánh đó; PR tự cập nhật.
- `feature/...` hoặc `fix/...` → `develop`: chọn **Squash and merge**.
- `develop` → `main`: chọn **Create a merge commit**, chỉ làm khi `develop` đã chạy ổn.
- Sửa lỗi trực tiếp cho bản chính thức: `fix/...` từ `main` → PR vào `main` (**Squash and merge**) → mở thêm PR `main` → `develop` (**Create a merge commit**) để `develop` cũng có bản sửa.

## 6. Quy ước code

**Chung:** giao diện, chú thích, tài liệu viết bằng tiếng Việt.

**Backend**

- Thư mục theo vai trò → màn hình → chức năng: `backend/src/<sv|dn|gv|admin>/<số>-<tên-màn>/`. Ví dụ chức năng mới của GV-03: `backend/src/gv/03-de-tai-huong-dan/de-tai.routes.js` và `de-tai.service.js`. Xem sơ đồ trong `backend/README.md`.
- `*.routes.js` chỉ kiểm tra đầu vào; `*.service.js` chứa nghiệp vụ và truy vấn CSDL.
- Lỗi: ném `AppError(status, code, message)`; phản hồi lỗi luôn có dạng `{ code, message }`.
- **Danh tính người dùng lấy ở máy chủ.** Không nhận `studentId` / `accountId` từ client.
- Secret key chỉ dùng trong backend.

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

> **Nhóm đang dùng chung một Supabase thì không chạy lại `schema.postgres.sql` trên đó.**

**Dữ liệu thử:**

- Dùng ID dải 9xxx, toàn bộ là dữ liệu giả. Không đụng dữ liệu ngoài dải này khi thử.
- Đã dùng: tài khoản `9101`, `9102`, `9111`, `9201`; đề tài `9001`–`9003`;
  tài nguyên học thuật `9301`–`9306` và nhóm `9301` (`seed_showcase.sql`).
- Dải ID riêng cho từng thành viên: `TBD`.
- `reset.sql` đặt lại dữ liệu thử của chức năng ứng tuyển, **kể cả khi người khác đang thử** trên cùng CSDL: báo nhóm trước khi chạy.

## 8. File dùng chung

Đây là nơi dễ conflict nhất. Sửa ít, PR nhỏ, gộp sớm.

| File                                                                | Quy tắc                          |
| ------------------------------------------------------------------- | -------------------------------- |
| `backend/src/server.js`                                             | Chỉ thêm phần gắn route của mình |
| `backend/src/config.js`, `db.js`, thư mục `shared/`                 | Báo nhóm trước khi sửa           |
| `database/schema.postgres.sql`                                      | Chỉ sửa kèm migration            |
| `frontend/assets/js/app-shell.js`, `ux-effects.js` và CSS tương ứng | Tách PR riêng                    |

Người phụ trách từng thư mục và từng mảng chức năng: `TBD`.

## 9. Khi gặp sự cố

| Tình huống                      | Cách xử lý                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Push bị từ chối                 | `git pull` rồi push lại. **Không dùng `--force`**                                                                    |
| Conflict khi merge              | Sửa các đoạn `<<<<<<<` … `>>>>>>>`, chạy thử, `git add <file>`, `git commit`. Không chắc thì hỏi người viết đoạn kia |
| Muốn hủy lần merge đang dở      | `git merge --abort`                                                                                                  |
| Lỡ `git add` nhầm file          | `git restore --staged <file>`                                                                                        |
| Lỡ commit hoặc push khóa bí mật | **Báo nhóm và đổi khóa trên Supabase ngay.** Xóa ở commit sau là chưa đủ                                             |

Cẩn thận với `git restore <file>` và nút **Discard Changes**: phần chưa commit sẽ mất, thường không lấy lại được.
