// DN-08 Hộp thư kết nối: proposal gửi tới các bài toán R&D của doanh nghiệp.
//   - 4 tab theo trạng thái proposal: Chờ phản hồi / Đã hẹn trao đổi / Chuyển đàm phán / Đã từ chối
//   - Thanh lọc: chọn điều kiện rồi bấm "Lọc" (hoặc Enter ở ô tìm kiếm) mới áp dụng
//   - Từ chối (có hoàn tác), Hẹn trao đổi (hộp chọn lịch), Chấp nhận → mở đúng thẻ ở Không gian đàm phán (DN-09)
//   ?bai-toan=<mã>  lọc sẵn theo bài toán (nút "Xem proposal" ở DN-04 / DN-15)
//   ?proposal=<id>  chọn sẵn một proposal (tự chuyển sang tab chứa nó)
// Chưa có API: thay đổi trạng thái lưu tạm bằng DnBaiToan.capNhatProposal() (localStorage).
// Cần dn-bai-toan-data.js nạp trước.
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var dsEl = document.getElementById('ds-proposal');
  var chiTietEl = document.getElementById('chi-tiet-proposal');
  var thanhNut = document.getElementById('thanh-nut-proposal');
  var formLoc = document.getElementById('form-loc-hop-thu');
  if (!D || !dsEl || !chiTietEl || !formLoc) return;
  var esc = D.escapeHtml;
  var $ = function (id) { return document.getElementById(id); };

  var oTim = $('loc-tim');
  var chonBaiToan = $('loc-bai-toan');
  var chonNguon = $('loc-nguon');
  var chonLinhVuc = $('loc-linh-vuc');
  var chonSapXep = $('loc-sap-xep');
  var cacTab = Array.prototype.slice.call(document.querySelectorAll('[data-tab-ht]'));

  var LOP_TAB_BAT = ['text-primary', 'font-bold', 'border-primary'];
  var LOP_TAB_TAT = ['text-text-muted', 'hover:text-on-surface', 'border-transparent'];
  var LOP_CHON = 'bg-blue-50/70 border-l-4 border-l-primary-container border-y border-r border-border-subtle rounded-r-lg p-4 shadow-sm';
  var LOP_THUONG = 'bg-surface-container-lowest border border-border-subtle rounded-lg p-4 shadow-xs hover:border-primary-fixed-dim hover:bg-surface-container-low';

  var tatCaBaiToan = D.layTatCa();
  function baiToan(ma) { return tatCaBaiToan.filter(function (b) { return b.ma === ma; })[0] || null; }

  // ---------- Đổ danh mục vào bộ lọc ----------
  chonBaiToan.insertAdjacentHTML('beforeend', tatCaBaiToan.map(function (b) {
    var ghiChu = b.trangThai === 'nhap' ? ' (bản nháp)' : (b.trangThai === 'cho-duyet' ? ' (chờ duyệt)' : '');
    var ten = b.tieuDe.length > 48 ? b.tieuDe.slice(0, 46) + '…' : b.tieuDe;
    return '<option value="' + esc(b.ma) + '">' + esc(b.ma + ' · ' + ten + ghiChu) + '</option>';
  }).join(''));
  chonLinhVuc.insertAdjacentHTML('beforeend', D.LINH_VUC.map(function (lv) {
    return '<option value="' + lv.id + '">' + esc(lv.ngan) + '</option>';
  }).join(''));

  // ---------- Trạng thái trang ----------
  var thamSo = new URLSearchParams(window.location.search);
  var boLoc = { q: '', baiToan: thamSo.get('bai-toan') || '', nguon: '', linhVuc: '', sapXep: 'moi-nhat' };
  var tab = 'cho-phan-hoi';
  var idChon = thamSo.get('proposal') || '';
  if (boLoc.baiToan && !baiToan(boLoc.baiToan)) boLoc.baiToan = '';

  // ?tab=<trạng thái> mở sẵn một tab (nút "Mở từ Hộp thư kết nối" ở DN-09 dùng ?tab=dam-phan)
  if (D.TRANG_THAI_PROPOSAL[thamSo.get('tab')]) tab = thamSo.get('tab');
  var pChon = idChon ? D.layProposal(idChon) : null;
  if (pChon) tab = pChon.trangThai;

  function dongBoOLoc() {
    oTim.value = boLoc.q;
    chonBaiToan.value = boLoc.baiToan;
    chonNguon.value = boLoc.nguon;
    chonLinhVuc.value = boLoc.linhVuc;
    chonSapXep.value = boLoc.sapXep;
    $('loc-chua-ap-dung').classList.add('hidden');
  }

  function docOLoc() {
    return { q: oTim.value.trim(), baiToan: chonBaiToan.value, nguon: chonNguon.value, linhVuc: chonLinhVuc.value, sapXep: chonSapXep.value };
  }

  function khopBoLoc(p) {
    var bt = baiToan(p.baiToan);
    if (boLoc.baiToan && p.baiToan !== boLoc.baiToan) return false;
    if (boLoc.nguon && p.nguon !== boLoc.nguon) return false;
    if (boLoc.linhVuc && (!bt || bt.linhVuc !== boLoc.linhVuc)) return false;
    if (!boLoc.q) return true;
    var chu = D.chuanHoa([p.nguoiGui, p.nhom, p.tieuDe, p.baiToan, bt ? bt.tieuDe : '', p.the.join(' ')].join(' '));
    return D.chuanHoa(boLoc.q).split(/\s+/).filter(Boolean).every(function (tu) { return chu.indexOf(tu) !== -1; });
  }

  function sapXep(ds) {
    return ds.sort(function (a, b) {
      if (boLoc.sapXep === 'phu-hop') return b.phuHop - a.phuHop;
      if (boLoc.sapXep === 'uu-tien') {
        // Proposal mới trước, trong cùng nhóm thì chờ lâu nhất lên đầu
        if (a.moi !== b.moi) return a.moi ? -1 : 1;
        return b.phutTruoc - a.phutTruoc;
      }
      return a.phutTruoc - b.phutTruoc;
    });
  }

  function dsDaLoc() { return D.layDanhSachProposal().filter(khopBoLoc); }
  function dsTrongTab() { return sapXep(dsDaLoc().filter(function (p) { return p.trangThai === tab; })); }

  // ---------- Vẽ ----------
  function veThongKe() {
    var tatCa = D.layDanhSachProposal();
    var cho = tatCa.filter(function (p) { return p.trangThai === 'cho-phan-hoi'; }).length;
    var daPhanHoi = tatCa.length - cho;
    var pt = Math.round(daPhanHoi / tatCa.length * 100);
    $('ht-da-phan-hoi').textContent = 'Proposal đã phản hồi: ' + daPhanHoi + '/' + tatCa.length;
    $('ht-phan-tram').textContent = pt + '%';
    $('ht-thanh').style.width = pt + '%';
    $('ht-con-cho').textContent = 'Còn ' + cho + ' proposal chờ phản hồi';
  }

  function veTab() {
    var ds = dsDaLoc();
    cacTab.forEach(function (t) {
      var ma = t.getAttribute('data-tab-ht');
      var bat = ma === tab;
      t.setAttribute('aria-selected', bat ? 'true' : 'false');
      LOP_TAB_BAT.forEach(function (c) { t.classList.toggle(c, bat); });
      LOP_TAB_TAT.forEach(function (c) { t.classList.toggle(c, !bat); });
      var dem = t.querySelector('[data-dem]');
      dem.textContent = ds.filter(function (p) { return p.trangThai === ma; }).length;
      dem.className = 'px-2 py-0.5 text-[10px] rounded-xl ' + (bat ? 'font-bold bg-primary-fixed text-on-primary-fixed-variant' : 'font-semibold bg-surface-container text-on-surface-variant');
    });
  }

  function dongPhu(p) {
    if (p.trangThai === 'da-hen' && p.lichHen) {
      return '<span class="flex items-center gap-1 text-secondary font-medium"><span class="material-symbols-outlined text-[13px]">event</span>' +
        esc(D.dinhDangNgay(p.lichHen.ngay) + ' · ' + p.lichHen.gio) + '</span>';
    }
    return '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">schedule</span>' + esc(p.thoiGian) + '</span>';
  }

  function veDanhSach() {
    var ds = dsTrongTab();
    var html = '';
    if (boLoc.baiToan) {
      var bt = baiToan(boLoc.baiToan);
      var chuaCongKhai = bt && (bt.trangThai === 'nhap' || bt.trangThai === 'cho-duyet');
      html += '<div class="' + (chuaCongKhai ? 'bg-status-warning/10 border-status-warning/30' : 'bg-secondary-fixed/40 border-secondary-fixed') + ' border rounded-lg px-4 py-3 flex items-start justify-between gap-3">' +
        '<div class="min-w-0 text-xs text-on-surface"><span class="block font-bold ' + (chuaCongKhai ? 'text-on-surface' : 'text-secondary') + '">Bài toán ' + esc(bt.ma) + ' · ' + esc(D.TRANG_THAI[bt.trangThai].tab) + '</span>' +
        '<span class="block mt-0.5 text-on-surface-variant line-clamp-2">' + esc(bt.tieuDe) + '</span>' +
        (chuaCongKhai ? '<span class="block mt-1 text-on-surface">Bài toán chưa công khai nên chưa nhận proposal.</span>' : '') +
        '<a class="inline-flex items-center gap-1 mt-1 text-primary font-semibold hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(bt.ma) + '">Xem chi tiết bài toán<span class="material-symbols-outlined text-[14px]">arrow_forward</span></a>' +
        '</div><button class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-xs font-semibold text-on-surface hover:bg-surface-container" type="button" data-bo-loc-bai-toan>' +
        '<span class="material-symbols-outlined text-[14px]">close</span>Bỏ lọc</button></div>';
    }
    html += ds.map(function (p) {
      var chon = p.id === idChon;
      return '<button class="w-full text-left cursor-pointer transition-all hover:shadow-md ' + (chon ? LOP_CHON : LOP_THUONG) + '" type="button" data-proposal="' + esc(p.id) + '"' +
        (chon ? ' aria-current="true"' : '') + '>' +
        '<div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2.5 min-w-0">' +
        '<div class="size-8 shrink-0 rounded-xl ' + p.mau + ' font-bold flex items-center justify-center text-xs">' + esc(p.kyHieu) + '</div>' +
        '<span class="text-xs font-bold text-on-surface truncate">' + esc(p.nguoiGui) + '</span></div>' +
        '<div class="flex items-center gap-1.5 shrink-0"><span class="bg-surface-container text-on-surface-variant text-[11px] px-2 py-0.5 rounded-xl font-medium">' + esc(p.quyMo) + '</span>' +
        (p.moi && p.trangThai === 'cho-phan-hoi' ? '<span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-xl">Mới</span>' : '') + '</div></div>' +
        '<h3 class="font-bold text-on-surface text-xs mt-2 line-clamp-1 leading-snug">' + esc(p.tieuDe) + '</h3>' +
        '<div class="text-[11px] text-text-muted mt-2.5 flex items-center justify-between gap-2 pt-2 border-t ' + (chon ? 'border-blue-200/60' : 'border-border-subtle') + '">' +
        '<span class="truncate">' + esc(p.dongPhu || (p.baiToan + ' · ' + p.nhom)) + '</span>' + dongPhu(p) + '</div></button>';
    }).join('');
    if (!ds.length) {
      html += '<div class="bg-surface-container-lowest border border-border-subtle rounded-lg p-6 text-center text-xs text-text-muted">' +
        'Không có proposal nào ở tab "' + esc(D.TRANG_THAI_PROPOSAL[tab]) + '" khớp bộ lọc.</div>';
    }
    html += '<div class="text-center pt-2"><span class="text-xs text-text-muted font-medium">Hiển thị ' + ds.length + ' proposal · ' + esc(D.TRANG_THAI_PROPOSAL[tab]) + '</span></div>';
    dsEl.innerHTML = html;
  }

  function khoiTrangThai(p) {
    if (p.trangThai === 'da-hen' && p.lichHen) {
      var h = p.lichHen;
      return '<div class="mt-5 rounded-lg bg-secondary-fixed/40 border border-secondary-fixed px-4 py-3 text-xs flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px] text-secondary">event</span><div><p class="font-bold text-on-surface">Đã hẹn trao đổi: ' +
        esc(D.dinhDangNgay(h.ngay) + ' · ' + h.gio) + '</p><p class="text-on-surface-variant mt-0.5">' + esc(h.hinhThuc) + (h.ghiChu ? ' · ' + esc(h.ghiChu) : '') + '</p></div></div>';
    }
    if (p.trangThai === 'tu-choi') {
      return '<div class="mt-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px] text-status-error">block</span><div><p class="font-bold text-on-surface">Đã từ chối proposal này</p>' +
        '<p class="text-on-surface-variant mt-0.5">' + esc(p.lyDoTuChoi || 'Doanh nghiệp đã từ chối trên Hộp thư kết nối.') + '</p></div></div>';
    }
    if (p.trangThai === 'dam-phan') {
      return '<div class="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs flex items-start gap-2">' +
        '<span class="material-symbols-outlined text-[18px] text-emerald-700">handshake</span><div><p class="font-bold text-on-surface">Đã chấp nhận, đang ở Không gian đàm phán</p>' +
        '<p class="text-on-surface-variant mt-0.5">Trao đổi kỹ thuật, NDA &amp; IP tiếp tục ở phòng đàm phán của proposal này.</p></div></div>';
    }
    return '';
  }

  function veChiTiet() {
    var p = D.layProposal(idChon);
    if (!p || p.trangThai !== tab || !khopBoLoc(p)) p = null;
    if (!p) {
      chiTietEl.innerHTML = '<div class="py-16 text-center text-xs text-text-muted flex flex-col items-center gap-2">' +
        '<span class="material-symbols-outlined text-[36px]">inbox</span>Chọn một proposal ở danh sách bên trái để xem chi tiết.</div>';
      thanhNut.classList.add('hidden');
      return;
    }
    var bt = baiToan(p.baiToan);
    var laGV = !p.mssv;
    var tep = p.tep.map(function (t, i) {
      return '<div class="flex items-center justify-between p-3 rounded border border-border-subtle bg-surface-container-low hover:bg-surface-container transition-colors">' +
        '<div class="flex items-center gap-3 overflow-hidden"><div class="size-8 rounded-sm bg-red-100 text-status-error flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">picture_as_pdf</span></div><div class="overflow-hidden">' +
        '<p class="text-xs font-bold text-on-surface truncate" title="' + esc(t.ten) + '">' + esc(t.ten) + '</p>' +
        '<p class="text-[10px] text-text-muted">' + esc(t.kichThuoc) + ' · ' + esc(t.loai) + '</p></div></div>' +
        '<div class="flex items-center gap-1 shrink-0">' +
        '<button class="p-1.5 text-on-surface-variant hover:text-primary rounded-sm hover:bg-white" type="button" title="Xem trước tài liệu" aria-label="Xem ' + esc(t.ten) + '" data-xem-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">visibility</span></button>' +
        '<button class="p-1.5 text-on-surface-variant hover:text-primary rounded-sm hover:bg-white" type="button" title="Tải xuống" aria-label="Tải ' + esc(t.ten) + '" data-tai-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">download</span></button>' +
        '</div></div>';
    }).join('');
    var thanhVien = p.thanhVien.map(function (tv, i) {
      return '<div class="flex items-center justify-between p-2.5 rounded border border-border-subtle bg-surface-container-lowest">' +
        '<div class="flex items-center gap-3"><div class="size-7 rounded-xl ' + (i === 0 ? p.mau : 'bg-surface-container text-on-surface') + ' font-bold flex items-center justify-center text-[11px]">' + (i + 1) + '</div>' +
        '<div><p class="text-xs font-bold text-on-surface">' + esc(tv.ten) + (tv.truongNhom ? ' <span class="text-primary font-normal text-[11px]">(Trưởng nhóm)</span>' : '') + '</p>' +
        '<p class="text-[11px] text-text-muted">' + (tv.mssv ? 'MSSV: ' + esc(tv.mssv) + ' · ' : '') + esc(tv.vaiTro) + '</p></div></div>' +
        (tv.gpa ? '<span class="text-xs font-semibold text-secondary">GPA: ' + esc(tv.gpa) + '</span>' : '') + '</div>';
    }).join('');

    chiTietEl.innerHTML =
      '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border-subtle">' +
      '<div class="flex items-start gap-4"><div class="size-14 rounded-xl ' + p.mau + ' font-bold flex items-center justify-center text-lg shrink-0">' + esc(p.kyHieu) + '</div>' +
      '<div class="space-y-1"><div class="flex items-center gap-2 flex-wrap"><h2 class="text-base font-bold text-on-surface">' + esc(p.nguoiGui) + '</h2>' +
      '<span class="material-symbols-outlined text-secondary text-[18px]" style="font-variation-settings: \'FILL\' 1;">verified</span>' +
      (p.huyHieu ? '<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-xl">' + esc(p.huyHieu) + '</span>' : '') + '</div>' +
      '<p class="text-xs text-text-muted leading-tight">' + esc(laGV ? p.gioiThieu : 'MSSV: ' + p.mssv + ' · ' + p.khoa + ' · ' + p.lop) + '</p>' +
      (laGV ? '' : '<div class="flex items-center gap-3 pt-1 text-xs"><span class="font-bold text-primary">GPA: ' + esc(p.gpa) + ' / 10</span><span class="text-text-muted">•</span>' +
        '<span class="text-text-muted">Điểm rèn luyện: <strong class="text-on-surface font-semibold">' + esc(p.drl) + '</strong></span></div>') +
      '</div></div>' +
      '<div class="flex sm:flex-col items-end gap-2 shrink-0"><span class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl text-xs font-semibold">' +
      esc(p.nhom === 'Cá nhân' ? 'Cá nhân' : p.nhom + ' (' + p.thanhVien.length + ' người)') + '</span>' +
      '<span class="text-[11px] text-text-muted">Mức phù hợp: <strong class="text-on-surface">' + esc(p.phuHop) + '%</strong></span></div></div>' +

      khoiTrangThai(p) +

      '<div class="py-5 border-b border-border-subtle space-y-3"><div class="flex items-center justify-between gap-2">' +
      '<span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Proposal giải pháp</span>' +
      '<a class="text-xs text-secondary font-semibold bg-secondary-fixed/50 px-2.5 py-0.5 rounded-xl hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '" title="' + esc(bt ? bt.tieuDe : '') + '">Bài toán ' + esc(p.baiToan) + '</a></div>' +
      '<h3 class="text-base font-bold text-on-surface leading-snug">' + esc(p.tieuDe.replace(/^Proposal:\s*/, '')) + '</h3>' +
      (bt ? '<p class="text-[11px] text-text-muted">Gửi tới bài toán: <a class="text-primary hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(bt.ma) + '">' + esc(bt.tieuDe) + '</a></p>' : '') +
      '<p class="text-xs text-on-surface-variant leading-relaxed">' + esc(p.noiDung) + '</p>' +
      '<div class="flex flex-wrap gap-2 pt-1">' + p.the.map(function (t) {
        return '<span class="px-2.5 py-1 bg-surface-container text-on-surface-variant text-[11px] rounded font-medium border border-border-subtle">' + esc(t) + '</span>';
      }).join('') + '<span class="px-2.5 py-1 bg-tertiary-container/10 text-tertiary font-bold text-[11px] rounded border border-tertiary-container/30">' + esc(p.trl) + '</span></div></div>' +

      '<div class="py-5 border-b border-border-subtle space-y-2"><span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Thư giới thiệu gửi doanh nghiệp</span>' +
      '<div class="bg-brand-surface border border-border-subtle rounded p-4 text-xs text-on-surface-variant leading-relaxed space-y-2.5">' +
      '<p class="font-medium text-on-surface">Kính gửi Ban Công nghệ V-Tech Global,</p>' +
      p.thu.map(function (dong) { return '<p>' + esc(dong) + '</p>'; }).join('') +
      '<p class="font-medium text-on-surface pt-1">Trân trọng cảm ơn Quý doanh nghiệp!</p></div></div>' +

      '<div class="py-5 border-b border-border-subtle space-y-3"><div class="flex items-center justify-between gap-2">' +
      '<span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Tài liệu đính kèm (' + p.tep.length + ')</span>' +
      '<span class="text-[10px] text-text-muted" title="Chưa có kho tệp: hệ thống tạo tệp PDF minh họa">Tệp minh họa (bản demo)</span></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + tep + '</div></div>' +

      '<div class="pt-5 space-y-3"><span class="text-[11px] font-bold uppercase tracking-wider text-text-muted">' +
      (p.thanhVien.length > 1 ? 'Thành viên (' + p.thanhVien.length + ' người)' : 'Người gửi') + '</span>' +
      '<div class="space-y-2">' + thanhVien + '</div></div>';

    veThanhNut(p);
  }

  // Nút thao tác theo trạng thái proposal; mỗi nút có màu nền riêng
  var LOP_TU_CHOI = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer';
  var LOP_HEN = 'px-4 py-2 bg-secondary hover:bg-on-secondary-container text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer';
  var LOP_CHAP_NHAN = 'px-6 py-2 bg-primary-container hover:bg-brand-navy-dark text-white rounded text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer';
  function nutHtml(lop, icon, chu, hanhDong) {
    return '<button class="' + lop + '" type="button" data-hanh-dong-ht="' + hanhDong + '"><span class="material-symbols-outlined text-[18px]">' + icon + '</span><span>' + esc(chu) + '</span></button>';
  }
  function veThanhNut(p) {
    var trai = '', phai = '';
    if (p.trangThai === 'cho-phan-hoi' || p.trangThai === 'da-hen') {
      trai = nutHtml(LOP_TU_CHOI, 'close', 'Từ chối', 'tu-choi');
      phai = nutHtml(LOP_HEN, 'calendar_month', p.trangThai === 'da-hen' ? 'Đổi lịch hẹn' : 'Hẹn trao đổi', 'hen') +
        nutHtml(LOP_CHAP_NHAN, 'check', 'Chấp nhận & mở đàm phán', 'chap-nhan');
    } else if (p.trangThai === 'dam-phan') {
      phai = '<a class="' + LOP_HEN + '" href="09_khong-gian-dam-phan.html#' + esc(p.dpId) + '"><span class="material-symbols-outlined text-[18px]">view_agenda</span><span>Xem trong danh sách</span></a>' +
        '<a class="' + LOP_CHAP_NHAN + '" href="16_phong-dam-phan.html?phong=' + encodeURIComponent(p.dpId) + '"><span class="material-symbols-outlined text-[18px]">meeting_room</span><span>Vào phòng đàm phán</span></a>';
    } else if (p.trangThai === 'tu-choi') {
      phai = nutHtml(LOP_HEN, 'undo', 'Hoàn tác từ chối', 'hoan-tac');
    }
    thanhNut.innerHTML = '<div class="flex items-center gap-2.5">' + trai + '</div><div class="flex flex-wrap items-center justify-end gap-2.5">' + phai + '</div>';
    thanhNut.classList.remove('hidden');
  }

  function veLai() {
    // Giữ proposal đang chọn nếu còn trong tab, không thì chọn proposal đầu tiên
    var ds = dsTrongTab();
    if (!ds.some(function (p) { return p.id === idChon; })) idChon = ds.length ? ds[0].id : '';
    veThongKe();
    veTab();
    veDanhSach();
    veChiTiet();
  }

  function ghiUrl() {
    if (!history.replaceState) return;
    var q = new URLSearchParams();
    if (boLoc.baiToan) q.set('bai-toan', boLoc.baiToan);
    if (idChon) q.set('proposal', idChon);
    var s = q.toString();
    history.replaceState(null, '', window.location.pathname + (s ? '?' + s : ''));
  }

  // ---------- Thao tác ----------
  function canhBaoKhongLuu() { D.thongBao('Không lưu được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); }

  function tuChoi(p) {
    var truoc = p.trangThai;
    if (!D.capNhatProposal(p.id, { trangThai: 'tu-choi', trangThaiTruoc: truoc })) { canhBaoKhongLuu(); return; }
    veLai();
    ghiUrl();
    D.thongBao('Đã từ chối proposal của ' + p.nhom + ' (' + p.nguoiGui + ') cho bài toán ' + p.baiToan + '.', null, {
      chu: 'Hoàn tác',
      lam: function () { D.capNhatProposal(p.id, { trangThai: truoc }); idChon = p.id; veLai(); ghiUrl(); }
    });
  }

  function hoanTac(p) {
    var ve = p.trangThaiTruoc || 'cho-phan-hoi';
    if (!D.capNhatProposal(p.id, { trangThai: ve })) { canhBaoKhongLuu(); return; }
    tab = ve;
    idChon = p.id;
    veLai();
    ghiUrl();
    D.thongBao('Đã đưa proposal của ' + p.nhom + ' về tab "' + D.TRANG_THAI_PROPOSAL[ve] + '".');
  }

  function chapNhan(p) {
    if (!D.capNhatProposal(p.id, { trangThai: 'dam-phan', trangThaiTruoc: p.trangThai })) { canhBaoKhongLuu(); return; }
    window.location.href = '09_khong-gian-dam-phan.html?tu-hop-thu=' + encodeURIComponent(p.id) + '#' + encodeURIComponent(p.dpId);
  }

  // ---------- Hộp thoại hẹn trao đổi ----------
  var hop = null;
  var oTruocHop = null;
  function taoHop() {
    hop = document.createElement('div');
    hop.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4 bg-slate-900/40';
    hop.id = 'hop-hen';
    hop.innerHTML = '<form class="w-full max-w-md bg-white rounded-xl shadow-md border border-border-subtle p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="hop-hen-tieu-de" novalidate>' +
      '<div class="flex items-start justify-between gap-3"><div><h3 class="text-base font-bold text-on-surface" id="hop-hen-tieu-de">Hẹn trao đổi</h3>' +
      '<p class="text-xs text-text-muted mt-0.5" data-hen-voi></p></div>' +
      '<button class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-container" type="button" aria-label="Đóng" data-dong-hop><span class="material-symbols-outlined text-[20px]">close</span></button></div>' +
      '<div class="grid grid-cols-2 gap-3"><label class="text-xs font-semibold text-on-surface space-y-1"><span>Ngày *</span>' +
      '<input class="w-full px-3 py-2 text-xs bg-brand-surface border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-primary" type="date" name="ngay" required></label>' +
      '<label class="text-xs font-semibold text-on-surface space-y-1"><span>Giờ *</span>' +
      '<input class="w-full px-3 py-2 text-xs bg-brand-surface border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-primary" type="time" name="gio" required></label></div>' +
      '<label class="block text-xs font-semibold text-on-surface space-y-1"><span>Hình thức</span>' +
      '<select class="w-full px-3 py-2 text-xs bg-brand-surface border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-primary" name="hinhThuc">' +
      '<option>Trực tuyến (Google Meet)</option><option>Trực tuyến (MS Teams)</option><option>Tại văn phòng V-Tech Global</option><option>Tại UIT</option></select></label>' +
      '<label class="block text-xs font-semibold text-on-surface space-y-1"><span>Nội dung trao đổi</span>' +
      '<input class="w-full px-3 py-2 text-xs bg-brand-surface border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-primary" type="text" name="ghiChu" maxlength="150" placeholder="VD: Thống nhất phạm vi dữ liệu thử nghiệm"></label>' +
      '<p class="hidden text-xs text-status-error" data-loi-hen></p>' +
      '<div class="flex justify-end gap-2 pt-2"><button class="px-4 py-2 border border-border-subtle text-on-surface hover:bg-surface-container rounded text-xs font-semibold" type="button" data-dong-hop>Hủy</button>' +
      '<button class="' + LOP_HEN + '" type="submit"><span class="material-symbols-outlined text-[18px]">event_available</span><span>Lưu lịch hẹn</span></button></div></form>';
    document.body.appendChild(hop);
    hop.addEventListener('click', function (e) {
      if (e.target === hop || e.target.closest('[data-dong-hop]')) dongHop();
    });
    hop.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongHop(); });
    hop.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var p = D.layProposal(hop.getAttribute('data-proposal'));
      var ngay = f.ngay.value, gio = f.gio.value;
      var loi = '';
      if (!ngay || !gio) loi = 'Chọn ngày và giờ hẹn.';
      else if (ngay < D.homNay()) loi = 'Ngày hẹn không được trước hôm nay.';
      else if (ngay === D.homNay()) {
        var d = new Date();
        var bayGio = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        if (gio <= bayGio) loi = 'Giờ hẹn đã qua.';
      }
      var oLoi = hop.querySelector('[data-loi-hen]');
      oLoi.textContent = loi;
      oLoi.classList.toggle('hidden', !loi);
      if (loi || !p) return;
      var lichHen = { ngay: ngay, gio: gio, hinhThuc: f.hinhThuc.value, ghiChu: f.ghiChu.value.trim() };
      if (!D.capNhatProposal(p.id, { trangThai: 'da-hen', trangThaiTruoc: p.trangThai, lichHen: lichHen })) { canhBaoKhongLuu(); return; }
      dongHop();
      veLai();
      ghiUrl();
      D.thongBao('Đã hẹn trao đổi với ' + p.nhom + ' lúc ' + gio + ' ngày ' + D.dinhDangNgay(ngay) + '. Proposal chuyển sang tab "Đã hẹn trao đổi".');
    });
  }
  function moHop(p) {
    if (!hop) taoHop();
    oTruocHop = document.activeElement;
    var f = hop.querySelector('form');
    f.reset();
    f.ngay.min = D.homNay();
    if (p.lichHen) {
      f.ngay.value = p.lichHen.ngay; f.gio.value = p.lichHen.gio;
      f.hinhThuc.value = p.lichHen.hinhThuc; f.ghiChu.value = p.lichHen.ghiChu || '';
    }
    hop.querySelector('[data-hen-voi]').textContent = p.nhom + ' · ' + p.nguoiGui + ' · bài toán ' + p.baiToan;
    hop.querySelector('[data-loi-hen]').classList.add('hidden');
    hop.setAttribute('data-proposal', p.id);
    hop.classList.remove('hidden');
    hop.classList.add('flex');
    f.ngay.focus();
  }
  function dongHop() {
    hop.classList.add('hidden');
    hop.classList.remove('flex');
    if (oTruocHop && oTruocHop.focus) oTruocHop.focus();
  }

  // ---------- Sự kiện ----------
  thanhNut.addEventListener('click', function (e) {
    var nut = e.target.closest('[data-hanh-dong-ht]');
    if (!nut) return;
    var p = D.layProposal(idChon);
    if (!p) return;
    var hd = nut.getAttribute('data-hanh-dong-ht');
    if (hd === 'tu-choi') tuChoi(p);
    else if (hd === 'hen') moHop(p);
    else if (hd === 'chap-nhan') chapNhan(p);
    else if (hd === 'hoan-tac') hoanTac(p);
  });

  chiTietEl.addEventListener('click', function (e) {
    var nutXem = e.target.closest('[data-xem-tep]');
    var nutTai = e.target.closest('[data-tai-tep]');
    if (!nutXem && !nutTai) return;
    var p = D.layProposal(idChon);
    var t = p && p.tep[Number((nutXem || nutTai).getAttribute(nutXem ? 'data-xem-tep' : 'data-tai-tep'))];
    if (!t) return;
    var blob = D.taoPdfMau([
      'UIT Connect - Tai lieu minh hoa (ban demo)', '',
      'Ten tep: ' + t.ten,
      'Loai: ' + t.loai + ' - ' + t.kichThuoc,
      'Proposal: ' + p.tieuDe,
      'Nguoi gui: ' + p.nguoiGui + ' (' + p.nhom + ')',
      'Bai toan: ' + p.baiToan, '',
      'Chua co kho tep that tren may chu, day la tep tao tu dong de minh hoa.'
    ]);
    var url = URL.createObjectURL(blob);
    if (nutXem) {
      var w = window.open(url, '_blank');
      if (!w) D.thongBao('Trình duyệt chặn cửa sổ mới. Hãy cho phép cửa sổ bật lên hoặc dùng nút Tải xuống.', 'canh-bao');
    } else {
      var a = document.createElement('a');
      a.href = url;
      a.download = t.ten;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  });

  cacTab.forEach(function (t) {
    t.addEventListener('click', function () {
      tab = t.getAttribute('data-tab-ht');
      veLai();
      ghiUrl();
    });
  });

  dsEl.addEventListener('click', function (e) {
    if (e.target.closest('[data-bo-loc-bai-toan]')) {
      boLoc.baiToan = '';
      dongBoOLoc();
      veLai();
      ghiUrl();
      return;
    }
    var nut = e.target.closest('[data-proposal]');
    if (!nut) return;
    idChon = nut.getAttribute('data-proposal');
    veDanhSach();
    veChiTiet();
    ghiUrl();
    // Màn hẹp: khung chi tiết nằm dưới danh sách, cuộn xuống cho người dùng thấy
    if (window.innerWidth < 1024) chiTietEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Lọc chỉ áp dụng khi bấm "Lọc" / Enter; khi đang chỉnh thì nhắc "chưa áp dụng"
  formLoc.addEventListener('submit', function (e) {
    e.preventDefault();
    boLoc = docOLoc();
    $('loc-chua-ap-dung').classList.add('hidden');
    veLai();
    ghiUrl();
    var n = dsDaLoc().length;
    D.thongBao('Đã lọc: ' + n + ' proposal khớp điều kiện.');
  });
  function kiemTraChuaApDung() {
    var moi = docOLoc();
    var khac = Object.keys(moi).some(function (k) { return moi[k] !== boLoc[k]; });
    $('loc-chua-ap-dung').classList.toggle('hidden', !khac);
  }
  formLoc.addEventListener('input', kiemTraChuaApDung);
  formLoc.addEventListener('change', kiemTraChuaApDung);
  $('nut-dat-lai-loc').addEventListener('click', function () {
    boLoc = { q: '', baiToan: '', nguon: '', linhVuc: '', sapXep: 'moi-nhat' };
    dongBoOLoc();
    veLai();
    ghiUrl();
  });

  dongBoOLoc();
  veLai();
})();
