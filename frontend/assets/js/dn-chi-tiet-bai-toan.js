// DN-15 Chi tiết bài toán R&D (và Hồ sơ dự án khi bài toán đang thực hiện).
//   ?ma=<mã>          bài toán cần xem
//   #ho-so-du-an      cuộn tới phần hồ sơ dự án
// Dữ liệu lấy từ dn-bai-toan-data.js (nạp trước).
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var goc = document.getElementById('chi-tiet-bai-toan');
  if (!D || !goc) return;
  var esc = D.escapeHtml;

  var ma = new URLSearchParams(window.location.search).get('ma') || '';
  var b = ma ? D.layTheoMa(ma) : null;
  var bcCuoi = document.getElementById('bc-cuoi');

  if (!b) {
    goc.innerHTML = '<div class="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm text-center flex flex-col items-center gap-3">' +
      '<span class="material-symbols-outlined text-[40px] text-text-muted">search_off</span>' +
      '<h1 class="font-headline-md text-headline-md text-on-surface">Không tìm thấy bài toán' + (ma ? ' ' + esc(ma) : '') + '</h1>' +
      '<p class="font-body-md text-body-md text-on-surface-variant max-w-lg">Bài toán có thể đã bị xóa, hoặc là bản nháp chỉ lưu trên một trình duyệt khác (chưa có API bài toán R&amp;D).</p>' +
      '<a class="h-10 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md inline-flex items-center gap-1.5 hover:bg-brand-navy-dark" href="04_bai-toan-rd.html">' +
      '<span class="material-symbols-outlined text-[18px]">arrow_back</span>Về danh sách bài toán</a></div>';
    if (bcCuoi) bcCuoi.textContent = 'Không tìm thấy';
    return;
  }

  var laDuAn = b.trangThai === 'dang-thuc-hien' && b.duAn;
  document.title = (laDuAn ? 'Hồ sơ dự án ' : 'Chi tiết bài toán ') + b.ma + ' | UIT Connect';
  if (bcCuoi) bcCuoi.textContent = b.ma;

  var loai = D.LOAI[b.loai];
  var tt = D.TRANG_THAI[b.trangThai] || D.TRANG_THAI.nhap;
  var maHoa = encodeURIComponent(b.ma);

  function chip(lop, icon, chu) {
    return '<span class="px-2.5 py-0.5 rounded-full ' + lop + ' font-label-sm text-label-sm font-semibold inline-flex items-center gap-1">' +
      (icon ? '<span class="material-symbols-outlined text-[13px]">' + icon + '</span>' : '<span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>') + esc(chu) + '</span>';
  }
  function the(ds) {
    return (ds || []).map(function (k) {
      return '<span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-code-sm">' + esc(k) + '</span>';
    }).join('');
  }
  function dong(nhan, giaTri) {
    return '<div class="flex items-start justify-between gap-4 py-2.5"><dt class="font-body-sm text-body-sm text-text-muted shrink-0">' + esc(nhan) +
      '</dt><dd class="font-label-md text-label-md text-on-surface text-right">' + (giaTri || '<span class="text-text-muted font-normal">Chưa thiết lập</span>') + '</dd></div>';
  }
  function the_khoi(tieuDe, icon, noiDung, id) {
    // scroll-mt-20: chừa chỗ cho header dính (cao 64px) khi cuộn tới #ho-so-du-an
    return '<section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm scroll-mt-20"' + (id ? ' id="' + id + '"' : '') + '>' +
      '<h2 class="font-headline-sm text-headline-sm text-primary flex items-center gap-2 mb-space-md"><span class="material-symbols-outlined text-[20px]">' + icon + '</span>' + esc(tieuDe) + '</h2>' +
      noiDung + '</section>';
  }

  // ---------- Nút thao tác theo trạng thái ----------
  var LOP_CHINH = 'h-10 px-5 rounded-lg bg-primary-container text-on-primary hover:bg-brand-navy-dark font-label-md text-label-md inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors';
  var LOP_PHU = 'h-10 px-5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md inline-flex items-center justify-center gap-1.5 transition-colors';
  function nut(href, lop, icon, chu) {
    return '<a class="' + lop + '" href="' + href + '"><span class="material-symbols-outlined text-[18px]">' + icon + '</span>' + esc(chu) + '</a>';
  }
  var nutThaoTac = '';
  if (b.trangThai === 'dang-mo') {
    nutThaoTac = nut('08_hop-thu-ket-noi.html?bai-toan=' + maHoa, LOP_CHINH, 'folder_open', 'Xem proposal (' + ((b.proposal && b.proposal.tong) || 0) + ')') +
      nut('05_dang-bai-toan-moi.html?ma=' + maHoa, LOP_PHU, 'edit', 'Chỉnh sửa');
  } else if (b.trangThai === 'nhap') {
    nutThaoTac = nut('05_dang-bai-toan-moi.html?ma=' + maHoa, LOP_CHINH, 'edit_note', 'Tiếp tục soạn');
  } else if (b.trangThai === 'dang-thuc-hien') {
    nutThaoTac = nut('09_khong-gian-dam-phan.html', LOP_CHINH.replace('bg-primary-container', 'bg-secondary').replace('hover:bg-brand-navy-dark', 'hover:bg-on-secondary-container'), 'handshake', 'Đàm phán & Báo cáo');
  } else if (b.trangThai === 'cho-duyet') {
    nutThaoTac = '<span class="h-10 px-4 rounded-lg bg-surface-container-low text-text-muted font-body-md text-body-md inline-flex items-center gap-1.5" title="Bài toán đang trong quá trình Admin xét duyệt">' +
      '<span class="material-symbols-outlined text-[16px]">lock</span>Đang chờ duyệt, chưa sửa được</span>';
  }

  // Nút xóa bài đăng (quy tắc ở DnBaiToan.kiemTraXoa: không xóa bài đang thực hiện / đang đàm phán)
  var ktXoa = D.kiemTraXoa(b.ma);
  nutThaoTac += '<button class="h-10 px-4 rounded-lg font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors ' +
    (ktXoa.duoc ? 'bg-white/10 text-white hover:bg-red-600' : 'bg-white/5 text-white/60 cursor-help') + '" type="button" data-xoa-bai' +
    (ktXoa.duoc ? '' : ' title="' + esc(ktXoa.lyDo) + '" aria-disabled="true"') + '>' +
    '<span class="material-symbols-outlined text-[18px]">' + (ktXoa.duoc ? 'delete' : 'lock') + '</span>' +
    (b.trangThai === 'nhap' ? 'Xóa bản nháp' : 'Xóa bài đăng') + '</button>';

  // ---------- Đầu trang ----------
  var nhanMa = (b.trangThai === 'nhap' ? 'ID: ' : 'Mã: ') + b.ma + (b.duAn && b.duAn.soHopDong ? ' · HĐ: ' + b.duAn.soHopDong : '');
  var dau = '<div class="relative bg-gradient-to-r from-primary-container via-brand-hero-mid to-brand-hero-dark rounded-xl p-space-xl text-on-primary shadow-md overflow-hidden">' +
    '<div class="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-primary-fixed-dim/10 pointer-events-none blur-2xl"></div>' +
    '<div class="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">' +
    '<div class="max-w-3xl space-y-space-sm"><div class="flex flex-wrap items-center gap-space-xs">' +
    (loai ? chip('bg-white/15 text-on-primary', loai.icon, loai.ten) : '') + chip(tt.mau, tt.icon, tt.ten) +
    (b.daSua ? chip('bg-secondary-fixed text-on-secondary-fixed', 'edit_note', 'Đã sửa') : '') +
    '<span class="font-code-sm text-code-sm text-primary-fixed">' + esc(nhanMa) + '</span></div>' +
    '<p class="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed">' + (laDuAn ? 'Hồ sơ dự án' : 'Chi tiết bài toán R&D') + '</p>' +
    '<h1 class="font-headline-lg text-headline-lg lg:font-display-lg lg:text-display-lg text-on-primary">' + esc(b.tieuDe || '(Chưa có tiêu đề)') + '</h1>' +
    '<p class="font-body-md text-body-md text-primary-fixed">' + esc(D.tenLinhVuc(b.linhVuc) || 'Chưa chọn lĩnh vực') + '</p></div>' +
    (nutThaoTac ? '<div class="flex flex-wrap gap-space-sm shrink-0 [&>a]:bg-white [&>a]:text-primary [&>a:hover]:bg-brand-light-blue">' + nutThaoTac + '</div>' : '') +
    '</div></div>';

  var canhBao = b.luuCucBo ? '<div class="rounded-xl bg-status-warning/10 px-space-md py-space-sm flex items-start gap-space-sm font-body-sm text-body-sm text-on-surface">' +
    '<span class="material-symbols-outlined text-[18px] text-status-warning shrink-0">cloud_off</span>' +
    '<span>Bài toán này ' + (b.taoCucBo ? 'được tạo' : 'đã được sửa') + ' trên trình duyệt này và <strong>chưa lưu lên máy chủ</strong> (chưa có API bài toán R&amp;D).</span></div>' : '';

  // ---------- Cột chính ----------
  var moTa = the_khoi('Mô tả bài toán & bối cảnh', 'description',
    b.moTa ? '<div class="rte font-body-lg text-body-lg text-on-surface">' + D.lamSachHtml(b.moTa) + '</div>' :
      '<p class="font-body-md text-body-md text-text-muted">Chưa có mô tả.</p>');

  var yeuCau = the_khoi('Yêu cầu & kỹ năng', 'checklist',
    '<div class="space-y-space-md">' +
    '<div><h3 class="font-label-md text-label-md text-text-muted mb-1.5">Kỹ năng / công nghệ</h3><div class="flex flex-wrap gap-1.5">' + (the(b.kyNang) || '<span class="font-body-sm text-body-sm text-text-muted">Chưa có</span>') + '</div></div>' +
    '<div><h3 class="font-label-md text-label-md text-text-muted mb-1.5">Sản phẩm bàn giao</h3><div class="flex flex-wrap gap-1.5">' + (the(b.sanPham) || '<span class="font-body-sm text-body-sm text-text-muted">Chưa có</span>') + '</div></div>' +
    '<dl class="divide-y divide-surface-container-high">' +
    dong('Đối tượng được nộp', esc((b.doiTuong || []).map(function (d) { return D.DOI_TUONG[d]; }).join('; '))) +
    dong('Quy mô nhóm', b.quyMoNhom && b.quyMoNhom.min ? esc(b.quyMoNhom.min + ' – ' + b.quyMoNhom.max + ' người') : '') +
    dong('TRL tối thiểu', b.trl ? 'TRL ' + esc(b.trl) : 'Không yêu cầu') +
    dong('Yêu cầu NDA', b.yeuCauNda ? 'Có, theo mẫu chuẩn UIT' : 'Không') + '</dl>' +
    (b.tieuChi ? '<div><h3 class="font-label-md text-label-md text-text-muted mb-1.5">Tiêu chí đánh giá proposal</h3><p class="font-body-md text-body-md text-on-surface">' + esc(b.tieuChi) + '</p></div>' : '') +
    '</div>');

  var TRANG_THAI_MOC = {
    'da-nghiem-thu': { chu: 'Đã nghiệm thu', icon: 'check_circle', mau: 'text-tertiary' },
    'dang-thuc-hien': { chu: 'Đang thực hiện', icon: 'pending', mau: 'text-primary' },
    'chua-bat-dau': { chu: 'Chưa bắt đầu', icon: 'radio_button_unchecked', mau: 'text-text-muted' }
  };
  var dsMoc = (b.moc || []).map(function (m, i) {
    var t = TRANG_THAI_MOC[m.trangThai];
    return '<li class="flex items-start gap-3 py-2.5">' +
      '<span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface shrink-0">' + (i + 1) + '</span>' +
      '<div class="flex-1 min-w-0"><p class="font-title-md text-title-md text-on-surface">' + esc(m.ten) + '</p>' +
      '<p class="font-body-sm text-body-sm text-text-muted">Tuần ' + esc(m.tuan) + ' · Giải ngân ' + esc(m.phanTram) + '%</p></div>' +
      (t ? '<span class="font-label-sm text-label-sm ' + t.mau + ' inline-flex items-center gap-1 shrink-0"><span class="material-symbols-outlined text-[16px]">' + t.icon + '</span>' + t.chu + '</span>' : '') +
      '</li>';
  }).join('');
  var nganSachKhoi = the_khoi('Ngân sách & thời hạn', 'payments',
    '<dl class="divide-y divide-surface-container-high">' +
    dong('Ngân sách dự kiến', b.thoaThuanNganSach ? 'Thỏa thuận sau' : esc(D.dinhDangNganSach(b.nganSach))) +
    dong('Hạn nhận proposal', esc(D.dinhDangNgay(b.hanNop))) +
    dong('Ngày bắt đầu', esc(D.dinhDangNgay(b.ngayBatDau)) + (b.ngayKetThuc ? ' – ' + esc(D.dinhDangNgay(b.ngayKetThuc)) : '')) +
    dong('Thời gian thực hiện', b.thoiGian ? esc(b.thoiGian + ' tuần') : '') +
    dong('Hình thức làm việc', esc((D.HINH_THUC[b.hinhThuc] || '') + (b.diaDiem ? ' · ' + b.diaDiem : (b.donVi ? ' · ' + b.donVi : '')))) +
    '</dl><h3 class="font-label-md text-label-md text-text-muted mt-space-md mb-1">Mốc nghiệm thu</h3>' +
    (dsMoc ? '<ol class="divide-y divide-surface-container-high">' + dsMoc + '</ol>' : '<p class="font-body-sm text-body-sm text-text-muted">Chưa thiết lập mốc nghiệm thu.</p>'));

  var tep = (b.tepDinhKem || []).map(function (t) {
    return '<li class="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low">' +
      '<div class="flex items-center gap-3 min-w-0"><span class="w-9 h-9 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">' +
      '<span class="material-symbols-outlined text-[20px]">' + (/\.pdf$/i.test(t.ten) ? 'picture_as_pdf' : 'folder_zip') + '</span></span>' +
      '<div class="min-w-0"><p class="font-label-md text-label-md text-on-surface truncate">' + esc(t.ten) + '</p>' +
      '<p class="font-code-sm text-code-sm text-text-muted">' + esc(t.kichThuoc) + (t.moi ? ' · <span class="text-status-warning">Chưa tải lên máy chủ</span>' : '') + '</p></div></div></li>';
  }).join('');
  var tepKhoi = the_khoi('Tài liệu đính kèm', 'attach_file',
    tep ? '<ul class="space-y-2">' + tep + '</ul>' : '<p class="font-body-sm text-body-sm text-text-muted">Không có tài liệu đính kèm.</p>');

  // ---------- Hồ sơ dự án (bài toán đang thực hiện) ----------
  var duAnKhoi = '';
  if (laDuAn) {
    var da = b.duAn;
    var moc = b.moc || [];
    var xong = moc.filter(function (m) { return m.trangThai === 'da-nghiem-thu'; });
    var giaiNgan = xong.reduce(function (t, m) { return t + (m.phanTram || 0); }, 0);
    var tien = b.nganSach ? Math.round(b.nganSach.max * giaiNgan / 100 * 1000000) : 0;
    var thanhVien = (da.thanhVien || []).map(function (tv) {
      return '<li class="flex items-center gap-3 py-2"><span class="w-8 h-8 rounded-full bg-primary-container text-on-primary font-code-sm text-code-sm flex items-center justify-center shrink-0">' + esc(tv.kyHieu) + '</span>' +
        '<div><p class="font-label-md text-label-md text-on-surface">' + esc(tv.ten) + '</p><p class="font-body-sm text-body-sm text-text-muted">' + esc(tv.vaiTro) + '</p></div></li>';
    }).join('');
    var baoCao = (da.baoCao || []).map(function (bc) {
      return '<li class="flex items-center justify-between gap-3 py-2"><span class="flex items-center gap-2 min-w-0"><span class="material-symbols-outlined text-[18px] text-status-error">picture_as_pdf</span>' +
        '<span class="font-body-md text-body-md text-on-surface truncate">' + esc(bc.ten) + '</span></span>' +
        '<span class="font-body-sm text-body-sm text-text-muted shrink-0">' + esc(D.dinhDangNgay(bc.ngay)) + ' · ' + esc(bc.ghiChu) + '</span></li>';
    }).join('');
    duAnKhoi = the_khoi('Hồ sơ dự án', 'folder_shared',
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-lg">' +
      '<div class="rounded-xl bg-brand-light-blue/60 p-space-md"><p class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Tiến độ</p>' +
      '<p class="font-headline-sm text-headline-sm text-primary">Milestone ' + (xong.length + (moc.some(function (m) { return m.trangThai === 'dang-thuc-hien'; }) ? 1 : 0)) + '/' + moc.length + '</p></div>' +
      '<div class="rounded-xl bg-brand-light-blue/60 p-space-md"><p class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Đã giải ngân</p>' +
      '<p class="font-headline-sm text-headline-sm text-primary">' + giaiNgan + '%</p><p class="font-body-sm text-body-sm text-text-muted">' + tien.toLocaleString('vi-VN') + ' đ</p></div>' +
      '<div class="rounded-xl bg-brand-light-blue/60 p-space-md"><p class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Thời gian</p>' +
      '<p class="font-title-md text-title-md text-on-surface">' + esc(D.dinhDangNgay(b.ngayBatDau)) + ' – ' + esc(D.dinhDangNgay(b.ngayKetThuc)) + '</p></div></div>' +
      '<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-space-lg"><div class="bg-secondary h-full rounded-full" style="width:' + giaiNgan + '%"></div></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-space-lg">' +
      '<div><h3 class="font-label-md text-label-md text-text-muted mb-1">Đối tác thực hiện</h3>' +
      '<dl class="divide-y divide-surface-container-high">' +
      dong('Đơn vị', esc(da.doiTac)) + dong('Trưởng nhóm', esc(da.truongNhom)) + dong('Giảng viên hướng dẫn', esc(da.giangVien)) +
      dong('Số thỏa thuận', esc(da.soHopDong)) + dong('Ngày ký MoA', esc(D.dinhDangNgay(da.ngayKy))) + '</dl></div>' +
      '<div><h3 class="font-label-md text-label-md text-text-muted mb-1">Thành viên</h3><ul class="divide-y divide-surface-container-high">' + thanhVien + '</ul></div></div>' +
      (da.lichTraoDoi ? '<div class="mt-space-md inline-flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">' +
        '<span class="material-symbols-outlined text-[16px] text-primary">calendar_today</span><span>Lịch trao đổi gần nhất: <strong class="text-on-surface">' + esc(da.lichTraoDoi) + '</strong></span></div>' : '') +
      (baoCao ? '<h3 class="font-label-md text-label-md text-text-muted mt-space-lg mb-1">Báo cáo đã nộp</h3><ul class="divide-y divide-surface-container-high">' + baoCao + '</ul>' : '') +
      '<p class="mt-space-md font-body-sm text-body-sm text-text-muted">Trạng thái hợp tác chỉ được ghi nhận trên UIT Connect; việc ký kết và thanh toán diễn ra ngoài hệ thống.</p>',
      'ho-so-du-an');
  }

  // ---------- Cột phụ ----------
  var cotPhu = '';
  if (b.trangThai === 'dang-mo') {
    var p = b.proposal || { tong: 0, moi: 0, loiMoi: 0 };
    var dsP = D.proposalCuaBaiToan(b.ma);
    cotPhu += the_khoi('Hồ sơ ứng tuyển', 'inbox',
      '<p class="font-headline-md text-headline-md text-primary">' + p.tong + ' <span class="font-body-md text-body-md text-on-surface-variant">proposals</span>' +
      (p.moi ? ' <span class="align-middle px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">' + p.moi + ' mới</span>' : '') + '</p>' +
      '<p class="font-body-sm text-body-sm text-text-muted mb-space-md">' + p.loiMoi + ' lời mời kết nối đã gửi</p>' +
      (dsP.length ? '<ul class="divide-y divide-surface-container-high mb-space-md">' + dsP.map(function (x) {
        return '<li><a class="flex items-center gap-2 py-2 hover:text-primary" href="08_hop-thu-ket-noi.html?bai-toan=' + maHoa + '&amp;proposal=' + encodeURIComponent(x.id) + '">' +
          '<span class="w-7 h-7 rounded-full ' + x.mau + ' font-code-sm text-code-sm flex items-center justify-center shrink-0">' + esc(x.kyHieu) + '</span>' +
          '<span class="min-w-0"><span class="block font-label-md text-label-md truncate">' + esc(x.nhom) + '</span><span class="block font-body-sm text-body-sm text-text-muted">' + esc(D.TRANG_THAI_PROPOSAL[x.trangThai] + ' · ' + x.thoiGian) + '</span></span></a></li>';
      }).join('') + '</ul>' : '') +
      nut('08_hop-thu-ket-noi.html?bai-toan=' + maHoa, LOP_CHINH + ' w-full', 'folder_open', 'Mở hộp thư của bài toán'));
  } else if (b.trangThai === 'cho-duyet') {
    cotPhu += the_khoi('Trạng thái duyệt', 'verified_user',
      '<p class="font-label-md text-label-md text-on-surface mb-1">Ban Quản lý UIT đang thẩm định</p>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">Nộp ngày ' + esc(D.dinhDangNgay(b.ngayNop || b.ngayLuu)) +
      (b.ngayDuKienMo ? '. Dự kiến mở nhận proposal: ' + esc(D.dinhDangNgay(b.ngayDuKienMo)) : '') + '. Trong lúc chờ duyệt không sửa được nội dung.</p>');
  } else if (b.trangThai === 'nhap') {
    var td = b.tienDoSoanThao || 0;
    cotPhu += the_khoi('Trạng thái soạn thảo', 'edit_document',
      '<div class="flex items-center justify-between mb-1.5"><span class="font-body-sm text-body-sm text-text-muted">Hoàn thiện</span><span class="font-code-sm text-code-sm font-bold">' + td + '%</span></div>' +
      '<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-space-md"><div class="bg-primary-container h-full rounded-full" style="width:' + td + '%"></div></div>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Bản nháp chưa gửi Ban Quản lý duyệt. Lưu gần nhất ' + esc(D.dinhDangNgay(b.ngayLuu)) + '.</p>' +
      nut('05_dang-bai-toan-moi.html?ma=' + maHoa, LOP_CHINH + ' w-full', 'edit_note', 'Tiếp tục soạn'));
  }
  cotPhu += the_khoi('Thông tin chung', 'info',
    '<dl class="divide-y divide-surface-container-high">' +
    dong('Mã', esc(b.ma)) +
    dong('Loại hình', loai ? esc(loai.ten) : '') +
    dong('Trạng thái', esc(tt.tab)) +
    dong('Ngày tạo', esc(D.dinhDangNgay(b.ngayTao))) +
    dong('Cập nhật', esc(D.dinhDangNgay(b.ngayLuu))) + '</dl>');

  goc.innerHTML = dau + canhBao +
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">' +
    '<div class="lg:col-span-2 space-y-space-lg">' + duAnKhoi + moTa + yeuCau + nganSachKhoi + tepKhoi + '</div>' +
    '<aside class="space-y-space-lg">' + cotPhu + '</aside></div>';

  goc.addEventListener('click', function (e) {
    if (!e.target.closest('[data-xoa-bai]')) return;
    D.xoaBaiToanCoXacNhan(b.ma, function (daXoa) {
      if (!daXoa) { window.location.reload(); return; }
      goc.innerHTML = '<div class="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm text-center flex flex-col items-center gap-3">' +
        '<span class="material-symbols-outlined text-[40px] text-text-muted">delete</span>' +
        '<h1 class="font-headline-md text-headline-md text-on-surface">Đã xóa ' + esc(b.ma) + '</h1>' +
        '<p class="font-body-md text-body-md text-on-surface-variant">Bấm "Hoàn tác" trong thông báo bên dưới nếu xóa nhầm.</p>' +
        '<a class="h-10 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md inline-flex items-center gap-1.5 hover:bg-brand-navy-dark" href="04_bai-toan-rd.html">' +
        '<span class="material-symbols-outlined text-[18px]">arrow_back</span>Về danh sách bài toán</a></div>';
    });
  });

  if (window.location.hash === '#ho-so-du-an') {
    var el = document.getElementById('ho-so-du-an');
    if (el) el.scrollIntoView({ block: 'start' });
  }
})();
