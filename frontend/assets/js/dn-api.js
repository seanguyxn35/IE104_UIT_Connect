// Gọi API luồng Doanh nghiệp và đổi dữ liệu API sang cùng dạng với dữ liệu mẫu (dn-bai-toan-data.js),
// để các trang DN-01 / 08 / 09 / 16 dùng chung phần vẽ giao diện cho cả hai chế độ:
//   - Có máy chủ (mở qua http://localhost:3000): dữ liệu thật, thao tác lưu vào CSDL
//   - Không có máy chủ (file://, GitHub Pages) hoặc máy chủ lỗi: dữ liệu mẫu, báo rõ "chưa lưu lên máy chủ"
// Cần dn-bai-toan-data.js nạp trước.
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var esc = D.escapeHtml;

  var TT_PROPOSAL = { Submitted: 'cho-phan-hoi', Scheduled: 'da-hen', In_Discussion: 'dam-phan', Contracted: 'dam-phan', Completed: 'dam-phan', Declined: 'tu-choi', Cancelled: 'tu-choi' };
  var TT_BAI_TOAN = { Draft: 'nhap', Pending_Approval: 'cho-duyet', Open: 'dang-mo', In_Progress: 'dang-thuc-hien', Closed: 'da-dong', Rejected: 'da-dong' };
  var LOAI_BAI_TOAN = { Open_Call: 'ung-tuyen', Lab_Collaboration: 'hop-tac-lab', Sponsored: 'tai-tro' };
  var TT_PHONG = { Contracted: 'da-ky', Awaiting_Business: 'cho-xac-nhan', Awaiting_Partner: 'cho-doi-tac', In_Discussion: 'dang-trao-doi' };
  var BUOC = { traoDoi: 'Technical', nda: 'NDA_IP', hopDong: 'Contract' };
  var MAU = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-teal-100 text-teal-700',
    'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-cyan-100 text-cyan-700'];
  var NEN = ['from-primary via-primary-container to-brand-hero-dark', 'from-tertiary-container via-brand-hero-mid to-brand-hero-dark',
    'from-secondary via-primary-container to-brand-hero-dark', 'from-primary-container via-brand-hero-mid to-brand-hero-dark',
    'from-brand-hero-mid via-primary to-brand-hero-dark'];

  function coMayChu() { return /^https?:$/.test(window.location.protocol); }

  // fetch JSON; lỗi { code, message } của máy chủ thành Error mang message, status
  function goi(duongDan, tuyChon) {
    tuyChon = tuyChon || {};
    if (tuyChon.body) tuyChon.headers = { 'Content-Type': 'application/json' };
    return fetch(duongDan, tuyChon).then(function (res) {
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

  function kyHieu(ten) {
    return String(ten || '?').replace(/^(GS\.TS|PGS\.TS|TS|ThS)\.\s*/, '').split(/\s+/).slice(-2).map(function (x) { return x[0]; }).join('').toUpperCase();
  }
  function tuongDoi(phut) {
    if (phut < 60) return phut + ' phút trước';
    if (phut < 1440) return Math.round(phut / 60) + ' giờ trước';
    if (phut < 10080) return Math.round(phut / 1440) + ' ngày trước';
    if (phut < 43200) return Math.round(phut / 10080) + ' tuần trước';
    return Math.round(phut / 43200) + ' tháng trước';
  }
  function dungLuong(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  // Ngày / giờ theo giờ Việt Nam: 'ngay' → YYYY-MM-DD, 'gio' → HH:MM, 'luc' → YYYY-MM-DDTHH:MM
  function gioVN(iso, kieu) {
    var d = new Date(iso);
    var ngay = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    var gio = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
    return kieu === 'ngay' ? ngay : (kieu === 'gio' ? gio : ngay + 'T' + gio);
  }
  function linhVucTuTen(ten) {
    var lv = D.LINH_VUC.filter(function (x) { return x.tenCsdl === ten; })[0];
    return lv ? lv.id : '';
  }

  // Proposal (connection_request) từ API → dạng proposal mẫu
  function proposalTuApi(r) {
    var tv = [];
    if (r.lecturer) tv.push({ ten: r.lecturer.name, truongNhom: true, vaiTro: r.lecturer.position || 'Giảng viên' });
    r.members.forEach(function (m) {
      tv.push({ ten: m.name, truongNhom: !r.lecturer && m.isLeader, mssv: m.studentCode, vaiTro: m.role || 'Thành viên',
        gpa: m.gpa != null ? Number(m.gpa).toFixed(2) : '' });
    });
    var ld = r.lecturer ? null : r.leader;
    var nguoiGui = r.lecturer ? r.lecturer.name : (ld ? ld.name : '');
    var phut = Math.max(1, Math.round((Date.now() - Date.parse(r.createdAt)) / 60000));
    var soNguoi = r.members.length + (r.lecturer ? 1 : 0);
    var nguon = r.partner.type === 'student' ? 'ca-nhan' : (r.partner.type === 'lab' ? 'lab' : 'nhom-sv');
    return {
      id: String(r.id), baiToan: r.problemCode, trangThai: TT_PROPOSAL[r.status] || 'cho-phan-hoi', trangThaiApi: r.status,
      nguon: nguon, tieuDe: r.title || 'Proposal', nguoiGui: nguoiGui, kyHieu: kyHieu(nguoiGui), mau: MAU[r.id % MAU.length],
      quyMo: nguon === 'ca-nhan' ? 'Cá nhân' : (r.lecturer ? 'Lab · ' + soNguoi + ' thành viên' : 'Nhóm ' + soNguoi + ' SV'),
      moi: r.isNew, thoiGian: tuongDoi(phut), phutTruoc: phut, phuHop: r.fitScore == null ? 0 : r.fitScore,
      nhom: r.partner.name || 'Cá nhân', laPhanHoiLoiMoi: r.initiatedBy === 'Business',
      dongPhu: r.initiatedBy === 'Business' ? 'Phản hồi lời mời · ' + ((ld && ld.faculty) || '') : null,
      mssv: ld ? ld.studentCode : null, khoa: ld ? ld.faculty : '',
      lop: ld && ld.className ? 'Lớp ' + ld.className + (ld.cohort ? ' (' + ld.cohort + ')' : '') : '',
      gpa: ld && ld.gpa != null ? Number(ld.gpa).toFixed(2) : '—', drl: ld && ld.trainingScore != null ? ld.trainingScore : '—',
      gioiThieu: r.lecturer ? [r.lecturer.position, r.lecturer.faculty].filter(Boolean).join(' · ') : '',
      noiDung: r.content || '', the: r.tags || [], trl: r.trlLabel || '',
      thu: String(r.coverLetter || '').split(/\n\s*\n/).filter(Boolean),
      tep: (r.attachments || []).map(function (a) { return { id: a.id, ten: a.fileName, kichThuoc: dungLuong(a.sizeBytes), loai: a.docType || 'Tài liệu' }; }),
      thanhVien: tv,
      lichHen: r.meeting ? { ngay: gioVN(r.meeting.startAt, 'ngay'), gio: gioVN(r.meeting.startAt, 'gio'), hinhThuc: r.meeting.mode, ghiChu: r.meeting.agenda || '' } : null,
      lyDoTuChoi: r.declineReason, dpId: 'dp-' + r.id
    };
  }

  function baiToanTuApi(b) {
    return { ma: b.code, tieuDe: b.title, trangThai: TT_BAI_TOAN[b.status] || 'dang-mo', linhVuc: linhVucTuTen(b.fieldName) };
  }

  // Phòng đàm phán từ API → dạng phòng mẫu (layDanhSachPhong)
  function phongTuApi(r) {
    var p = proposalTuApi(r);
    var buoc = {};
    Object.keys(BUOC).forEach(function (k) {
      var s = r.steps.filter(function (x) { return x.code === BUOC[k]; })[0] || {};
      buoc[k] = { dn: !!s.businessConfirmed, doiTac: !!s.partnerConfirmed, ghiChu: s.note || '' };
    });
    var trieu = r.problem && r.problem.funding ? Math.round(Number(r.problem.funding) / 1000000) : 0;
    var tin = (r.messages || []).map(function (m) {
      return { tu: m.sender === 'Business' ? 'dn' : (m.sender === 'Partner' ? 'doi-tac' : 'he-thong'), luc: gioVN(m.createdAt, 'luc'), noiDung: m.content };
    });
    var vanBan = (r.documents || []).map(function (d) {
      return { id: d.id, ten: d.fileName, kichThuoc: dungLuong(d.sizeBytes), loai: (d.docType || 'Tài liệu') + (d.fromProposal ? ' (proposal)' : '') };
    });
    if (r.documents) p.tep = []; // văn bản của proposal đã nằm trong vanBan
    return {
      id: String(r.id), apiId: r.id, cardId: 'dp-' + r.id, p: p,
      baiToan: r.problem ? {
        ma: r.problem.code, tieuDe: r.problem.title, loai: LOAI_BAI_TOAN[r.problem.type] || 'ung-tuyen',
        nganSach: trieu ? { min: trieu, max: trieu } : null,
        duAn: r.contractCode ? { soHopDong: r.contractCode } : null
      } : null,
      moPhong: gioVN(r.roomOpenedAt, 'ngay'),
      nhan: String((r.tags && r.tags[0]) || 'R&D').toUpperCase().slice(0, 10),
      nen: NEN[r.id % NEN.length],
      buoc: buoc,
      trangThai: TT_PHONG[r.roomStatus] || 'dang-trao-doi',
      canhBao: r.warning,
      lich: r.meeting ? { ngay: gioVN(r.meeting.startAt, 'ngay'), gio: gioVN(r.meeting.startAt, 'gio'), hinhThuc: r.meeting.mode, noiDung: r.meeting.agenda || '' } : null,
      tinNhan: tin,
      vanBan: vanBan,
      chuaDoc: r.unreadCount || 0,
      nganSachDeXuat: r.proposedBudget ? Math.round(Number(r.proposedBudget) / 1000000) : 0
    };
  }

  // Dải báo nguồn dữ liệu đặt trước phần tử "truoc"
  function veNguon(truoc, coApi, loi, moTaApi) {
    var el = document.getElementById('nguon-du-lieu');
    if (!el) {
      el = document.createElement('div');
      el.id = 'nguon-du-lieu';
      truoc.parentNode.insertBefore(el, truoc);
    }
    el.className = 'rounded-lg px-4 py-2.5 text-xs flex items-start gap-2 border ' +
      (coApi ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900');
    el.innerHTML = coApi
      ? '<span class="material-symbols-outlined text-[16px]">cloud_done</span><span>Dữ liệu từ máy chủ: ' + esc(moTaApi) + '</span>'
      : '<span class="material-symbols-outlined text-[16px]">cloud_off</span><span>' + esc(loi) +
        ': đang hiển thị <strong>dữ liệu mẫu</strong>, thao tác chỉ lưu tạm trên trình duyệt, <strong>chưa lưu lên máy chủ</strong>. ' +
        'Chạy <code>npm start</code> trong thư mục backend rồi mở trang qua http://localhost:3000.</span>';
  }

  // Lý do dùng dữ liệu mẫu, theo lỗi khi gọi API
  function lyDoDuLieuMau(err) {
    if (!coMayChu()) return 'Trang đang mở trực tiếp từ tệp (file://)';
    return err && err.status ? err.message : 'Không kết nối được máy chủ';
  }

  // Mở liên kết ký tạm: xem (tab mới, mở trước khi chờ máy chủ để không bị chặn cửa sổ bật lên) hoặc tải xuống
  function moTep(duongDan, taiXuong) {
    var tabMoi = taiXuong ? null : window.open('', '_blank');
    return goi(duongDan + (taiXuong ? '?download=1' : '')).then(function (kq) {
      if (tabMoi) { tabMoi.location.href = kq.url; return; }
      var a = document.createElement('a');
      a.href = kq.url;
      a.download = kq.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, function (err) {
      if (tabMoi) tabMoi.close();
      throw err;
    });
  }

  window.DnApi = {
    BUOC: BUOC,
    coMayChu: coMayChu,
    goi: goi,
    proposalTuApi: proposalTuApi,
    baiToanTuApi: baiToanTuApi,
    phongTuApi: phongTuApi,
    veNguon: veNguon,
    lyDoDuLieuMau: lyDoDuLieuMau,
    moTep: moTep
  };
})();
