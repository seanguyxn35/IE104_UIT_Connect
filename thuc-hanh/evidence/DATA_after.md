# Dữ liệu SAU khi chạy TC01–TC03

Chụp lúc **2026-11-12 03:24:27 UTC** (10:24:27 giờ Việt Nam), ngay sau ca TC03. Cùng truy vấn với `DATA_before.md`.

| topic_id | slots | tong_don | don_cua_sv_a | so_accepted | chi_tiet (mã đơn:SV:trạng thái) |
|---|---|---|---|---|---|
| 9001 | 3 | **1** | **1** | 0 | **6:9101:Pending** |
| 9002 | 3 | 1 | 1 | 0 | 4:9101:Pending |
| 9003 | 1 | 1 | 0 | 1 | 5:9102:Accepted |

So với trước:

| Ca | Đề tài | tong_don trước → sau | Kết luận |
|---|---|---|---|
| TC01 (R1) | 9001 | 0 → **1** | Tạo đúng 1 đơn mới (#6, SV 9101, Pending) |
| TC02 (R2) | 9002 | 1 → 1 | Không tạo đơn thứ hai cho cặp (9002, 9101) |
| TC03 (R3) | 9003 | 1 → 1 | Không tạo đơn mới |
