// DN-01 Bàn làm việc: số liệu và liên kết lấy từ dữ liệu dùng chung (dn-bai-toan-data.js),
// nên khớp với Bài toán R&D (DN-04), Hộp thư kết nối (DN-08), Không gian đàm phán (DN-09 / DN-16).
//   - 4 thẻ "Việc cần xử lý": đếm và mở đúng trang / tab / bộ lọc
//   - "Bài toán R&D của tôi": nút theo trạng thái, trỏ đúng bài toán
//   - "Proposal mới nhất": proposal chờ phản hồi, "Xem proposal" mở đúng proposal ở Hộp thư
//   - "Không gian đàm phán": "Mở" vào đúng phòng
(function () {
  'use strict';
  var D = window.DnBaiToan;
  if (!D || !document.getElementById('bl-bai-toan')) return;
  var esc = D.escapeHtml;
  var $ = function (id) { return document.getElementById(id); };

  var baiToan = D.layTatCa();
  var proposal = D.layDanhSachProposal();
  var phong = D.layDanhSachPhong();

  // ---------- 4 thẻ việc cần xử lý ----------
  function datThe(so, giaTri, href, tieuDeLink) {
    $('bl-so-' + so).textContent = giaTri;
    var a = $('bl-link-' + so);
    a.href = href;
    a.title = tieuDeLink;
  }
  var choPhanHoi = proposal.filter(function (p) { return p.trangThai === 'cho-phan-hoi'; });
  var loiMoi = proposal.filter(function (p) { return p.laPhanHoiLoiMoi && p.trangThai !== 'tu-choi'; });
  var choXacNhan = phong.filter(function (ph) { return ph.trangThai === 'cho-xac-nhan'; });
  var choDuyet = baiToan.filter(function (b) { return b.trangThai === 'cho-duyet'; });

  datThe(1, choPhanHoi.length, '08_hop-thu-ket-noi.html?tab=cho-phan-hoi', 'Mở tab Chờ phản hồi ở Hộp thư kết nối');
  datThe(2, loiMoi.length, loiMoi.length === 1 ? '08_hop-thu-ket-noi.html?proposal=' + encodeURIComponent(loiMoi[0].id) : '08_hop-thu-ket-noi.html?tab=da-hen',
    'Mở phản hồi lời mời ở Hộp thư kết nối');
  datThe(3, choXacNhan.length, choXacNhan.length === 1 ? '16_phong-dam-phan.html?phong=' + encodeURIComponent(choXacNhan[0].id) + '#tien-trinh' : '09_khong-gian-dam-phan.html?trang-thai=cho-xac-nhan',
    'Mở phòng đàm phán đang chờ bạn xác nhận');
  datThe(4, choDuyet.length, '04_bai-toan-rd.html?tab=cho-duyet', 'Mở tab Chờ Admin duyệt ở Bài toán R&D');

  // ---------- Bài toán R&D của tôi ----------
  var CHIP = {
    'cho-duyet': 'bg-status-warning/15 text-amber-900',
    'nhap': 'bg-surface-container-highest text-on-surface-variant',
    'dang-mo': 'bg-tertiary-fixed text-tertiary',
    'dang-thuc-hien': 'bg-primary-fixed text-primary',
    'da-dong': 'bg-surface-container-high text-text-muted'
  };
  var LOP_NUT = 'h-8 px-space-md rounded-xl bg-surface-container-lowest hover:bg-brand-light-blue text-primary font-label-md text-label-md shadow-xs transition-colors inline-flex items-center';
  var LOP_NUT_CHINH = 'h-8 px-space-md rounded-xl bg-primary text-on-primary hover:bg-brand-navy-dark font-label-md text-label-md shadow-xs transition-colors inline-flex items-center';
  function nut(href, lop, chu) { return '<a class="' + lop + '" href="' + href + '">' + esc(chu) + '</a>'; }

  // Bài toán cần doanh nghiệp xử lý lên trước
  var THU_TU = { 'dang-mo': 0, 'nhap': 1, 'cho-duyet': 2, 'dang-thuc-hien': 3, 'da-dong': 4 };
  var dsBt = baiToan.slice().sort(function (a, b) { return THU_TU[a.trangThai] - THU_TU[b.trangThai]; }).slice(0, 4);
  $('bl-bai-toan').innerHTML = dsBt.map(function (b) {
    var ma = encodeURIComponent(b.ma);
    var dsP = proposal.filter(function (p) { return p.baiToan === b.ma; });
    var meta = '', nutHtml = '';
    if (b.trangThai === 'dang-mo') {
      meta = '<span class="flex items-center gap-1 text-primary font-medium"><span class="material-symbols-outlined text-[16px]">description</span>' + dsP.length + ' proposal đã nộp</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">event</span>Hạn: ' + esc(D.dinhDangNgay(b.hanNop)) + '</span>';
      nutHtml = nut('05_dang-bai-toan-moi.html?ma=' + ma, LOP_NUT, 'Chỉnh sửa') + nut('08_hop-thu-ket-noi.html?bai-toan=' + ma, LOP_NUT_CHINH, 'Xem hồ sơ');
    } else if (b.trangThai === 'nhap') {
      meta = '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">edit_note</span>Đang soạn thảo · ' + (b.tienDoSoanThao || 0) + '%</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">save</span>Lưu: ' + esc(D.dinhDangNgay(b.ngayLuu)) + '</span>';
      nutHtml = nut('05_dang-bai-toan-moi.html?ma=' + ma, LOP_NUT, 'Tiếp tục soạn');
    } else if (b.trangThai === 'cho-duyet') {
      meta = '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">history</span>Nộp: ' + esc(D.dinhDangNgay(b.ngayNop || b.ngayLuu)) + '</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">lock</span>Không sửa được khi chờ duyệt</span>';
      nutHtml = nut('15_chi-tiet-bai-toan.html?ma=' + ma, LOP_NUT, 'Xem chi tiết');
    } else if (b.trangThai === 'dang-thuc-hien') {
      meta = '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">group</span>' + esc(b.duAn ? b.duAn.doiTac : '') + '</span>';
      nutHtml = nut('15_chi-tiet-bai-toan.html?ma=' + ma + '#ho-so-du-an', LOP_NUT_CHINH, 'Hồ sơ dự án');
    } else {
      nutHtml = nut('15_chi-tiet-bai-toan.html?ma=' + ma, LOP_NUT, 'Xem chi tiết');
    }
    return '<article class="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">' +
      '<div class="flex flex-col gap-1 min-w-0 flex-1"><div class="flex items-center gap-space-sm min-w-0">' +
      '<span class="px-2 py-0.5 rounded-full ' + CHIP[b.trangThai] + ' font-label-sm text-label-sm shrink-0">' + esc(D.TRANG_THAI[b.trangThai].ten + (b.daSua ? ' · Đã sửa' : '')) + '</span>' +
      '<h3 class="font-title-md text-title-md text-on-surface truncate"><a class="hover:text-primary hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + ma + '" title="' + esc(b.tieuDe) + '">' + esc(b.tieuDe) + '</a></h3></div>' +
      '<div class="flex flex-wrap items-center gap-x-space-lg gap-y-1 text-on-surface-variant font-body-sm text-body-sm"><span class="font-code-sm text-code-sm text-text-muted">' + esc(b.ma) + '</span>' + meta + '</div></div>' +
      '<div class="flex items-center gap-space-sm shrink-0">' + nutHtml + '</div></article>';
  }).join('');

  // ---------- Proposal mới nhất ----------
  var moiNhat = choPhanHoi.slice().sort(function (a, b) { return a.phutTruoc - b.phutTruoc; }).slice(0, 3);
  $('bl-so-moi').textContent = choPhanHoi.filter(function (p) { return p.moi; }).length + ' mới';
  $('bl-proposal').innerHTML = moiNhat.length ? moiNhat.map(function (p) {
    var bt = baiToan.filter(function (b) { return b.ma === p.baiToan; })[0];
    var them = p.thanhVien.length - 2;
    var avatar = p.thanhVien.slice(0, 2).map(function (tv, i) {
      var chu = tv.ten.replace(/^(PGS\.TS\.|TS\.|ThS\.)\s*/, '').split(' ').slice(-2).map(function (x) { return x[0]; }).join('').toUpperCase();
      return '<div class="w-8 h-8 rounded-full ' + (i === 0 ? p.mau : 'bg-surface-container-highest text-on-surface') + ' font-code-sm text-code-sm flex items-center justify-center ring-2 ring-surface-container-lowest font-semibold">' + esc(chu) + '</div>';
    }).join('') + (them > 0 ? '<div class="w-8 h-8 rounded-full bg-primary-container text-on-primary font-code-sm text-code-sm flex items-center justify-center ring-2 ring-surface-container-lowest font-semibold">+' + them + '</div>' : '');
    return '<article class="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col md:flex-row md:items-center justify-between gap-space-md">' +
      '<div class="flex items-start gap-space-md min-w-0"><div class="flex -space-x-2 shrink-0 pt-0.5">' + avatar + '</div>' +
      '<div class="flex flex-col gap-0.5 min-w-0"><div class="flex items-center gap-space-sm">' +
      '<span class="font-title-md text-title-md text-brand-hero-dark font-semibold">' + esc(p.nhom) + '</span>' +
      (p.moi ? '<span class="w-1.5 h-1.5 rounded-full bg-status-error" title="Mới"></span>' : '') + '</div>' +
      '<p class="font-body-md text-body-md text-on-surface truncate">' + esc(p.tieuDe.replace(/^Proposal:\s*/, '')) + '</p>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant truncate">Cho bài toán <a class="font-medium text-primary hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '">' +
      esc(p.baiToan + (bt ? ' · ' + bt.tieuDe : '')) + '</a></p>' +
      '<span class="font-label-sm text-label-sm text-text-muted">' + esc(p.nguoiGui + ' · ' + p.thoiGian) + '</span></div></div>' +
      '<div class="flex items-center gap-space-sm shrink-0 self-end md:self-center">' +
      nut('08_hop-thu-ket-noi.html?proposal=' + encodeURIComponent(p.id), LOP_NUT, 'Xem proposal') + '</div></article>';
  }).join('') : '<p class="p-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-text-muted">Không có proposal nào đang chờ phản hồi.</p>';

  // ---------- Không gian đàm phán ----------
  var CHIP_PHONG = {
    'cho-xac-nhan': 'bg-status-warning/15 text-amber-900',
    'cho-doi-tac': 'bg-brand-light-blue text-primary',
    'dang-trao-doi': 'bg-secondary-fixed text-on-secondary-container',
    'da-ky': 'bg-tertiary-fixed text-tertiary'
  };
  var THU_TU_PHONG = { 'cho-xac-nhan': 0, 'dang-trao-doi': 1, 'cho-doi-tac': 2, 'da-ky': 3 };
  var dsPhong = phong.slice().sort(function (a, b) { return THU_TU_PHONG[a.trangThai] - THU_TU_PHONG[b.trangThai]; });
  $('bl-tat-ca-phong').textContent = 'Tất cả (' + phong.length + ')';
  $('bl-dam-phan').innerHTML = dsPhong.slice(0, 3).map(function (ph) {
    var dangCho = D.BUOC_PHONG.filter(function (b) { return !D.buocXong(ph.buoc[b.id]); })[0];
    var moTa = ph.trangThai === 'da-ky' ? 'Đã ký kết · ' + (ph.baiToan && ph.baiToan.duAn ? ph.baiToan.duAn.soHopDong : ph.p.baiToan) : (dangCho ? 'Bước hiện tại: ' + dangCho.ten : '');
    return '<div class="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-2">' +
      '<div class="flex items-start justify-between gap-space-sm"><div class="flex flex-col min-w-0">' +
      '<span class="font-title-md text-title-md text-brand-hero-dark font-semibold truncate">' + esc(ph.p.nhom) + '</span>' +
      '<span class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2" title="' + esc(ph.baiToan ? ph.baiToan.tieuDe : '') + '">' + esc(ph.p.baiToan + ' · ' + moTa) + '</span></div>' +
      '<span class="px-2 py-0.5 rounded-full ' + CHIP_PHONG[ph.trangThai] + ' font-label-sm text-label-sm shrink-0">' + esc(D.TRANG_THAI_PHONG[ph.trangThai].ten) + '</span></div>' +
      '<div class="flex items-center justify-between gap-2">' +
      (ph.chuaDoc ? '<a class="font-label-sm text-label-sm text-status-error hover:underline" href="16_phong-dam-phan.html?phong=' + encodeURIComponent(ph.id) + '#trao-doi">' + ph.chuaDoc + ' tin nhắn chưa đọc</a>' : '<span></span>') +
      '<a class="font-label-md text-label-md text-primary hover:text-secondary flex items-center gap-0.5 font-semibold" href="16_phong-dam-phan.html?phong=' + encodeURIComponent(ph.id) + '">' +
      '<span>Mở</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span></a></div></div>';
  }).join('') || '<p class="font-body-sm text-body-sm text-text-muted">Chưa có phòng đàm phán.</p>';
})();
