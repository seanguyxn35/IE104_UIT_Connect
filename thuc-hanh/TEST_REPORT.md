# TEST REPORT – Sinh viên ứng tuyển đề tài Lab

| Mục | Giá trị |
|---|---|
| Chức năng | SV ứng tuyển đề tài Lab – màn SV-07 Chợ ghép nhóm, nút "Ứng tuyển ngay" |
| API | `POST /api/lab-applications` |
| Môi trường | Windows 11, Node.js 24.20, Express 5.3, Chrome (headless), Supabase PostgreSQL 17 (project `uit-connect`, Singapore) |
| Tài khoản thử | SV A, `student_id = 9101` (cấu hình `TEST_STUDENT_ID` ở máy chủ) |
| Ngày chạy | 2026-11-12, 10:23–10:24 giờ Việt Nam (03:23–03:24 UTC) |
| Chuẩn bị dữ liệu | Chạy `database/reset.sql` → dữ liệu trước: [evidence/DATA_before.md](evidence/DATA_before.md) |

## Tổng hợp

| Ca | Quy tắc | Đề tài | Mong đợi | Thực tế | Kết quả |
|---|---|---|---|---|---|
| TC01 | R1 | 9001 | `201`, thêm đúng 1 đơn | `201`, đơn #6 (9101, Pending); số đơn 0 → 1 | **Đạt** |
| TC02 | R2 | 9002 | `409 ALREADY_APPLIED`, không thêm đơn | `409 ALREADY_APPLIED`; số đơn 1 → 1 | **Đạt** |
| TC03 | R3 | 9003 | `409 TOPIC_FULL`, không thêm đơn | `409 TOPIC_FULL`; số đơn 1 → 1 | **Đạt** |

3/3 ca **Đạt**. Ba ca chạy liên tiếp sau một lần `reset.sql`; mỗi ca chỉ tác động lên một đề tài riêng nên không ảnh
hưởng lẫn nhau. Muốn chạy lại từng ca riêng lẻ thì chạy `reset.sql` trước ca đó.

---

## TC01 → R1: ứng tuyển thành công

| Mục | Nội dung |
|---|---|
| Điều kiện ban đầu | Đề tài 9001: `slots = 3`, 0 đơn. SV A chưa ứng tuyển 9001 |
| Bước thực hiện | 1. Mở `http://localhost:3000/pages/sv/07_cho-ghep-nhom.html` · 2. Bấm "Ứng tuyển ngay" ở thẻ thứ 1 (`data-topic-id="9001"`) |
| Kết quả mong đợi | Báo thành công; xuất hiện đúng 1 đơn mới `(9001, 9101, Pending)` |
| Kết quả thực tế | Request `POST /api/lab-applications {"topicId":9001}` → **`201`** `{"applicationId":6,"topicId":9001,"studentId":9101,"status":"Pending","appliedAt":"2026-11-12T03:24:11+00:00"}`. Giao diện: thông báo xanh "Ứng tuyển thành công! Giảng viên sẽ phản hồi sớm. (Mã đơn #6)", nút chuyển "Đã ứng tuyển". Dữ liệu: đề tài 9001 từ **0 → 1** đơn (`6:9101:Pending`) |
| Kết quả | **Đạt** |
| Minh chứng | [TC01_ui.png](evidence/TC01_ui.png) · [TC01_response.json](evidence/TC01_response.json) · [DATA_before.md](evidence/DATA_before.md) / [DATA_after.md](evidence/DATA_after.md) dòng 9001 |

## TC02 → R2: ứng tuyển trùng bị từ chối

| Mục | Nội dung |
|---|---|
| Điều kiện ban đầu | Đề tài 9002: `slots = 3`; SV A đã có đơn #4 `Pending` |
| Bước thực hiện | 1. Mở SV-07 · 2. Bấm "Ứng tuyển ngay" ở thẻ thứ 2 (`data-topic-id="9002"`) |
| Kết quả mong đợi | Báo đã ứng tuyển; số đơn của cặp (9002, 9101) không tăng |
| Kết quả thực tế | **`409`** `{"code":"ALREADY_APPLIED","message":"Bạn đã ứng tuyển đề tài này trước đó."}`. Giao diện: thông báo vàng cùng nội dung, nút chuyển "Đã ứng tuyển". Dữ liệu: đề tài 9002 giữ **1 → 1** đơn, vẫn chỉ có `4:9101:Pending` |
| Kết quả | **Đạt** |
| Minh chứng | [TC02_ui.png](evidence/TC02_ui.png) · [TC02_response.json](evidence/TC02_response.json) · DATA_before / DATA_after dòng 9002 |

## TC03 → R3: đề tài hết chỗ bị từ chối

| Mục | Nội dung |
|---|---|
| Điều kiện ban đầu | Đề tài 9003: `slots = 1`; SV B đã có đơn #5 `Accepted` (1/1 chỗ); `status` vẫn là `Open`. SV A chưa ứng tuyển 9003 |
| Bước thực hiện | 1. Mở SV-07 · 2. Bấm "Ứng tuyển ngay" ở thẻ thứ 3 (`data-topic-id="9003"`) |
| Kết quả mong đợi | Báo hết chỗ; không xuất hiện đơn mới |
| Kết quả thực tế | **`409`** `{"code":"TOPIC_FULL","message":"Đề tài đã đủ người."}`. Giao diện: thông báo vàng "Đề tài đã đủ người.", nút giữ "Ứng tuyển ngay". Dữ liệu: đề tài 9003 giữ **1 → 1** đơn, không có đơn của 9101 |
| Kết quả | **Đạt** |
| Minh chứng | [TC03_ui.png](evidence/TC03_ui.png) · [TC03_response.json](evidence/TC03_response.json) · DATA_before / DATA_after dòng 9003 |

TC03 cũng cho thấy R3 do **máy chủ đếm** số đơn `Accepted` so với `slots`, không dựa vào cột `status` (vẫn là `Open`).

---

## Cách lấy minh chứng

- **Giao diện và request/response:** chạy tự động bằng [tests/run_ui_tests.mjs](tests/run_ui_tests.mjs) – mở Chrome
  headless qua DevTools Protocol, bấm đúng nút trên trang như người dùng, chụp màn hình (`TCxx_ui.png`, nút được bấm
  có viền cam) và ghi request/response bắt từ tầng Network của Chrome (`TCxx_response.json`, tương đương tab Network).
  ```powershell
  # backend đang chạy (cd backend; npm start) và đã chạy database/reset.sql
  node thuc-hanh/tests/run_ui_tests.mjs
  ```
- **Log máy chủ:** [evidence/server_log.txt](evidence/server_log.txt) – mỗi yêu cầu một dòng (thời điểm, body, mã phản hồi).
- **Dữ liệu trước/sau:** truy vấn ghi trong [evidence/DATA_before.md](evidence/DATA_before.md), chạy trên Supabase SQL Editor.

## Kiểm tra bổ sung (đầu vào không hợp lệ, gọi API trực tiếp)

| Yêu cầu | Phản hồi thực tế |
|---|---|
| `{}` | `400 INVALID_INPUT` "topicId không hợp lệ." |
| `{"topicId":"abc"}` | `400 INVALID_INPUT` |
| `{"topicId":-5}` | `400 INVALID_INPUT` |
| Body không phải JSON | `400 INVALID_INPUT` "Body không phải JSON hợp lệ." |
| `{"topicId":1}` (không tồn tại) | `404 TOPIC_NOT_FOUND` |

## Sự cố gặp trong lúc chạy và cách xử lý

Lần chạy TC01 đầu tiên (10:20 giờ VN, trước bản sửa): máy chủ đã ghi đơn vào CSDL nhưng phản hồi từ Supabase về máy
chủ bị treo (mạng), nên giao diện kẹt ở "Đang gửi…". Đơn thừa đó đã được xóa bằng `reset.sql` trước lần chạy chính
thức ở trên. Đã bổ sung:

- Máy chủ: mỗi lệnh gọi Supabase chờ tối đa 10 giây rồi trả `500 SERVER_ERROR` (`backend/src/db.js`); log thêm trường
  hợp trình duyệt đóng kết nối trước khi có phản hồi (`backend/src/server.js`).
- Giao diện: `fetch` chờ tối đa 15 giây, quá hạn thì báo lỗi kết nối và mở lại nút (`frontend/assets/js/lab-application.js`).

Lưu ý: nếu phản hồi bị mất **sau** khi đơn đã ghi, SV bấm lại sẽ nhận `409 ALREADY_APPLIED` – không tạo đơn thứ hai
(R2 vẫn đúng).

## Chưa kiểm tra

- Hai yêu cầu trùng gửi **đồng thời** (lớp bảo vệ bằng ràng buộc `uq_lab_application` – mã `23505`): có trong mã nguồn,
  chưa có ca kiểm thử riêng.
- Trường hợp vượt thời gian chờ 10 giây / 15 giây: chưa tái hiện có chủ đích sau khi sửa.
- 3 nút "Ứng tuyển ngay" còn lại trên SV-07 chưa nối với dữ liệu (ngoài phạm vi bài).
