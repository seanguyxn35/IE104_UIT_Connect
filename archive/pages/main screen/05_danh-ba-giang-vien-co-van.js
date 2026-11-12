// Trang 05 – Danh bạ giảng viên: chọn giảng viên ở thẻ -> đổi hồ sơ chi tiết, thanh tab và form "Gửi yêu cầu".
(function () {
  // ---------- Dữ liệu giảng viên (mẫu cho prototype) ----------
  var LECTURERS = {
    a: {
      title: 'TS.', name: 'Nguyễn Văn A', rank: 'Tiến sĩ Giảng viên cao cấp',
      faculty: 'Khoa Khoa học Máy tính', role: 'Trưởng Lab Thị giác máy tính UIT', roleShort: 'Trưởng Lab CV&PR',
      email: 'anguyen@uit.edu.vn', room: 'Phòng E4.12, Nhà E, UIT', open: true, pubTotal: 45,
      stats: [['45', 'Công bố quốc tế'], ['18', 'Đề tài nghiệm thu'], ['24', 'Nhóm SV hướng dẫn'], ['05', 'Giải thưởng Euréka']],
      research: 'Nghiên cứu các kiến trúc mô hình học sâu rút gọn (Lightweight Deep Learning) triển khai trên các thiết bị biên hạn chế tài nguyên (Nvidia Jetson, Edge TPU). Ứng dụng trọng tâm vào phân tích dữ liệu thị giác giao thông thông minh đô thị và nhận dạng phương tiện tốc độ cao.',
      focus: [['Computer Vision AI', 'Phân tích hành vi thời gian thực'], ['Model Compression', 'Pruning & Quantization INT8'], ['Edge Hardware', 'Nvidia Jetson Orin Nano']],
      bio: 'Tốt nghiệp Tiến sĩ ngành Khoa học Máy tính, có hơn 12 năm giảng dạy và nghiên cứu tại UIT. Chủ nhiệm nhiều đề tài cấp ĐHQG-HCM về giao thông thông minh, cố vấn kỹ thuật cho các doanh nghiệp camera AI trong nước.',
      education: [['2014', 'Tiến sĩ Khoa học Máy tính – ĐH Quốc gia Seoul (Hàn Quốc)'], ['2009', 'Thạc sĩ Khoa học Máy tính – ĐH Công nghệ Thông tin, ĐHQG-HCM'], ['2006', 'Kỹ sư Khoa học Máy tính – ĐH Bách khoa, ĐHQG-HCM']],
      pubs: [
        { trl: 6, venue: 'IEEE Trans. Intell. Transp. Syst. (2024)', title: 'Real-time Edge AI for Urban Traffic Anomaly Detection', authors: 'Nguyen V. A., Le T. B., et al.', doi: '10.1109/TITS.2024.3129841' },
        { trl: 5, venue: 'Pattern Recognition Letters (2023)', title: 'Lightweight Vehicle Re-identification on Jetson Orin via Knowledge Distillation', authors: 'Nguyen V. A., Tran Q. H., et al.', doi: '10.1016/j.patrec.2023.08.014' },
        { trl: 4, venue: 'IEEE Access (2023)', title: 'INT8 Post-training Quantization for Real-time Pedestrian Detection on Edge TPU', authors: 'Pham G. K., Nguyen V. A.', doi: '10.1109/ACCESS.2023.3301175' }
      ],
      deadline: '30/03/2026',
      topics: [
        { code: 'UIT-CV-2026-01', slots: '2 sinh viên (Nhóm/Cá nhân)', title: 'Nghiên cứu tối ưu hóa mô hình AI Vision trên chip SoC công suất thấp phục vụ Smart Camera', target: 'SV K19 - K20', req: 'PyTorch, C++, Linux', gpa: '> 8.0', goal: 'Đạt bài báo Scopus Q2 và tham dự giải Euréka 2026. Hỗ trợ 100% thiết bị bo mạch Jetson Nano thực nghiệm.' },
        { code: 'UIT-CV-2026-02', slots: '1 sinh viên (Cá nhân)', title: 'Nhận dạng biển số xe tốc độ cao trong điều kiện thiếu sáng bằng mô hình học sâu rút gọn', target: 'SV K20 - K21', req: 'Python, OpenCV, YOLO', gpa: '> 7.5', goal: 'Triển khai thử nghiệm tại trạm thu phí của doanh nghiệp đối tác và tham dự giải Euréka 2026.' },
        { code: 'UIT-CV-2026-03', slots: '2 sinh viên (Nhóm)', title: 'Phát hiện hành vi bất thường tại nút giao thông từ camera giám sát đô thị', target: 'SV K19 - K21', req: 'Python, PyTorch, Object Tracking', gpa: '> 7.0', goal: 'Xây dựng bộ dữ liệu giao thông TP.HCM có gán nhãn và một bài báo hội nghị quốc tế.' }
      ],
      lab: { name: 'Lab Thị giác máy tính & Nhận dạng mẫu (CV&PR)', desc: 'Nghiên cứu thị giác máy tính và AI biên phục vụ giao thông thông minh; hợp tác cùng Sở GTVT TP.HCM và các doanh nghiệp camera AI.' },
      members: [['ThS. Trần Quốc H', 'Nghiên cứu sinh – Nén mô hình'], ['KS. Phạm Gia K', 'Kỹ sư nghiên cứu – Edge AI'], ['CN. Võ Minh T', 'Trợ lý nghiên cứu – Dữ liệu']],
      groups: [['Nhóm VisionLab UIT', 'Hệ thống AI Edge giám sát an toàn giao thông', '3 SV'], ['Nhóm SmartCam K20', 'Đếm phương tiện thời gian thực trên Jetson Nano', '2 SV']],
      proposal: 'Hệ thống AI Edge giám sát an toàn giao thông đô thị thời gian thực',
      letter: 'Nhóm chúng em gồm 3 sinh viên Khoa KHMT, đã theo dõi các công bố gần đây của Thầy/Cô tại Lab CV&PR. Nhóm đã thử nghiệm thành công mô hình YOLOv8 trên board Jetson Nano và rất mong muốn được Thầy/Cô nhận hướng dẫn đề tài NCKH cấp Trường.'
    },
    b: {
      title: 'TS.', name: 'Lê Thị B', rank: 'Tiến sĩ Giảng viên chính',
      faculty: 'Khoa Kỹ thuật Máy tính', role: 'Phụ trách Lab CE-Robotics & Vi mạch', roleShort: 'Lab CE-Robotics & Vi mạch',
      email: 'ble@uit.edu.vn', room: 'Phòng B3.08, Nhà B, UIT', open: true, pubTotal: 28,
      stats: [['28', 'Công bố quốc tế'], ['11', 'Đề tài nghiệm thu'], ['16', 'Nhóm SV hướng dẫn'], ['03', 'Giải thưởng Euréka']],
      research: 'Thiết kế vi mạch số dựa trên kiến trúc tập lệnh mở RISC-V, tối ưu năng lượng cho thiết bị IoT nhúng. Nghiên cứu tăng tốc phần cứng trên FPGA cho các bài toán xử lý tín hiệu và AI biên.',
      focus: [['RISC-V SoC', 'Thiết kế lõi xử lý 32-bit'], ['FPGA Acceleration', 'Tăng tốc phần cứng cho AI'], ['Embedded IoT', 'Thiết bị năng lượng siêu thấp']],
      bio: 'Có 10 năm kinh nghiệm thiết kế vi mạch số và hệ thống nhúng. Từng làm kỹ sư thiết kế ASIC tại doanh nghiệp bán dẫn trước khi về giảng dạy tại UIT; hiện dẫn dắt nhóm sinh viên thi Vi mạch Việt Nam.',
      education: [['2016', 'Tiến sĩ Kỹ thuật Điện tử – ĐH Kỹ thuật Grenoble (Pháp)'], ['2011', 'Thạc sĩ Kỹ thuật Máy tính – ĐH Công nghệ Thông tin, ĐHQG-HCM'], ['2008', 'Kỹ sư Điện tử – Viễn thông – ĐH Bách khoa, ĐHQG-HCM']],
      pubs: [
        { trl: 5, venue: 'IEEE Access (2024)', title: 'A Low-Power RISC-V Core for Biomedical IoT Sensors', authors: 'Le T. B., Pham M. K., et al.', doi: '10.1109/ACCESS.2024.3388120' },
        { trl: 4, venue: 'Microprocessors and Microsystems (2023)', title: 'FPGA-based CNN Accelerator with Dynamic Quantization', authors: 'Le T. B., Do T. H.', doi: '10.1016/j.micpro.2023.104876' },
        { trl: 4, venue: 'Sensors – MDPI (2023)', title: 'Energy-aware Scheduling for Embedded IoT Nodes', authors: 'Nguyen T. L., Le T. B.', doi: '10.3390/s23094410' }
      ],
      deadline: '05/04/2026',
      topics: [
        { code: 'UIT-CE-2026-03', slots: '2 sinh viên (Nhóm)', title: 'Thiết kế lõi RISC-V tích hợp bộ tăng tốc mã hóa AES cho thiết bị IoT y tế', target: 'SV K19 - K20', req: 'Verilog/SystemVerilog, Vivado', gpa: '> 7.5', goal: 'Tape-out thử nghiệm qua chương trình MPW và tham dự cuộc thi Vi mạch Việt Nam 2026.' },
        { code: 'UIT-CE-2026-05', slots: '3 sinh viên (Nhóm)', title: 'Hệ thống nhúng giám sát chất lượng không khí dùng LoRa và vi điều khiển STM32', target: 'SV K20 - K21', req: 'C, STM32, Thiết kế PCB', gpa: '> 7.0', goal: 'Hoàn thiện nguyên mẫu triển khai tại khuôn viên ĐHQG-HCM; hỗ trợ linh kiện từ Lab.' }
      ],
      lab: { name: 'Lab CE-Robotics & Vi mạch', desc: 'Thiết kế vi mạch, hệ thống nhúng và robot; trang bị bo mạch FPGA Xilinx, công cụ EDA và thiết bị đo kiểm cho sinh viên.' },
      members: [['ThS. Phạm Minh K', 'Nghiên cứu sinh – Thiết kế ASIC'], ['ThS. Đỗ Thu H', 'Kỹ sư FPGA'], ['KS. Nguyễn Tấn L', 'Kỹ sư nhúng – IoT']],
      groups: [['Nhóm RISC-V K19', 'Lõi RISC-V năng lượng thấp', '4 SV'], ['Nhóm AirSense', 'Trạm đo bụi mịn PM2.5 dùng LoRa', '3 SV']],
      proposal: 'Thiết kế bộ tăng tốc phần cứng cho mô hình AI trên FPGA',
      letter: 'Nhóm chúng em gồm 3 sinh viên, đã theo dõi các công bố gần đây của Thầy/Cô tại Lab CE-Robotics & Vi mạch. Nhóm đã có kinh nghiệm lập trình Verilog trên board FPGA và rất mong muốn được Thầy/Cô nhận hướng dẫn đề tài NCKH cấp Trường.'
    },
    c: {
      title: 'PGS.TS.', name: 'Trần Văn C', rank: 'Phó Giáo sư Tiến sĩ',
      faculty: 'Khoa Mạng máy tính & Truyền thông', role: 'Trưởng Lab An toàn Thông tin', roleShort: 'Trưởng Lab ATTT',
      email: 'ctran@uit.edu.vn', room: 'Phòng E7.05, Nhà E, UIT', open: true, pubTotal: 34,
      stats: [['34', 'Công bố quốc tế'], ['21', 'Đề tài nghiệm thu'], ['30', 'Nhóm SV hướng dẫn'], ['04', 'Giải thưởng Euréka']],
      research: 'Phát hiện và phân tích mã độc bằng học máy, kiến trúc mạng Zero Trust cho doanh nghiệp và bảo mật hệ thống IoT công nghiệp. Chú trọng các mô hình có khả năng giải thích (XAI) để hỗ trợ chuyên viên an ninh mạng ra quyết định.',
      focus: [['Malware Analysis', 'Phát hiện mã độc bằng AI'], ['Zero Trust', 'Kiến trúc bảo mật doanh nghiệp'], ['Network Forensics', 'Điều tra sự cố mạng']],
      bio: 'Hơn 15 năm nghiên cứu an toàn thông tin, thành viên ban cố vấn của nhiều cuộc thi CTF sinh viên toàn quốc. Chủ nhiệm đề tài cấp Nhà nước về giám sát an ninh mạng cho hạ tầng trọng yếu.',
      education: [['2012', 'Tiến sĩ Khoa học Máy tính – ĐH Tohoku (Nhật Bản)'], ['2007', 'Thạc sĩ Mạng máy tính – ĐH Khoa học Tự nhiên, ĐHQG-HCM'], ['2004', 'Cử nhân Công nghệ Thông tin – ĐH Khoa học Tự nhiên, ĐHQG-HCM']],
      pubs: [
        { trl: 5, venue: 'Computers & Security (2024)', title: 'Graph Neural Networks for Android Malware Family Classification', authors: 'Tran V. C., Ngo D. P., et al.', doi: '10.1016/j.cose.2024.103722' },
        { trl: 6, venue: 'IEEE Trans. Netw. Serv. Manag. (2023)', title: 'Adaptive Zero Trust Access Control for Hybrid Cloud', authors: 'Tran V. C., Le H. N.', doi: '10.1109/TNSM.2023.3290147' },
        { trl: 4, venue: 'Vehicular Communications (2023)', title: 'Intrusion Detection for In-Vehicle CAN Bus using Lightweight Transformers', authors: 'Vo T. Q., Tran V. C., et al.', doi: '10.1016/j.vehcom.2023.100652' }
      ],
      deadline: '28/03/2026',
      topics: [
        { code: 'UIT-NT-2026-02', slots: '3 sinh viên (Nhóm)', title: 'Phát hiện mã độc Android bằng mạng nơ-ron đồ thị và giải thích mô hình (XAI)', target: 'SV K19 - K20', req: 'Python, PyTorch Geometric, Reverse Engineering', gpa: '> 7.5', goal: 'Công bố tại hội nghị quốc tế chuyên ngành an toàn thông tin và chuyển giao mô-đun cho đối tác SOC.' }
      ],
      lab: { name: 'Lab An toàn Thông tin (InSecLab)', desc: 'Nghiên cứu an ninh mạng, phân tích mã độc và kiểm thử xâm nhập; vận hành hệ thống cyber range phục vụ đào tạo và thi CTF.' },
      members: [['TS. Ngô Đức P', 'Giảng viên – Phân tích mã độc'], ['ThS. Lê Hoàng N', 'Nghiên cứu sinh – Cloud Security'], ['KS. Võ Thanh Q', 'Kỹ sư – IDS/IPS']],
      groups: [['Nhóm UIT-Shield', 'Phát hiện tấn công phishing bằng NLP', '3 SV'], ['Nhóm CANGuard', 'IDS cho mạng CAN-Bus xe hơi', '2 SV'], ['Đội CTF UIT.Hacking', 'Luyện thi CTF quốc tế', '5 SV']],
      proposal: 'Phát hiện mã độc Android bằng học sâu có khả năng giải thích',
      letter: 'Nhóm chúng em gồm 3 sinh viên, đã theo dõi các công bố gần đây của Thầy/Cô tại Lab An toàn Thông tin. Nhóm đã tham gia các giải CTF sinh viên và rất mong muốn được Thầy/Cô nhận hướng dẫn đề tài NCKH cấp Trường.'
    },
    d: {
      title: 'TS.', name: 'Hoàng Văn D', rank: 'Tiến sĩ Giảng viên',
      faculty: 'Khoa Hệ thống Thông tin', role: 'Phụ trách Lab HTTT Thông minh & Web3', roleShort: 'Lab HTTT Thông minh & Web3',
      email: 'dhoang@uit.edu.vn', room: 'Phòng A2.10, Nhà A, UIT', open: false, pubTotal: 19,
      stats: [['19', 'Công bố quốc tế'], ['07', 'Đề tài nghiệm thu'], ['12', 'Nhóm SV hướng dẫn'], ['01', 'Giải thưởng Euréka']],
      research: 'Ứng dụng blockchain trong truy xuất nguồn gốc chuỗi cung ứng, hợp đồng thông minh và hệ thống thông tin doanh nghiệp phi tập trung. Quan tâm đến kiểm chứng hình thức (formal verification) cho hợp đồng thông minh.',
      focus: [['Blockchain', 'Truy xuất nguồn gốc nông sản'], ['Smart Contract', 'Kiểm thử & bảo mật hợp đồng'], ['DApp Web3', 'Ứng dụng phi tập trung']],
      bio: 'Có 8 năm nghiên cứu hệ thống thông tin và blockchain, từng tham gia dự án truy xuất nguồn gốc nông sản xuất khẩu cùng doanh nghiệp tại Đồng bằng sông Cửu Long.',
      education: [['2018', 'Tiến sĩ Hệ thống Thông tin – ĐH Công nghệ Queensland (Úc)'], ['2013', 'Thạc sĩ Hệ thống Thông tin – ĐH Công nghệ Thông tin, ĐHQG-HCM'], ['2010', 'Cử nhân Hệ thống Thông tin – ĐH Công nghệ Thông tin, ĐHQG-HCM']],
      pubs: [
        { trl: 6, venue: 'IEEE Access (2024)', title: 'A Permissioned Blockchain Framework for Agricultural Supply Chain Traceability', authors: 'Hoang V. D., Truong M. A., et al.', doi: '10.1109/ACCESS.2024.3351902' },
        { trl: 3, venue: 'Blockchain: Research and Applications (2023)', title: 'Formal Verification of Solidity Smart Contracts using Model Checking', authors: 'Hoang V. D., Bui T. S.', doi: '10.1016/j.bcra.2023.100148' }
      ],
      deadline: null,
      topics: [],
      lab: { name: 'Lab HTTT Thông minh & Web3', desc: 'Nghiên cứu hệ thống thông tin doanh nghiệp, blockchain và ứng dụng phi tập trung; vận hành mạng thử nghiệm Hyperledger Fabric cho sinh viên.' },
      members: [['ThS. Trương Minh A', 'Nghiên cứu sinh – Blockchain'], ['CN. Bùi Thanh S', 'Trợ lý nghiên cứu – Smart Contract']],
      groups: [['Nhóm AgriChain', 'Truy xuất nguồn gốc sầu riêng xuất khẩu', '4 SV'], ['Nhóm SafeContract', 'Phát hiện lỗ hổng hợp đồng Solidity', '3 SV'], ['Nhóm UniCert', 'Văn bằng số trên blockchain', '3 SV'], ['Nhóm Web3Pay', 'Ví thanh toán phi tập trung cho căn tin', '2 SV']],
      proposal: 'Ứng dụng blockchain truy xuất nguồn gốc nông sản',
      letter: 'Nhóm chúng em gồm 3 sinh viên, đã theo dõi các công bố gần đây của Thầy/Cô tại Lab HTTT Thông minh & Web3 và rất mong muốn được Thầy/Cô nhận hướng dẫn đề tài NCKH cấp Trường khi có đợt mới.'
    }
  };

  var TABS = [
    ['intro', function (l) { return 'Hướng NC & Giới thiệu'; }],
    ['pubs', function (l) { return 'Công bố khoa học (' + l.pubTotal + ')'; }],
    ['topics', function (l) { return 'Đề tài mở nhận SV (' + l.topics.length + ')'; }],
    ['group', function (l) { return 'Nhóm nghiên cứu'; }]
  ];

  // ---------- Class dùng chung (giữ đúng style Stitch) ----------
  var TAB_ACTIVE = 'py-3 text-[14px] font-semibold text-[#1F4E78] border-b-2 border-[#1F4E78] shrink-0';
  var TAB_NORMAL = 'py-3 text-[14px] font-medium text-[#5F6368] hover:text-[#1A1A1A] border-b-2 border-transparent shrink-0 transition-colors';
  var BTN_PRIMARY = 'px-3 py-1.5 rounded-[6px] bg-[#1F4E78] text-white text-[13px] font-medium hover:bg-[#163A59] transition-colors flex items-center gap-1 shadow-sm';
  var BTN_SECONDARY = 'px-3 py-1.5 rounded-[6px] bg-[#F5F7FA] text-[#1F4E78] border border-[#E1E5EA] hover:bg-[#E6F0F7] text-[13px] font-medium transition-colors';
  var CHIP_ACTIVE = ['bg-[#E6F0F7]', 'text-[#1F4E78]'];
  var CHIP_NORMAL = ['bg-[#F5F7FA]', 'text-[#5F6368]'];

  var current = 'a';
  var currentTab = 'intro';
  var avatars = {};
  var unselectedBtnClass = {};

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function icon(name, size) {
    return '<span class="material-symbols-outlined text-[' + (size || 16) + 'px]">' + name + '</span>';
  }

  function heading(iconName, text, right) {
    return '<div class="flex items-center justify-between gap-3 mb-3">' +
      '<h3 class="text-[16px] font-semibold text-[#1A1A1A] flex items-center gap-2">' +
      '<div class="w-6 h-6 rounded bg-[#E6F0F7] text-[#1F4E78] flex items-center justify-center">' + icon(iconName) + '</div>' +
      esc(text) + '</h3>' + (right || '') + '</div>';
  }

  // ---------- Khối hồ sơ ----------
  function renderHeader(l, key) {
    var stats = l.stats.map(function (s) {
      return '<div class="bg-white/10 rounded-[6px] p-2"><div class="text-[18px] font-bold text-white">' + esc(s[0]) +
        '</div><div class="text-[11px] text-white/80">' + esc(s[1]) + '</div></div>';
    }).join('');
    return '<div class="bg-[#163A59] p-6 text-white relative">' +
      '<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">' +
        '<div class="flex items-center gap-4">' +
          '<div class="relative shrink-0">' +
            '<img class="w-[72px] h-[72px] rounded-2xl object-cover ring-2 ring-white/30" alt="' + esc(l.title + ' ' + l.name) + '" src="' + esc(avatars[key] || '') + '"/>' +
            '<span class="absolute -bottom-1 -right-1 px-1.5 rounded-full ' + (l.open ? 'bg-emerald-600' : 'bg-[#5F6368]') + ' text-white text-[10px] font-bold">' + (l.open ? 'Đang mở' : 'Đủ chỉ tiêu') + '</span>' +
          '</div>' +
          '<div>' +
            '<div class="flex items-center gap-2"><span class="px-2 py-0.5 rounded bg-white/20 text-[11px] font-semibold text-white">' + esc(l.rank) + '</span>' +
            '<span class="material-symbols-outlined text-[18px] text-[#2E86AB]">verified</span></div>' +
            '<h2 class="text-[24px] font-semibold text-white mt-1">' + esc(l.title + ' ' + l.name) + '</h2>' +
            '<p class="text-[13px] text-white/80">' + esc(l.faculty + ' • ' + l.role) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="text-left sm:text-right text-[12px] text-white/80 space-y-1">' +
          '<div class="flex sm:justify-end items-center gap-1.5">' + icon('mail', 15) + '<a class="hover:underline" href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></div>' +
          '<div class="flex sm:justify-end items-center gap-1.5">' + icon('location_on', 15) + '<span>' + esc(l.room) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/10 text-center">' + stats + '</div>' +
    '</div>';
  }

  function renderTabBar(l) {
    return '<div class="px-6 bg-[#F5F7FA] border-b border-[#E1E5EA] flex items-center gap-6 overflow-x-auto no-scrollbar" role="tablist">' +
      TABS.map(function (t) {
        var on = t[0] === currentTab;
        return '<button type="button" role="tab" aria-selected="' + on + '" data-tab="' + t[0] + '" class="' + (on ? TAB_ACTIVE : TAB_NORMAL) + '">' + esc(t[1](l)) + '</button>';
      }).join('') + '</div>';
  }

  function renderPub(p) {
    return '<div class="p-3.5 rounded-[8px] bg-[#F5F7FA] border border-[#E1E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
      '<div class="space-y-1">' +
        '<div class="flex items-center gap-2"><span class="px-2 py-0.5 rounded bg-[#1F4E78] text-white text-[11px] font-mono font-semibold">TRL ' + p.trl + '</span>' +
        '<span class="text-[12px] text-[#5F6368]">' + esc(p.venue) + '</span></div>' +
        '<div class="text-[14px] font-semibold text-[#1A1A1A]">' + esc(p.title) + '</div>' +
        '<div class="text-[12px] text-[#5F6368]">' + esc(p.authors) + ' • DOI: ' + esc(p.doi) + '</div>' +
      '</div>' +
      '<button type="button" class="px-3 py-1.5 rounded-[6px] bg-white border border-[#E1E5EA] hover:bg-[#E6F0F7] text-[#1F4E78] text-[13px] font-medium shrink-0 flex items-center gap-1">' + icon('download') + ' PDF</button>' +
    '</div>';
  }

  function renderTopic(t, i, l) {
    var tag = function (s) { return '<span class="px-2 py-0.5 rounded bg-[#F5F7FA] border border-[#E1E5EA]">' + esc(s) + '</span>'; };
    return '<div class="p-4 rounded-[10px] bg-white border border-[#E1E5EA] shadow-sm">' +
      '<div class="flex items-center justify-between gap-2 mb-1.5">' +
        '<span class="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[12px] font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Còn trống: ' + esc(t.slots) + '</span>' +
        '<span class="text-[12px] text-[#5F6368]">Mã: ' + esc(t.code) + '</span>' +
      '</div>' +
      '<h4 class="text-[15px] font-semibold text-[#1F4E78]">' + esc(t.title) + '</h4>' +
      '<div class="flex flex-wrap gap-2 my-2 text-[12px] text-[#5F6368]">' + tag('Đối tượng: ' + t.target) + tag('Yêu cầu: ' + t.req) + tag('GPA: ' + t.gpa) + '</div>' +
      '<p class="text-[13px] text-[#5F6368] leading-relaxed">Mục tiêu: ' + esc(t.goal) + '</p>' +
      '<div class="mt-3 flex justify-end"><button type="button" data-register-topic="' + i + '" class="px-4 py-2 rounded-[6px] bg-[#1F4E78] text-white text-[13px] font-medium hover:bg-[#163A59] transition-colors flex items-center gap-1.5 shadow-sm">' + icon('send') + ' Đăng ký đề tài này</button></div>' +
    '</div>';
  }

  function renderPane(l) {
    if (currentTab === 'intro') {
      var focus = l.focus.map(function (f) {
        return '<div class="p-3 rounded-[8px] bg-[#F5F7FA] border border-[#E1E5EA]"><div class="text-[13px] font-semibold text-[#1F4E78]">' + esc(f[0]) +
          '</div><div class="text-[12px] text-[#5F6368] mt-0.5">' + esc(f[1]) + '</div></div>';
      }).join('');
      var edu = l.education.map(function (e) {
        return '<li class="flex gap-3"><span class="font-mono text-[12px] text-[#1F4E78] font-semibold w-10 shrink-0 pt-0.5">' + esc(e[0]) + '</span><span>' + esc(e[1]) + '</span></li>';
      }).join('');
      return '<div>' + heading('science', 'Định hướng nghiên cứu trọng điểm') +
          '<p class="text-[14px] text-[#5F6368] leading-relaxed">' + esc(l.research) + '</p>' +
          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">' + focus + '</div></div>' +
        '<div>' + heading('person', 'Giới thiệu') +
          '<p class="text-[14px] text-[#5F6368] leading-relaxed">' + esc(l.bio) + '</p>' +
          '<ul class="mt-3 space-y-2 text-[13px] text-[#1A1A1A]">' + edu + '</ul></div>' +
        '<div>' + heading('menu_book', 'Công bố tiêu biểu gần đây',
            '<a class="text-[13px] font-medium text-[#2E86AB] hover:underline" href="#" data-goto-tab="pubs">Xem tất cả ' + l.pubTotal + ' bài</a>') +
          '<div class="space-y-2.5">' + renderPub(l.pubs[0]) + '</div></div>';
    }

    if (currentTab === 'pubs') {
      return '<div>' + heading('menu_book', 'Công bố khoa học (' + l.pubTotal + ')',
          '<span class="text-[12px] text-[#5F6368]">Hiển thị ' + l.pubs.length + ' công bố tiêu biểu</span>') +
        '<div class="space-y-2.5">' + l.pubs.map(renderPub).join('') + '</div></div>';
    }

    if (currentTab === 'topics') {
      if (!l.topics.length) {
        return '<div class="p-6 rounded-[10px] border-2 border-dashed border-[#E1E5EA] bg-[#F5F7FA] text-center">' +
          '<span class="material-symbols-outlined text-[28px] text-[#5F6368]">event_busy</span>' +
          '<h4 class="text-[15px] font-semibold text-[#1A1A1A] mt-1">Chưa có đề tài mở trong học kỳ này</h4>' +
          '<p class="text-[13px] text-[#5F6368] mt-1">' + esc(l.title + ' ' + l.name) + ' đã đủ chỉ tiêu hướng dẫn. Bạn có thể theo dõi để nhận thông báo khi có đợt mới.</p></div>';
      }
      return '<div><h3 class="text-[16px] font-semibold text-[#1A1A1A] mb-3 flex flex-wrap items-center justify-between gap-2">' +
          '<span class="flex items-center gap-2"><div class="w-6 h-6 rounded bg-[#E6F0F7] text-[#1F4E78] flex items-center justify-center">' + icon('assignment_turned_in') + '</div>' +
          'Đề tài đang mở tuyển sinh viên (' + l.topics.length + ' đề tài)</span>' +
          '<span class="text-[12px] text-[#2E86AB] font-medium">Hạn nộp đợt 1: ' + esc(l.deadline) + '</span></h3>' +
        '<div class="space-y-3">' + l.topics.map(function (t, i) { return renderTopic(t, i, l); }).join('') + '</div></div>';
    }

    // group
    var members = l.members.map(function (m) {
      var initials = m[0].split(' ').slice(-1)[0].charAt(0);
      return '<div class="p-3 rounded-[8px] bg-[#F5F7FA] border border-[#E1E5EA] flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-full bg-[#E6F0F7] text-[#1F4E78] flex items-center justify-center text-[13px] font-bold shrink-0">' + esc(initials) + '</div>' +
        '<div class="min-w-0"><div class="text-[13px] font-semibold text-[#1A1A1A] truncate">' + esc(m[0]) + '</div><div class="text-[12px] text-[#5F6368] truncate">' + esc(m[1]) + '</div></div></div>';
    }).join('');
    var groups = l.groups.map(function (g) {
      return '<div class="p-3 rounded-[8px] bg-white border border-[#E1E5EA] flex items-center justify-between gap-3">' +
        '<div class="min-w-0"><div class="text-[13px] font-semibold text-[#1F4E78]">' + esc(g[0]) + '</div><div class="text-[12px] text-[#5F6368]">' + esc(g[1]) + '</div></div>' +
        '<span class="px-2 py-0.5 rounded-full bg-[#E6F0F7] text-[#1F4E78] text-[12px] font-medium shrink-0">' + esc(g[2]) + '</span></div>';
    }).join('');
    return '<div>' + heading('hub', l.lab.name) +
        '<p class="text-[14px] text-[#5F6368] leading-relaxed">' + esc(l.lab.desc) + '</p>' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">' + members + '</div></div>' +
      '<div>' + heading('diversity_3', 'Nhóm sinh viên đang hướng dẫn', '<span class="text-[12px] text-[#5F6368]">' + l.groups.length + ' nhóm</span>') +
        '<div class="space-y-2">' + groups + '</div></div>';
  }

  function renderProfile() {
    var l = LECTURERS[current];
    var box = document.getElementById('lecturer-profile');
    if (!box) return;
    box.innerHTML = renderHeader(l, current) + renderTabBar(l) +
      '<div class="p-6 space-y-6" role="tabpanel">' + renderPane(l) + '</div>';
  }

  function switchTab(tab) {
    currentTab = tab;
    renderProfile();
  }

  // ---------- Thẻ giảng viên ----------
  function updateCards() {
    document.querySelectorAll('[data-lecturer]').forEach(function (card) {
      var key = card.getAttribute('data-lecturer');
      var on = key === current;
      card.classList.remove('border', 'border-2', 'border-[#E1E5EA]', 'border-[#1F4E78]', 'hover:shadow');
      card.classList.add.apply(card.classList, on ? ['border-2', 'border-[#1F4E78]'] : ['border', 'border-[#E1E5EA]', 'hover:shadow']);

      var badge = card.querySelector('[data-selected-badge]');
      if (on && !badge) {
        badge = document.createElement('span');
        badge.setAttribute('data-selected-badge', '');
        badge.textContent = 'Đang xem hồ sơ';
        card.insertBefore(badge, card.firstChild);
      } else if (!on && badge) {
        badge.remove();
      }
      // Nhãn nằm trên viền thẻ để không che tên giảng viên
      if (on) badge.className = 'absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#1F4E78] text-white text-[11px] font-bold shadow-sm';

      var chip = card.querySelector('[data-degree-chip]');
      if (chip) {
        chip.classList.remove.apply(chip.classList, on ? CHIP_NORMAL : CHIP_ACTIVE);
        chip.classList.add.apply(chip.classList, on ? CHIP_ACTIVE : CHIP_NORMAL);
      }

      var btn = card.querySelector('[data-card-action]');
      if (btn) {
        btn.className = on ? BTN_PRIMARY : unselectedBtnClass[key];
        btn.innerHTML = on ? '<span>Chọn tư vấn</span>' + icon('arrow_forward') : 'Xem hồ sơ';
      }
    });
  }

  // ---------- Form "Gửi yêu cầu xin Cố vấn" ----------
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

  function updateLetterCount() {
    var letter = document.getElementById('advisor-letter');
    if (letter) setText('advisor-letter-count', letter.value.length + '/500 ký tự');
  }

  function updateDrawer() {
    var l = LECTURERS[current];
    var avatar = document.getElementById('advisor-avatar');
    if (avatar) { avatar.src = avatars[current] || avatar.src; avatar.alt = 'Avatar ' + l.title + ' ' + l.name; }
    setText('advisor-name', l.title + ' ' + l.name + ' (' + l.roleShort + ')');

    var status = document.getElementById('advisor-status');
    if (status) {
      status.textContent = l.open ? 'Đang mở nhận' : 'Đủ chỉ tiêu';
      status.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ' + (l.open ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-[#5F6368]');
    }

    var topic = document.getElementById('advisor-topic');
    if (topic) topic.value = l.proposal;
    var letter = document.getElementById('advisor-letter');
    if (letter) letter.value = 'Kính gửi Thầy/Cô ' + l.title + ' ' + l.name + ',\n' + l.letter;
    updateLetterCount();

    var submit = document.getElementById('advisor-submit');
    if (submit) {
      submit.disabled = !l.open;
      submit.classList.toggle('opacity-50', !l.open);
      submit.classList.toggle('cursor-not-allowed', !l.open);
      submit.innerHTML = icon('send', 18) + (l.open ? ' Gửi yêu cầu xin hướng dẫn' : ' Giảng viên đã đủ chỉ tiêu');
    }
  }

  function focusDrawer(field) {
    var drawer = document.getElementById('advisor-drawer');
    if (!drawer) return;
    drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var target = document.getElementById(field || 'advisor-letter');
    if (target) {
      target.classList.add('ring-2', 'ring-[#2E86AB]');
      setTimeout(function () { target.classList.remove('ring-2', 'ring-[#2E86AB]'); }, 1500);
    }
  }

  // ---------- Chọn giảng viên ----------
  function select(key, scroll) {
    if (!LECTURERS[key]) return;
    current = key;
    currentTab = 'intro';
    updateCards();
    renderProfile();
    updateDrawer();
    if (scroll) {
      var box = document.getElementById('lecturer-profile');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function init() {
    document.querySelectorAll('[data-lecturer]').forEach(function (card) {
      var key = card.getAttribute('data-lecturer');
      var img = card.querySelector('img');
      if (img) avatars[key] = img.getAttribute('src');
      var btn = card.querySelector('[data-card-action]');
      // Thẻ A được Stitch thiết kế sẵn ở trạng thái "đang chọn" -> dùng kiểu nút phụ chuẩn khi bỏ chọn
      unselectedBtnClass[key] = btn && btn.textContent.indexOf('Xem hồ sơ') !== -1 ? btn.className : BTN_SECONDARY;

      card.classList.add('cursor-pointer');
      card.addEventListener('click', function (e) {
        if (key === current && e.target.closest('[data-card-action]')) {
          focusDrawer('advisor-letter'); // "Chọn tư vấn" -> chuyển tới form gửi yêu cầu
          return;
        }
        if (key !== current) select(key, true);
      });
    });

    var box = document.getElementById('lecturer-profile');
    if (box) {
      box.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab], [data-goto-tab]');
        if (tab) {
          e.preventDefault();
          switchTab(tab.getAttribute('data-tab') || tab.getAttribute('data-goto-tab'));
          return;
        }
        var reg = e.target.closest('[data-register-topic]');
        if (reg) {
          var t = LECTURERS[current].topics[+reg.getAttribute('data-register-topic')];
          var input = document.getElementById('advisor-topic');
          if (t && input) input.value = t.title;
          focusDrawer('advisor-topic');
        }
      });
    }

    var letter = document.getElementById('advisor-letter');
    if (letter) letter.addEventListener('input', updateLetterCount);

    // Giảng viên đủ chỉ tiêu: chặn gửi form (kể cả khi nhấn Enter)
    var drawer = document.getElementById('advisor-drawer');
    if (drawer) {
      drawer.addEventListener('submit', function (e) {
        if (!LECTURERS[current].open) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    }

    select('a', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
