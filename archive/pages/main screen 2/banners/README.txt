BANNER TRANG CHỦ (01_trang-chu.html)

1. Đặt ảnh vào thư mục này với tên:
     banner-1.jpg, banner-2.jpg, banner-3.jpg
   -> Mở lại trang chủ là ảnh tự thay khung mẫu, không cần sửa code.

2. Kích thước khuyến nghị: 1280 x 400 px (tỉ lệ 16:5).
   Ảnh khác tỉ lệ vẫn hiển thị nhưng sẽ bị cắt bớt 2 bên hoặc trên/dưới.

3. Ảnh .png / .webp: đổi phần src="banners/banner-N.jpg" trong 01_trang-chu.html
   (khối "0. BANNER TỰ ĐỘNG CHUYỂN") cho đúng đuôi file.

4. Thêm / bớt banner: trong khối đó, mỗi banner là một thẻ <a> nằm trong [data-banner-track].
   Chép thêm hoặc xoá thẻ <a> tương ứng; chấm chỉ vị trí tự cập nhật.
   data-path trên thẻ <a> là trang mở ra khi bấm vào banner (xem bảng ROUTES trong app-shell.js).

5. Thời gian tự chuyển: data-interval="5000" (mili giây) trên thẻ [data-banner-slider].
