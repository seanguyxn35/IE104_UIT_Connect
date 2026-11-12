# DESIGN – Sinh viên ứng tuyển đề tài Lab

Chức năng thuộc đồ án **UIT Connect**, màn **SV-07 Chợ ghép nhóm**
([frontend/pages/sv/07_cho-ghep-nhom.html](../frontend/pages/sv/07_cho-ghep-nhom.html)), nút **"Ứng tuyển ngay"**.

| Mục | Bước của đề | Nội dung |
|---|---|---|
| 1 | Bước 1 | Yêu cầu người dùng, quy tắc R1–R3 |
| 2 | Bước 2 | Thiết kế cơ sở dữ liệu, dữ liệu thử |
| 3 | Bước 3 | Luồng nghiệp vụ, hai điểm từ chối, hợp đồng API |
| 4 | Bước 4 | Vị trí mã nguồn, cách chạy |
| 5 | Bước 5 | Kiểm thử (chi tiết trong `TEST_REPORT.md`) |

---

## 1. Yêu cầu người dùng

| Mục | Nội dung |
|---|---|
| Ai | Sinh viên đã đăng nhập (bài này dùng tài khoản thử SV A, `student_id = 9101`, cấu hình ở máy chủ) |
| Muốn làm gì | Ứng tuyển vào một đề tài nghiên cứu do giảng viên/Lab đăng |
| Vì sao | Để giảng viên xem xét và nhận vào nhóm thực hiện đề tài |
| Điều kiện trước | Đề tài tồn tại; SV có hồ sơ (`student_profile`) |
| Kết quả sau | Có đúng một đơn `lab_application` trạng thái `Pending` gắn SV với đề tài |

| Quy tắc | Giao diện hiển thị | Dữ liệu |
|---|---|---|
| **R1** – Còn chỗ và SV chưa ứng tuyển đề tài này | "Ứng tuyển thành công" | Tạo **đúng 1** dòng `lab_application` (`Pending`) |
| **R2** – SV đã ứng tuyển đề tài này (đơn ở bất kỳ trạng thái nào) | "Bạn đã ứng tuyển đề tài này trước đó" | **Không** tạo dòng thứ hai |
| **R3** – Đề tài hết chỗ: số đơn `Accepted` ≥ `slots` | "Đề tài đã đủ người" | **Không** tạo dòng mới |

## 2. Thiết kế cơ sở dữ liệu

Dùng 2 bảng có sẵn trong lược đồ đồ án ([database/schema.postgres.sql](../database/schema.postgres.sql)), không thêm bảng/cột.

| Bảng | Trường dùng tới | Ràng buộc liên quan |
|---|---|---|
| `lab_topic` | `topic_id` (PK), `lecturer_id` (FK → `lecturer_profile`), `title`, `slots`, `status`, `deadline` | `ck_lab_topic_slots`: `slots >= 1` |
| `lab_application` | `application_id` (PK), `topic_id` (FK → `lab_topic`), `student_id` (FK → `student_profile`), `status`, `applied_at` | **`uq_lab_application UNIQUE (topic_id, student_id)`** – chặn đơn trùng ở tầng dữ liệu (R2); `ck_lab_application_status` |

Quan hệ: một đề tài có nhiều đơn ứng tuyển; một SV ứng tuyển nhiều đề tài nhưng mỗi đề tài tối đa một đơn.

```
lecturer_profile 1 ──< lab_topic 1 ──< lab_application >── 1 student_profile
```

**Số chỗ còn** = `slots` − số đơn `status = 'Accepted'` của đề tài (đơn `Pending` chưa chiếm chỗ).

Dữ liệu thử: [database/seed.sql](../database/seed.sql) (chạy 1 lần), [database/reset.sql](../database/reset.sql) (chạy trước mỗi ca).

| Đề tài | Thiết lập | Ca |
|---|---|---|
| 9001 | `slots = 3`, chưa có đơn | TC01 → R1 |
| 9002 | SV A (9101) đã có đơn `Pending` | TC02 → R2 |
| 9003 | `slots = 1`, SV B (9102) đã có đơn `Accepted` | TC03 → R3 |

---

## 3. Luồng nghiệp vụ và API

### 3.1 Luồng xử lý

```mermaid
sequenceDiagram
    autonumber
    actor SV as Sinh viên
    participant UI as Giao diện SV-07
    participant API as Route POST /api/lab-applications
    participant SVC as labApplicationService
    participant DB as Supabase (PostgreSQL)

    SV->>UI: Bấm "Ứng tuyển ngay" (đề tài X)
    UI->>UI: Khóa nút, hiện "Đang gửi…"
    UI->>API: POST { topicId: X }
    API->>API: Kiểm tra topicId hợp lệ; studentId = TEST_STUDENT_ID (máy chủ)
    API->>SVC: apply(studentId, topicId)
    SVC->>DB: Đọc đề tài X (slots)
    alt Không có đề tài X
        SVC-->>API: TOPIC_NOT_FOUND
        API-->>UI: 404
    end
    SVC->>DB: Tìm đơn (topic_id = X, student_id)
    alt ĐIỂM TỪ CHỐI 1 – R2: đã có đơn
        SVC-->>API: ALREADY_APPLIED (không ghi)
        API-->>UI: 409 ALREADY_APPLIED
    end
    SVC->>DB: Đếm đơn Accepted của đề tài X
    alt ĐIỂM TỪ CHỐI 2 – R3: Accepted >= slots
        SVC-->>API: TOPIC_FULL (không ghi)
        API-->>UI: 409 TOPIC_FULL
    end
    SVC->>DB: INSERT lab_application (X, studentId, 'Pending')
    DB-->>SVC: application_id
    SVC-->>API: Đơn mới
    API-->>UI: 201 { applicationId, ... }
    UI->>SV: Hiển thị thông báo theo kết quả
```

Mô tả bằng bước đánh số (khớp sơ đồ):

1. **Giao diện** – SV bấm "Ứng tuyển ngay" trên thẻ đề tài; mã đề tài lấy từ thuộc tính `data-topic-id` của nút.
2. **Giao diện** – Khóa nút và hiện "Đang gửi…" để tránh bấm nhiều lần.
3. **Giao diện → API** – Gửi `POST /api/lab-applications` với body `{ "topicId": X }`.
4. **API** – Kiểm tra `topicId` là số nguyên dương (sai → `400`). Danh tính SV **không** lấy từ client mà lấy từ
   tài khoản thử cấu hình ở máy chủ (`TEST_STUDENT_ID` trong `backend/.env`), thay cho phiên đăng nhập.
5. **Nghiệp vụ** – Đọc đề tài X; không có → `404 TOPIC_NOT_FOUND`.
6. **Nghiệp vụ – kiểm tra R2** – Tìm đơn có `(topic_id = X, student_id)`. Có → trả `409 ALREADY_APPLIED`, **dừng**.
7. **Nghiệp vụ – kiểm tra R3** – Đếm đơn `Accepted` của X. `>= slots` → trả `409 TOPIC_FULL`, **dừng**.
8. **Dữ liệu** – Chỉ khi qua cả hai kiểm tra mới `INSERT` một dòng `lab_application` trạng thái `Pending`.
9. **API → Giao diện** – Trả `201` kèm mã đơn.
10. **Giao diện** – Hiển thị thông báo tương ứng (bảng 3.3). Với `201` và `ALREADY_APPLIED`, nút chuyển thành
    "Đã ứng tuyển" (vô hiệu); với lỗi khác, mở lại nút để thử lại.

**Thứ tự kiểm tra: trùng trước, sức chứa sau.** Nếu SV đã ứng tuyển một đề tài đã đầy, thông báo "đã ứng tuyển"
đúng với tình trạng của SV hơn "hết chỗ".

### 3.2 Hai điểm từ chối và vì sao không ghi dữ liệu

| Điểm | Quy tắc | Điều kiện | Vì sao không ghi |
|---|---|---|---|
| Bước 6 | R2 | Đã tồn tại đơn `(topic_id, student_id)` | Hàm nghiệp vụ `return` lỗi **trước** câu `INSERT` – câu lệnh ghi duy nhất của chức năng. Các bước trước đó chỉ `SELECT` (đọc). **Lớp bảo vệ thứ hai:** ràng buộc `uq_lab_application UNIQUE (topic_id, student_id)`; nếu hai yêu cầu trùng đến cùng lúc và cùng qua bước 6, CSDL từ chối `INSERT` thứ hai (mã lỗi PostgreSQL `23505`), máy chủ chuyển thành `409 ALREADY_APPLIED`. |
| Bước 7 | R3 | Số đơn `Accepted` ≥ `slots` | Tương tự: trả lỗi trước `INSERT`, không có câu ghi nào được thực thi. |

Kiểm chứng ở Bước 5: đếm số dòng `lab_application` của đề tài trước và sau mỗi ca – ca bị từ chối phải không đổi.

**Giới hạn đã biết (R3):** R3 không có ràng buộc tương ứng trong CSDL. Thư viện `supabase-js` không mở transaction
qua nhiều lệnh, nên về lý thuyết hai yêu cầu đồng thời có thể cùng qua bước 7. Ở chức năng này rủi ro thấp vì
đơn mới luôn là `Pending` – không làm tăng số đơn `Accepted` mà R3 đếm. Muốn chặn tuyệt đối thì chuyển bước 6–8
vào một hàm PostgreSQL chạy trong một transaction có khóa dòng đề tài (`SELECT … FOR UPDATE`).

### 3.3 Hợp đồng API

**Yêu cầu**

| Mục | Giá trị |
|---|---|
| Phương thức, đường dẫn | `POST /api/lab-applications` |
| Header | `Content-Type: application/json` |
| Body | `{ "topicId": 9001 }` – `topicId`: số nguyên dương, bắt buộc |
| Danh tính | Lấy từ máy chủ (`TEST_STUDENT_ID`), client không gửi `studentId` (có gửi cũng bị bỏ qua) |

**Phản hồi** – lỗi luôn có dạng `{ "code": "...", "message": "..." }`.

| HTTP | `code` | Khi nào | Body mẫu | Giao diện hiển thị |
|---|---|---|---|---|
| `201 Created` | – | R1: qua cả hai kiểm tra, đã tạo đơn | `{ "applicationId": 15, "topicId": 9001, "studentId": 9101, "status": "Pending", "appliedAt": "2026-11-12T10:15:00+00:00" }` | "Ứng tuyển thành công! Giảng viên sẽ phản hồi sớm." |
| `409 Conflict` | `ALREADY_APPLIED` | R2 | `{ "code": "ALREADY_APPLIED", "message": "Bạn đã ứng tuyển đề tài này trước đó." }` | Nội dung `message` |
| `409 Conflict` | `TOPIC_FULL` | R3 | `{ "code": "TOPIC_FULL", "message": "Đề tài đã đủ người." }` | Nội dung `message` |
| `400 Bad Request` | `INVALID_INPUT` | `topicId` thiếu / không phải số nguyên dương | `{ "code": "INVALID_INPUT", "message": "topicId không hợp lệ." }` | "Dữ liệu gửi lên không hợp lệ." |
| `404 Not Found` | `TOPIC_NOT_FOUND` | Không có đề tài | `{ "code": "TOPIC_NOT_FOUND", "message": "Không tìm thấy đề tài." }` | Nội dung `message` |
| `500` | `SERVER_ERROR` | Lỗi kết nối CSDL hoặc lỗi không lường trước | `{ "code": "SERVER_ERROR", "message": "Có lỗi xảy ra, vui lòng thử lại." }` | Nội dung `message` |

R2 và R3 cùng là `409` (xung đột với trạng thái dữ liệu hiện có); giao diện phân biệt bằng `code`, không dựa vào
câu chữ của `message`.

### 3.4 Đối chiếu quy tắc → luồng → API → kiểm thử

| Quy tắc | Bước trong luồng | Phản hồi | Bảo vệ ở dữ liệu | Ca kiểm thử |
|---|---|---|---|---|
| R1 | 5 → 6 → 7 → 8 → 9 | `201` | – | TC01 (đề tài 9001) |
| R2 | 6 (dừng) | `409 ALREADY_APPLIED` | `uq_lab_application` | TC02 (đề tài 9002) |
| R3 | 7 (dừng) | `409 TOPIC_FULL` | – (giới hạn ở 3.2) | TC03 (đề tài 9003) |

---

## 4. Vị trí mã nguồn

Công nghệ: HTML + Tailwind (CDN) + JavaScript thuần ở giao diện; Node.js 20.6+ với Express 5 ở máy chủ;
PostgreSQL trên Supabase, truy cập qua `@supabase/supabase-js` bằng secret key (chỉ ở máy chủ).

| Phần | Vị trí | Thành phần cần chỉ ra |
|---|---|---|
| Giao diện | [frontend/pages/sv/07_cho-ghep-nhom.html](../frontend/pages/sv/07_cho-ghep-nhom.html) | 3 nút "Ứng tuyển ngay" đầu tiên có `data-topic-id` = 9001 / 9002 / 9003; thẻ `<script src="…/lab-application.js">` cuối trang |
| | [frontend/assets/js/lab-application.js](../frontend/assets/js/lab-application.js) | `apply(button)`: gửi `fetch` (bước 2–3, 10); `setButtonState`: "Đang gửi…" / "Đã ứng tuyển"; `showResult`: hộp thông báo góc phải |
| API | [backend/src/routes/labApplications.js](../backend/src/routes/labApplications.js) | `labApplicationsRouter.post('/')`: kiểm tra `topicId` (bước 4), lấy `studentId` từ `config.testStudentId`, trả `201` |
| | [backend/src/server.js](../backend/src/server.js) | Gắn route vào `/api/lab-applications`; bộ xử lý lỗi chung đổi `AppError` thành `{ code, message }`; phục vụ thư mục `frontend/` |
| Nghiệp vụ | [backend/src/services/labApplicationService.js](../backend/src/services/labApplicationService.js) | `applyToTopic(studentId, topicId)`: bước 5 đọc đề tài, **bước 6 kiểm tra R2**, **bước 7 kiểm tra R3**, bước 8 `insert`; bắt mã `23505` |
| Dữ liệu | [database/schema.postgres.sql](../database/schema.postgres.sql) | Bảng `lab_topic`, `lab_application`, ràng buộc `uq_lab_application` |
| | [database/seed.sql](../database/seed.sql), [database/reset.sql](../database/reset.sql) | Dữ liệu thử và đặt lại dữ liệu trước mỗi ca |
| Cấu hình | `backend/.env` (không commit), [backend/.env.example](../backend/.env.example) | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `TEST_STUDENT_ID=9101`, `PORT` |
| Kiểm thử | `thuc-hanh/TEST_REPORT.md`, `thuc-hanh/evidence/` | TC01–TC03 |

Đối chiếu mẫu (theo đề): **R2 "không ứng tuyển trùng"** → `applyToTopic`, khối "Bước 6 – R2" (đếm đơn theo
`topic_id` + `student_id`, có thì ném `AppError(409, 'ALREADY_APPLIED')` trước `insert`) → ràng buộc
`uq_lab_application` ở dữ liệu (bắt `23505`) → TC02 so sánh phản hồi và số đơn trước/sau.
R1: khối "Bước 8" → TC01. R3: khối "Bước 7 – R3" → TC03.

**Cách chạy**

```powershell
cd backend
npm install          # lần đầu
npm start            # http://localhost:3000
```

Mở `http://localhost:3000/pages/sv/07_cho-ghep-nhom.html` (không mở bằng `file://`, vì `fetch` tới `/api` sẽ lỗi).
Mỗi yêu cầu API được ghi một dòng log ở cửa sổ chạy server: phương thức, body, mã phản hồi.

**Giới hạn của giao diện:** nội dung 6 thẻ đề tài trên SV-07 vẫn là dữ liệu mẫu tĩnh của prototype; chỉ 3 nút
"Ứng tuyển ngay" đầu tiên được nối với 3 đề tài thử (rê chuột lên nút sẽ thấy mã đề tài). 3 nút còn lại chưa nối.

## 5. Kiểm thử

Chi tiết từng ca (điều kiện, bước, mong đợi, thực tế, minh chứng): [TEST_REPORT.md](TEST_REPORT.md).
Chạy ngày 2026-11-12 sau `database/reset.sql`.

| Ca | Quy tắc | Phản hồi thực tế | Số đơn của đề tài trước → sau | Kết quả |
|---|---|---|---|---|
| TC01 | R1 | `201`, đơn #6 (9101, Pending) | 9001: 0 → 1 | Đạt |
| TC02 | R2 | `409 ALREADY_APPLIED` | 9002: 1 → 1 | Đạt |
| TC03 | R3 | `409 TOPIC_FULL` | 9003: 1 → 1 | Đạt |

Minh chứng: `evidence/TCxx_ui.png` (giao diện), `evidence/TCxx_response.json` (request/response),
`evidence/DATA_before.md`, `evidence/DATA_after.md` (dữ liệu), `evidence/server_log.txt` (log máy chủ).
Kiểm thử giao diện tự động: `node thuc-hanh/tests/run_ui_tests.mjs`.
