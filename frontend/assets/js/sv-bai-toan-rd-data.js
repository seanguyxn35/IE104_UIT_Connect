// Dữ liệu và tiện ích dùng chung cho nhóm trang "Bài toán DN & R&D" của Sinh viên
// (SV-09 danh sách, SV-13 chi tiết & ứng tuyển).
//
// Nguồn bài toán:
//   1. Bài toán do Doanh nghiệp đăng ở luồng DN (DN-05), đọc qua window.DnBaiToan (dn-bai-toan-data.js).
//      Chỉ bài đã được Admin duyệt (Đang mở, Đang thực hiện) mới hiện cho sinh viên.
//      DN đăng / sửa bài trên cùng trình duyệt thì SV thấy ngay sau khi bài ở trạng thái công khai.
//   2. Bài toán mẫu của các doanh nghiệp / Lab khác (CONG_TY_KHAC) cho đủ danh sách khi chưa có API.
//
// Chưa có API bài toán R&D phía SV: lưu bài toán và proposal chỉ lưu tạm trong localStorage, trang phải báo "chưa lưu".
// Proposal SV nộp cho bài toán của DN được ghi vào kho dùng chung (DnBaiToan.nopProposalSv) nên hiện trong Hộp thư DN-08,
// và trạng thái DN cập nhật (hẹn / chấp nhận / từ chối) hiện lại ở SV-13.
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var KHOA_DA_LUU = 'uitc.sv.baiToanDaLuu.v1';

  // Sinh viên đang đăng nhập (chưa có đăng nhập thật: khớp SV mẫu Nguyễn Văn An ở SV-04 và dữ liệu DN)
  var SINH_VIEN = {
    ten: 'Nguyễn Văn An', kyHieu: 'VA', mssv: '21520001',
    khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHMT2021 (K19)', gpa: '8.92', drl: 94,
    kyNang: ['PyTorch', 'Computer Vision', 'Edge AI', 'NVIDIA Jetson', 'Python', 'eBPF', 'Network Security', 'LLM', 'RAG']
  };

  // Nhóm sinh viên đang tham gia (SV-06)
  var NHOM_CUA_TOI = [
    { id: 'visionlab', ten: 'VisionLab UIT', thanhVien: [
      { ten: 'Nguyễn Văn An', truongNhom: true, mssv: '21520001', vaiTro: 'Xử lý mô hình AI & Pipeline tối ưu hóa', gpa: '8.92' },
      { ten: 'Đặng Hoàng Nam', mssv: '21520342', vaiTro: 'Nhúng phần cứng & NVIDIA Jetson Edge SDK', gpa: '8.45' },
      { ten: 'Vũ Thảo Nhi', mssv: '21520678', vaiTro: 'Thu thập dữ liệu & Dashboard Web', gpa: '8.60' }
    ] },
    { id: 'nlp-k19', ten: 'UIT NLP Team K19', thanhVien: [
      { ten: 'Nguyễn Văn An', mssv: '21520001', vaiTro: 'Huấn luyện mô hình ngôn ngữ', gpa: '8.92' },
      { ten: 'Trần Khánh Linh', truongNhom: true, mssv: '21520455', vaiTro: 'Xử lý dữ liệu tiếng Việt', gpa: '8.71' },
      { ten: 'Lê Hữu Phước', mssv: '21520512', vaiTro: 'RAG & Vector DB', gpa: '8.33' },
      { ten: 'Phan Mỹ Duyên', mssv: '21520590', vaiTro: 'Đánh giá & báo cáo', gpa: '8.48' }
    ] }
  ];

  var GV_HUONG_DAN = ['TS. Lê Minh Quân – Khoa KHMT', 'PGS.TS. Trần Thị Hoa – Khoa KTMT', 'ThS. Phạm Đức Long – Khoa MMT&TT'];

  // Doanh nghiệp đang dùng luồng DN (DN 9501)
  var DN_LUONG_DN = {
    ten: 'V-Tech Global', kyHieu: 'VT', diaChi: 'TP. Thủ Đức, TP.HCM', daXacMinh: true,
    linhVucHD: 'Giải pháp thanh toán, AI & tự động hóa', quyMo: '500 – 1.000 nhân sự',
    gioiThieu: 'V-Tech Global nghiên cứu và phát triển giải pháp công nghệ cho thanh toán số, y tế và nhà máy thông minh; đối tác R&D của UIT trên UIT Connect.'
  };

  var LOAI_SV = {
    'ung-tuyen': { ten: 'Đang mở ứng tuyển', tab: 'Đang mở ứng tuyển', lop: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'hop-tac-lab': { ten: 'Dự án hợp tác Lab', tab: 'Dự án hợp tác Lab', lop: 'bg-blue-50 text-blue-700 border-blue-200' },
    'tai-tro': { ten: 'Doanh nghiệp tài trợ', tab: 'Doanh nghiệp tài trợ', lop: 'bg-amber-50 text-amber-700 border-amber-200' }
  };

  // Trạng thái proposal nhìn từ phía sinh viên (cùng mã với TRANG_THAI_PROPOSAL của DN-08)
  var TRANG_THAI_PROPOSAL_SV = {
    'cho-phan-hoi': { ten: 'Chờ doanh nghiệp phản hồi', icon: 'hourglass_top', lop: 'bg-amber-50 text-amber-800 border-amber-200' },
    'da-hen': { ten: 'Doanh nghiệp đã hẹn trao đổi', icon: 'event_available', lop: 'bg-blue-50 text-blue-800 border-blue-200' },
    'dam-phan': { ten: 'Đang đàm phán với doanh nghiệp', icon: 'handshake', lop: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    'tu-choi': { ten: 'Doanh nghiệp đã từ chối', icon: 'block', lop: 'bg-red-50 text-red-700 border-red-200' }
  };

  var MUC_KINH_PHI = {
    'duoi-50': { ten: 'Dưới 50 triệu VNĐ', khop: function (m) { return m < 50; } },
    '50-100': { ten: '50 – 100 triệu VNĐ', khop: function (m) { return m >= 50 && m <= 100; } },
    'tren-100': { ten: 'Trên 100 triệu VNĐ', khop: function (m) { return m > 100; } }
  };

  // ---------- Bài toán mẫu của doanh nghiệp / Lab khác ----------
  // nganSach tính bằng triệu VNĐ; thoiGian tính bằng tuần.
  function bt(o) {
    var moTa = '<p>' + o.gioiThieu + '</p><p><b>Thách thức kỹ thuật:</b></p><ol>' +
      o.thachThuc.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
      '<p><b>Đầu ra mong đợi:</b> ' + o.dauRa + '</p>';
    var n = o.thoiGian;
    return {
      ma: o.ma, tieuDe: o.tieuDe, loai: o.loai, linhVuc: o.linhVuc, trangThai: o.trangThai || 'dang-mo',
      tomTat: o.tomTat, moTa: moTa,
      tepDinhKem: [{ ten: 'De_bai_' + o.ma.replace(/-/g, '_') + '.pdf', kichThuoc: o.kichThuocTep || '1.2 MB' }],
      kyNang: o.kyNang, doiTuong: o.doiTuong, quyMoNhom: o.quyMoNhom, trl: o.trl,
      sanPham: o.sanPham, tieuChi: o.tieuChi, yeuCauNda: !!o.yeuCauNda,
      nganSach: { min: o.kinhPhi, max: o.kinhPhi }, hanNop: o.hanNop, ngayBatDau: o.ngayBatDau,
      thoiGian: n, hinhThuc: o.hinhThuc, diaDiem: o.diaDiem, ngayDang: o.ngayDang,
      moc: [
        { ten: 'Khảo sát & thiết kế giải pháp', tuan: Math.round(n * 0.25), phanTram: 30 },
        { ten: 'Hiện thực & thử nghiệm', tuan: Math.round(n * 0.75), phanTram: 40 },
        { ten: 'Hoàn thiện & bàn giao', tuan: n, phanTram: 30 }
      ],
      doanhNghiep: o.dn
    };
  }

  var CONG_TY_KHAC = [
    bt({
      ma: 'RD-2026-101', loai: 'ung-tuyen', linhVuc: 'ai', kinhPhi: 60, hanNop: '2026-12-20', ngayBatDau: '2027-01-05', thoiGian: 16, ngayDang: '2026-11-22',
      tieuDe: 'Tối ưu hóa mô hình Large Language Model (LLM) phục vụ tra cứu văn bản pháp luật nội bộ',
      tomTat: 'Đề tài hướng tới việc tinh chỉnh (fine-tuning) và áp dụng kỹ thuật RAG trên mô hình mã nguồn mở để giải bài toán hỏi đáp văn bản quy phạm pháp luật với độ chính xác trên 92%.',
      gioiThieu: 'Bộ phận pháp chế cần trợ lý hỏi đáp trên kho hơn 20.000 văn bản quy phạm và quy định nội bộ, trả lời bằng tiếng Việt và luôn dẫn nguồn.',
      thachThuc: ['Fine-tune mô hình mở 7B trên dữ liệu pháp luật tiếng Việt.', 'Xây dựng RAG truy hồi theo điều, khoản, có xử lý văn bản hết hiệu lực.', 'Độ chính xác trên bộ câu hỏi đánh giá ≥ 92%.'],
      dauRa: 'mã nguồn pipeline RAG, mô hình đã tinh chỉnh, báo cáo đánh giá.',
      kyNang: ['PyTorch', 'LangChain', 'Vector DB', 'RAG', 'LLM'], doiTuong: ['nhom-sv', 'ca-nhan'], quyMoNhom: { min: 1, max: 4 }, trl: 3,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật'], tieuChi: 'Kinh nghiệm NLP tiếng Việt; kết quả thử nghiệm sơ bộ trên bộ câu hỏi mẫu.',
      hinhThuc: 'ket-hop', diaDiem: 'Khu Công nghệ cao TP.HCM', yeuCauNda: true,
      dn: { ten: 'FPT Software AIC', diaChi: 'Khu Công nghệ cao TP.HCM', logo: 'img-08.jpg', linhVucHD: 'Phần mềm & Trí tuệ nhân tạo', quyMo: 'Trên 10.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-102', loai: 'ung-tuyen', linhVuc: 'sec', kinhPhi: 45, hanNop: '2027-01-10', ngayBatDau: '2027-02-01', thoiGian: 14, ngayDang: '2026-11-20',
      tieuDe: 'Phát hiện bất thường và tấn công DDoS tầng ứng dụng bằng thuật toán phân loại hành vi',
      tomTat: 'Xây dựng giải pháp giám sát lưu lượng mạng thời gian thực, tự động trích xuất đặc trưng và nhận diện các chiến dịch tấn công HTTP-Flood tinh vi với độ trễ dưới 2 giây.',
      gioiThieu: 'Trung tâm giám sát an ninh mạng cần lớp phát hiện sớm các chiến dịch HTTP-Flood giả dạng người dùng thật.',
      thachThuc: ['Trích xuất đặc trưng hành vi phiên bằng eBPF.', 'Phân loại hành vi với độ trễ cảnh báo dưới 2 giây.', 'Giảm cảnh báo giả xuống dưới 1%.'],
      dauRa: 'mô-đun phát hiện, bộ dữ liệu đã gán nhãn, báo cáo kỹ thuật.',
      kyNang: ['Network Security', 'eBPF', 'Scikit-learn', 'Python'], doiTuong: ['nhom-sv'], quyMoNhom: { min: 2, max: 4 }, trl: 3,
      sanPham: ['Mã nguồn', 'Bộ dữ liệu', 'Báo cáo kỹ thuật'], tieuChi: 'Hiểu biết về giao thức HTTP và các kiểu tấn công DDoS; kinh nghiệm học máy.',
      hinhThuc: 'tai-dn', diaDiem: 'Quận 10, TP.HCM', yeuCauNda: true,
      dn: { ten: 'Viettel Cyber Security', diaChi: 'Quận 10, TP.HCM', logo: 'img-06.jpg', linhVucHD: 'An ninh mạng', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-103', loai: 'hop-tac-lab', linhVuc: 'robot', kinhPhi: 80, hanNop: '2027-01-20', ngayBatDau: '2027-02-15', thoiGian: 24, ngayDang: '2026-11-18',
      tieuDe: 'Hệ thống Edge-AI tích hợp cảm biến LiDAR cho xe tự hành cỡ nhỏ trong nhà máy thông minh',
      tomTat: 'Phối hợp cùng phòng thí nghiệm UIT Embedded Lab để thiết kế thuật toán SLAM 3D và điều hướng chính xác cao chạy trên kit NVIDIA Jetson Orin Nano.',
      gioiThieu: 'Doanh nghiệp cần nguyên mẫu xe tự hành cỡ nhỏ vận chuyển linh kiện giữa các trạm trong nhà máy, không dùng vạch từ.',
      thachThuc: ['SLAM 3D kết hợp LiDAR và IMU, sai số dưới 3 cm.', 'Điều hướng tránh vật cản động chạy trên Jetson Orin Nano.', 'Kiểm thử trong mô phỏng trước khi chạy thật.'],
      dauRa: 'mã nguồn ROS 2, bản demo trên xe mẫu, báo cáo kỹ thuật.',
      kyNang: ['ROS2', 'NVIDIA Jetson', 'C/C++', 'LiDAR SLAM'], doiTuong: ['lab', 'nhom-sv'], quyMoNhom: { min: 3, max: 6 }, trl: 4,
      sanPham: ['Mã nguồn', 'Bản demo / prototype', 'Báo cáo kỹ thuật'], tieuChi: 'Có GV hướng dẫn mảng robot; kinh nghiệm ROS 2.',
      hinhThuc: 'ket-hop', diaDiem: 'Tân Bình, TP.HCM', yeuCauNda: true,
      dn: { ten: 'Bosch Global Software', diaChi: 'Tân Bình, TP.HCM', logo: 'img-09.jpg', linhVucHD: 'Phần mềm ô tô & IoT', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-104', loai: 'ung-tuyen', linhVuc: 'data', kinhPhi: 50, hanNop: '2026-12-31', ngayBatDau: '2027-01-15', thoiGian: 16, ngayDang: '2026-11-15',
      tieuDe: 'Phát hiện gian lận thanh toán trực tuyến sử dụng mô hình học đồ thị (Graph Neural Network)',
      tomTat: 'Mô hình hóa lịch sử chuyển tiền thành cấu trúc đồ thị không đồng nhất, huấn luyện mô hình GNN phân biệt các tài khoản rửa tiền và mạng lưới gian lận có tổ chức.',
      gioiThieu: 'Ví điện tử cần phát hiện các nhóm tài khoản phối hợp gian lận mà mô hình theo từng giao dịch đơn lẻ bỏ sót.',
      thachThuc: ['Xây dựng đồ thị không đồng nhất từ dữ liệu giao dịch đã ẩn danh.', 'Huấn luyện GNN phát hiện cụm tài khoản bất thường.', 'Suy luận theo lô hằng giờ trên luồng Kafka.'],
      dauRa: 'mã nguồn, mô hình đã huấn luyện, báo cáo đánh giá trên dữ liệu thật đã ẩn danh.',
      kyNang: ['PyTorch Geometric', 'Kafka', 'Python', 'SQL'], doiTuong: ['nhom-sv', 'ca-nhan'], quyMoNhom: { min: 1, max: 4 }, trl: 3,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật'], tieuChi: 'Kiến thức học sâu trên đồ thị; kinh nghiệm xử lý dữ liệu lớn.',
      hinhThuc: 'ket-hop', diaDiem: 'Quận 7, TP.HCM', yeuCauNda: true,
      dn: { ten: 'MoMo Innovation Hub', diaChi: 'Quận 7, TP.HCM', logo: 'img-16.jpg', linhVucHD: 'Công nghệ tài chính (FinTech)', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-105', loai: 'tai-tro', linhVuc: 'ai', kinhPhi: 75, hanNop: '2027-02-15', ngayBatDau: '2027-03-01', thoiGian: 28, ngayDang: '2026-11-12',
      tieuDe: 'Phân đoạn tự động tổn thương phổi trên ảnh chụp cắt lớp vi tính (CT scan) đa lát cắt',
      tomTat: 'Đề tài tài trợ 100% kinh phí tính toán GPU trên cloud, hỗ trợ sinh viên và giảng viên công bố bài báo quốc tế tại các hội nghị chuẩn mực IEEE / MICCAI.',
      gioiThieu: 'Doanh nghiệp tài trợ toàn bộ chi phí GPU và dữ liệu CT đã ẩn danh cho nhóm nghiên cứu phân đoạn tổn thương phổi.',
      thachThuc: ['Phân đoạn 3D trên ảnh CT đa lát cắt với Dice ≥ 0,85.', 'Xử lý dữ liệu không cân bằng giữa các loại tổn thương.', 'Đối sánh kết quả với bác sĩ chẩn đoán hình ảnh.'],
      dauRa: 'mô hình, mã nguồn và một bài báo gửi hội nghị quốc tế.',
      kyNang: ['Medical Imaging', 'MONAI', '3D U-Net', 'PyTorch'], doiTuong: ['lab', 'nhom-sv'], quyMoNhom: { min: 2, max: 5 }, trl: 2,
      sanPham: ['Mô hình đã huấn luyện', 'Mã nguồn', 'Bài báo khoa học'], tieuChi: 'Có định hướng công bố khoa học; kinh nghiệm xử lý ảnh y tế là lợi thế.',
      hinhThuc: 'tu-xa', diaDiem: 'Hà Nội & Từ xa', yeuCauNda: true,
      dn: { ten: 'VinBrain Healthcare AI', diaChi: 'Hà Nội & Từ xa', logo: 'img-17.jpg', linhVucHD: 'AI trong y tế', quyMo: '100 – 500 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-106', loai: 'ung-tuyen', linhVuc: 'cloud', kinhPhi: 40, hanNop: '2026-12-15', ngayBatDau: '2027-01-04', thoiGian: 12, ngayDang: '2026-11-10',
      tieuDe: 'Tự động sinh kịch bản kiểm thử API thông minh dựa trên phân tích đặc tả OpenAPI và Swagger',
      tomTat: 'Áp dụng kỹ thuật kiểm thử đột biến (mutation testing) và heuristic search để tự động phát hiện các lỗ hổng logic nghiệp vụ trong các microservices phức tạp.',
      gioiThieu: 'Đội kiểm thử cần công cụ sinh kịch bản kiểm thử API tự động từ đặc tả OpenAPI cho hơn 300 microservice.',
      thachThuc: ['Phân tích đặc tả OpenAPI, suy ra ràng buộc giữa các tham số.', 'Sinh dữ liệu kiểm thử bằng tìm kiếm heuristic.', 'Tích hợp vào pipeline CI/CD.'],
      dauRa: 'công cụ dòng lệnh mã nguồn mở nội bộ và báo cáo đánh giá trên 3 dịch vụ thật.',
      kyNang: ['Software Testing', 'TypeScript', 'OpenAPI', 'Docker'], doiTuong: ['ca-nhan', 'nhom-sv'], quyMoNhom: { min: 1, max: 3 }, trl: 3,
      sanPham: ['Mã nguồn', 'Báo cáo kỹ thuật'], tieuChi: 'Kinh nghiệm viết kiểm thử tự động; hiểu REST API.',
      hinhThuc: 'ket-hop', diaDiem: 'Phú Nhuận, TP.HCM',
      dn: { ten: 'KMS Technology', diaChi: 'Phú Nhuận, TP.HCM', logo: 'img-05.jpg', linhVucHD: 'Phần mềm & Kiểm thử', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-107', loai: 'hop-tac-lab', linhVuc: 'ai', kinhPhi: 45, hanNop: '2027-01-12', ngayBatDau: '2027-02-01', thoiGian: 20, ngayDang: '2026-11-08',
      tieuDe: 'Nhận dạng biển số và hành vi phương tiện cho camera giao thông thông minh',
      tomTat: 'Phối hợp cùng Sở GTVT xây dựng mô-đun nhận dạng chạy thời gian thực trên thiết bị biên, xử lý đồng thời 16 luồng camera Full HD tại các nút giao trọng điểm.',
      gioiThieu: 'Lab CV&PR tuyển sinh viên tham gia dự án hợp tác với Sở GTVT về camera giao thông thông minh.',
      thachThuc: ['Nhận dạng biển số trong điều kiện thiếu sáng, mưa.', 'Phát hiện vượt đèn đỏ, đi sai làn theo thời gian thực.', 'Xử lý 16 luồng Full HD trên một thiết bị Jetson Orin.'],
      dauRa: 'mô-đun nhận dạng triển khai thử tại 2 nút giao.',
      kyNang: ['YOLO', 'DeepStream', 'NVIDIA Jetson', 'Computer Vision'], doiTuong: ['lab', 'nhom-sv'], quyMoNhom: { min: 2, max: 5 }, trl: 4,
      sanPham: ['Mã nguồn', 'Bản demo / prototype'], tieuChi: 'Đã học môn Thị giác máy tính; ưu tiên SV năm 3, 4.',
      hinhThuc: 'tai-uit', diaDiem: 'Phòng E4.12, UIT',
      dn: { ten: 'Lab CV&PR – UIT', diaChi: 'Phòng E4.12, UIT', icon: 'biotech', linhVucHD: 'Thị giác máy tính & Nhận dạng', quyMo: 'Phòng thí nghiệm UIT' }
    }),
    bt({
      ma: 'RD-2026-108', loai: 'hop-tac-lab', linhVuc: 'ic', kinhPhi: 70, hanNop: '2027-01-25', ngayBatDau: '2027-02-20', thoiGian: 24, ngayDang: '2026-11-05',
      tieuDe: 'Thiết kế lõi tăng tốc suy luận AI trên FPGA cho thiết bị biên công suất thấp',
      tomTat: 'Hiện thực bộ nhân ma trận lượng tử hóa INT8 tích hợp vào SoC RISC-V, mục tiêu đạt 2 TOPS/W và kiểm chứng trên bo mạch Xilinx Kria KV260.',
      gioiThieu: 'Lab Vi mạch số hợp tác với doanh nghiệp bán dẫn phát triển lõi tăng tốc AI cho thiết bị biên.',
      thachThuc: ['Thiết kế bộ nhân ma trận INT8 dạng systolic array.', 'Tích hợp vào SoC RISC-V qua bus AXI.', 'Đạt hiệu suất 2 TOPS/W trên Kria KV260.'],
      dauRa: 'mã RTL, bản demo trên bo mạch, báo cáo kỹ thuật.',
      kyNang: ['Verilog', 'FPGA', 'Vivado HLS', 'RISC-V'], doiTuong: ['lab'], quyMoNhom: { min: 2, max: 4 }, trl: 3,
      sanPham: ['Mã nguồn', 'Bản demo / prototype', 'Báo cáo kỹ thuật'], tieuChi: 'Có GV hướng dẫn mảng vi mạch; đã học Thiết kế hệ thống số.',
      hinhThuc: 'tai-uit', diaDiem: 'Phòng C3.12, UIT', yeuCauNda: true,
      dn: { ten: 'Lab Vi mạch số (IC Design)', diaChi: 'Phòng C3.12, UIT', icon: 'memory', linhVucHD: 'Thiết kế vi mạch', quyMo: 'Phòng thí nghiệm UIT' }
    }),
    bt({
      ma: 'RD-2026-109', loai: 'hop-tac-lab', linhVuc: 'sec', kinhPhi: 55, hanNop: '2027-02-05', ngayBatDau: '2027-03-01', thoiGian: 20, ngayDang: '2026-11-03',
      tieuDe: 'Phát hiện xâm nhập dựa trên học sâu đồ thị cho mạng IoT công nghiệp',
      tomTat: 'Xây dựng bộ dữ liệu lưu lượng Modbus/OPC-UA và mô hình GNN phát hiện tấn công theo thời gian thực, tích hợp với hệ thống SOC của đối tác sản xuất.',
      gioiThieu: 'InSecLab hợp tác với một nhà máy sản xuất xây dựng hệ thống phát hiện xâm nhập cho mạng điều khiển công nghiệp.',
      thachThuc: ['Thu thập và gán nhãn lưu lượng Modbus/OPC-UA.', 'Mô hình GNN phát hiện tấn công theo thời gian thực.', 'Tích hợp cảnh báo vào SOC của đối tác.'],
      dauRa: 'bộ dữ liệu, mô hình, mô-đun tích hợp SOC.',
      kyNang: ['Zeek', 'GNN', 'Suricata', 'Network Security'], doiTuong: ['lab', 'nhom-sv'], quyMoNhom: { min: 2, max: 5 }, trl: 3,
      sanPham: ['Bộ dữ liệu', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật'], tieuChi: 'Kiến thức mạng công nghiệp là lợi thế.',
      hinhThuc: 'tai-uit', diaDiem: 'Phòng A2.05, UIT', yeuCauNda: true,
      dn: { ten: 'InSecLab – An toàn thông tin', diaChi: 'Phòng A2.05, UIT', icon: 'shield', linhVucHD: 'An toàn thông tin', quyMo: 'Phòng thí nghiệm UIT' }
    }),
    bt({
      ma: 'RD-2026-110', loai: 'tai-tro', linhVuc: 'edge', kinhPhi: 120, hanNop: '2027-01-15', ngayBatDau: '2027-02-10', thoiGian: 24, ngayDang: '2026-11-01',
      tieuDe: 'Tối ưu hiệu năng mô hình ngôn ngữ chạy trực tiếp trên thiết bị di động',
      tomTat: 'Gói tài trợ R&D toàn phần kèm suất thực tập: nén và lượng tử hóa LLM tiếng Việt dưới 2 tỷ tham số để chạy mượt trên chip Exynos thế hệ mới.',
      gioiThieu: 'Gói tài trợ R&D toàn phần kèm suất thực tập cho nhóm sinh viên nén mô hình ngôn ngữ tiếng Việt chạy trên điện thoại.',
      thachThuc: ['Lượng tử hóa INT4 mô hình dưới 2 tỷ tham số.', 'Tốc độ sinh ≥ 15 token/giây trên chip di động.', 'Giữ chất lượng trả lời tiếng Việt so với mô hình gốc.'],
      dauRa: 'mô hình đã nén, ứng dụng demo Android, báo cáo kỹ thuật.',
      kyNang: ['On-device AI', 'TFLite', 'Model Compression', 'LLM'], doiTuong: ['nhom-sv', 'lab'], quyMoNhom: { min: 2, max: 4 }, trl: 3,
      sanPham: ['Mô hình đã huấn luyện', 'Bản demo / prototype', 'Báo cáo kỹ thuật'], tieuChi: 'Kinh nghiệm tối ưu mô hình; ưu tiên nhóm có thành viên lập trình Android.',
      hinhThuc: 'ket-hop', diaDiem: 'Hà Nội & TP.HCM', yeuCauNda: true,
      dn: { ten: 'Samsung SVMC', diaChi: 'Hà Nội & TP.HCM', icon: 'smartphone', linhVucHD: 'Nghiên cứu & phát triển di động', quyMo: 'Trên 1.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-111', loai: 'ung-tuyen', linhVuc: 'ai', kinhPhi: 65, hanNop: '2027-01-05', ngayBatDau: '2027-01-20', thoiGian: 16, ngayDang: '2026-10-30',
      tieuDe: 'Nhận dạng tiếng nói tiếng Việt đa vùng miền cho trợ lý ảo trên ứng dụng nhắn tin',
      tomTat: 'Cải thiện độ chính xác nhận dạng giọng nói giọng Trung và Nam Bộ, giảm tỉ lệ lỗi từ (WER) dưới 8% trong môi trường nhiễu.',
      gioiThieu: 'Trợ lý ảo trên ứng dụng nhắn tin nhận dạng kém với giọng địa phương và môi trường ồn.',
      thachThuc: ['Thu thập và làm sạch dữ liệu giọng nói đa vùng miền.', 'Tinh chỉnh mô hình ASR với tăng cường dữ liệu nhiễu.', 'WER dưới 8% trên bộ thử của doanh nghiệp.'],
      dauRa: 'mô hình ASR, bộ dữ liệu đã chuẩn hóa, báo cáo đánh giá.',
      kyNang: ['Speech Recognition', 'PyTorch', 'NLP Tiếng Việt', 'Python'], doiTuong: ['nhom-sv', 'ca-nhan'], quyMoNhom: { min: 1, max: 4 }, trl: 4,
      sanPham: ['Mô hình đã huấn luyện', 'Bộ dữ liệu', 'Báo cáo kỹ thuật'], tieuChi: 'Kinh nghiệm xử lý âm thanh hoặc NLP.',
      hinhThuc: 'ket-hop', diaDiem: 'Quận 7, TP.HCM', yeuCauNda: true,
      dn: { ten: 'VNG Corporation', diaChi: 'Quận 7, TP.HCM', icon: 'graphic_eq', linhVucHD: 'Internet & Nền tảng số', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-112', loai: 'ung-tuyen', linhVuc: 'cloud', kinhPhi: 35, hanNop: '2026-12-10', ngayBatDau: '2027-01-04', thoiGian: 12, ngayDang: '2026-10-28',
      tieuDe: 'Tự động hóa kiểm thử chức năng mạng lõi 5G trên môi trường mô phỏng mã nguồn mở',
      tomTat: 'Dựng môi trường mạng lõi 5G bằng Open5GS và UERANSIM, viết bộ kiểm thử tự động cho các luồng đăng ký, phiên dữ liệu và chuyển giao.',
      gioiThieu: 'Trung tâm viễn thông cần môi trường mô phỏng 5G để kiểm thử hồi quy trước mỗi lần phát hành.',
      thachThuc: ['Dựng mạng lõi 5G trên Kubernetes.', 'Viết kịch bản kiểm thử cho 20 luồng chức năng chính.', 'Báo cáo kết quả tự động trên CI.'],
      dauRa: 'Helm chart, bộ kiểm thử, tài liệu vận hành.',
      kyNang: ['Kubernetes', 'Docker', '5G Core', 'Python'], doiTuong: ['ca-nhan', 'nhom-sv'], quyMoNhom: { min: 1, max: 3 }, trl: 4,
      sanPham: ['Mã nguồn', 'Báo cáo kỹ thuật'], tieuChi: 'Kiến thức mạng di động; kinh nghiệm Docker/Kubernetes.',
      hinhThuc: 'tai-dn', diaDiem: 'Công viên phần mềm Quang Trung, TP.HCM',
      dn: { ten: 'TMA Solutions', diaChi: 'Quận 12, TP.HCM', icon: 'cell_tower', linhVucHD: 'Gia công phần mềm & Viễn thông', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-113', loai: 'tai-tro', linhVuc: 'ai', kinhPhi: 90, hanNop: '2027-03-01', ngayBatDau: '2027-03-20', thoiGian: 20, ngayDang: '2026-10-25',
      tieuDe: 'Trợ lý AI rà soát mã nguồn (code review) tự động cho quy trình phát triển phần mềm',
      tomTat: 'Tài trợ nghiên cứu mô hình ngôn ngữ đề xuất nhận xét review cho pull request, phát hiện lỗi bảo mật và vi phạm quy chuẩn mã nguồn.',
      gioiThieu: 'Doanh nghiệp tài trợ nhóm nghiên cứu xây dựng trợ lý review mã nguồn chạy trong mạng nội bộ.',
      thachThuc: ['Thu thập dữ liệu review đã ẩn danh từ các dự án nội bộ.', 'Tinh chỉnh mô hình mã nguồn mở sinh nhận xét review.', 'Đánh giá với kỹ sư thật: ≥ 60% nhận xét được chấp nhận.'],
      dauRa: 'mô hình, tiện ích tích hợp Git, báo cáo đánh giá.',
      kyNang: ['LLM', 'Python', 'Static Analysis', 'Git'], doiTuong: ['nhom-sv', 'lab'], quyMoNhom: { min: 2, max: 5 }, trl: 2,
      sanPham: ['Mô hình đã huấn luyện', 'Mã nguồn', 'Báo cáo kỹ thuật'], tieuChi: 'Kinh nghiệm học sâu cho mã nguồn; định hướng công bố.',
      hinhThuc: 'tu-xa', diaDiem: 'Tân Bình, TP.HCM & Từ xa', yeuCauNda: true,
      dn: { ten: 'NashTech Vietnam', diaChi: 'Tân Bình, TP.HCM', icon: 'code', linhVucHD: 'Dịch vụ phần mềm', quyMo: '1.000 – 5.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-114', loai: 'ung-tuyen', linhVuc: 'ai', kinhPhi: 55, hanNop: '2026-11-20', ngayBatDau: '2026-12-10', thoiGian: 14, ngayDang: '2026-10-20',
      tieuDe: 'eKYC chống giả mạo khuôn mặt (liveness detection) trên ứng dụng di động',
      tomTat: 'Phát hiện tấn công giả mạo bằng ảnh in, video phát lại và mặt nạ 3D khi định danh khách hàng điện tử, chạy trực tiếp trên điện thoại tầm trung.',
      gioiThieu: 'Nền tảng định danh điện tử cần lớp chống giả mạo khuôn mặt nhẹ, chạy ngay trên thiết bị.',
      thachThuc: ['Phát hiện ảnh in, video phát lại, mặt nạ 3D.', 'Mô hình dưới 5 MB, suy luận dưới 100 ms trên điện thoại tầm trung.', 'APCER/BPCER dưới 3%.'],
      dauRa: 'mô hình, SDK demo, báo cáo đánh giá.',
      kyNang: ['Computer Vision', 'PyTorch', 'TFLite', 'Face Anti-Spoofing'], doiTuong: ['nhom-sv', 'ca-nhan'], quyMoNhom: { min: 1, max: 4 }, trl: 3,
      sanPham: ['Mô hình đã huấn luyện', 'Bản demo / prototype'], tieuChi: 'Kinh nghiệm thị giác máy tính.',
      hinhThuc: 'tu-xa', diaDiem: 'Hà Nội & Từ xa', yeuCauNda: true,
      dn: { ten: 'VNPT AI', diaChi: 'Hà Nội', icon: 'face', linhVucHD: 'Trí tuệ nhân tạo & Viễn thông', quyMo: '500 – 1.000 nhân sự' }
    }),
    bt({
      ma: 'RD-2026-115', loai: 'ung-tuyen', linhVuc: 'data', kinhPhi: 30, hanNop: '2027-01-30', ngayBatDau: '2027-02-20', thoiGian: 10, ngayDang: '2026-10-18',
      tieuDe: 'Trích xuất thông tin hóa đơn VAT và chứng từ kế toán bằng OCR và mô hình hiểu tài liệu',
      tomTat: 'Nhận dạng và trích xuất các trường mã số thuế, số tiền, ngày lập từ ảnh chụp hóa đơn với độ chính xác trường ≥ 95%, xuất về định dạng JSON chuẩn.',
      gioiThieu: 'Bộ phận kế toán xử lý hàng nghìn hóa đơn giấy mỗi tháng và cần tự động hóa khâu nhập liệu.',
      thachThuc: ['OCR tiếng Việt trên ảnh chụp nghiêng, mờ.', 'Trích xuất trường bằng mô hình hiểu bố cục tài liệu.', 'Độ chính xác từng trường ≥ 95%.'],
      dauRa: 'dịch vụ API trích xuất và báo cáo đánh giá.',
      kyNang: ['OCR', 'Python', 'Document AI', 'FastAPI'], doiTuong: ['ca-nhan', 'nhom-sv'], quyMoNhom: { min: 1, max: 3 }, trl: 4,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện'], tieuChi: 'Kinh nghiệm Python; biết xử lý ảnh là lợi thế.',
      hinhThuc: 'tu-xa', diaDiem: 'Hà Nội & Đà Nẵng',
      dn: { ten: 'Rikkeisoft', diaChi: 'Hà Nội & Đà Nẵng', icon: 'receipt_long', linhVucHD: 'Gia công phần mềm', quyMo: '1.000 – 5.000 nhân sự' }
    })
  ];

  // ---------- Nguồn dữ liệu: API /api/student-rd-problems (mở qua máy chủ) hoặc dữ liệu mẫu ----------
  var API = '/api/student-rd-problems';
  var nguon = { api: false, loi: '', ds: [], daLuu: [] };

  function coMayChu() { return /^https?:$/.test(window.location.protocol); }

  // fetch JSON; lỗi { code, message } của máy chủ thành Error mang message, status, code
  function goi(duongDan, tuyChon) {
    tuyChon = tuyChon || {};
    if (tuyChon.json !== undefined) {
      tuyChon.body = JSON.stringify(tuyChon.json);
      tuyChon.headers = Object.assign({ 'Content-Type': 'application/json' }, tuyChon.headers || {});
      delete tuyChon.json;
    }
    return fetch(duongDan, tuyChon).then(function (res) {
      if (res.status === 204) return {};
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.message || 'Máy chủ trả lỗi ' + res.status); e.status = res.status; e.code = data.code; throw e; }
        return data;
      });
    }, function () {
      var e = new Error('Không kết nối được máy chủ');
      e.status = 0;
      throw e;
    });
  }

  function lyDoDuLieuMau(err) {
    if (!coMayChu()) return 'Trang đang mở trực tiếp từ tệp (không qua máy chủ).';
    if (err && err.status === 404 && err.code === 'NOT_FOUND') return 'Máy chủ chưa có API bài toán R&D cho sinh viên.';
    return 'Không lấy được dữ liệu từ máy chủ (' + String(err && err.message ? err.message : 'lỗi không rõ').replace(/\.$/, '') + ').';
  }

  var LOAI_TU_API = { Open_Call: 'ung-tuyen', Lab_Collaboration: 'hop-tac-lab', Sponsored: 'tai-tro' };
  var TT_TU_API = { Open: 'dang-mo', In_Progress: 'dang-thuc-hien' };
  var DOI_TUONG_TU_API = { Student: 'ca-nhan', Team: 'nhom-sv', Lab: 'lab' };
  var HINH_THUC_TU_API = { Onsite: 'tai-dn', At_UIT: 'tai-uit', Remote: 'tu-xa', Hybrid: 'ket-hop' };
  var TT_PROPOSAL_TU_API = { Submitted: 'cho-phan-hoi', Scheduled: 'da-hen', In_Discussion: 'dam-phan', Contracted: 'dam-phan', Completed: 'dam-phan', Declined: 'tu-choi' };
  var PARTNER_TU_API = { Student: 'ca-nhan', Team: 'nhom-sv', Lab: 'lab' };

  function linhVucTuTen(ten) {
    var lv = D.LINH_VUC.filter(function (x) { return x.tenCsdl === ten; })[0];
    return lv ? lv.id : '';
  }
  function trieu(vnd) { return vnd == null ? null : Math.round(Number(vnd) / 1e6); }
  function dungLuong(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function gioVN(iso) {
    var d = new Date(iso);
    return {
      ngay: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
      gio: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })
    };
  }

  // Proposal của tôi (API) → dạng proposal SV-13 vẽ
  function proposalTuApi(r) {
    if (!r) return null;
    var lich = r.meeting ? gioVN(r.meeting.startAt) : null;
    return {
      id: r.id, idApi: r.id,
      trangThai: TT_PROPOSAL_TU_API[r.status] || 'cho-phan-hoi',
      tieuDe: r.title || '',
      nguon: PARTNER_TU_API[r.partnerType],
      nhom: r.teamName || (r.partnerType === 'Student' ? 'Cá nhân' : ''),
      gvHuongDan: r.lecturerName,
      guiLuc: r.createdAt,
      lichHen: lich ? { ngay: lich.ngay, gio: lich.gio, hinhThuc: r.meeting.mode, ghiChu: r.meeting.agenda } : null,
      lyDoTuChoi: r.declineReason,
      tep: (r.attachments || []).map(function (t) { return { id: t.id, ten: t.fileName, kichThuoc: dungLuong(t.sizeBytes), loai: t.docType }; }),
      coTheRut: !!r.canWithdraw,
      tuMayChu: true
    };
  }

  // Bài toán (API) → cùng dạng dữ liệu mẫu để các trang vẽ chung
  function baiToanTuApi(p) {
    var dn = p.business || {};
    var logo = dn.logoUrl && /^\/assets\/img\/[\w.-]+$/.test(dn.logoUrl) ? dn.logoUrl.replace('/assets/img/', '') : '';
    return {
      id: p.id, ma: p.code, tieuDe: p.title, loai: LOAI_TU_API[p.type] || 'ung-tuyen', linhVuc: linhVucTuTen(p.fieldName),
      trangThai: TT_TU_API[p.status] || 'dang-mo', moNhanApi: p.isOpen,
      tomTat: p.summary, moTa: p.requirement || '',
      kyNang: p.skills || [],
      doiTuong: (p.acceptedPartners || []).map(function (x) { return DOI_TUONG_TU_API[x]; }).filter(Boolean),
      quyMoNhom: p.teamSizeMin || p.teamSizeMax ? { min: p.teamSizeMin || 1, max: p.teamSizeMax || p.teamSizeMin } : null,
      trl: p.trlLevel, sanPham: p.deliverables || [], tieuChi: p.selectionCriteria, yeuCauNda: !!p.ndaRequired,
      nganSach: p.funding ? { min: trieu(p.fundingMin != null ? p.fundingMin : p.funding), max: trieu(p.funding) } : null,
      hanNop: p.deadline || '', ngayBatDau: p.startDate || '', thoiGian: p.durationWeeks,
      hinhThuc: HINH_THUC_TU_API[p.workMode] || '', diaDiem: p.location || dn.address || '',
      ngayDang: String(p.publishedAt || '').slice(0, 10),
      moc: (p.milestones || []).map(function (m) { return { ten: m.name, tuan: m.dueWeek, phanTram: m.budgetPercent }; }),
      tepDinhKem: (p.attachments || []).map(function (t) { return { id: t.id, ten: t.fileName, kichThuoc: dungLuong(t.sizeBytes) }; }),
      doanhNghiep: {
        ten: dn.name || '', diaChi: dn.address || '', logo: logo, linhVucHD: dn.industry || '', gioiThieu: dn.description || '',
        kyHieu: String(dn.name || '?').split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase()
      },
      tuLuongDn: !!dn.verified,
      phuHop: p.fitScore,
      daLuuApi: !!p.saved,
      proposalApi: p.myProposal ? { id: p.myProposal.id, trangThai: TT_PROPOSAL_TU_API[p.myProposal.status] || 'cho-phan-hoi' } : null,
      proposalCuaToi: p.myProposal && p.myProposal.title !== undefined ? proposalTuApi(p.myProposal) : null,
      kyNangCuaToi: p.mySkills || null,
      luaChon: p.options || null
    };
  }

  // Nạp danh sách: API trước, lỗi thì dùng dữ liệu mẫu. Trả về Promise.
  function napDanhSach() {
    if (!coMayChu()) { nguon.api = false; nguon.loi = lyDoDuLieuMau(null); return Promise.resolve(); }
    return goi(API).then(function (data) {
      nguon.api = true;
      nguon.loi = '';
      nguon.ds = data.problems.map(baiToanTuApi);
      var maTheoId = {};
      nguon.ds.forEach(function (b) { maTheoId[b.id] = b.ma; });
      nguon.daLuu = (data.saved || []).map(function (id) { return maTheoId[id]; }).filter(Boolean);
    }).catch(function (err) {
      nguon.api = false;
      nguon.loi = lyDoDuLieuMau(err);
    });
  }

  // Chi tiết một bài: API (kèm mốc, tệp, proposal của tôi, nhóm & GV cho form) hoặc dữ liệu mẫu.
  // Promise trả bài toán, hoặc null nếu không tìm thấy.
  function napChiTiet(ma) {
    if (!coMayChu()) { nguon.api = false; nguon.loi = lyDoDuLieuMau(null); return Promise.resolve(layTheoMa(ma)); }
    return goi(API + '/' + encodeURIComponent(ma)).then(function (p) {
      nguon.api = true;
      nguon.loi = '';
      return baiToanTuApi(p);
    }, function (err) {
      if (err.status === 404 && err.code === 'PROBLEM_NOT_FOUND') { nguon.api = true; return null; }
      if (err.status === 400) { nguon.api = true; return null; }
      nguon.api = false;
      nguon.loi = lyDoDuLieuMau(err);
      return layTheoMa(ma);
    });
  }

  // Báo nguồn dữ liệu trên khung ghi chú của trang
  function veNguon(el) {
    if (!el) return;
    el.className = 'flex items-start gap-2 rounded-lg border px-4 py-2.5 text-body-sm ' +
      (nguon.api ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900');
    el.innerHTML = nguon.api
      ? '<span class="material-symbols-outlined text-[18px] shrink-0">cloud_done</span><p>Dữ liệu lấy từ máy chủ. Lưu bài và proposal được lưu vào CSDL; proposal hiện ngay trong Hộp thư kết nối của doanh nghiệp.</p>'
      : '<span class="material-symbols-outlined text-[18px] shrink-0">info</span><p>' + D.escapeHtml(nguon.loi) +
        ' Đang dùng dữ liệu mẫu: lưu bài và proposal <b>chỉ lưu tạm trên trình duyệt này, chưa lưu lên máy chủ</b>.</p>';
  }

  // ---------- Lấy danh sách bài toán cho SV ----------
  var CONG_KHAI = { 'dang-mo': 1, 'dang-thuc-hien': 1 };

  function layTatCa() {
    if (nguon.api) return JSON.parse(JSON.stringify(nguon.ds));
    var tuDn = D.layTatCa().filter(function (b) { return CONG_KHAI[b.trangThai]; }).map(function (b) {
      b.doanhNghiep = DN_LUONG_DN;
      b.tuLuongDn = true;
      b.ngayDang = b.ngayDuyet || b.ngayNop || b.ngayTao || b.ngayLuu || D.homNay();
      return b;
    });
    return tuDn.concat(CONG_TY_KHAC.map(function (b) { return JSON.parse(JSON.stringify(b)); }));
  }

  function layTheoMa(ma) {
    return layTatCa().filter(function (b) { return b.ma === ma; })[0] || null;
  }

  // Tình trạng nhận hồ sơ: { moNhan, ten, lop }
  function tinhTrangNhan(b) {
    if (b.trangThai === 'dang-thuc-hien') return { moNhan: false, ten: 'Đã có đơn vị thực hiện', lop: 'text-text-secondary' };
    var n = D.soNgayToi(b.hanNop);
    if (n === null) return { moNhan: true, ten: 'Không giới hạn hạn nộp', lop: 'text-text-secondary' };
    if (n < 0) return { moNhan: false, ten: 'Đã hết hạn nhận hồ sơ', lop: 'text-red-600' };
    if (n === 0) return { moNhan: true, ten: 'Hạn cuối hôm nay', lop: 'text-red-600 font-semibold' };
    return { moNhan: true, ten: 'Còn ' + n + ' ngày', lop: n <= 7 ? 'text-amber-700 font-semibold' : 'text-text-secondary' };
  }

  function nganSachMax(b) { return (b.nganSach && (b.nganSach.max || b.nganSach.min)) || 0; }

  function chuoiKinhPhi(b) {
    var ns = b.nganSach;
    if (!ns || !ns.min) return 'Thỏa thuận';
    var f = function (x) { return (x * 1000000).toLocaleString('vi-VN'); };
    return (!ns.max || ns.max === ns.min) ? f(ns.min) + ' VNĐ' : f(ns.min) + ' – ' + f(ns.max) + ' VNĐ';
  }

  // ---------- Kho đã lưu ----------
  // Danh sách đã lưu, mới lưu trước: [{ ma }]
  function dsDaLuu() {
    if (nguon.api) return nguon.daLuu.map(function (ma) { return { ma: ma }; });
    try {
      var ds = JSON.parse(window.localStorage.getItem(KHOA_DA_LUU) || '[]');
      return Array.isArray(ds) ? ds : [];
    } catch (e) { return []; }
  }
  function laDaLuu(ma) { return dsDaLuu().some(function (x) { return x.ma === ma; }); }
  // Đổi trạng thái lưu. Promise trả true (đã lưu) / false (đã bỏ lưu); lỗi thì reject (Error có message).
  // daLuuHienTai: trạng thái trang đang hiện (trang chi tiết truyền vào), bỏ trống thì đọc từ danh sách.
  function doiLuu(ma, daLuuHienTai) {
    var co = daLuuHienTai === undefined ? laDaLuu(ma) : daLuuHienTai;
    if (nguon.api) {
      return goi(API + '/' + encodeURIComponent(ma) + '/saved', { method: co ? 'DELETE' : 'PUT' }).then(function () {
        nguon.daLuu = nguon.daLuu.filter(function (x) { return x !== ma; });
        if (!co) nguon.daLuu.unshift(ma);
        return !co;
      });
    }
    var ds = dsDaLuu();
    ds = co ? ds.filter(function (x) { return x.ma !== ma; }) : [{ ma: ma, ngayLuu: new Date().toISOString() }].concat(ds);
    try { window.localStorage.setItem(KHOA_DA_LUU, JSON.stringify(ds)); }
    catch (e) { return Promise.reject(new Error('Trình duyệt đang chặn lưu dữ liệu cục bộ.')); }
    return Promise.resolve(!co);
  }

  // ---------- Proposal của sinh viên đang đăng nhập ----------
  function laCuaToi(p) {
    return p.mssv === SINH_VIEN.mssv || (p.thanhVien || []).some(function (tv) { return tv.mssv === SINH_VIEN.mssv; });
  }

  // Proposal của tôi (đã áp phản hồi DN). Proposal nộp cho bài của DN khác (không thuộc luồng DN) đọc thẳng từ kho SV.
  function proposalCuaToi() {
    var ds = D.layDanhSachProposal().filter(laCuaToi);
    var co = {};
    ds.forEach(function (p) { co[p.id] = true; });
    D.docSvProposal().forEach(function (p) {
      if (!co[p.id] && laCuaToi(p)) { p.tuSinhVien = true; ds.push(p); }
    });
    return ds;
  }

  function proposalChoBaiToan(ma) {
    if (nguon.api) {
      var b = nguon.ds.filter(function (x) { return x.ma === ma; })[0];
      return b ? b.proposalApi : null;
    }
    return proposalCuaToi().filter(function (p) { return p.baiToan === ma; })[0] || null;
  }

  function mucPhuHop(b) {
    if (typeof b.phuHop === 'number') return b.phuHop;
    var ky = (b.kyNang || []).map(D.chuanHoa);
    if (!ky.length) return 70;
    var cua = SINH_VIEN.kyNang.map(D.chuanHoa);
    var trung = ky.filter(function (k) { return cua.indexOf(k) !== -1; }).length;
    return Math.min(98, 55 + Math.round(40 * trung / ky.length));
  }

  window.SvBaiToanRd = {
    SINH_VIEN: SINH_VIEN,
    NHOM_CUA_TOI: NHOM_CUA_TOI,
    GV_HUONG_DAN: GV_HUONG_DAN,
    LOAI_SV: LOAI_SV,
    TRANG_THAI_PROPOSAL_SV: TRANG_THAI_PROPOSAL_SV,
    MUC_KINH_PHI: MUC_KINH_PHI,
    layTatCa: layTatCa,
    layTheoMa: layTheoMa,
    tinhTrangNhan: tinhTrangNhan,
    nganSachMax: nganSachMax,
    chuoiKinhPhi: chuoiKinhPhi,
    dsDaLuu: dsDaLuu,
    laDaLuu: laDaLuu,
    doiLuu: doiLuu,
    proposalCuaToi: proposalCuaToi,
    proposalChoBaiToan: proposalChoBaiToan,
    mucPhuHop: mucPhuHop,
    API: API,
    goi: goi,
    coMayChu: coMayChu,
    laApi: function () { return nguon.api; },
    napDanhSach: napDanhSach,
    napChiTiet: napChiTiet,
    veNguon: veNguon
  };
})();
