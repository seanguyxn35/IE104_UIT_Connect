# Dữ liệu TRƯỚC khi chạy TC01–TC03

Chụp ngay sau khi chạy `database/reset.sql`, lúc **2026-11-12 03:23:55 UTC** (10:23:55 giờ Việt Nam).
Truy vấn (Supabase → SQL Editor):

```sql
SELECT t.topic_id, t.slots,
       count(a.application_id)                                       AS tong_don,
       count(a.application_id) FILTER (WHERE a.student_id = 9101)    AS don_cua_sv_a,
       count(a.application_id) FILTER (WHERE a.status = 'Accepted')  AS so_accepted,
       string_agg(a.application_id || ':' || a.student_id || ':' || a.status, ', ') AS chi_tiet
FROM lab_topic t LEFT JOIN lab_application a ON a.topic_id = t.topic_id
WHERE t.topic_id IN (9001, 9002, 9003)
GROUP BY t.topic_id, t.slots ORDER BY t.topic_id;
```

| topic_id | slots | tong_don | don_cua_sv_a | so_accepted | chi_tiet (mã đơn:SV:trạng thái) |
|---|---|---|---|---|---|
| 9001 | 3 | 0 | 0 | 0 | – |
| 9002 | 3 | 1 | 1 | 0 | 4:9101:Pending |
| 9003 | 1 | 1 | 0 | 1 | 5:9102:Accepted |
