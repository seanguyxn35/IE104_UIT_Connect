// Dữ liệu và tiện ích dùng chung cho nhóm trang "Bài toán R&D" của Doanh nghiệp
// (DN-04 danh sách, DN-05 đăng/sửa, DN-08 hộp thư kết nối, DN-15 chi tiết / hồ sơ dự án).
//
// Chưa có API bài toán R&D: dữ liệu mẫu nằm ở BAI_TOAN_MAU và PROPOSAL_MAU bên dưới.
// Bài toán DN tạo mới hoặc sửa được lưu tạm trong localStorage của trình duyệt (KHOA_LUU),
// chỉ trình duyệt đó thấy, không lên máy chủ. Các trang phải báo rõ điều này cho người dùng.
//
// Script thường (không phải ES module) để mở được cả bằng file:// và trên GitHub Pages.
(function () {
  'use strict';

  var KHOA_LUU = 'uitc.dn.baiToan.v1';

  // ---------- Danh mục ----------
  // tenCsdl: tên tương ứng trong bảng field của CSDL (API trả tên này). "Điện toán biên" chưa có trong danh mục CSDL.
  var LINH_VUC = [
    { id: 'ai', ten: 'Trí tuệ nhân tạo (AI) & Thị giác máy tính (Computer Vision)', ngan: 'Trí tuệ nhân tạo (AI)', tenCsdl: 'Trí tuệ nhân tạo & Học máy' },
    { id: 'iot', ten: 'Hệ thống nhúng & IoT (Embedded Systems & IoT)', ngan: 'Hệ thống nhúng & IoT', tenCsdl: 'Hệ thống nhúng & IoT' },
    { id: 'sec', ten: 'An toàn thông tin & Mật mã học (Cybersecurity)', ngan: 'An toàn thông tin', tenCsdl: 'An toàn thông tin' },
    { id: 'data', ten: 'Khoa học dữ liệu & Dữ liệu lớn (Data Science & Big Data)', ngan: 'Khoa học dữ liệu', tenCsdl: 'Khoa học dữ liệu & Big Data' },
    { id: 'cloud', ten: 'Mạng máy tính & Điện toán đám mây (Cloud & Networking)', ngan: 'Mạng máy tính & Cloud', tenCsdl: 'Mạng & Điện toán đám mây' },
    { id: 'edge', ten: 'Điện toán biên (Edge Computing)', ngan: 'Điện toán biên', tenCsdl: null },
    { id: 'ic', ten: 'Vi mạch & Bán dẫn (IC Design & Semiconductor)', ngan: 'Vi mạch & Bán dẫn', tenCsdl: 'Thiết kế vi mạch & Bán dẫn' },
    { id: 'robot', ten: 'Robot & Hệ thống tự hành (Robotics)', ngan: 'Robot & Tự hành', tenCsdl: 'Robot & Xe tự hành' },
    { id: 'blockchain', ten: 'Blockchain & Công nghệ tài chính (Fintech)', ngan: 'Blockchain & Fintech', tenCsdl: 'Blockchain & Fintech' }
  ];

  var LOAI = {
    'ung-tuyen': { ten: 'Đang mở ứng tuyển', day: 'Đang mở ứng tuyển (Open Recruitment)', icon: 'code_blocks', mau: 'bg-secondary-container/40 text-on-secondary-container' },
    'hop-tac-lab': { ten: 'Hợp tác Lab', day: 'Hợp tác Lab nghiên cứu (Lab Partnership)', icon: 'hub', mau: 'bg-brand-light-blue text-brand-navy-dark' },
    'tai-tro': { ten: 'Doanh nghiệp tài trợ', day: 'Doanh nghiệp tài trợ & Đặt hàng (Sponsored Grant)', icon: 'monetization_on', mau: 'bg-status-warning/20 text-on-surface' }
  };

  var TRANG_THAI = {
    'nhap': { ten: 'Bản nháp', tab: 'Bản nháp', icon: 'edit_document', mau: 'bg-surface-container-highest text-on-surface-variant' },
    'cho-duyet': { ten: 'Chờ duyệt', tab: 'Chờ Admin duyệt', icon: 'hourglass_empty', mau: 'bg-status-warning/20 text-on-surface' },
    'dang-mo': { ten: 'Đang mở', tab: 'Đang mở', icon: '', mau: 'bg-tertiary-fixed text-tertiary' },
    'dang-thuc-hien': { ten: 'Đang thực hiện', tab: 'Đang thực hiện', icon: 'sync', mau: 'bg-primary-fixed text-primary' },
    'da-dong': { ten: 'Đã đóng', tab: 'Đã đóng', icon: 'lock', mau: 'bg-surface-container-high text-text-muted' }
  };

  var DOI_TUONG = {
    'nhom-sv': 'Nhóm sinh viên (NCKH, khóa luận)',
    'lab': 'Phòng Lab / nhóm nghiên cứu có GV hướng dẫn',
    'ca-nhan': 'Sinh viên cá nhân'
  };

  var SAN_PHAM = ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật', 'Bộ dữ liệu', 'Bản demo / prototype', 'Bài báo khoa học'];

  var HINH_THUC = {
    'tai-dn': 'Tại doanh nghiệp',
    'tai-uit': 'Tại UIT',
    'tu-xa': 'Làm việc từ xa',
    'ket-hop': 'Kết hợp'
  };

  // Gợi ý kỹ năng theo lĩnh vực (bước 2 của DN-05)
  var GOI_Y_KY_NANG = {
    ai: ['PyTorch', 'TensorFlow', 'Computer Vision', 'LLM', 'RAG', 'NLP Tiếng Việt', 'YOLO'],
    iot: ['C/C++', 'Embedded Linux', 'MQTT', 'ESP32', 'RTOS'],
    sec: ['Network Security', 'eBPF', 'Pentest', 'Mật mã học', 'SIEM'],
    data: ['Python', 'Spark', 'SQL', 'Data Pipeline', 'Power BI'],
    cloud: ['Kubernetes', 'Docker', 'AWS', 'SDN', 'Terraform'],
    edge: ['Edge AI', 'NVIDIA Jetson', 'TensorRT', 'Model Compression', 'ONNX'],
    ic: ['Verilog', 'FPGA', 'Semiconductor', 'Defect Detection'],
    robot: ['ROS2', 'LiDAR SLAM', 'Sensor Fusion', 'Gazebo'],
    blockchain: ['Solidity', 'Smart Contracts', 'Ethereum L2', 'Zero-Knowledge Proofs']
  };

  // ---------- Dữ liệu mẫu ----------
  var BAI_TOAN_MAU = [
    {
      ma: 'RD-2026-084',
      tieuDe: 'Hệ thống Edge-AI phát hiện bất thường & tấn công DDoS tầng ứng dụng trên thiết bị biên',
      loai: 'ung-tuyen',
      linhVuc: 'sec',
      trangThai: 'dang-mo',
      tomTat: 'Yêu cầu xây dựng mô hình nén chạy trên Jetson Orin Nano, độ trễ < 15ms, hỗ trợ phân tích gói tin eBPF thời gian thực.',
      moTa: '<p>V-Tech Global vận hành hệ thống cổng thanh toán và API cho hơn 200 đối tác bán lẻ. Các đợt tấn công DDoS tầng ứng dụng (HTTP flood, slowloris) ngày càng khó phân biệt với lưu lượng thật.</p>' +
        '<p><b>Thách thức kỹ thuật:</b></p>' +
        '<ol><li>Phát hiện bất thường ngay tại thiết bị biên (NVIDIA Jetson Orin Nano), độ trễ suy luận dưới 15 ms.</li>' +
        '<li>Thu thập và trích xuất đặc trưng gói tin bằng eBPF, không làm nghẽn luồng mạng.</li>' +
        '<li>Mô hình nén (quantization / pruning) nhưng F1-score không thấp hơn 95%.</li></ol>' +
        '<p><b>Đầu ra mong đợi:</b> mã nguồn pipeline, mô hình đã huấn luyện, báo cáo đánh giá trên tập CIC-DDoS2019 và dữ liệu thật đã ẩn danh do doanh nghiệp cung cấp.</p>',
      tepDinhKem: [{ ten: 'Specs_EdgeAI_DDoS_VTech_2026.pdf', kichThuoc: '2.8 MB' }],
      kyNang: ['Edge AI', 'eBPF', 'NVIDIA Jetson', 'Network Security', 'PyTorch'],
      doiTuong: ['nhom-sv', 'lab'],
      quyMoNhom: { min: 2, max: 5 },
      trl: 3,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật'],
      tieuChi: 'Độ trễ suy luận đo trên Jetson Orin Nano; F1-score trên tập kiểm thử của doanh nghiệp; kinh nghiệm eBPF của nhóm.',
      yeuCauNda: true,
      nganSach: { min: 150, max: 300 },
      hanNop: '2026-11-30',
      ngayBatDau: '2026-12-15',
      thoiGian: 16,
      hinhThuc: 'ket-hop',
      diaDiem: 'TP. Thủ Đức, TP.HCM',
      moc: [
        { ten: 'Thu thập dữ liệu & pipeline eBPF', tuan: 4, phanTram: 30 },
        { ten: 'Mô hình phát hiện bất thường', tuan: 10, phanTram: 40 },
        { ten: 'Tối ưu trên Jetson & bàn giao', tuan: 16, phanTram: 30 }
      ],
      ngayTao: '2026-10-05',
      ngayLuu: '2026-10-06',
      proposal: { tong: 8, moi: 3, loiMoi: 2, ghiChu: 'Nhóm nộp gần nhất', nhom: [
        { kyHieu: 'VL', ten: 'VisionLab UIT', mau: 'bg-primary-container text-on-primary' },
        { kyHieu: 'SL', ten: 'SecLab UIT', mau: 'bg-tertiary-container text-on-tertiary' },
        { kyHieu: 'AR', ten: 'AI Researchers Group', mau: 'bg-brand-navy-dark text-on-primary' }
      ] }
    },
    {
      ma: 'RD-2026-079',
      tieuDe: 'Tối ưu hóa mô hình LLM chuyên biệt tiếng Việt phục vụ y tế dự phòng trên hạ tầng Hybrid-Cloud',
      loai: 'hop-tac-lab',
      linhVuc: 'ai',
      trangThai: 'dang-mo',
      tomTat: 'Fine-tune và nén mô hình ngôn ngữ lớn (7B parameters) với cơ chế RAG đa tầng, kiểm thử đối sánh lâm sàng.',
      moTa: '<p>Ban Công nghệ Y tế V-Tech đang xây dựng trợ lý tư vấn y tế dự phòng cho các trạm y tế phường. Mô hình cần trả lời bằng tiếng Việt, dẫn nguồn từ tài liệu của Bộ Y tế.</p>' +
        '<ul><li>Fine-tune mô hình mở cỡ 7B trên kho hướng dẫn chuyên môn đã chuẩn hóa.</li>' +
        '<li>Xây dựng RAG đa tầng: truy hồi theo chủ đề, sau đó theo đoạn văn bản.</li>' +
        '<li>Nén mô hình để chạy suy luận trên cụm GPU tại chỗ, phần huấn luyện chạy trên đám mây.</li></ul>' +
        '<blockquote>Dữ liệu bệnh nhân không rời hạ tầng của doanh nghiệp. Lab hợp tác làm việc trên dữ liệu đã ẩn danh.</blockquote>',
      tepDinhKem: [
        { ten: 'RFP_LLM_YTe_DuPhong.pdf', kichThuoc: '1.9 MB' },
        { ten: 'Bo_cau_hoi_danh_gia_mau.zip', kichThuoc: '12.4 MB' }
      ],
      kyNang: ['LLM', 'RAG', 'NLP Tiếng Việt', 'vLLM', 'Healthcare AI'],
      doiTuong: ['lab'],
      quyMoNhom: { min: 3, max: 8 },
      trl: 4,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật', 'Bài báo khoa học'],
      tieuChi: 'Kinh nghiệm NLP tiếng Việt của Lab; phương án đánh giá với bác sĩ; kế hoạch bảo mật dữ liệu.',
      yeuCauNda: true,
      nganSach: { min: 250, max: 450 },
      hanNop: '2026-12-15',
      ngayBatDau: '2027-01-10',
      thoiGian: 24,
      hinhThuc: 'ket-hop',
      donVi: 'Ban Công nghệ Y tế V-Tech',
      moc: [
        { ten: 'Chuẩn hóa kho tri thức & RAG', tuan: 8, phanTram: 30 },
        { ten: 'Fine-tune & đánh giá lâm sàng', tuan: 18, phanTram: 40 },
        { ten: 'Nén mô hình & triển khai thử', tuan: 24, phanTram: 30 }
      ],
      ngayTao: '2026-09-28',
      ngayLuu: '2026-09-30',
      proposal: { tong: 5, moi: 1, loiMoi: 4, ghiChu: 'Đang xem xét sơ bộ', nhom: [
        { kyHieu: 'DS', ten: 'Data Science Lab', mau: 'bg-primary-fixed text-primary' },
        { kyHieu: 'NL', ten: 'NLP Lab UIT', mau: 'bg-secondary-fixed text-secondary' }
      ] }
    },
    {
      ma: 'RD-2026-071',
      tieuDe: 'Phát triển thuật toán SLAM 3D và định vị chính xác cho AGV vận chuyển nhà xưởng thông minh',
      loai: 'tai-tro',
      linhVuc: 'robot',
      trangThai: 'dang-thuc-hien',
      tomTat: 'Đang phối hợp cùng Lab Robotics & IoT UIT. Hợp đồng MoA đã ký kết, tiến độ Milestone 2.',
      moTa: '<p>Nhà xưởng của V-Tech dùng 12 xe tự hành (AGV) dẫn đường bằng vạch từ. Doanh nghiệp muốn chuyển sang định vị không cần vạch để thay đổi tuyến linh hoạt.</p>' +
        '<ol><li>SLAM 3D bằng LiDAR kết hợp IMU, sai số định vị dưới 2 cm.</li>' +
        '<li>Chạy trên máy tính nhúng của AGV (Embedded Linux, ROS2).</li>' +
        '<li>Kiểm thử trong mô phỏng Gazebo trước khi chạy tại xưởng.</li></ol>',
      tepDinhKem: [
        { ten: 'Ban_ve_mat_bang_xuong.pdf', kichThuoc: '4.1 MB' },
        { ten: 'Thong_so_AGV_VT200.pdf', kichThuoc: '0.9 MB' }
      ],
      kyNang: ['ROS2', 'LiDAR SLAM', 'C++', 'Sensor Fusion', 'Embedded Linux'],
      doiTuong: ['lab', 'nhom-sv'],
      quyMoNhom: { min: 3, max: 5 },
      trl: 4,
      sanPham: ['Mã nguồn', 'Báo cáo kỹ thuật', 'Bản demo / prototype'],
      tieuChi: 'Kinh nghiệm ROS2; có AGV hoặc robot thử nghiệm tại Lab.',
      yeuCauNda: true,
      nganSach: { min: 350, max: 350 },
      hanNop: '2026-08-15',
      ngayBatDau: '2026-09-01',
      ngayKetThuc: '2027-03-30',
      thoiGian: 30,
      hinhThuc: 'tai-dn',
      diaDiem: 'Xưởng V-Tech, KCN Tân Bình',
      moc: [
        { ten: 'Mô phỏng Gazebo', tuan: 6, phanTram: 40, trangThai: 'da-nghiem-thu' },
        { ten: 'SLAM 3D trên AGV mẫu', tuan: 14, phanTram: 20, trangThai: 'dang-thuc-hien' },
        { ten: 'Định vị chính xác & tích hợp', tuan: 22, phanTram: 20, trangThai: 'chua-bat-dau' },
        { ten: 'Nghiệm thu tại nhà xưởng', tuan: 30, phanTram: 20, trangThai: 'chua-bat-dau' }
      ],
      ngayTao: '2026-07-10',
      ngayLuu: '2026-07-12',
      duAn: {
        soHopDong: 'HĐ-2026-042',
        ngayKy: '2026-09-01',
        doiTac: 'Lab Robotics & IoT UIT',
        truongNhom: 'Đỗ Mai Anh (21521789)',
        thanhVien: [
          { kyHieu: 'MA', ten: 'Đỗ Mai Anh', vaiTro: 'Trưởng nhóm · SLAM & định vị' },
          { kyHieu: 'TH', ten: 'Trần Thanh Hải', vaiTro: 'ROS2 & điều khiển AGV' },
          { kyHieu: 'PA', ten: 'Phan Anh', vaiTro: 'Sensor Fusion & kiểm thử' }
        ],
        giangVien: 'TS. Nguyễn Hoàng Long (Lab Robotics & IoT)',
        lichTraoDoi: 'Thứ 4, 21/10 · 10:00 · Xưởng Chế tạo Robotics Nhà E (nghiệm thu Milestone 2)',
        baoCao: [
          { ten: 'Bao_cao_Milestone1_Gazebo.pdf', ngay: '2026-10-14', ghiChu: 'Đã nghiệm thu' },
          { ten: 'Bao_cao_tien_do_tuan_10.pdf', ngay: '2026-11-12', ghiChu: 'Báo cáo định kỳ' }
        ]
      }
    },
    {
      ma: 'RD-2026-091',
      tieuDe: 'Hệ thống kiểm thử vi mạch tự động ứng dụng AI phát hiện lỗi vật lý trên wafer bán dẫn',
      loai: 'ung-tuyen',
      linhVuc: 'ic',
      trangThai: 'cho-duyet',
      tomTat: 'Tự động phân loại khuyết tật hình ảnh SEM wafer với độ chính xác F1-score > 98.5%.',
      moTa: '<p>Dây chuyền kiểm thử wafer hiện phân loại khuyết tật thủ công từ ảnh SEM, mỗi ca cần 3 kỹ sư.</p>' +
        '<ul><li>Phân loại 9 nhóm khuyết tật vật lý trên ảnh SEM.</li>' +
        '<li>F1-score trên 98.5%, thời gian xử lý dưới 200 ms mỗi ảnh.</li>' +
        '<li>Giải thích được vùng khuyết tật (heatmap) để kỹ sư kiểm tra lại.</li></ul>',
      tepDinhKem: [{ ten: 'Mo_ta_bai_toan_Wafer_SEM.pdf', kichThuoc: '3.2 MB' }],
      kyNang: ['Computer Vision', 'Semiconductor', 'Deep Learning', 'Defect Detection'],
      doiTuong: ['nhom-sv', 'ca-nhan'],
      quyMoNhom: { min: 1, max: 4 },
      trl: 2,
      sanPham: ['Mã nguồn', 'Mô hình đã huấn luyện', 'Báo cáo kỹ thuật'],
      tieuChi: 'Kết quả thử nghiệm sơ bộ trên tập ảnh mẫu do doanh nghiệp cung cấp.',
      yeuCauNda: true,
      nganSach: { min: 200, max: 350 },
      hanNop: '2027-02-28',
      ngayBatDau: '2027-03-15',
      ngayDuKienMo: '2027-01-10',
      thoiGian: 20,
      hinhThuc: 'tai-uit',
      diaDiem: 'UIT, TP. Thủ Đức',
      moc: [
        { ten: 'Tiền xử lý & gán nhãn dữ liệu', tuan: 6, phanTram: 30 },
        { ten: 'Mô hình phân loại & heatmap', tuan: 14, phanTram: 40 },
        { ten: 'Tích hợp dây chuyền thử', tuan: 20, phanTram: 30 }
      ],
      ngayTao: '2026-10-20',
      ngayNop: '2026-10-22',
      ngayLuu: '2026-10-22'
    },
    {
      ma: 'DRAFT-904',
      tieuDe: 'Nghiên cứu kiến trúc Blockchain Layer-2 tối ưu phí gas cho giao dịch chứng chỉ tín chỉ carbon sinh viên',
      loai: 'hop-tac-lab',
      linhVuc: 'blockchain',
      trangThai: 'nhap',
      tomTat: 'Bản thảo chưa hoàn tất phần ngân sách dự kiến và tiêu chí chuyển giao công nghệ mã nguồn.',
      moTa: '<p>Doanh nghiệp muốn thử nghiệm phát hành chứng chỉ tín chỉ carbon cho hoạt động xanh của sinh viên trên mạng Layer-2, giảm phí gas so với Ethereum mainnet.</p>' +
        '<ul><li>So sánh Optimistic Rollup và ZK-Rollup cho bài toán này.</li>' +
        '<li>Thiết kế smart contract phát hành và thu hồi chứng chỉ.</li></ul>',
      tepDinhKem: [],
      kyNang: ['Blockchain', 'Smart Contracts', 'Ethereum L2', 'Zero-Knowledge Proofs'],
      doiTuong: ['lab'],
      quyMoNhom: { min: 2, max: 5 },
      trl: 0,
      sanPham: ['Mã nguồn', 'Báo cáo kỹ thuật'],
      tieuChi: '',
      yeuCauNda: false,
      nganSach: null,
      hanNop: '',
      ngayBatDau: '',
      thoiGian: 0,
      hinhThuc: 'tu-xa',
      moc: [],
      ngayTao: '2026-10-15',
      ngayLuu: '2026-10-19',
      tienDoSoanThao: 60
    }
  ];

  // ---------- Proposal gửi tới các bài toán (Hộp thư kết nối DN-08) ----------
  // Chỉ bài toán đã công khai mới nhận proposal: RD-2026-084, RD-2026-079 (đang mở), RD-2026-071 (đang thực hiện).
  // RD-2026-091 (chờ duyệt) và DRAFT-904 (bản nháp) chưa công khai nên không có proposal.
  // trangThai: cho-phan-hoi | da-hen | dam-phan | tu-choi (khớp 4 tab của DN-08)
  // dpId: id thẻ tương ứng ở Không gian đàm phán (DN-09)
  // phutTruoc: số phút từ lúc gửi (để sắp xếp "Mới nhất"); phuHop: mức phù hợp 0–100
  var TRANG_THAI_PROPOSAL = {
    'cho-phan-hoi': 'Chờ phản hồi',
    'da-hen': 'Đã hẹn trao đổi',
    'dam-phan': 'Chuyển đàm phán',
    'tu-choi': 'Đã từ chối'
  };

  var PROPOSAL_MAU = [
    // ===== RD-2026-084: Edge-AI phát hiện DDoS (8 proposal) =====
    {
      id: 'p-netguard', baiToan: 'RD-2026-084', trangThai: 'cho-phan-hoi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Autoencoder nhẹ kết hợp luật eBPF phát hiện HTTP flood trên Jetson',
      nguoiGui: 'Phạm Thùy Linh', kyHieu: 'TL', mau: 'bg-indigo-100 text-indigo-700',
      quyMo: 'Nhóm 4 SV', moi: true, thoiGian: '2 giờ trước', phutTruoc: 120, phuHop: 88,
      nhom: 'NetGuard UIT', mssv: '21521544', khoa: 'Khoa Mạng máy tính & Truyền thông', lop: 'Lớp MMTT2021 (K19)', gpa: '8.64', drl: 91,
      noiDung: 'Hai tầng phát hiện: luật eBPF lọc nhanh các mẫu tấn công đã biết, autoencoder 1,2 triệu tham số phát hiện bất thường còn lại. Đã thử trên Jetson Orin Nano: độ trễ 9 ms, F1-score 95,4% trên CIC-DDoS2019. Kế hoạch 15 tuần.',
      the: ['eBPF', 'Autoencoder', 'NVIDIA Jetson', 'Network Security'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['Nhóm NetGuard UIT gồm 4 sinh viên ngành Mạng máy tính, đã vận hành phòng lab mạng của Khoa trong 2 năm.', 'Nhóm mong được dùng thử dữ liệu lưu lượng đã ẩn danh của doanh nghiệp để hiệu chỉnh ngưỡng phát hiện.'],
      tep: [{ ten: 'Proposal_NetGuard_DDoS.pdf', kichThuoc: '2.1 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ket_qua_Jetson_NetGuard.pdf', kichThuoc: '0.7 MB', loai: 'Kết quả thử nghiệm' }],
      thanhVien: [
        { ten: 'Phạm Thùy Linh', truongNhom: true, mssv: '21521544', vaiTro: 'Mô hình autoencoder', gpa: '8.64' },
        { ten: 'Đoàn Minh Khoa', mssv: '21521560', vaiTro: 'eBPF / XDP', gpa: '8.21' },
        { ten: 'Lương Bảo Ngọc', mssv: '21521602', vaiTro: 'Đo hiệu năng trên Jetson', gpa: '8.40' },
        { ten: 'Tạ Quang Huy', mssv: '21521619', vaiTro: 'Dashboard giám sát', gpa: '7.95' }
      ]
    },
    {
      id: 'p-edgesentinel', baiToan: 'RD-2026-084', trangThai: 'cho-phan-hoi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Edge Sentinel – phân loại lưu lượng bằng mô hình cây tăng cường lượng tử hóa',
      nguoiGui: 'Hồ Quang Vinh', kyHieu: 'QV', mau: 'bg-cyan-100 text-cyan-700',
      quyMo: 'Nhóm 2 SV', moi: true, thoiGian: '5 giờ trước', phutTruoc: 300, phuHop: 74,
      nhom: 'Edge Sentinel', mssv: '21520733', khoa: 'Khoa Kỹ thuật Máy tính', lop: 'Lớp KTMT2021 (K19)', gpa: '8.35', drl: 87,
      noiDung: 'Dùng LightGBM đã chuyển sang mã C chạy trực tiếp trên CPU của Jetson, không cần GPU; độ trễ dưới 5 ms. Phù hợp làm tầng lọc đầu, có thể ghép với mô hình học sâu của nhóm khác.',
      the: ['LightGBM', 'Edge AI', 'C/C++'], trl: 'TRL 2 (Ý tưởng công nghệ)',
      thu: ['Nhóm Edge Sentinel gồm 2 sinh viên Kỹ thuật Máy tính, quan tâm tới tối ưu mô hình trên phần cứng nhúng.'],
      tep: [{ ten: 'Proposal_EdgeSentinel.pdf', kichThuoc: '1.3 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Hồ Quang Vinh', truongNhom: true, mssv: '21520733', vaiTro: 'Mô hình & sinh mã C', gpa: '8.35' },
        { ten: 'Kiều Anh Thư', mssv: '21520781', vaiTro: 'Tích hợp Jetson', gpa: '8.18' }
      ]
    },
    {
      id: 'p-airesearch', baiToan: 'RD-2026-084', trangThai: 'cho-phan-hoi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Transformer rút gọn phát hiện tấn công tầng ứng dụng theo chuỗi request',
      nguoiGui: 'Bùi Thanh Tâm', kyHieu: 'TT', mau: 'bg-slate-200 text-slate-700',
      quyMo: 'Nhóm 3 SV', moi: true, thoiGian: '1 ngày trước', phutTruoc: 1440, phuHop: 81,
      nhom: 'AI Researchers Group', mssv: '21522210', khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHTN2021 (K19)', gpa: '9.02', drl: 93, huyHieu: 'Top 5% Khoá',
      noiDung: 'Mô hình transformer 4 lớp đọc chuỗi request HTTP theo phiên, chưng cất tri thức từ mô hình lớn rồi lượng tử hóa INT8. F1-score 97,1% trên tập thử, độ trễ 14 ms trên Jetson Orin Nano.',
      the: ['Transformer', 'Knowledge Distillation', 'PyTorch', 'TensorRT'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['AI Researchers Group đã có 2 bài báo hội nghị trong nước về phát hiện xâm nhập bằng học sâu.', 'Nhóm sẵn sàng trình bày demo trực tuyến khi doanh nghiệp thuận tiện.'],
      tep: [{ ten: 'Proposal_TransformerIDS_ARG.pdf', kichThuoc: '2.6 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ho_so_nang_luc_ARG.pdf', kichThuoc: '1.1 MB', loai: 'Hồ sơ năng lực' }],
      thanhVien: [
        { ten: 'Bùi Thanh Tâm', truongNhom: true, mssv: '21522210', vaiTro: 'Kiến trúc mô hình', gpa: '9.02' },
        { ten: 'Mạc Hải Đăng', mssv: '21522245', vaiTro: 'Chưng cất & lượng tử hóa', gpa: '8.77' },
        { ten: 'Quách Ngọc Hân', mssv: '21522288', vaiTro: 'Dữ liệu & đánh giá', gpa: '8.69' }
      ]
    },
    {
      id: 'p-cyberlab', baiToan: 'RD-2026-084', trangThai: 'da-hen', nguon: 'lab',
      tieuDe: 'Proposal: Hợp tác CyberLab – nền tảng phát hiện DDoS biên có giải thích',
      nguoiGui: 'TS. Trịnh Gia Khang', kyHieu: 'GK', mau: 'bg-emerald-100 text-emerald-700',
      quyMo: 'Lab · 4 thành viên', moi: false, thoiGian: '3 ngày trước', phutTruoc: 4320, phuHop: 90,
      nhom: 'CyberLab UIT', gioiThieu: 'Trưởng nhóm nghiên cứu CyberLab · Khoa Mạng máy tính & Truyền thông',
      noiDung: 'CyberLab đề xuất nền tảng gồm bộ thu eBPF, mô hình phát hiện và mô-đun giải thích (SHAP) để kỹ sư vận hành hiểu vì sao lưu lượng bị chặn. Có sẵn testbed 40 máy để tái hiện tấn công.',
      the: ['eBPF', 'Explainable AI', 'Testbed', 'Network Security'], trl: 'TRL 4 (Lab Prototype)',
      thu: ['CyberLab UIT đã thực hiện 3 dự án an toàn mạng với doanh nghiệp trong 2 năm gần đây.', 'Lab đề xuất một buổi trao đổi để thống nhất phạm vi dữ liệu và hạ tầng thử nghiệm.'],
      tep: [{ ten: 'Proposal_CyberLab_DDoS.pdf', kichThuoc: '3.4 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ho_so_nang_luc_CyberLab.pdf', kichThuoc: '2.0 MB', loai: 'Hồ sơ năng lực' }],
      thanhVien: [
        { ten: 'TS. Trịnh Gia Khang', truongNhom: true, vaiTro: 'Chủ nhiệm, giảng viên hướng dẫn' },
        { ten: 'Hà Minh Tuấn', mssv: '20520412', vaiTro: 'Học viên cao học · eBPF', gpa: '8.50' },
        { ten: 'Phan Thị Diệu', mssv: '21520530', vaiTro: 'Mô hình phát hiện', gpa: '8.88' },
        { ten: 'Trần Đức Lộc', mssv: '21520561', vaiTro: 'Testbed & tái hiện tấn công', gpa: '8.10' }
      ],
      lichHen: { ngay: '2026-11-28', gio: '14:00', hinhThuc: 'Trực tuyến (Google Meet)', ghiChu: 'Thống nhất phạm vi dữ liệu thử nghiệm' }
    },
    {
      id: 'p-seclab', baiToan: 'RD-2026-084', trangThai: 'dam-phan', nguon: 'nhom-sv', dpId: 'dp-seclab',
      tieuDe: 'Proposal: Phát hiện bất thường DDoS bằng eBPF và học sâu đồ thị',
      nguoiGui: 'Trần Minh Quân', kyHieu: 'MQ', mau: 'bg-purple-100 text-purple-700',
      quyMo: 'Nhóm 3 SV', moi: false, thoiGian: '2 tuần trước', phutTruoc: 20160, phuHop: 84,
      nhom: 'SecLab Fellows UIT', mssv: '21520890', khoa: 'Khoa Mạng máy tính & Truyền thông', lop: 'Lớp ATTT2021 (K19)', gpa: '8.71', drl: 90,
      noiDung: 'Biểu diễn luồng kết nối thành đồ thị theo thời gian, dùng GNN nhẹ để phát hiện HTTP flood và slowloris. Bộ thu thập eBPF chạy ở chế độ XDP, mô hình lượng tử hóa INT8 bằng TensorRT. Kế hoạch 14 tuần, có buổi demo trên dữ liệu ẩn danh của doanh nghiệp ở tuần 8.',
      the: ['Network Security', 'eBPF', 'Graph Neural Network', 'TensorRT'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['Nhóm SecLab Fellows gồm 3 sinh viên ngành An toàn thông tin, đã đạt giải Nhì cuộc thi ATTT sinh viên 2026 với đề tài phát hiện tấn công bằng eBPF.', 'Nhóm mong được trao đổi thêm về dữ liệu thật của doanh nghiệp để điều chỉnh kế hoạch kiểm thử.'],
      tep: [{ ten: 'Proposal_GNN_eBPF_SecLabFellows.pdf', kichThuoc: '3.1 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Trần Minh Quân', truongNhom: true, mssv: '21520890', vaiTro: 'eBPF / XDP & thu thập dữ liệu', gpa: '8.71' },
        { ten: 'Lý Gia Huy', mssv: '21521415', vaiTro: 'Mô hình GNN', gpa: '8.30' },
        { ten: 'Ngô Bảo Trâm', mssv: '21521877', vaiTro: 'Kiểm thử & báo cáo', gpa: '8.55' }
      ]
    },
    {
      id: 'p-visionlab', baiToan: 'RD-2026-084', trangThai: 'dam-phan', nguon: 'nhom-sv', dpId: 'dp-visionlab',
      tieuDe: 'Edge-AI phát hiện bất thường & tấn công DDoS tầng ứng dụng trên thiết bị biên',
      nguoiGui: 'Nguyễn Văn An', kyHieu: 'VA', mau: 'bg-blue-100 text-blue-700',
      quyMo: 'Nhóm 3 SV', moi: false, thoiGian: '3 tuần trước', phutTruoc: 30240, phuHop: 92,
      nhom: 'VisionLab UIT', huyHieu: 'Top 5% Khoá',
      mssv: '21520001', khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHMT2021 (K19)', gpa: '8.92', drl: 94,
      noiDung: 'Đề xuất pipeline eBPF thu thập lưu lượng kết hợp mô hình phân loại hành vi đã nén chạy trên NVIDIA Jetson Orin Nano: độ trễ suy luận < 12ms, F1-score 96,8% trên tập CIC-DDoS2019. Bàn giao mã nguồn, mô hình và báo cáo kỹ thuật sau 16 tuần.',
      the: ['Network Security', 'Edge AI', 'eBPF', 'NVIDIA Jetson'], trl: 'TRL 4 (Lab Prototype)',
      thu: ['Em là Nguyễn Văn An, trưởng nhóm VisionLab UIT. Nhóm đã có mô hình mẫu (TRL 4) phát hiện bất thường lưu lượng mạng chạy trên thiết bị biên và rất mong được đồng hành cùng V-Tech Global giải quyết bài toán RD-2026-084, hướng tới triển khai thử nghiệm trên hạ tầng thực tế của doanh nghiệp.', 'Chúng em xin gửi kèm proposal kỹ thuật và hồ sơ năng lực của nhóm để Quý doanh nghiệp xem xét.'],
      tep: [{ ten: 'Proposal_DDoS_EdgeAI_VisionLab.pdf', kichThuoc: '2.4 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ho_so_nang_luc_VisionLab.pdf', kichThuoc: '1.8 MB', loai: 'Hồ sơ năng lực' }],
      thanhVien: [
        { ten: 'Nguyễn Văn An', truongNhom: true, mssv: '21520001', vaiTro: 'Xử lý mô hình AI & Pipeline tối ưu hóa', gpa: '8.92' },
        { ten: 'Đặng Hoàng Nam', mssv: '21520342', vaiTro: 'Nhúng phần cứng & NVIDIA Jetson Edge SDK', gpa: '8.45' },
        { ten: 'Vũ Thảo Nhi', mssv: '21520678', vaiTro: 'Thu thập dữ liệu giao thông & Dashboard Web', gpa: '8.60' }
      ]
    },
    {
      id: 'p-blueteam', baiToan: 'RD-2026-084', trangThai: 'tu-choi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Hệ thống WAF học máy triển khai trên máy chủ trung tâm',
      nguoiGui: 'Ngô Đức Huy', kyHieu: 'ĐH', mau: 'bg-orange-100 text-orange-700',
      quyMo: 'Nhóm 2 SV', moi: false, thoiGian: '1 tuần trước', phutTruoc: 10080, phuHop: 52,
      nhom: 'Blue Team UIT', mssv: '21521960', khoa: 'Khoa Mạng máy tính & Truyền thông', lop: 'Lớp ATTT2021 (K19)', gpa: '8.05', drl: 85,
      noiDung: 'Tường lửa ứng dụng web (WAF) dùng học máy, chạy trên máy chủ trung tâm thay vì thiết bị biên.',
      the: ['WAF', 'Machine Learning'], trl: 'TRL 2 (Ý tưởng công nghệ)',
      thu: ['Nhóm Blue Team UIT xin gửi proposal cho bài toán RD-2026-084.'],
      tep: [{ ten: 'Proposal_WAF_BlueTeam.pdf', kichThuoc: '0.9 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Ngô Đức Huy', truongNhom: true, mssv: '21521960', vaiTro: 'Mô hình & WAF', gpa: '8.05' },
        { ten: 'Châu Gia Phúc', mssv: '21521977', vaiTro: 'Triển khai máy chủ', gpa: '7.88' }
      ],
      lyDoTuChoi: 'Giải pháp chạy trên máy chủ trung tâm, không đáp ứng yêu cầu xử lý tại thiết bị biên.'
    },
    {
      id: 'p-nhatminh', baiToan: 'RD-2026-084', trangThai: 'tu-choi', nguon: 'ca-nhan',
      tieuDe: 'Proposal: Phát hiện DDoS bằng thống kê entropy lưu lượng',
      nguoiGui: 'Lâm Nhật Minh', kyHieu: 'NM', mau: 'bg-lime-100 text-lime-700',
      quyMo: 'Cá nhân', moi: false, thoiGian: '9 ngày trước', phutTruoc: 12960, phuHop: 45,
      nhom: 'Cá nhân', mssv: '22520845', khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHMT2022 (K20)', gpa: '7.90', drl: 82,
      noiDung: 'Dùng độ đo entropy của địa chỉ nguồn và URL để phát hiện bất thường, không dùng học sâu.',
      the: ['Entropy', 'Thống kê'], trl: 'TRL 2 (Ý tưởng công nghệ)',
      thu: ['Em xin gửi ý tưởng ban đầu và mong nhận góp ý của doanh nghiệp.'],
      tep: [{ ten: 'Y_tuong_Entropy_DDoS.pdf', kichThuoc: '0.5 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [{ ten: 'Lâm Nhật Minh', mssv: '22520845', vaiTro: 'Toàn bộ đề xuất', gpa: '7.90' }],
      lyDoTuChoi: 'Phương pháp chưa phát hiện được tấn công tầng ứng dụng (slowloris), chưa có kết quả thử nghiệm.'
    },

    // ===== RD-2026-079: LLM y tế dự phòng (5 proposal / phản hồi) =====
    {
      id: 'p-dsclub', baiToan: 'RD-2026-079', trangThai: 'cho-phan-hoi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Nén mô hình LLM 7B chạy suy luận trên hạ tầng Hybrid-Cloud',
      nguoiGui: 'Đinh Mai Phương', kyHieu: 'MP', mau: 'bg-rose-100 text-rose-700',
      quyMo: 'Nhóm 2 SV', moi: true, thoiGian: '3 giờ trước', phutTruoc: 180, phuHop: 76,
      nhom: 'Data Science Club', mssv: '21521655', khoa: 'Khoa Hệ thống Thông tin', lop: 'Lớp HTTT2021 (K19)', gpa: '8.50', drl: 88,
      noiDung: 'Tập trung vào phần hạ tầng: huấn luyện trên đám mây, suy luận tại chỗ bằng mô hình lượng tử hóa 4-bit; đo độ trễ và chi phí cho 3 cấu hình GPU. Không bao gồm phần đánh giá lâm sàng.',
      the: ['LLM', 'Hybrid-Cloud', 'Quantization'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['Nhóm Data Science Club xin gửi proposal cho phần hạ tầng của bài toán RD-2026-079 và sẵn sàng phối hợp với nhóm khác phụ trách phần mô hình.'],
      tep: [{ ten: 'Proposal_HybridCloud_DSClub.pdf', kichThuoc: '1.6 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Đinh Mai Phương', truongNhom: true, mssv: '21521655', vaiTro: 'Hạ tầng & đo hiệu năng', gpa: '8.50' },
        { ten: 'Trương Gia Bảo', mssv: '21521802', vaiTro: 'Lượng tử hóa mô hình', gpa: '8.12' }
      ]
    },
    {
      id: 'p-quocbao', baiToan: 'RD-2026-079', trangThai: 'da-hen', nguon: 'ca-nhan',
      tieuDe: 'Phản hồi lời mời: Đồng ý trao đổi về bài toán LLM y tế',
      nguoiGui: 'Phạm Quốc Bảo', kyHieu: 'QB', mau: 'bg-teal-100 text-teal-700',
      quyMo: 'Cá nhân', moi: false, thoiGian: '2 ngày trước', phutTruoc: 2880, phuHop: 79, laPhanHoiLoiMoi: true, dongPhu: 'Lời mời đã gửi 12/10 · Khoa KHMT',
      nhom: 'Cá nhân', mssv: '21520915', khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHTN2021 (K19)', gpa: '9.10', drl: 96, huyHieu: 'Top 5% Khoá',
      noiDung: 'Đồng ý trao đổi về bài toán RD-2026-079 theo lời mời doanh nghiệp gửi ngày 12/10. Có kinh nghiệm nén mô hình bằng AWQ / GPTQ và triển khai vLLM trên cụm GPU nhỏ; mong muốn tham gia phần nén mô hình và triển khai suy luận.',
      the: ['LLM', 'vLLM', 'Model Compression'], trl: 'Phản hồi lời mời',
      thu: ['Em cảm ơn Quý doanh nghiệp đã gửi lời mời. Em có thể trao đổi trực tuyến vào chiều thứ 3 hoặc thứ 5 hằng tuần.'],
      tep: [{ ten: 'CV_PhamQuocBao.pdf', kichThuoc: '0.4 MB', loai: 'Hồ sơ năng lực' }],
      thanhVien: [{ ten: 'Phạm Quốc Bảo', mssv: '21520915', vaiTro: 'Nén mô hình & triển khai suy luận', gpa: '9.10' }],
      lichHen: { ngay: '2026-12-02', gio: '15:30', hinhThuc: 'Trực tuyến (MS Teams)', ghiChu: 'Trao đổi kinh nghiệm nén mô hình' }
    },
    {
      id: 'p-healthtech', baiToan: 'RD-2026-079', trangThai: 'dam-phan', nguon: 'nhom-sv', dpId: 'dp-healthtech',
      tieuDe: 'Proposal: LLM tiếng Việt cho y tế dự phòng với RAG đa tầng',
      nguoiGui: 'Lê Hoàng Yến', kyHieu: 'HY', mau: 'bg-amber-100 text-amber-700',
      quyMo: 'Nhóm 4 SV', moi: false, thoiGian: '2 tuần trước', phutTruoc: 21600, phuHop: 87,
      nhom: 'Nhóm AI HealthTech', mssv: '21522040', khoa: 'Khoa Khoa học Máy tính', lop: 'Lớp KHMT2021 (K19)', gpa: '8.80', drl: 92,
      noiDung: 'Fine-tune mô hình 7B bằng LoRA trên 40.000 cặp hỏi đáp y tế dự phòng đã chuẩn hóa; RAG hai tầng (chủ đề → đoạn văn) có trích dẫn nguồn Bộ Y tế. Đánh giá với 2 bác sĩ cộng tác theo bộ câu hỏi mẫu của doanh nghiệp.',
      the: ['LLM', 'RAG', 'NLP Tiếng Việt', 'LoRA'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['Nhóm AI HealthTech đang làm khóa luận về hỏi đáp y khoa tiếng Việt dưới sự hướng dẫn của NLP Lab UIT.', 'Nhóm gửi kèm proposal và kết quả thử nghiệm ban đầu trên bộ câu hỏi mẫu.'],
      tep: [{ ten: 'Proposal_LLM_YTe_AIHealthTech.pdf', kichThuoc: '2.2 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ket_qua_thu_nghiem_ban_dau.pdf', kichThuoc: '0.8 MB', loai: 'Kết quả thử nghiệm' }],
      thanhVien: [
        { ten: 'Lê Hoàng Yến', truongNhom: true, mssv: '21522040', vaiTro: 'Fine-tune & đánh giá mô hình', gpa: '8.80' },
        { ten: 'Huỳnh Đức Toàn', mssv: '21522118', vaiTro: 'RAG & vector database', gpa: '8.42' },
        { ten: 'Mai Khánh Linh', mssv: '21522231', vaiTro: 'Chuẩn hóa dữ liệu y tế', gpa: '8.65' },
        { ten: 'Võ Minh Trí', mssv: '21522306', vaiTro: 'Triển khai vLLM', gpa: '8.20' }
      ]
    },
    {
      id: 'p-nlplab', baiToan: 'RD-2026-079', trangThai: 'dam-phan', nguon: 'lab', dpId: 'dp-nlplab',
      tieuDe: 'Proposal: NLP Lab UIT – trợ lý y tế dự phòng tiếng Việt có kiểm chứng nguồn',
      nguoiGui: 'PGS.TS. Trần Quốc Dũng', kyHieu: 'TD', mau: 'bg-sky-100 text-sky-700',
      quyMo: 'Lab · 3 thành viên', moi: false, thoiGian: '1 tháng trước', phutTruoc: 43200, phuHop: 93,
      nhom: 'NLP Lab UIT', gioiThieu: 'Trưởng NLP Lab UIT · Khoa Khoa học Máy tính',
      noiDung: 'NLP Lab đảm nhận trọn gói: xây kho tri thức y tế dự phòng, fine-tune mô hình 7B, RAG có kiểm chứng nguồn và đánh giá cùng bác sĩ. Lab có sẵn cụm 8 GPU A100 cho giai đoạn huấn luyện.',
      the: ['LLM', 'RAG', 'NLP Tiếng Việt', 'Healthcare AI'], trl: 'TRL 4 (Lab Prototype)',
      thu: ['NLP Lab UIT đã công bố bộ dữ liệu hỏi đáp y khoa tiếng Việt và có kinh nghiệm hợp tác với 2 bệnh viện.', 'Lab đề xuất mở phòng đàm phán để thống nhất phạm vi dữ liệu và điều khoản sở hữu trí tuệ.'],
      tep: [{ ten: 'Proposal_NLPLab_YTeDuPhong.pdf', kichThuoc: '4.2 MB', loai: 'Proposal kỹ thuật' }, { ten: 'Ho_so_nang_luc_NLPLab.pdf', kichThuoc: '2.5 MB', loai: 'Hồ sơ năng lực' }],
      thanhVien: [
        { ten: 'PGS.TS. Trần Quốc Dũng', truongNhom: true, vaiTro: 'Chủ nhiệm Lab' },
        { ten: 'Phan Lê Khánh', mssv: '20521140', vaiTro: 'Nghiên cứu sinh · RAG', gpa: '8.90' },
        { ten: 'Nguyễn Khôi', mssv: '21521322', vaiTro: 'Fine-tune mô hình', gpa: '8.74' }
      ]
    },
    {
      id: 'p-medai', baiToan: 'RD-2026-079', trangThai: 'tu-choi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Chatbot y tế dùng API mô hình thương mại',
      nguoiGui: 'Vương Thảo My', kyHieu: 'TM', mau: 'bg-fuchsia-100 text-fuchsia-700',
      quyMo: 'Nhóm 3 SV', moi: false, thoiGian: '10 ngày trước', phutTruoc: 14400, phuHop: 40,
      nhom: 'MedAI Club', mssv: '22521077', khoa: 'Khoa Hệ thống Thông tin', lop: 'Lớp HTTT2022 (K20)', gpa: '8.02', drl: 86,
      noiDung: 'Xây chatbot gọi API mô hình ngôn ngữ thương mại, bổ sung kho câu hỏi thường gặp.',
      the: ['Chatbot', 'API'], trl: 'TRL 2 (Ý tưởng công nghệ)',
      thu: ['MedAI Club xin gửi proposal cho bài toán RD-2026-079.'],
      tep: [{ ten: 'Proposal_Chatbot_MedAI.pdf', kichThuoc: '0.8 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Vương Thảo My', truongNhom: true, mssv: '22521077', vaiTro: 'Thiết kế hội thoại', gpa: '8.02' },
        { ten: 'Đặng Tú Anh', mssv: '22521090', vaiTro: 'Tích hợp API', gpa: '7.85' },
        { ten: 'Lê Phước Thịnh', mssv: '22521104', vaiTro: 'Giao diện', gpa: '7.70' }
      ],
      lyDoTuChoi: 'Gửi dữ liệu y tế ra API bên ngoài, không đáp ứng yêu cầu dữ liệu không rời hạ tầng doanh nghiệp.'
    },

    // ===== RD-2026-071: SLAM 3D cho AGV (đang thực hiện) =====
    {
      id: 'p-robotics', baiToan: 'RD-2026-071', trangThai: 'dam-phan', nguon: 'lab', dpId: 'dp-robotics',
      tieuDe: 'Proposal: SLAM 3D LiDAR–IMU và định vị cm cho AGV nhà xưởng',
      nguoiGui: 'Đỗ Mai Anh', kyHieu: 'MA', mau: 'bg-blue-100 text-blue-700',
      quyMo: 'Nhóm 3 SV · Lab', moi: false, thoiGian: '4 tháng trước', phutTruoc: 172800, phuHop: 95,
      nhom: 'Lab Robotics & IoT UIT', mssv: '21521789', khoa: 'Khoa Kỹ thuật Máy tính', lop: 'Lớp KTMT2021 (K19)', gpa: '8.83', drl: 92,
      noiDung: 'SLAM 3D kết hợp LiDAR và IMU trên ROS2, kiểm thử trong Gazebo trước khi chạy trên AGV VT200. Sai số định vị mục tiêu dưới 2 cm. Proposal đã được chấp nhận và đang thực hiện theo thỏa thuận HĐ-2026-042.',
      the: ['ROS2', 'LiDAR SLAM', 'Sensor Fusion', 'Gazebo'], trl: 'TRL 4 (Lab Prototype)',
      thu: ['Nhóm thuộc Lab Robotics & IoT UIT, dưới sự hướng dẫn của TS. Nguyễn Hoàng Long.'],
      tep: [{ ten: 'Proposal_SLAM3D_RoboticsLab.pdf', kichThuoc: '3.8 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Đỗ Mai Anh', truongNhom: true, mssv: '21521789', vaiTro: 'SLAM & định vị', gpa: '8.83' },
        { ten: 'Trần Thanh Hải', mssv: '21521811', vaiTro: 'ROS2 & điều khiển AGV', gpa: '8.47' },
        { ten: 'Phan Anh', mssv: '21521836', vaiTro: 'Sensor Fusion & kiểm thử', gpa: '8.30' }
      ]
    },
    {
      id: 'p-agvk18', baiToan: 'RD-2026-071', trangThai: 'tu-choi', nguon: 'nhom-sv',
      tieuDe: 'Proposal: Định vị AGV bằng camera và mã QR dán sàn',
      nguoiGui: 'Cao Tuấn Kiệt', kyHieu: 'TK', mau: 'bg-stone-200 text-stone-700',
      quyMo: 'Nhóm 3 SV', moi: false, thoiGian: '4 tháng trước', phutTruoc: 175000, phuHop: 58,
      nhom: 'Nhóm AGV K18', mssv: '20521560', khoa: 'Khoa Kỹ thuật Máy tính', lop: 'Lớp KTMT2020 (K18)', gpa: '8.10', drl: 84,
      noiDung: 'Dán mã QR trên sàn và dùng camera hướng xuống để định vị AGV.',
      the: ['Computer Vision', 'QR Code'], trl: 'TRL 3 (Proof of Concept)',
      thu: ['Nhóm AGV K18 xin gửi proposal cho bài toán RD-2026-071.'],
      tep: [{ ten: 'Proposal_QR_AGV_K18.pdf', kichThuoc: '1.2 MB', loai: 'Proposal kỹ thuật' }],
      thanhVien: [
        { ten: 'Cao Tuấn Kiệt', truongNhom: true, mssv: '20521560', vaiTro: 'Thị giác máy tính', gpa: '8.10' },
        { ten: 'Đào Nhật Nam', mssv: '20521588', vaiTro: 'Điều khiển AGV', gpa: '7.92' },
        { ten: 'Lý Thanh Trúc', mssv: '20521603', vaiTro: 'Kiểm thử', gpa: '8.00' }
      ],
      lyDoTuChoi: 'Doanh nghiệp đã chọn phương án SLAM không cần dán mốc của Lab Robotics & IoT UIT.'
    }
  ];

  // ---------- Phòng đàm phán (DN-09 danh sách, DN-16 trong phòng) ----------
  // Mỗi phòng gắn với một proposal đã chấp nhận (trangThai 'dam-phan'); id phòng = dpId của proposal.
  // 3 bước sau proposal: traoDoi (trao đổi kỹ thuật) → nda (NDA & IP) → hopDong.
  // Mỗi bước có xác nhận của doanh nghiệp (dn) và đối tác (doiTac); bước xong khi CẢ HAI cùng xác nhận.
  // Bước sau chỉ mở khi bước trước xong. "Hợp đồng" chỉ ghi nhận trạng thái đã ký ngoài hệ thống
  // (UIT Connect không làm hợp đồng điện tử / ký số).
  var BUOC_PHONG = [
    { id: 'traoDoi', ten: 'Trao đổi kỹ thuật', moTa: 'Hai bên thống nhất phạm vi kỹ thuật, dữ liệu và kế hoạch.' },
    { id: 'nda', ten: 'NDA & IP', moTa: 'Thỏa thuận bảo mật và điều khoản sở hữu trí tuệ theo mẫu chuẩn UIT.' },
    { id: 'hopDong', ten: 'Hợp đồng', moTa: 'Hợp đồng R&D ký ngoài hệ thống; UIT Connect chỉ ghi nhận khi cả hai bên xác nhận đã ký.' }
  ];

  var TRANG_THAI_PHONG = {
    'dang-trao-doi': { ten: 'Đang trao đổi', mau: 'bg-surface-container-low text-tertiary', cham: 'bg-tertiary-fixed-dim' },
    'cho-xac-nhan': { ten: 'Chờ bạn xác nhận', mau: 'bg-error-container text-on-error-container', cham: 'bg-status-warning animate-ping' },
    'cho-doi-tac': { ten: 'Chờ đối tác phản hồi', mau: 'bg-brand-light-blue text-primary', cham: 'bg-primary animate-pulse' },
    'da-ky': { ten: 'Đã ký kết', mau: 'bg-surface-container-low text-tertiary', cham: 'bg-tertiary' }
  };

  var PHONG_MAU = [
    {
      id: 'dp-nlplab', proposal: 'p-nlplab', moPhong: '2026-10-05', nhan: 'LLM',
      nen: 'from-primary via-primary-container to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: true, doiTac: true, ghiChu: 'Hoàn tất 22/10' },
        nda: { dn: false, doiTac: false, ghiChu: 'Đang soạn thảo' },
        hopDong: { dn: false, doiTac: false, ghiChu: 'Chưa mở' }
      },
      lich: { ngay: '2026-12-04', gio: '14:00', hinhThuc: 'Trực tuyến (MS Teams)', noiDung: 'Rà soát dự thảo NDA & điều khoản dữ liệu y tế' },
      vanBan: [{ ten: 'Du_thao_NDA_NLPLab_v1.pdf', kichThuoc: '0.6 MB', loai: 'Dự thảo NDA' }, { ten: 'Bien_ban_trao_doi_22-10.pdf', kichThuoc: '0.3 MB', loai: 'Biên bản họp' }],
      tinNhan: [
        { tu: 'he-thong', luc: '2026-10-05T09:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' },
        { tu: 'doi-tac', luc: '2026-10-22T16:10', noiDung: 'Cảm ơn doanh nghiệp về buổi trao đổi. Lab gửi biên bản họp, mong hai bên xác nhận phạm vi dữ liệu.' },
        { tu: 'dn', luc: '2026-10-23T08:30', noiDung: 'V-Tech đã xác nhận biên bản. Bộ phận pháp chế đang soạn dự thảo NDA.' },
        { tu: 'doi-tac', luc: '2026-11-24T10:05', noiDung: 'Lab đã nhận dự thảo NDA v1, sẽ góp ý trong tuần này.' }
      ],
      chuaDoc: 1
    },
    {
      id: 'dp-seclab', proposal: 'p-seclab', moPhong: '2026-10-08', nhan: 'eBPF',
      nen: 'from-tertiary-container via-brand-hero-mid to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: false, doiTac: true, ghiChu: 'Đối tác đã xác nhận biên bản' },
        nda: { dn: false, doiTac: true, ghiChu: 'Đối tác đã ký 14/11' },
        hopDong: { dn: false, doiTac: false, ghiChu: 'Chưa mở' }
      },
      canhBao: 'Nhóm đã xác nhận biên bản trao đổi kỹ thuật và ký NDA & điều khoản IP (14/11/2026). Vui lòng rà soát và xác nhận trước 30/11/2026.',
      lich: { ngay: '2026-11-30', gio: '17:00', hinhThuc: 'Trực tuyến (Google Meet)', noiDung: 'Hạn rà soát NDA v2' },
      vanBan: [{ ten: 'Bien_ban_trao_doi_ky_thuat_SecLab.pdf', kichThuoc: '0.4 MB', loai: 'Biên bản họp' }, { ten: 'NDA_v2_SecLab_da_ky.pdf', kichThuoc: '0.7 MB', loai: 'NDA (đối tác đã ký)' }],
      tinNhan: [
        { tu: 'he-thong', luc: '2026-10-08T10:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' },
        { tu: 'doi-tac', luc: '2026-11-14T14:20', noiDung: 'Nhóm đã ký NDA v2 và tải lên mục Văn bản. Mong doanh nghiệp xác nhận để chuyển sang bước hợp đồng.' },
        { tu: 'doi-tac', luc: '2026-11-25T09:00', noiDung: 'Nhóm xin nhắc hạn xác nhận NDA là 30/11.' }
      ],
      chuaDoc: 2
    },
    {
      id: 'dp-healthtech', proposal: 'p-healthtech', moPhong: '2026-10-12', nhan: 'LLM-YTẾ',
      nen: 'from-secondary via-primary-container to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: true, doiTac: true, ghiChu: 'Hoàn tất 19/11' },
        nda: { dn: false, doiTac: false, ghiChu: 'Đang soạn thảo' },
        hopDong: { dn: false, doiTac: false, ghiChu: 'Dự kiến 12/2026' }
      },
      lich: { ngay: '2026-12-08', gio: '15:30', hinhThuc: 'Văn phòng V-Tech, Khu Công nghệ cao', noiDung: 'Demo mô hình RAG' },
      vanBan: [{ ten: 'Bien_ban_trao_doi_HealthTech.pdf', kichThuoc: '0.3 MB', loai: 'Biên bản họp' }],
      tinNhan: [
        { tu: 'he-thong', luc: '2026-10-12T08:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' },
        { tu: 'dn', luc: '2026-11-19T17:00', noiDung: 'Cảm ơn nhóm về buổi trao đổi. V-Tech sẽ gửi dự thảo NDA trước 01/12.' }
      ],
      chuaDoc: 0
    },
    {
      id: 'dp-robotics', proposal: 'p-robotics', moPhong: '2026-08-20', nhan: 'SLAM-3D',
      nen: 'from-primary-container via-brand-hero-mid to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: true, doiTac: true, ghiChu: 'Hoàn tất' },
        nda: { dn: true, doiTac: true, ghiChu: 'Đã ký' },
        hopDong: { dn: true, doiTac: true, ghiChu: 'Đã ký MoA 01/09/2026' }
      },
      lich: { ngay: '2026-12-03', gio: '10:00', hinhThuc: 'Xưởng Chế tạo Robotics Nhà E', noiDung: 'Nghiệm thu Milestone 2' },
      vanBan: [{ ten: 'MoA_HD-2026-042_ban_scan.pdf', kichThuoc: '1.9 MB', loai: 'Thỏa thuận đã ký (bản scan)' }, { ten: 'NDA_RoboticsLab.pdf', kichThuoc: '0.6 MB', loai: 'NDA' }],
      tinNhan: [
        { tu: 'he-thong', luc: '2026-08-20T09:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' },
        { tu: 'he-thong', luc: '2026-09-01T10:00', noiDung: 'Hai bên đã xác nhận ký hợp đồng. Bài toán chuyển sang Đang thực hiện.' },
        { tu: 'doi-tac', luc: '2026-11-20T15:45', noiDung: 'Nhóm đã nộp báo cáo tuần 10, đề xuất nghiệm thu Milestone 2 ngày 03/12.' }
      ],
      chuaDoc: 1
    },
    {
      id: 'dp-visionlab', proposal: 'p-visionlab', moPhong: '2026-10-19', nhan: 'EDGE-AI', nganSachDeXuat: 220,
      nen: 'from-brand-hero-mid via-primary to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: true, doiTac: false, ghiChu: 'Chờ đối tác xác nhận biên bản' },
        nda: { dn: false, doiTac: false, ghiChu: 'Chưa bắt đầu' },
        hopDong: { dn: false, doiTac: false, ghiChu: 'Chưa mở' }
      },
      lich: { ngay: '2026-11-28', gio: '16:30', hinhThuc: 'Trực tuyến (MS Teams)', noiDung: 'Chốt biên bản trao đổi kỹ thuật' },
      vanBan: [{ ten: 'Bien_ban_trao_doi_VisionLab.pdf', kichThuoc: '0.3 MB', loai: 'Biên bản họp' }],
      tinNhan: [
        { tu: 'he-thong', luc: '2026-10-19T11:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' },
        { tu: 'dn', luc: '2026-11-21T09:30', noiDung: 'V-Tech đã xác nhận biên bản trao đổi kỹ thuật, mời nhóm rà soát và xác nhận.' }
      ],
      chuaDoc: 0
    }
  ];

  // ---------- Tiện ích ----------
  function nhanBan(obj) { return JSON.parse(JSON.stringify(obj)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Bỏ dấu tiếng Việt, chữ thường: dùng cho tìm kiếm
  function chuanHoa(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  }

  // Mô tả bài toán là HTML do người dùng soạn: chỉ giữ thẻ định dạng an toàn.
  var THE_CHO_PHEP = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, OL: 1, UL: 1, LI: 1, A: 1, PRE: 1, CODE: 1, BLOCKQUOTE: 1, P: 1, BR: 1, DIV: 1 };
  function lamSachHtml(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    (function duyet(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (con) {
        if (con.nodeType === 3) return;
        if (con.nodeType !== 1 || !THE_CHO_PHEP[con.tagName]) {
          // Thẻ lạ: giữ chữ bên trong, bỏ thẻ (script/style thì bỏ hẳn)
          if (con.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(con.tagName)) {
            duyet(con);
            while (con.firstChild) node.insertBefore(con.firstChild, con);
          }
          node.removeChild(con);
          return;
        }
        var href = con.tagName === 'A' ? (con.getAttribute('href') || '') : '';
        Array.prototype.slice.call(con.attributes).forEach(function (a) { con.removeAttribute(a.name); });
        if (con.tagName === 'A') {
          if (/^(https?:|mailto:)/i.test(href.trim())) {
            con.setAttribute('href', href.trim());
            con.setAttribute('target', '_blank');
            con.setAttribute('rel', 'noopener noreferrer');
          }
        }
        duyet(con);
      });
    })(tpl.content);
    return tpl.innerHTML;
  }

  function chuTuHtml(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = lamSachHtml(html);
    return (tpl.content.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dinhDangNgay(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  function dinhDangNganSach(ns) {
    if (!ns || !ns.min) return '';
    if (!ns.max || ns.max === ns.min) return ns.min + ' triệu VNĐ';
    return ns.min + ' - ' + ns.max + ' triệu VNĐ';
  }

  function homNay() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Số ngày từ hôm nay đến ngày iso (âm nếu đã qua)
  function soNgayToi(iso) {
    if (!iso) return null;
    var a = new Date(homNay() + 'T00:00:00');
    var b = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  function tenLinhVuc(id, ngan) {
    for (var i = 0; i < LINH_VUC.length; i++) {
      if (LINH_VUC[i].id === id) return ngan ? LINH_VUC[i].ngan : LINH_VUC[i].ten;
    }
    return '';
  }

  // ---------- Lưu tạm trên trình duyệt ----------
  function docKho() {
    try {
      var raw = window.localStorage.getItem(KHOA_LUU);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) { return {}; }
  }

  function ghiKho(kho) {
    try {
      window.localStorage.setItem(KHOA_LUU, JSON.stringify(kho));
      return true;
    } catch (e) { return false; }
  }

  // Trả về danh sách bài toán: dữ liệu mẫu (đã áp bản sửa cục bộ) + bài toán tạo mới trên trình duyệt.
  function layTatCa() {
    var kho = docKho();
    var ketQua = [];
    var daCo = {};
    BAI_TOAN_MAU.forEach(function (mau) {
      daCo[mau.ma] = true;
      var ban = kho[mau.ma];
      if (ban && ban.daXoa) return;
      if (ban) { ban = nhanBan(ban); ban.luuCucBo = true; ketQua.push(ban); }
      else ketQua.push(nhanBan(mau));
    });
    Object.keys(kho).forEach(function (ma) {
      if (daCo[ma] || !kho[ma] || kho[ma].daXoa) return;
      var ban = nhanBan(kho[ma]);
      ban.luuCucBo = true;
      ban.taoCucBo = true;
      ketQua.push(ban);
    });
    return ketQua;
  }

  function layTheoMa(ma) {
    var ds = layTatCa();
    for (var i = 0; i < ds.length; i++) if (ds[i].ma === ma) return ds[i];
    return null;
  }

  function luu(baiToan) {
    var kho = docKho();
    var ban = nhanBan(baiToan);
    delete ban.luuCucBo;
    delete ban.taoCucBo;
    ban.ngayLuu = homNay();
    kho[ban.ma] = ban;
    return ghiKho(kho);
  }

  // Xóa bài toán (xóa mềm: giữ dấu daXoa + lý do để sau này gửi lên API / Admin).
  // Trả về { ok, truoc } với truoc là bản lưu cũ để hoàn tác bằng khoiPhuc().
  function xoa(ma, lyDo) {
    var kho = docKho();
    var truoc = kho.hasOwnProperty(ma) ? kho[ma] : null;
    kho[ma] = { daXoa: true, lyDoXoa: lyDo || '', ngayXoa: homNay() };
    return { ok: ghiKho(kho), truoc: truoc };
  }

  // Bài đã từng được Admin duyệt (đang mở / thực hiện / đóng, hoặc đã sửa rồi gửi duyệt lại)
  function daTungDuyet(b) {
    return !!b.daTungDuyet || b.trangThai === 'dang-mo' || b.trangThai === 'dang-thuc-hien' || b.trangThai === 'da-dong';
  }

  function khoiPhuc(ma, truoc) {
    var kho = docKho();
    if (truoc) kho[ma] = truoc;
    else delete kho[ma];
    return ghiKho(kho);
  }

  // Quy tắc xóa bài đăng (nhóm chốt 26/11/2026):
  //   - Chưa từng được duyệt (bản nháp, chờ duyệt lần đầu): xóa sau khi xác nhận.
  //   - Đã được duyệt: phải nêu lý do xóa.
  //   - Đang thực hiện (đã ký thỏa thuận): không xóa được.
  // Proposal và phòng đàm phán của bài đã xóa bị ẩn khỏi Hộp thư / Không gian đàm phán.
  function kiemTraXoa(ma) {
    var b = layTheoMa(ma);
    if (!b) return { duoc: false, lyDo: 'Không tìm thấy bài toán.' };
    if (b.trangThai === 'dang-thuc-hien') {
      return { duoc: false, lyDo: 'Bài toán đang thực hiện theo thỏa thuận đã ký nên không xóa được.' };
    }
    var dsP = layDanhSachProposal().filter(function (p) { return p.baiToan === ma; });
    return {
      duoc: true,
      canLyDo: daTungDuyet(b),
      soProposal: dsP.filter(function (p) { return p.trangThai !== 'tu-choi'; }).length,
      soPhong: dsP.filter(function (p) { return p.trangThai === 'dam-phan'; }).length
    };
  }

  // Hộp nhập lý do xóa bài đã được duyệt. xongFn(lyDo) gọi khi người dùng bấm xóa với lý do hợp lệ.
  function hoiLyDoXoa(b, kt, xongFn) {
    var cu = document.getElementById('hop-ly-do-xoa');
    if (cu) cu.remove();
    var oTruoc = document.activeElement;
    var hop = document.createElement('div');
    hop.id = 'hop-ly-do-xoa';
    hop.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40';
    var canhBao = [];
    if (kt.soProposal) canhBao.push(kt.soProposal + ' proposal đã nộp sẽ bị ẩn khỏi Hộp thư kết nối.');
    if (kt.soPhong) canhBao.push(kt.soPhong + ' phòng đàm phán đang mở sẽ bị đóng.');
    if (b.trangThai === 'dang-mo') canhBao.push('Bài toán sẽ không còn hiển thị với sinh viên và phòng Lab.');
    hop.innerHTML = '<form class="w-full max-w-lg bg-white rounded-xl shadow-md p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="hop-ly-do-xoa-tieu-de" novalidate>' +
      '<div class="flex items-start gap-3"><span class="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined">delete</span></span>' +
      '<div><h3 class="text-base font-bold text-slate-900" id="hop-ly-do-xoa-tieu-de">Xóa bài đăng ' + escapeHtml(b.ma) + '</h3>' +
      '<p class="text-xs text-slate-600 mt-0.5">' + escapeHtml(b.tieuDe) + '</p></div></div>' +
      '<p class="text-sm text-slate-700">Bài toán đã được Admin duyệt nên cần nêu lý do xóa. Lý do được lưu lại cho Ban Quản lý và các đối tác đã nộp proposal.</p>' +
      (canhBao.length ? '<ul class="text-xs text-amber-900 bg-amber-50 rounded-lg px-4 py-2 list-disc pl-6 space-y-0.5">' + canhBao.map(function (c) { return '<li>' + escapeHtml(c) + '</li>'; }).join('') + '</ul>' : '') +
      '<label class="block text-sm font-semibold text-slate-900 space-y-1"><span>Lý do xóa *</span>' +
      '<textarea class="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300" name="lyDo" rows="3" maxlength="500" placeholder="VD: Doanh nghiệp tạm dừng dự án do thay đổi kế hoạch đầu tư"></textarea></label>' +
      '<div class="flex items-center justify-between gap-2"><span class="text-[11px] text-slate-500" data-dem>0 / 500</span><p class="hidden text-xs text-red-600" data-loi></p></div>' +
      '<div class="flex justify-end gap-2"><button class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" data-huy>Hủy</button>' +
      '<button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold inline-flex items-center gap-1.5" type="submit"><span class="material-symbols-outlined text-[18px]">delete</span>Xóa bài đăng</button></div></form>';
    document.body.appendChild(hop);
    var form = hop.querySelector('form');
    var o = form.lyDo;
    function dong() { hop.remove(); if (oTruoc && oTruoc.focus) oTruoc.focus(); }
    o.addEventListener('input', function () { hop.querySelector('[data-dem]').textContent = o.value.length + ' / 500'; });
    hop.addEventListener('click', function (e) { if (e.target === hop || e.target.closest('[data-huy]')) dong(); });
    hop.addEventListener('keydown', function (e) { if (e.key === 'Escape') dong(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lyDo = o.value.trim();
      var loi = lyDo.length < 10 ? 'Lý do cần ít nhất 10 ký tự.' : '';
      var oLoi = hop.querySelector('[data-loi]');
      oLoi.textContent = loi;
      oLoi.classList.toggle('hidden', !loi);
      if (loi) { o.focus(); return; }
      dong();
      xongFn(lyDo);
    });
    o.focus();
  }

  function taoMaTam() {
    return 'NHAP-' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  // ---------- Trạng thái proposal (từ chối / hẹn / chấp nhận) lưu tạm trên trình duyệt ----------
  var KHOA_HOP_THU = 'uitc.dn.hopThu.v1';

  function docHopThu() {
    try {
      var obj = JSON.parse(window.localStorage.getItem(KHOA_HOP_THU) || '{}');
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) { return {}; }
  }

  // ---------- Proposal sinh viên nộp từ SV-13 (Chi tiết & ứng tuyển bài toán R&D) ----------
  // Lưu tạm trên trình duyệt; proposal nộp cho bài toán của DN này hiện luôn trong Hộp thư kết nối (DN-08).
  var KHOA_SV_PROPOSAL = 'uitc.sv.proposal.v1';

  function docSvProposal() {
    try {
      var ds = JSON.parse(window.localStorage.getItem(KHOA_SV_PROPOSAL) || '[]');
      return Array.isArray(ds) ? ds : [];
    } catch (e) { return []; }
  }

  function ghiSvProposal(ds) {
    try { window.localStorage.setItem(KHOA_SV_PROPOSAL, JSON.stringify(ds)); return true; }
    catch (e) { return false; }
  }

  // "Vừa xong", "5 phút trước"... tính từ thời điểm gửi (ISO)
  function thoiGianTruoc(phut) {
    if (phut < 1) return 'Vừa xong';
    if (phut < 60) return phut + ' phút trước';
    if (phut < 1440) return Math.floor(phut / 60) + ' giờ trước';
    if (phut < 10080) return Math.floor(phut / 1440) + ' ngày trước';
    return Math.floor(phut / 10080) + ' tuần trước';
  }

  function svProposalDayDu(p) {
    var ban = nhanBan(p);
    var phut = Math.max(0, Math.round((Date.now() - new Date(p.guiLuc).getTime()) / 60000)) || 0;
    ban.phutTruoc = phut;
    ban.thoiGian = thoiGianTruoc(phut);
    ban.tuSinhVien = true;
    return ban;
  }

  // Thêm proposal mới (đã kiểm tra hợp lệ ở trang SV). Trả về false nếu trình duyệt chặn lưu.
  function nopProposalSv(p) {
    var ds = docSvProposal();
    ds.push(p);
    return ghiSvProposal(ds);
  }

  // Rút proposal: chỉ khi DN chưa phản hồi. Xóa cả thay đổi DN đã lưu cho proposal đó.
  function rutProposalSv(id) {
    var ds = docSvProposal();
    var conLai = ds.filter(function (p) { return p.id !== id; });
    if (conLai.length === ds.length) return false;
    var kho = docHopThu();
    delete kho[id];
    try { window.localStorage.setItem(KHOA_HOP_THU, JSON.stringify(kho)); } catch (e) { /* bỏ qua */ }
    return ghiSvProposal(conLai);
  }

  // Danh sách proposal đã áp các thay đổi DN thực hiện trên trình duyệt này
  function layDanhSachProposal() {
    var kho = docHopThu();
    // Ẩn proposal của bài toán đã bị xóa
    var conBaiToan = {};
    layTatCa().forEach(function (b) { conBaiToan[b.ma] = true; });
    var tuSv = docSvProposal().map(svProposalDayDu);
    return tuSv.concat(PROPOSAL_MAU).filter(function (p) { return conBaiToan[p.baiToan]; }).map(function (p) {
      var ban = nhanBan(p);
      var sua = kho[p.id];
      if (sua) { Object.assign(ban, sua); ban.luuCucBo = true; }
      if (!ban.dpId) ban.dpId = 'dp-' + ban.id;
      return ban;
    });
  }

  function layProposal(id) {
    return layDanhSachProposal().filter(function (p) { return p.id === id; })[0] || null;
  }

  // patch: { trangThai, lichHen, trangThaiTruoc, ... }; trả về false nếu trình duyệt chặn lưu
  function capNhatProposal(id, patch) {
    var kho = docHopThu();
    kho[id] = Object.assign({}, kho[id] || {}, patch, { ngayCapNhat: homNay() });
    try { window.localStorage.setItem(KHOA_HOP_THU, JSON.stringify(kho)); return true; }
    catch (e) { return false; }
  }

  // Luồng xóa dùng chung cho DN-04 và DN-15: kiểm tra quy tắc → hỏi xác nhận → xóa → thông báo có "Hoàn tác".
  // sauKhiXoa(daXoa): gọi lại sau khi xóa (true) hoặc hoàn tác (false) để trang vẽ lại.
  function xoaBaiToanCoXacNhan(ma, sauKhiXoa) {
    var b = layTheoMa(ma);
    if (!b) return;
    var kt = kiemTraXoa(ma);
    if (!kt.duoc) { thongBao('Không xóa được: ' + kt.lyDo, 'canh-bao'); return; }
    var laNhap = b.trangThai === 'nhap';
    function thucHien(lyDo) {
      var kq = xoa(ma, lyDo);
      if (!kq.ok) { thongBao('Không xóa được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); return; }
      if (sauKhiXoa) sauKhiXoa(true);
      thongBao('Đã xóa ' + (laNhap ? 'bản nháp ' : 'bài đăng ') + b.ma + (lyDo ? ' (đã ghi lý do)' : '') + '. Lưu tạm trên trình duyệt, chưa có API nên máy chủ không thay đổi.', null, {
        chu: 'Hoàn tác',
        lam: function () {
          khoiPhuc(ma, kq.truoc);
          if (sauKhiXoa) sauKhiXoa(false);
          thongBao('Đã khôi phục ' + b.ma + '.');
        }
      });
    }
    if (kt.canLyDo) { hoiLyDoXoa(b, kt, thucHien); return; }
    // Chưa từng được duyệt: chỉ cần xác nhận
    if (!window.confirm((laNhap ? 'Xóa bản nháp' : 'Xóa bài đăng chưa được duyệt') + ' "' + b.tieuDe + '" (' + b.ma + ')?')) return;
    thucHien('');
  }

  function proposalCuaBaiToan(ma) {
    return layDanhSachProposal().filter(function (p) { return p.baiToan === ma; });
  }

  // ---------- Tệp PDF minh họa cho tài liệu đính kèm ----------
  // Chưa có kho tệp thật: tạo một PDF 1 trang (font Helvetica chuẩn, chỉ chữ ASCII nên bỏ dấu tiếng Việt).
  function boDauAscii(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7E]/g, '?');
  }

  function taoPdfMau(cacDong) {
    var thoat = function (s) { return boDauAscii(s).replace(/[\\()]/g, '\\$&'); };
    var noiDung = 'BT /F1 12 Tf 56 780 Td 18 TL ' + cacDong.map(function (d, i) {
      return (i ? 'T* ' : '') + '(' + thoat(d) + ') Tj';
    }).join(' ') + ' ET';
    var obj = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ' + noiDung.length + ' >>\nstream\n' + noiDung + '\nendstream'
    ];
    var pdf = '%PDF-1.4\n';
    var viTri = [];
    obj.forEach(function (o, i) { viTri.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = pdf.length;
    pdf += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' +
      viTri.map(function (v) { return String(v).padStart(10, '0') + ' 00000 n \n'; }).join('') +
      'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return new Blob([pdf], { type: 'application/pdf' });
  }

  // ---------- Phòng đàm phán: đọc / ghi ----------
  var KHOA_PHONG = 'uitc.dn.phong.v1';

  function docKhoPhong() {
    try {
      var obj = JSON.parse(window.localStorage.getItem(KHOA_PHONG) || '{}');
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) { return {}; }
  }

  function phongMacDinh(p) {
    // Proposal vừa được chấp nhận ở Hộp thư mà chưa có phòng mẫu
    return {
      id: p.dpId, proposal: p.id, moPhong: p.ngayCapNhat || homNay(), nhan: 'MỚI', moi: true,
      nen: 'from-primary via-primary-container to-brand-hero-dark',
      buoc: {
        traoDoi: { dn: false, doiTac: false, ghiChu: 'Chưa bắt đầu' },
        nda: { dn: false, doiTac: false, ghiChu: 'Chưa bắt đầu' },
        hopDong: { dn: false, doiTac: false, ghiChu: 'Chưa mở' }
      },
      lich: p.lichHen ? { ngay: p.lichHen.ngay, gio: p.lichHen.gio, hinhThuc: p.lichHen.hinhThuc, noiDung: p.lichHen.ghiChu || 'Buổi trao đổi đầu tiên' } : null,
      vanBan: [],
      tinNhan: [{ tu: 'he-thong', luc: (p.ngayCapNhat || homNay()) + 'T08:00', noiDung: 'Doanh nghiệp đã chấp nhận proposal, phòng đàm phán được mở.' }],
      chuaDoc: 0
    };
  }

  // Danh sách phòng = phòng mẫu + phòng của proposal vừa chấp nhận; áp thay đổi lưu trên trình duyệt.
  // Mỗi phòng kèm proposal (p) và bài toán (baiToan) để trang khỏi tra lại.
  function layDanhSachPhong() {
    var kho = docKhoPhong();
    var dsP = layDanhSachProposal();
    var theoId = {};
    dsP.forEach(function (p) { theoId[p.id] = p; });
    var ds = PHONG_MAU.map(nhanBan);
    var coSan = {};
    ds.forEach(function (ph) { coSan[ph.id] = true; });
    dsP.forEach(function (p) {
      if (p.trangThai === 'dam-phan' && !coSan[p.dpId]) ds.unshift(phongMacDinh(p));
    });
    return ds.filter(function (ph) {
      var p = theoId[ph.proposal];
      return p && p.trangThai === 'dam-phan';
    }).map(function (ph) {
      var sua = kho[ph.id];
      if (sua) {
        if (sua.buoc) Object.keys(sua.buoc).forEach(function (k) { Object.assign(ph.buoc[k], sua.buoc[k]); });
        if (sua.lich) ph.lich = sua.lich;
        if (sua.tinNhanThem) ph.tinNhan = ph.tinNhan.concat(sua.tinNhanThem);
        if (sua.daDoc) ph.chuaDoc = 0;
        ph.luuCucBo = true;
      }
      ph.p = theoId[ph.proposal];
      ph.baiToan = layTheoMa(ph.p.baiToan);
      ph.trangThai = trangThaiPhong(ph);
      return ph;
    });
  }

  function layPhong(id) {
    return layDanhSachPhong().filter(function (ph) { return ph.id === id; })[0] || null;
  }

  function buocXong(b) { return !!(b && b.dn && b.doiTac); }

  // Bước i mở khi mọi bước trước đã xong (cả hai bên xác nhận)
  function buocDaMo(phong, idBuoc) {
    for (var i = 0; i < BUOC_PHONG.length; i++) {
      if (BUOC_PHONG[i].id === idBuoc) return true;
      if (!buocXong(phong.buoc[BUOC_PHONG[i].id])) return false;
    }
    return false;
  }

  function trangThaiPhong(phong) {
    if (buocXong(phong.buoc.hopDong)) return 'da-ky';
    var cacBuoc = BUOC_PHONG.map(function (b) { return phong.buoc[b.id]; });
    if (cacBuoc.some(function (b) { return b.doiTac && !b.dn; })) return 'cho-xac-nhan';
    if (cacBuoc.some(function (b) { return b.dn && !b.doiTac; })) return 'cho-doi-tac';
    return 'dang-trao-doi';
  }

  // patch: { buoc: { nda: { dn: true, ghiChu } }, lich, tinNhanMoi, daDoc }
  function capNhatPhong(id, patch) {
    var kho = docKhoPhong();
    var cu = kho[id] || {};
    if (patch.buoc) {
      cu.buoc = cu.buoc || {};
      Object.keys(patch.buoc).forEach(function (k) { cu.buoc[k] = Object.assign({}, cu.buoc[k] || {}, patch.buoc[k]); });
    }
    if (patch.lich) cu.lich = patch.lich;
    if (patch.tinNhanMoi) cu.tinNhanThem = (cu.tinNhanThem || []).concat([patch.tinNhanMoi]);
    if (patch.daDoc) cu.daDoc = true;
    kho[id] = cu;
    try { window.localStorage.setItem(KHOA_PHONG, JSON.stringify(kho)); return true; }
    catch (e) { return false; }
  }

  // Thông báo nhỏ ở cuối màn hình (kiểu .dn-toast trong dn-bai-toan.css)
  var hetGioToast = null;
  // hanhDong (tùy chọn): { chu: 'Hoàn tác', lam: function () {...} } hiện thành nút trong thông báo
  function thongBao(noiDung, loai, hanhDong) {
    var el = document.getElementById('dn-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dn-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    var mau = loai === 'loi' ? 'bg-[#93000a]' : (loai === 'canh-bao' ? 'bg-[#7a4b00]' : 'bg-[#163A59]');
    var icon = loai === 'loi' ? 'error' : (loai === 'canh-bao' ? 'warning' : 'check_circle');
    el.className = 'dn-toast ' + mau + ' text-white text-[13px] leading-5 rounded-lg shadow-md px-4 py-3 flex items-start gap-2';
    el.innerHTML = '<span class="material-symbols-outlined text-[18px] shrink-0">' + icon + '</span><span>' + escapeHtml(noiDung) + '</span>' +
      (hanhDong ? '<button class="ml-2 shrink-0 font-bold underline underline-offset-2 hover:no-underline" type="button" data-hanh-dong>' + escapeHtml(hanhDong.chu) + '</button>' : '');
    if (hanhDong) {
      el.querySelector('[data-hanh-dong]').addEventListener('click', function () {
        el.classList.remove('is-visible');
        hanhDong.lam();
      });
    }
    // Ép trình duyệt vẽ lại để hiệu ứng chạy cả khi gọi liên tiếp
    void el.offsetWidth;
    el.classList.add('is-visible');
    clearTimeout(hetGioToast);
    hetGioToast = setTimeout(function () { el.classList.remove('is-visible'); }, hanhDong ? 7000 : 4500);
  }

  window.DnBaiToan = {
    thongBao: thongBao,
    LINH_VUC: LINH_VUC,
    LOAI: LOAI,
    TRANG_THAI: TRANG_THAI,
    DOI_TUONG: DOI_TUONG,
    SAN_PHAM: SAN_PHAM,
    HINH_THUC: HINH_THUC,
    GOI_Y_KY_NANG: GOI_Y_KY_NANG,
    BUOC_PHONG: BUOC_PHONG,
    TRANG_THAI_PHONG: TRANG_THAI_PHONG,
    layDanhSachPhong: layDanhSachPhong,
    layPhong: layPhong,
    buocXong: buocXong,
    buocDaMo: buocDaMo,
    capNhatPhong: capNhatPhong,
    TRANG_THAI_PROPOSAL: TRANG_THAI_PROPOSAL,
    layDanhSachProposal: layDanhSachProposal,
    layProposal: layProposal,
    capNhatProposal: capNhatProposal,
    taoPdfMau: taoPdfMau,
    escapeHtml: escapeHtml,
    chuanHoa: chuanHoa,
    lamSachHtml: lamSachHtml,
    chuTuHtml: chuTuHtml,
    dinhDangNgay: dinhDangNgay,
    dinhDangNganSach: dinhDangNganSach,
    homNay: homNay,
    soNgayToi: soNgayToi,
    tenLinhVuc: tenLinhVuc,
    layTatCa: layTatCa,
    layTheoMa: layTheoMa,
    luu: luu,
    xoa: xoa,
    khoiPhuc: khoiPhuc,
    kiemTraXoa: kiemTraXoa,
    daTungDuyet: daTungDuyet,
    xoaBaiToanCoXacNhan: xoaBaiToanCoXacNhan,
    taoMaTam: taoMaTam,
    proposalCuaBaiToan: proposalCuaBaiToan,
    docSvProposal: docSvProposal,
    nopProposalSv: nopProposalSv,
    rutProposalSv: rutProposalSv
  };
})();
