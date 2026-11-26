# Hướng dẫn đưa code lên repo chung

Dành cho từng thành viên trong nhóm, kể cả bạn chưa quen Git.
Quy ước chi tiết của dự án xem ở [CONTRIBUTING.md](CONTRIBUTING.md).

**Nguyên tắc:** bạn làm trên **bản nháp riêng**, gọi là **nhánh**. Làm xong thì nhờ người khác xem, rồi mới gộp vào
**bản chung của nhóm**, tên là `develop`. Không sửa thẳng vào `develop` hoặc `main`.

## Phần 1: Chuẩn bị (chỉ làm một lần)

1. **Tạo tài khoản GitHub**, rồi gửi tên tài khoản cho chủ repo.
2. **Chấp nhận lời mời** trong email GitHub gửi cho bạn. Chưa chấp nhận thì chưa đưa code lên được.
3. **Cài** Git, VS Code và Node.js từ phiên bản 20.6 trở lên.
4. **Giới thiệu mình với Git.** Mở Terminal trong VS Code, chạy hai dòng sau, thay bằng tên và email của bạn:

   ```bash
   git config --global user.name "Tên của bạn"
   git config --global user.email "email-cua-ban"
   ```

   Hai dòng này chỉ ghi tên tác giả vào commit, không phải đăng nhập.

5. **Tải dự án về.** Nhấn `Ctrl+Shift+P`, chọn **Git: Clone**, dán `https://github.com/seanguyxn35/IE104_UIT_Connect`,
   chọn nơi lưu rồi mở thư mục vừa tải. Nếu được yêu cầu đăng nhập, hãy đăng nhập GitHub qua trình duyệt.
6. **Cài đặt để chạy dự án:** chuyển sang nhánh `develop`, rồi làm theo mục 1 của [CONTRIBUTING.md](CONTRIBUTING.md).
   Thông tin cho file `.env` thì xin riêng trong nhóm.

## Phần 2: Mỗi khi nhận một việc mới

**Bước 1: Báo nhóm.** Nói bạn sẽ làm gì và sửa phần nào, để không có hai người làm trùng.

**Bước 2: Lấy bản mới nhất.** Bấm tên nhánh ở góc dưới bên trái VS Code, chọn `develop`.
Sau đó nhấn `Ctrl+Shift+P`, chọn **Git: Pull**.

**Bước 3: Tạo bản nháp.** Bấm lại tên nhánh, chọn **Create new branch**. Đặt tên theo mẫu `feature/tên-bạn-tên-việc`,
ví dụ `feature/an-dang-nhap`. Nhìn góc dưới để chắc bạn đang ở nhánh mới.

**Bước 4: Làm việc.** Sửa code và chạy thử. Thử cả khi nhập đúng và nhập sai.

**Bước 5: Lưu mốc (commit).**

1. Mở **Source Control** ở thanh bên trái.
2. Bấm vào từng file để xem mình đã đổi gì.
3. Bấm **+** ở những file muốn lưu.
4. Viết ghi chú ngắn, ví dụ `feat(auth): thêm đăng nhập bằng email`.
5. Bấm **Commit**.

Nên lưu nhiều mốc nhỏ thay vì một mốc rất lớn.

**Bước 6: Cập nhật phần mới của nhóm.** Nhấn `Ctrl+Shift+P`, chọn **Git: Fetch**. Nhấn lại, chọn **Git: Merge Branch**,
rồi chọn `origin/develop`. Chạy thử lại. Nếu làm nhiều ngày, hãy làm bước này mỗi ngày.

**Bước 7: Đưa lên GitHub (push).** Bấm **Publish Branch**. Từ lần sau, bấm **Sync Changes**.

**Bước 8: Xin gộp (Pull Request).**

1. Mở trang repo trên GitHub, bấm **Compare & pull request**.
2. Kiểm tra ô **base** là `develop`. Đây là chỗ rất dễ nhầm.
3. Ghi bạn đã làm gì, cách chạy thử và có thay đổi cơ sở dữ liệu hay không.
4. Bấm **Create pull request**, rồi nhắn một bạn vào xem.

**Bước 9: Chờ góp ý.** Nếu cần sửa, sửa tiếp **trên chính nhánh đó**, rồi lặp lại bước 5 và 7.
Pull Request tự cập nhật.

**Bước 10: Hoàn tất.** Khi được duyệt, bấm **Squash and merge**, rồi xóa nhánh trên GitHub.
Việc tiếp theo bắt đầu lại từ bước 1.

## Phần 3: Khi bạn là người xem code

- Mở Pull Request, vào tab **Files changed** để đọc.
- Nếu thay đổi làm trang chạy khác đi, tải nhánh đó về và chạy thử.
- Kiểm tra không có mật khẩu, khóa bí mật hay file `.env`.
- Ổn thì chọn **Approve**. Chưa ổn thì nói rõ chỗ nào và vì sao.

## Phần 4: Khi gặp trục trặc

| Chuyện gì xảy ra | Nên làm gì |
|---|---|
| Báo không có quyền (403) | Kiểm tra đã chấp nhận lời mời chưa, và có đăng nhập đúng tài khoản không |
| Push bị từ chối vì trên GitHub có phần mới | Chọn **Git: Pull**, rồi push lại |
| Báo **conflict** (hai người sửa cùng chỗ) | Mở file bị đánh dấu, chọn phần cần giữ. Không chắc thì hỏi người viết đoạn kia. Sau đó chạy thử, lưu file, bấm **+** và commit |
| Lỡ làm trên `develop`, **chưa commit** | Tạo nhánh mới ngay. Phần đang sửa sẽ đi theo bạn |
| Lỡ commit trên `develop` hoặc không biết xử lý | Dừng lại và nhờ người trong nhóm |
| Lỡ đưa khóa bí mật lên | **Báo nhóm ngay để đổi khóa.** Chỉ xóa file là chưa đủ |

## 5 điều cần nhớ

1. Mỗi việc dùng một nhánh riêng.
2. Xem kỹ danh sách file trước khi commit.
3. Không đưa `.env`, mật khẩu hay khóa lên GitHub.
4. Không dùng **force push**.
5. Cẩn thận với **Discard Changes**: phần chưa commit có thể mất hẳn.
