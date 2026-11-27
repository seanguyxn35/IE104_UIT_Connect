// DN-04 Bài toán R&D: dựng thẻ bài toán từ dữ liệu, tìm kiếm, lọc, sắp xếp, tab trạng thái.
// Cần dn-bai-toan-data.js nạp trước.
(function () {
  'use strict';
  var D = window.DnBaiToan;
  if (!D) return;
  var esc = D.escapeHtml;

  var dsThe = document.getElementById('ds-bai-toan');
  if (!dsThe) return;

  var oTim = document.getElementById('loc-tim-kiem');
  var chonLoai = document.getElementById('loc-loai');
  var chonLinhVuc = document.getElementById('loc-linh-vuc');
  var chonSapXep = document.getElementById('loc-sap-xep');
  var nutDatLai = document.getElementById('loc-dat-lai');
  var cacTab = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));

  var LOP_TAB_BAT = ['bg-brand-active-pill', 'text-brand-active-text', 'font-label-md', 'text-label-md', 'shadow-xs'];
  var LOP_TAB_TAT = ['text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-on-surface', 'font-body-md', 'text-body-md'];

  var trangThaiLoc = { tab: 'tat-ca', q: '', loai: '', linhVuc: '', sapXep: 'deadline' };

  // Đổ danh mục lĩnh vực vào bộ lọc (cùng danh mục với form đăng bài DN-05)
  if (chonLinhVuc) {
    chonLinhVuc.innerHTML = '<option value="">Lĩnh vực: Tất cả</option>' + D.LINH_VUC.map(function (lv) {
      return '<option value="' + lv.id + '">' + esc(lv.ngan) + '</option>';
    }).join('');
  }

  // Cho phép mở sẵn một tab: 04_bai-toan-rd.html?tab=nhap
  var thamSo = new URLSearchParams(window.location.search);
  if (thamSo.get('tab') && (thamSo.get('tab') === 'tat-ca' || D.TRANG_THAI[thamSo.get('tab')])) {
    trangThaiLoc.tab = thamSo.get('tab');
  }

  // ---------- Dựng từng phần của thẻ ----------
  function chip(lop, icon, chu) {
    return '<span class="px-2.5 py-0.5 rounded-full ' + lop + ' font-label-sm text-label-sm font-semibold flex items-center gap-1">' +
      (icon ? '<span class="material-symbols-outlined text-[13px]">' + icon + '</span>' : '<span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>') +
      esc(chu) + '</span>';
  }

  function meta(icon, chu, lop) {
    return '<div class="flex items-center gap-1 ' + (lop || '') + '"><span class="material-symbols-outlined text-[16px]' +
      (icon === 'paid' ? ' text-status-warning' : '') + '">' + icon + '</span>' + esc(chu) + '</div>';
  }

  var CHAM = '<span class="text-surface-dim">•</span>';

  function dongMeta(b) {
    var ns = D.dinhDangNganSach(b.nganSach);
    var phan = [];
    if (b.trangThai === 'nhap') {
      phan.push(ns ? meta('paid', ns, 'text-on-surface font-medium') : meta('money_off', 'Ngân sách: Chưa thiết lập', 'text-text-muted'));
      phan.push(meta('save', 'Lưu gần nhất: ' + D.dinhDangNgay(b.ngayLuu)));
    } else if (b.trangThai === 'cho-duyet') {
      if (ns) phan.push(meta('paid', ns, 'text-on-surface font-medium'));
      if (b.ngayDuKienMo) phan.push(meta('event', 'Dự kiến mở: ' + D.dinhDangNgay(b.ngayDuKienMo)));
      phan.push(meta('history', 'Nộp ngày: ' + D.dinhDangNgay(b.ngayNop || b.ngayLuu)));
    } else if (b.trangThai === 'dang-thuc-hien') {
      if (ns) phan.push(meta('paid', ns, 'text-on-surface font-medium'));
      if (b.ngayBatDau) phan.push(meta('calendar_today', D.dinhDangNgay(b.ngayBatDau) + (b.ngayKetThuc ? ' - ' + D.dinhDangNgay(b.ngayKetThuc) : '')));
      if (b.duAn) phan.push(meta('group', 'Đối tác: ' + b.duAn.doiTac, 'text-primary'));
    } else {
      if (ns) phan.push(meta('paid', ns, 'text-on-surface font-medium'));
      if (b.hanNop) {
        var con = D.soNgayToi(b.hanNop);
        if (b.trangThai === 'da-dong') phan.push(meta('event_busy', 'Đã đóng nhận: ' + D.dinhDangNgay(b.hanNop)));
        else if (con !== null && con <= 7) phan.push(meta('hourglass_top', 'Hạn nộp: ' + D.dinhDangNgay(b.hanNop) + (con >= 0 ? ' (còn ' + con + ' ngày)' : ' (đã qua)'), 'text-error'));
        else phan.push(meta('schedule', 'Hạn nộp: ' + D.dinhDangNgay(b.hanNop), 'text-on-surface-variant'));
      }
      if (b.diaDiem) phan.push(meta('location_on', b.diaDiem));
      else if (b.donVi) phan.push(meta('corporate_fare', b.donVi));
    }
    return phan.join(CHAM);
  }

  function cotGiua(b) {
    if (b.trangThai === 'dang-mo') {
      var p = b.proposal || { tong: 0, moi: 0, loiMoi: 0, nhom: [] };
      var avatar = (p.nhom || []).map(function (n) {
        return '<div class="inline-block h-8 w-8 rounded-full ' + n.mau + ' font-code-sm text-code-sm flex items-center justify-center shadow-xs" title="' + esc(n.ten) + '">' + esc(n.kyHieu) + '</div>';
      }).join('');
      return '<div class="lg:col-span-3 flex flex-col justify-between h-full bg-surface-container-low rounded-xl p-space-md">' +
        '<div><div class="flex items-center justify-between mb-1.5">' +
        '<span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Hồ sơ ứng tuyển</span>' +
        (p.moi ? '<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">' + p.moi + ' mới</span>' : '') +
        '</div><div class="font-headline-md text-headline-md text-primary mb-1">' + p.tong +
        ' <span class="font-body-md text-body-md font-normal text-on-surface-variant">proposals</span></div>' +
        '<p class="font-body-sm text-body-sm text-text-muted flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-secondary">send</span>' +
        p.loiMoi + ' lời mời kết nối đã gửi</p></div>' +
        (avatar ? '<div class="pt-space-md mt-space-xs flex items-center justify-between"><div class="flex -space-x-2 overflow-hidden">' + avatar +
          '</div><span class="font-label-sm text-label-sm text-text-muted">' + esc(p.ghiChu || '') + '</span></div>' :
          '<p class="pt-space-md font-body-sm text-body-sm text-text-muted">Chưa có nhóm nào nộp proposal.</p>') +
        '</div>';
    }
    if (b.trangThai === 'dang-thuc-hien') {
      var moc = b.moc || [];
      var daXong = moc.filter(function (m) { return m.trangThai === 'da-nghiem-thu'; });
      var dangLam = 0;
      moc.forEach(function (m, i) { if (m.trangThai === 'dang-thuc-hien') dangLam = i + 1; });
      var giaiNgan = daXong.reduce(function (t, m) { return t + (m.phanTram || 0); }, 0);
      var tien = b.nganSach ? Math.round(b.nganSach.max * giaiNgan / 100 * 1000000) : 0;
      return '<div class="lg:col-span-3 flex flex-col justify-between h-full bg-brand-light-blue/60 rounded-xl p-space-md">' +
        '<div><div class="flex items-center justify-between mb-1.5">' +
        '<span class="font-label-sm text-label-sm text-brand-navy-dark uppercase tracking-wider font-semibold">Tiến độ dự án</span>' +
        '<span class="font-code-sm text-code-sm font-bold text-secondary">Milestone ' + (dangLam || daXong.length) + '/' + moc.length + '</span></div>' +
        '<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-2"><div class="bg-secondary h-full rounded-full" style="width:' + giaiNgan + '%"></div></div>' +
        '<div class="font-body-sm text-body-sm text-on-surface mb-1 flex items-center justify-between"><span>Đã giải ngân:</span>' +
        '<span class="font-label-md text-label-md text-primary">' + giaiNgan + '% (' + tien.toLocaleString('vi-VN') + ' đ)</span></div></div>' +
        (daXong.length ? '<div class="pt-space-sm mt-space-xs font-label-sm text-label-sm text-brand-navy-dark flex items-center gap-1">' +
          '<span class="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>Đã nghiệm thu Milestone ' + daXong.length + ' (' + esc(daXong[daXong.length - 1].ten) + ')</div>' : '') +
        '</div>';
    }
    if (b.trangThai === 'cho-duyet') {
      return '<div class="lg:col-span-3 flex flex-col justify-center h-full bg-status-warning/10 rounded-xl p-space-md">' +
        '<div class="flex items-start gap-space-sm text-on-surface"><span class="material-symbols-outlined text-[20px] text-status-warning shrink-0 mt-0.5">verified_user</span>' +
        '<div><div class="font-label-md text-label-md mb-1">Ban Quản lý UIT đang thẩm định' + (b.daSua ? ' bản đã sửa' : '') + '</div>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">Đang rà soát nội dung kỹ thuật & tiêu chuẩn bảo mật dữ liệu doanh nghiệp. Trong lúc chờ duyệt không sửa được nội dung.</p>' +
        '</div></div></div>';
    }
    if (b.trangThai === 'nhap') {
      var td = b.tienDoSoanThao || 0;
      return '<div class="lg:col-span-3 flex flex-col justify-between h-full bg-surface-container-low rounded-xl p-space-md">' +
        '<div><div class="flex items-center justify-between mb-1.5">' +
        '<span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Trạng thái soạn thảo</span>' +
        '<span class="font-code-sm text-code-sm text-on-surface-variant font-bold">' + td + '%</span></div>' +
        '<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-2"><div class="bg-primary-container h-full rounded-full" style="width:' + td + '%"></div></div>' +
        '<p class="font-body-sm text-body-sm text-text-muted">Bản nháp cá nhân (chưa gửi Ban Quản lý duyệt).</p></div>' +
        '<div class="pt-space-sm font-label-sm text-label-sm text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[15px]">info</span>' +
        (b.luuCucBo ? 'Lưu tạm trên trình duyệt này' : 'Dữ liệu mẫu') + '</div></div>';
    }
    return '<div class="lg:col-span-3 flex flex-col justify-center h-full bg-surface-container-low rounded-xl p-space-md">' +
      '<p class="font-body-sm text-body-sm text-text-muted">Bài toán đã đóng, không nhận thêm proposal.</p></div>';
  }

  var LOP_NUT_CHINH = 'w-full h-10 px-space-md rounded-lg bg-primary-container text-on-primary hover:bg-brand-navy-dark font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm transition-all';
  var LOP_NUT_PHU = 'w-full h-9 px-space-md rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-body-md text-body-md flex items-center justify-center gap-1 transition-colors';

  function nut(href, lop, icon, chu, iconSau) {
    return '<a class="' + lop + '" href="' + href + '">' +
      (icon && !iconSau ? '<span class="material-symbols-outlined text-[18px]">' + icon + '</span>' : '') +
      '<span>' + esc(chu) + '</span>' +
      (icon && iconSau ? '<span class="material-symbols-outlined text-[16px]">' + icon + '</span>' : '') + '</a>';
  }

  function cotNut(b) {
    var ma = encodeURIComponent(b.ma);
    var chiTiet = '15_chi-tiet-bai-toan.html?ma=' + ma;
    var h = '';
    if (b.trangThai === 'dang-mo') {
      h += nut('08_hop-thu-ket-noi.html?bai-toan=' + ma, LOP_NUT_CHINH, 'folder_open', 'Xem proposal (' + ((b.proposal && b.proposal.tong) || 0) + ')');
      h += nut('05_dang-bai-toan-moi.html?ma=' + ma, LOP_NUT_PHU, 'edit', 'Chỉnh sửa');
    } else if (b.trangThai === 'dang-thuc-hien') {
      h += nut('09_khong-gian-dam-phan.html', LOP_NUT_CHINH.replace('bg-primary-container', 'bg-secondary').replace('hover:bg-brand-navy-dark', 'hover:bg-on-secondary-container'), 'handshake', 'Đàm phán & Báo cáo');
      h += nut(chiTiet + '#ho-so-du-an', LOP_NUT_PHU, 'visibility', 'Hồ sơ dự án');
    } else if (b.trangThai === 'cho-duyet') {
      h += nut(chiTiet, LOP_NUT_PHU.replace('h-9', 'h-10'), 'visibility', 'Xem chi tiết');
      h += '<button class="' + LOP_NUT_PHU.replace('bg-surface-container ', 'bg-surface-container-low ').replace('text-on-surface ', 'text-text-muted ').replace('hover:bg-surface-container-high', '') +
        ' cursor-not-allowed" disabled title="Bài toán đang trong quá trình Admin xét duyệt" type="button"><span class="material-symbols-outlined text-[16px]">lock</span>Sửa nội dung</button>';
    } else if (b.trangThai === 'nhap') {
      h += nut('05_dang-bai-toan-moi.html?ma=' + ma, LOP_NUT_CHINH.replace('bg-primary-container', 'bg-brand-navy-dark').replace('hover:bg-brand-navy-dark', 'hover:bg-primary'), 'arrow_forward', 'Tiếp tục soạn', true);
      h += '<button class="' + LOP_NUT_PHU.replace('text-on-surface ', 'text-status-error ').replace('hover:bg-surface-container-high', 'hover:bg-error-container hover:text-on-error-container') +
        '" type="button" data-xoa="' + esc(b.ma) + '"><span class="material-symbols-outlined text-[16px]">delete</span>Xóa bản nháp</button>';
    } else {
      h += nut(chiTiet, LOP_NUT_PHU.replace('h-9', 'h-10'), 'visibility', 'Xem chi tiết');
    }
    // Bản nháp đã có nút "Xóa bản nháp"; trạng thái khác có "Xóa bài đăng" (bị khóa nếu không được xóa)
    if (b.trangThai !== 'nhap') {
      var kt = D.kiemTraXoa(b.ma);
      h += '<button class="w-full h-8 px-space-md rounded-lg font-body-sm text-body-sm flex items-center justify-center gap-1 transition-colors ' +
        (kt.duoc ? 'text-status-error hover:bg-error-container hover:text-on-error-container' : 'text-text-muted hover:bg-surface-container-low') +
        '" type="button" data-xoa="' + esc(b.ma) + '"' + (kt.duoc ? '' : ' title="' + esc(kt.lyDo) + '" aria-disabled="true"') + '>' +
        '<span class="material-symbols-outlined text-[16px]">' + (kt.duoc ? 'delete' : 'lock') + '</span>Xóa bài đăng</button>';
    }
    return '<div class="lg:col-span-2 flex flex-row lg:flex-col justify-end lg:justify-center items-center lg:items-stretch gap-space-sm h-full">' + h + '</div>';
  }

  function dungThe(b) {
    var loai = D.LOAI[b.loai];
    var tt = D.TRANG_THAI[b.trangThai] || D.TRANG_THAI['nhap'];
    var nhanMa = b.trangThai === 'nhap' ? 'ID: ' + b.ma : 'Mã: ' + b.ma;
    if (b.duAn && b.duAn.soHopDong) nhanMa += ' · HĐ: ' + b.duAn.soHopDong;
    var tomTat = b.tomTat || D.chuTuHtml(b.moTa).slice(0, 180);
    var kyNang = (b.kyNang || []).map(function (k) {
      return '<span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-code-sm">' + esc(k) + '</span>';
    }).join('');
    return '<article class="group ' + (b.trangThai === 'nhap' ? 'bg-surface-container-lowest/80' : 'bg-surface-container-lowest') + ' rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all">' +
      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">' +
      '<div class="lg:col-span-7 flex flex-col gap-space-xs">' +
      '<div class="flex flex-wrap items-center gap-space-xs mb-1">' +
      (loai ? chip(loai.mau, loai.icon, loai.ten) : '') +
      chip(tt.mau, tt.icon, tt.ten) +
      (b.daSua ? '<span class="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1" title="Bài đã được duyệt, doanh nghiệp sửa nội dung nên phải duyệt lại"><span class="material-symbols-outlined text-[13px]">edit_note</span>Đã sửa</span>' : '') +
      (b.luuCucBo ? '<span class="px-2 py-0.5 rounded-full bg-status-warning/15 text-on-surface font-label-sm text-label-sm flex items-center gap-1" title="Chưa có API bài toán R&D: thay đổi chỉ nằm trên trình duyệt này"><span class="material-symbols-outlined text-[13px] text-status-warning">cloud_off</span>Chưa lưu lên máy chủ</span>' : '') +
      '<span class="font-code-sm text-code-sm text-text-muted ml-auto sm:ml-0">' + esc(nhanMa) + '</span></div>' +
      '<h2 class="font-title-md text-title-md lg:font-headline-sm lg:text-headline-sm text-on-surface group-hover:text-primary transition-colors">' +
      '<a class="hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(b.ma) + '">' + esc(b.tieuDe || '(Chưa có tiêu đề)') + '</a></h2>' +
      (tomTat ? '<p class="font-body-md text-body-md text-on-surface-variant line-clamp-2">' + esc(tomTat) + '</p>' : '') +
      (kyNang ? '<div class="flex flex-wrap items-center gap-1.5 my-1">' + kyNang + '</div>' : '') +
      '<div class="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-text-muted pt-1">' + dongMeta(b) + '</div>' +
      '</div>' + cotGiua(b) + cotNut(b) + '</div></article>';
  }

  // ---------- Lọc & sắp xếp ----------
  function khopTimKiem(b, q) {
    if (!q) return true;
    var chu = [b.tieuDe, b.ma, b.tomTat, (b.kyNang || []).join(' '), D.tenLinhVuc(b.linhVuc), D.LOAI[b.loai] ? D.LOAI[b.loai].ten : '',
      b.duAn ? b.duAn.soHopDong + ' ' + b.duAn.doiTac : ''].join(' ');
    var noi = D.chuanHoa(chu);
    return D.chuanHoa(q).split(/\s+/).filter(Boolean).every(function (tu) { return noi.indexOf(tu) !== -1; });
  }

  function khoaSapXep(b, kieu) {
    if (kieu === 'newest') return -(Date.parse(b.ngayTao || b.ngayLuu || 0) || 0);
    if (kieu === 'proposals') return -((b.proposal && b.proposal.tong) || 0);
    if (kieu === 'budget-high') return -((b.nganSach && (b.nganSach.max || b.nganSach.min)) || 0);
    // Hạn gần nhất: chỉ tính bài toán còn nhận proposal; còn lại xếp cuối
    var conNhan = (b.trangThai === 'dang-mo' || b.trangThai === 'cho-duyet') && b.hanNop;
    return conNhan ? Date.parse(b.hanNop) : Number.MAX_SAFE_INTEGER;
  }

  function veLai() {
    var tatCa = D.layTatCa();

    // Đếm theo tab (trên toàn bộ dữ liệu, không phụ thuộc ô tìm kiếm)
    var dem = { 'tat-ca': tatCa.length };
    Object.keys(D.TRANG_THAI).forEach(function (k) { dem[k] = 0; });
    tatCa.forEach(function (b) { dem[b.trangThai] = (dem[b.trangThai] || 0) + 1; });
    cacTab.forEach(function (tab) {
      var o = tab.querySelector('[data-dem]');
      if (o) o.textContent = dem[tab.getAttribute('data-tab')] || 0;
      var bat = tab.getAttribute('data-tab') === trangThaiLoc.tab;
      tab.setAttribute('aria-pressed', bat ? 'true' : 'false');
      LOP_TAB_BAT.forEach(function (c) { tab.classList.toggle(c, bat); });
      LOP_TAB_TAT.forEach(function (c) { tab.classList.toggle(c, !bat); });
    });

    var ketQua = tatCa.filter(function (b) {
      if (trangThaiLoc.tab !== 'tat-ca' && b.trangThai !== trangThaiLoc.tab) return false;
      if (trangThaiLoc.loai && b.loai !== trangThaiLoc.loai) return false;
      if (trangThaiLoc.linhVuc && b.linhVuc !== trangThaiLoc.linhVuc) return false;
      return khopTimKiem(b, trangThaiLoc.q);
    });
    ketQua.sort(function (a, b) { return khoaSapXep(a, trangThaiLoc.sapXep) - khoaSapXep(b, trangThaiLoc.sapXep); });

    dsThe.innerHTML = ketQua.length ? ketQua.map(dungThe).join('') :
      '<div class="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm text-center flex flex-col items-center gap-2">' +
      '<span class="material-symbols-outlined text-[36px] text-text-muted">search_off</span>' +
      '<p class="font-title-md text-title-md text-on-surface">Không có bài toán nào khớp bộ lọc</p>' +
      '<p class="font-body-sm text-body-sm text-text-muted">Thử từ khóa khác hoặc bấm nút đặt lại bộ lọc.</p></div>';

    var oHienThi = document.getElementById('dem-hien-thi');
    var oTong = document.getElementById('dem-tong');
    if (oHienThi) oHienThi.textContent = ketQua.length;
    if (oTong) oTong.textContent = tatCa.length;

    var oTongBaiToan = document.getElementById('so-tong-bai-toan');
    var oDangTrienKhai = document.getElementById('so-dang-trien-khai');
    if (oTongBaiToan) oTongBaiToan.textContent = tatCa.length;
    if (oDangTrienKhai) oDangTrienKhai.textContent = dem['dang-thuc-hien'] || 0;

    var soCucBo = tatCa.filter(function (b) { return b.luuCucBo; }).length;
    var oCanhBao = document.getElementById('canh-bao-cuc-bo');
    if (oCanhBao) {
      oCanhBao.classList.toggle('hidden', soCucBo === 0);
      var oSo = oCanhBao.querySelector('[data-so]');
      if (oSo) oSo.textContent = soCucBo;
    }
  }

  // ---------- Sự kiện ----------
  cacTab.forEach(function (tab) {
    tab.addEventListener('click', function () {
      trangThaiLoc.tab = tab.getAttribute('data-tab');
      veLai();
    });
  });

  var hen = null;
  if (oTim) oTim.addEventListener('input', function () {
    clearTimeout(hen);
    hen = setTimeout(function () { trangThaiLoc.q = oTim.value.trim(); veLai(); }, 150);
  });
  if (chonLoai) chonLoai.addEventListener('change', function () { trangThaiLoc.loai = chonLoai.value; veLai(); });
  if (chonLinhVuc) chonLinhVuc.addEventListener('change', function () { trangThaiLoc.linhVuc = chonLinhVuc.value; veLai(); });
  if (chonSapXep) chonSapXep.addEventListener('change', function () { trangThaiLoc.sapXep = chonSapXep.value; veLai(); });
  if (nutDatLai) nutDatLai.addEventListener('click', function () {
    trangThaiLoc = { tab: 'tat-ca', q: '', loai: '', linhVuc: '', sapXep: 'deadline' };
    if (oTim) oTim.value = '';
    if (chonLoai) chonLoai.value = '';
    if (chonLinhVuc) chonLinhVuc.value = '';
    if (chonSapXep) chonSapXep.value = 'deadline';
    veLai();
  });

  dsThe.addEventListener('click', function (e) {
    var nutXoa = e.target.closest('[data-xoa]');
    if (!nutXoa) return;
    D.xoaBaiToanCoXacNhan(nutXoa.getAttribute('data-xoa'), veLai);
  });

  veLai();
})();
