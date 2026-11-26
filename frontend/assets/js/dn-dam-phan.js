// DN-09 Không gian đàm phán: danh sách phòng đàm phán của doanh nghiệp.
//   - Thẻ dựng từ DnBaiToan.layDanhSachPhong(): trạng thái phòng suy ra từ xác nhận của hai bên ở từng bước
//   - Tab Tất cả / Đang đàm phán / Đã ký kết; thanh lọc chỉ áp dụng khi bấm "Lọc" (hoặc Enter)
//   - "Vào phòng" → DN-16; "Nhắn tin" → DN-16#trao-doi (trao đổi không theo thời gian thực)
//   - #<id phòng>: cuộn tới và làm nổi bật thẻ; ?tu-hop-thu=<id proposal>: báo vừa chấp nhận ở DN-08
// Cần dn-bai-toan-data.js nạp trước.
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var dsEl = document.getElementById('ds-dam-phan');
  var formLoc = document.getElementById('form-loc-dp');
  if (!D || !dsEl || !formLoc) return;
  var esc = D.escapeHtml;
  var $ = function (id) { return document.getElementById(id); };

  var oTim = $('dp-tim');
  var chonDoiTac = $('dp-doi-tac');
  var chonBaiToan = $('dp-bai-toan');
  var chonTrangThai = $('dp-trang-thai');
  var cacTab = Array.prototype.slice.call(document.querySelectorAll('[data-tab-dp]'));

  chonBaiToan.insertAdjacentHTML('beforeend', D.layTatCa().map(function (b) {
    var ten = b.tieuDe.length > 44 ? b.tieuDe.slice(0, 42) + '…' : b.tieuDe;
    return '<option value="' + esc(b.ma) + '">' + esc(b.ma + ' · ' + ten) + '</option>';
  }).join(''));

  var boLoc = { q: '', doiTac: '', baiToan: '', trangThai: '' };
  var tab = 'tat-ca';
  // ?trang-thai=<mã> lọc sẵn (thẻ "Đàm phán chờ bạn xác nhận" ở Bàn làm việc dùng ?trang-thai=cho-xac-nhan)
  var ttUrl = new URLSearchParams(window.location.search).get('trang-thai');
  if (D.TRANG_THAI_PHONG[ttUrl]) { boLoc.trangThai = ttUrl; chonTrangThai.value = ttUrl; }

  var THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  function ngayCoThu(iso) {
    var d = new Date(iso + 'T00:00:00');
    return THU[d.getDay()] + ', ' + D.dinhDangNgay(iso).slice(0, 5);
  }

  // ---------- Dựng thẻ ----------
  function buocHtml(icon, vong, nhan, lopNhan, phu, lopPhu) {
    return '<div class="flex flex-col items-center text-center relative z-10"><div class="w-6 h-6 rounded-xl ' + vong + ' flex items-center justify-center mb-1 shadow-xs">' +
      (icon ? '<span class="material-symbols-outlined text-[14px]">' + icon + '</span>' : '<span class="w-2 h-2 rounded-xl bg-surface-container-lowest"></span>') + '</div>' +
      '<span class="font-label-sm text-label-sm ' + lopNhan + '">' + esc(nhan) + '</span>' +
      '<span class="font-code-sm text-[10px] ' + lopPhu + '">' + esc(phu) + '</span></div>';
  }

  function stepper(ph) {
    var html = buocHtml('check', 'bg-tertiary text-on-tertiary', 'Proposal', 'text-on-surface', 'Đã chấp nhận', 'text-text-muted');
    D.BUOC_PHONG.forEach(function (b) {
      var x = ph.buoc[b.id];
      if (D.buocXong(x)) html += buocHtml('check', 'bg-tertiary text-on-tertiary', b.ten, 'text-on-surface', x.ghiChu || 'Hoàn tất', 'text-text-muted');
      else if (!D.buocDaMo(ph, b.id)) html += buocHtml('lock', 'bg-surface-container text-text-muted', b.ten, 'text-text-muted', x.ghiChu || 'Chưa mở', 'text-text-muted');
      else if (x.doiTac && !x.dn) html += buocHtml('priority_high', 'bg-status-warning text-surface-container-lowest ring-4 ring-status-warning/20', b.ten, 'text-status-warning font-bold', 'Cần bạn xác nhận', 'text-status-error font-medium');
      else if (x.dn && !x.doiTac) html += buocHtml('hourglass_top', 'bg-primary-fixed text-primary ring-4 ring-primary-fixed-dim/30', b.ten, 'text-primary font-bold', 'Chờ đối tác', 'text-primary font-medium');
      else html += buocHtml('', 'bg-primary text-on-primary ring-4 ring-primary/15 animate-pulse', b.ten, 'text-primary font-bold', x.ghiChu || 'Đang thực hiện', 'text-primary');
    });
    return '<div class="bg-surface-container-low rounded-lg p-space-md"><div class="grid grid-cols-4 relative items-center gap-2">' + html + '</div></div>';
  }

  function theHtml(ph) {
    var p = ph.p, bt = ph.baiToan;
    var tt = D.TRANG_THAI_PHONG[ph.trangThai];
    var loai = bt && D.LOAI[bt.loai];
    var maHoa = encodeURIComponent(ph.id);
    var avatar = p.thanhVien.slice(0, 3).map(function (tv, i) {
      var chu = tv.ten.replace(/^(PGS\.TS\.|TS\.|ThS\.)\s*/, '').split(' ').slice(-2).map(function (x) { return x[0]; }).join('').toUpperCase();
      var mau = ['bg-primary-container text-on-primary', 'bg-secondary text-on-secondary', 'bg-surface-container-highest text-on-surface'][i];
      return '<div class="w-7 h-7 rounded-xl ' + mau + ' flex items-center justify-center font-label-sm text-[11px] shadow-xs ring-2 ring-surface-container-lowest">' + esc(chu) + '</div>';
    }).join('');
    var nganSach = ph.nganSachDeXuat ? 'Ngân sách đề xuất: ' + ph.nganSachDeXuat + ' triệu VNĐ' : (bt && bt.nganSach ? 'Ngân sách: ' + D.dinhDangNganSach(bt.nganSach) : '');
    var hd = bt && bt.duAn && ph.trangThai === 'da-ky' ? bt.duAn.soHopDong : '';
    return '<article id="' + esc(ph.id) + '" class="bg-surface-container-lowest rounded-lg p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row items-start gap-space-lg relative overflow-hidden scroll-mt-20">' +
      (ph.trangThai === 'cho-xac-nhan' ? '<div class="w-1.5 absolute top-0 left-0 bottom-0 bg-status-warning"></div>' : '') +
      '<div class="w-full sm:w-[130px] h-24 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br ' + ph.nen + ' relative flex items-center justify-center shadow-xs">' +
      '<span class="material-symbols-outlined text-[48px] text-inverse-primary/30">handshake</span>' +
      '<div class="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded-sm bg-brand-hero-dark/80 font-code-sm text-[10px] text-inverse-primary font-medium tracking-tight">' + esc(ph.nhan) + '</div></div>' +
      '<div class="flex-1 min-w-0 space-y-space-md w-full">' +
      '<div class="flex flex-wrap items-center gap-space-xs">' +
      (loai ? '<span class="px-2.5 py-0.5 rounded-xl bg-brand-light-blue text-primary font-label-sm text-label-sm">' + esc(loai.ten) + '</span>' : '') +
      '<span class="px-2.5 py-0.5 rounded-xl ' + tt.mau + ' font-label-sm text-label-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-xl ' + tt.cham + '"></span>' + esc(tt.ten) + '</span>' +
      (ph.moi || ph.luuCucBo ? '<span class="px-2.5 py-0.5 rounded-xl bg-status-warning/15 text-on-surface font-label-sm text-label-sm flex items-center gap-1" title="Chưa có API: thay đổi chỉ lưu trên trình duyệt này"><span class="material-symbols-outlined text-[13px] text-status-warning">cloud_off</span>Chưa lưu lên máy chủ</span>' : '') +
      '</div>' +
      '<div class="space-y-1"><h2 class="font-title-md text-headline-sm text-text-main line-clamp-2"><a class="hover:text-primary transition-colors" href="16_phong-dam-phan.html?phong=' + maHoa + '">' + esc(bt ? bt.tieuDe : p.tieuDe) + '</a></h2>' +
      '<div class="flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-text-muted">' +
      '<a class="font-code-sm text-on-surface-variant font-medium hover:text-primary hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '" title="Xem bài toán">' + esc(p.baiToan) + '</a>' +
      (hd ? '<span>·</span><span class="font-code-sm text-on-surface-variant">' + esc(hd) + '</span>' : '') +
      '<span>·</span><span>Mở phòng: ' + esc(D.dinhDangNgay(ph.moPhong)) + '</span>' +
      (nganSach ? '<span>·</span><span>' + esc(nganSach) + '</span>' : '') + '</div></div>' +
      (ph.trangThai === 'cho-xac-nhan' && ph.canhBao ? '<div class="p-space-sm rounded bg-surface-container-high text-on-surface flex items-center gap-2.5 font-label-md text-label-md">' +
        '<span class="material-symbols-outlined text-status-warning text-[20px] flex-shrink-0">warning</span><span class="text-text-main"><strong class="text-status-error">Chờ bạn xác nhận:</strong> ' + esc(ph.canhBao) + '</span></div>' : '') +
      '<div class="flex flex-wrap items-center gap-space-sm pt-0.5"><div class="flex -space-x-2">' + avatar + '</div>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">Đối tác: <span class="font-title-md text-on-surface">' + esc(p.nguoiGui) + '</span>' +
      (p.mssv ? ' (' + esc(p.mssv) + ')' : '') + ' · ' + p.thanhVien.length + ' thành viên (' + esc(p.nhom) + ')</p></div>' +
      stepper(ph) +
      (ph.lich ? '<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">' +
        '<span class="material-symbols-outlined text-primary text-[16px]">calendar_today</span><span>Lịch trao đổi: <strong class="text-on-surface">' + esc(ngayCoThu(ph.lich.ngay) + ' · ' + ph.lich.gio) + '</strong> · ' +
        esc(ph.lich.hinhThuc) + (ph.lich.noiDung ? ' (' + esc(ph.lich.noiDung) + ')' : '') + '</span></div>' : '') +
      '</div>' +
      '<div class="flex lg:flex-col items-center lg:items-stretch gap-space-xs w-full lg:w-40 flex-shrink-0 pt-2 lg:pt-0">' +
      '<a class="flex-1 lg:flex-none h-9 px-space-md rounded-lg bg-primary-container hover:bg-brand-navy-dark text-on-primary font-title-md text-title-md transition-colors flex items-center justify-center gap-1.5" href="16_phong-dam-phan.html?phong=' + maHoa + '">' +
      '<span class="material-symbols-outlined text-[18px]">meeting_room</span>Vào phòng</a>' +
      '<a class="flex-1 lg:flex-none h-9 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md text-title-md transition-colors flex items-center justify-center gap-1.5 relative" href="16_phong-dam-phan.html?phong=' + maHoa + '#trao-doi"' +
      (ph.chuaDoc ? ' title="' + ph.chuaDoc + ' tin nhắn chưa đọc"' : '') + '>' +
      '<span class="material-symbols-outlined text-[18px]">chat</span>Nhắn tin' +
      (ph.chuaDoc ? '<span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-xl bg-status-error text-white text-[10px] font-bold flex items-center justify-center">' + ph.chuaDoc + '</span>' : '') + '</a>' +
      (ph.trangThai === 'da-ky' ? '<a class="flex-1 lg:flex-none h-9 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '#ho-so-du-an">' +
        '<span class="material-symbols-outlined text-[16px]">folder_shared</span>Hồ sơ dự án</a>' : '') +
      '</div></article>';
  }

  // ---------- Lọc ----------
  function khop(ph) {
    var p = ph.p;
    if (boLoc.doiTac && p.nguon !== boLoc.doiTac) return false;
    if (boLoc.baiToan && p.baiToan !== boLoc.baiToan) return false;
    if (boLoc.trangThai && ph.trangThai !== boLoc.trangThai) return false;
    if (!boLoc.q) return true;
    var chu = D.chuanHoa([ph.baiToan ? ph.baiToan.tieuDe : '', p.baiToan, p.nguoiGui, p.nhom, p.tieuDe,
      ph.baiToan && ph.baiToan.duAn ? ph.baiToan.duAn.soHopDong : ''].join(' '));
    return D.chuanHoa(boLoc.q).split(/\s+/).filter(Boolean).every(function (tu) { return chu.indexOf(tu) !== -1; });
  }
  function trongTab(ph) {
    if (tab === 'da-ky') return ph.trangThai === 'da-ky';
    if (tab === 'dang') return ph.trangThai !== 'da-ky';
    return true;
  }
  // Phòng cần doanh nghiệp xử lý lên đầu, sau đó phòng mở gần nhất
  var THU_TU = { 'cho-xac-nhan': 0, 'dang-trao-doi': 1, 'cho-doi-tac': 2, 'da-ky': 3 };

  function veLai() {
    var tatCa = D.layDanhSachPhong();
    var daLoc = tatCa.filter(khop);
    var ds = daLoc.filter(trongTab).sort(function (a, b) {
      return (THU_TU[a.trangThai] - THU_TU[b.trangThai]) || (a.moPhong < b.moPhong ? 1 : -1);
    });

    cacTab.forEach(function (t) {
      var ma = t.getAttribute('data-tab-dp');
      var bat = ma === tab;
      t.setAttribute('aria-selected', bat ? 'true' : 'false');
      t.className = 'pb-3 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 ' +
        (bat ? 'font-title-md text-title-md text-primary-container border-primary-container' : 'font-body-lg text-body-lg text-on-surface-variant hover:text-on-surface border-transparent');
      var dem = t.querySelector('[data-dem]');
      dem.className = 'px-2 py-0.5 rounded-xl font-label-sm text-label-sm ' + (bat ? 'bg-brand-active-pill text-brand-active-text' : 'bg-surface-container text-on-surface-variant');
      dem.textContent = daLoc.filter(function (ph) {
        return ma === 'tat-ca' || (ma === 'da-ky' ? ph.trangThai === 'da-ky' : ph.trangThai !== 'da-ky');
      }).length;
    });

    dsEl.innerHTML = ds.length ? ds.map(theHtml).join('') :
      '<div class="bg-surface-container-lowest rounded-lg p-space-xl shadow-xs text-center flex flex-col items-center gap-2">' +
      '<span class="material-symbols-outlined text-[36px] text-text-muted">search_off</span>' +
      '<p class="font-title-md text-title-md text-on-surface">Không có phòng đàm phán nào khớp bộ lọc</p>' +
      '<p class="font-body-sm text-body-sm text-text-muted">Thử từ khóa khác hoặc bấm "Đặt lại".</p></div>';

    $('dp-dem-hien-thi').innerHTML = 'Đang hiển thị <strong class="text-on-surface font-medium">' + ds.length + '</strong> / <strong class="text-on-surface font-medium">' +
      tatCa.length + '</strong> phòng đàm phán' + (ds.length < tatCa.length ? ' (đã lọc)' : '');
  }

  function docOLoc() {
    return { q: oTim.value.trim(), doiTac: chonDoiTac.value, baiToan: chonBaiToan.value, trangThai: chonTrangThai.value };
  }
  function kiemTraChuaApDung() {
    var moi = docOLoc();
    $('dp-chua-ap-dung').classList.toggle('hidden', !Object.keys(moi).some(function (k) { return moi[k] !== boLoc[k]; }));
  }

  formLoc.addEventListener('submit', function (e) {
    e.preventDefault();
    boLoc = docOLoc();
    $('dp-chua-ap-dung').classList.add('hidden');
    veLai();
  });
  formLoc.addEventListener('input', kiemTraChuaApDung);
  formLoc.addEventListener('change', kiemTraChuaApDung);
  $('dp-nut-dat-lai').addEventListener('click', function () {
    boLoc = { q: '', doiTac: '', baiToan: '', trangThai: '' };
    oTim.value = ''; chonDoiTac.value = ''; chonBaiToan.value = ''; chonTrangThai.value = '';
    tab = 'tat-ca';
    $('dp-chua-ap-dung').classList.add('hidden');
    veLai();
  });
  cacTab.forEach(function (t) {
    t.addEventListener('click', function () { tab = t.getAttribute('data-tab-dp'); veLai(); });
  });

  veLai();

  // ---------- Làm nổi bật thẻ được mở từ Hộp thư ----------
  var dich = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
  if (dich && dsEl.contains(dich)) {
    dich.classList.add('ring-2', 'ring-primary-container');
    dich.scrollIntoView({ block: 'start' });
    setTimeout(function () { dich.classList.remove('ring-2', 'ring-primary-container'); }, 4000);
  }
  var tuHopThu = new URLSearchParams(window.location.search).get('tu-hop-thu');
  var p = tuHopThu ? D.layProposal(tuHopThu) : null;
  if (p && p.trangThai === 'dam-phan') {
    D.thongBao('Đã chấp nhận proposal của ' + p.nhom + ' cho bài toán ' + p.baiToan + '. Phòng đàm phán được làm nổi bật bên dưới (lưu tạm trên trình duyệt).');
  }
})();
