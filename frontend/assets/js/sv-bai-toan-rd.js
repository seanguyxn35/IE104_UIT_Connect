// SV-09 Bài toán DN & R&D: danh sách bài toán cho sinh viên.
//   - Tab theo loại bài toán + tab "Đã lưu" (đổi tab áp dụng ngay)
//   - Thanh lọc: chọn điều kiện rồi bấm "Lọc" (hoặc Enter ở ô tìm kiếm) mới áp dụng, giống Hộp thư kết nối DN-08
//   - Phân trang 6 bài / trang
//   - Nút cờ: lưu / bỏ lưu bài toán (lưu tạm trên trình duyệt)
// Tham số URL: ?tab=da-luu|ung-tuyen|hop-tac-lab|tai-tro  &q=  &trang=
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var S = window.SvBaiToanRd;
  var esc = D.escapeHtml;
  var MOI_TRANG = 6;

  function $(id) { return document.getElementById(id); }

  var tatCa = S.layTatCa();
  var tab = '';
  var trang = 1;
  var LOC_TRONG = { q: '', linhVuc: '', kinhPhi: '', doiTuong: '', sapXep: 'moi-nhat' };
  var boLoc = Object.assign({}, LOC_TRONG);

  var formLoc = $('form-loc-rd');
  var oTim = $('rd-search');
  var chonLinhVuc = $('loc-linh-vuc');
  var chonKinhPhi = $('loc-kinh-phi');
  var chonDoiTuong = $('loc-doi-tuong');
  var chonSapXep = $('loc-sap-xep');
  var luoi = $('rd-grid');
  var cacTab = Array.prototype.slice.call(document.querySelectorAll('#rd-tabs .rd-tab'));

  // ---------- Danh mục lọc ----------
  D.LINH_VUC.forEach(function (lv) {
    var o = document.createElement('option');
    o.value = lv.id;
    o.textContent = lv.ngan;
    chonLinhVuc.appendChild(o);
  });
  Object.keys(S.MUC_KINH_PHI).forEach(function (k) {
    var o = document.createElement('option');
    o.value = k;
    o.textContent = S.MUC_KINH_PHI[k].ten;
    chonKinhPhi.appendChild(o);
  });

  function docOLoc() {
    return { q: oTim.value.trim(), linhVuc: chonLinhVuc.value, kinhPhi: chonKinhPhi.value, doiTuong: chonDoiTuong.value, sapXep: chonSapXep.value };
  }
  function dongBoOLoc() {
    oTim.value = boLoc.q;
    chonLinhVuc.value = boLoc.linhVuc;
    chonKinhPhi.value = boLoc.kinhPhi;
    chonDoiTuong.value = boLoc.doiTuong;
    chonSapXep.value = boLoc.sapXep;
    $('loc-chua-ap-dung').classList.add('hidden');
  }

  function khopBoLoc(b) {
    if (boLoc.linhVuc && b.linhVuc !== boLoc.linhVuc) return false;
    if (boLoc.kinhPhi && !S.MUC_KINH_PHI[boLoc.kinhPhi].khop(S.nganSachMax(b))) return false;
    if (boLoc.doiTuong && (b.doiTuong || []).indexOf(boLoc.doiTuong) === -1) return false;
    if (!boLoc.q) return true;
    var chu = D.chuanHoa([b.ma, b.tieuDe, b.tomTat, b.doanhNghiep.ten, (b.kyNang || []).join(' '), D.tenLinhVuc(b.linhVuc)].join(' '));
    return D.chuanHoa(boLoc.q).split(/\s+/).filter(Boolean).every(function (tu) { return chu.indexOf(tu) !== -1; });
  }

  function sapXep(ds) {
    return ds.sort(function (a, b) {
      if (boLoc.sapXep === 'han-nop') {
        // Bài còn nhận hồ sơ, hạn gần nhất lên đầu; bài hết hạn / đã có đơn vị xuống cuối
        var na = S.tinhTrangNhan(a).moNhan ? D.soNgayToi(a.hanNop) : 1e6;
        var nb = S.tinhTrangNhan(b).moNhan ? D.soNgayToi(b.hanNop) : 1e6;
        return na - nb;
      }
      if (boLoc.sapXep === 'kinh-phi') return S.nganSachMax(b) - S.nganSachMax(a);
      if (boLoc.sapXep === 'phu-hop') return S.mucPhuHop(b) - S.mucPhuHop(a);
      return String(b.ngayDang).localeCompare(String(a.ngayDang));
    });
  }

  function thuocTab(b, t) {
    if (!t) return true;
    if (t === 'da-luu') return S.laDaLuu(b.ma);
    return b.loai === t;
  }

  function dsDaLoc() { return tatCa.filter(khopBoLoc); }
  function dsTrongTab() {
    var ds = dsDaLoc().filter(function (b) { return thuocTab(b, tab); });
    if (tab === 'da-luu') {
      // Tab "Đã lưu": mới lưu lên đầu (trừ khi chọn kiểu sắp xếp khác)
      if (boLoc.sapXep === 'moi-nhat') {
        var thuTu = {};
        S.dsDaLuu().forEach(function (x, i) { thuTu[x.ma] = i; });
        return ds.sort(function (a, b) { return thuTu[a.ma] - thuTu[b.ma]; });
      }
    }
    return sapXep(ds);
  }

  // ---------- Vẽ ----------
  var TAB_ON = ['border-primary-container', 'font-bold', 'text-primary-container'];
  var TAB_OFF = ['border-transparent', 'font-medium', 'text-text-secondary', 'hover:text-text-main'];
  var COUNT_ON = ['bg-brand-light', 'text-primary-container'];
  var COUNT_OFF = ['bg-surface-container', 'text-text-secondary'];
  function bat(el, on, onList, offList) {
    onList.forEach(function (c) { el.classList.toggle(c, on); });
    offList.forEach(function (c) { el.classList.toggle(c, !on); });
  }

  function veTab() {
    var daLoc = dsDaLoc();
    cacTab.forEach(function (t) {
      var ma = t.getAttribute('data-tab');
      var on = ma === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      bat(t, on, TAB_ON, TAB_OFF);
      var dem = t.querySelector('.rd-tab-count');
      bat(dem, on, COUNT_ON, COUNT_OFF);
      dem.textContent = daLoc.filter(function (b) { return thuocTab(b, ma); }).length;
    });
  }

  function logo(dn) {
    if (dn.logo) {
      return '<div class="size-12 rounded bg-surface-container flex items-center justify-center border border-border-color overflow-hidden shrink-0">' +
        '<img class="size-12 object-cover" alt="Logo ' + esc(dn.ten) + '" src="../../assets/img/' + esc(dn.logo) + '"></div>';
    }
    if (dn.icon) {
      return '<div class="size-12 rounded bg-brand-light flex items-center justify-center text-primary-container border border-border-color shrink-0">' +
        '<span class="material-symbols-outlined text-[24px]">' + esc(dn.icon) + '</span></div>';
    }
    return '<div class="size-12 rounded bg-primary-container text-white flex items-center justify-center font-bold text-sm border border-border-color shrink-0">' + esc(dn.kyHieu || dn.ten.slice(0, 2)) + '</div>';
  }

  function the(b) {
    var loai = S.LOAI_SV[b.loai] || S.LOAI_SV['ung-tuyen'];
    var nhan = S.tinhTrangNhan(b);
    var daLuu = S.laDaLuu(b.ma);
    var p = S.proposalChoBaiToan(b.ma);
    var url = '13_chi-tiet-bai-toan-rd.html?ma=' + encodeURIComponent(b.ma);
    var nutChinh = p
      ? '<a class="flex-1 h-9 rounded border border-primary-container text-primary-container hover:bg-brand-light text-body-sm font-semibold transition-colors flex items-center justify-center gap-1.5" href="' + url + '#proposal-cua-toi">' +
          '<span class="material-symbols-outlined text-[16px]">task_alt</span><span>Xem proposal đã nộp</span></a>'
      : '<a class="flex-1 h-9 rounded bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold transition-colors flex items-center justify-center gap-1.5" href="' + url + '">' +
          '<span>' + (nhan.moNhan ? 'Xem chi tiết &amp; Ứng tuyển' : 'Xem chi tiết') + '</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>';
    return '<article class="bg-surface-container-lowest rounded-lg border border-border-color p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative group" data-ma="' + esc(b.ma) + '">' +
      '<div class="space-y-4">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="flex items-center gap-3 min-w-0">' + logo(b.doanhNghiep) +
            '<div class="min-w-0"><h2 class="text-sm font-bold text-text-main line-clamp-1 flex items-center gap-1">' + esc(b.doanhNghiep.ten) +
              (b.tuLuongDn ? '<span class="material-symbols-outlined text-[15px] text-primary-container" title="Doanh nghiệp đã xác minh trên UIT Connect">verified</span>' : '') + '</h2>' +
            '<span class="text-body-xs text-text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>' + esc(b.doanhNghiep.diaChi) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold border whitespace-nowrap ' + loai.lop + '">' + esc(loai.ten) + '</span>' +
            '<span class="text-[11px] font-mono text-text-secondary">' + esc(b.ma) + ' · ' + esc(D.tenLinhVuc(b.linhVuc, true)) + '</span>' +
            (p ? '<span class="text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px]">task_alt</span>Đã ứng tuyển</span>' : '') +
          '</div>' +
          '<h3 class="text-base font-bold text-text-main line-clamp-2"><a class="hover:text-primary-container transition-colors" href="' + url + '">' + esc(b.tieuDe) + '</a></h3>' +
          '<p class="text-body-sm text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">' + esc(b.tomTat || D.chuTuHtml(b.moTa)) + '</p>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5 pt-1">' + (b.kyNang || []).slice(0, 4).map(function (k) {
          return '<span class="px-2 py-0.5 rounded-sm bg-surface-container text-text-secondary text-body-xs font-medium">' + esc(k) + '</span>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="mt-5 pt-4 border-t border-border-color space-y-3">' +
        '<div class="flex items-center justify-between gap-2 text-body-xs text-text-secondary">' +
          '<span class="flex items-center gap-1.5 font-medium text-primary-container"><span class="material-symbols-outlined text-[18px]">payments</span>' + esc(S.chuoiKinhPhi(b)) + '</span>' +
          '<span class="flex items-center gap-1 text-right ' + nhan.lop + '" title="Hạn nộp: ' + esc(D.dinhDangNgay(b.hanNop)) + '"><span class="material-symbols-outlined text-[16px]">schedule</span>' +
            (nhan.moNhan ? 'Hạn: ' + esc(D.dinhDangNgay(b.hanNop)) : esc(nhan.ten)) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2">' + nutChinh +
          '<button class="size-9 rounded border flex items-center justify-center transition-colors ' +
            (daLuu ? 'border-primary-container bg-brand-light text-primary-container' : 'border-border-color hover:bg-surface-container text-text-secondary') +
            '" type="button" data-luu="' + esc(b.ma) + '" aria-pressed="' + daLuu + '" title="' + (daLuu ? 'Bỏ lưu bài toán' : 'Lưu bài toán') + '" aria-label="' + (daLuu ? 'Bỏ lưu bài toán ' : 'Lưu bài toán ') + esc(b.ma) + '">' +
            '<span class="material-symbols-outlined text-[18px]"' + (daLuu ? ' style="font-variation-settings:\'FILL\' 1"' : '') + '>' + (daLuu ? 'bookmark' : 'bookmark_border') + '</span></button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function nutTrang(so, dangChon) {
    return '<button class="size-9 rounded text-sm font-semibold ' +
      (dangChon ? 'bg-primary-container text-white font-bold' : 'border border-border-color bg-surface-container-lowest hover:bg-surface-container text-text-main') +
      '" type="button" data-trang="' + so + '"' + (dangChon ? ' aria-current="page"' : '') + ' aria-label="Trang ' + so + '">' + so + '</button>';
  }

  function vePhanTrang(tong) {
    var soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
    var dau = tong ? (trang - 1) * MOI_TRANG + 1 : 0;
    var cuoi = Math.min(tong, trang * MOI_TRANG);
    $('rd-range').textContent = tong ? dau + ' - ' + cuoi : '0';
    $('rd-total').textContent = tong;
    var h = '';
    for (var i = 1; i <= soTrang; i++) h += nutTrang(i, i === trang);
    $('rd-pages').innerHTML = h;
    $('rd-prev').disabled = trang <= 1;
    $('rd-next').disabled = trang >= soTrang;
    $('rd-pagination').classList.toggle('hidden', !tong);
  }

  function veLuoi() {
    var ds = dsTrongTab();
    var soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
    if (trang > soTrang) trang = soTrang;
    var trangNay = ds.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);
    luoi.innerHTML = trangNay.map(the).join('');
    var rong = !ds.length;
    $('rd-empty').classList.toggle('hidden', !rong);
    if (rong) {
      var coLoc = Object.keys(LOC_TRONG).some(function (k) { return boLoc[k] !== LOC_TRONG[k]; });
      $('rd-empty-title').textContent = tab === 'da-luu' && !coLoc ? 'Bạn chưa lưu bài toán nào' : 'Chưa có bài toán phù hợp';
      $('rd-empty-desc').textContent = tab === 'da-luu' && !coLoc
        ? 'Bấm biểu tượng cờ trên thẻ bài toán để lưu lại xem sau.'
        : 'Thử chọn tab khác, đổi điều kiện lọc hoặc bấm "Đặt lại".';
    }
    vePhanTrang(ds.length);
  }

  function veLai() { veTab(); veLuoi(); }

  function ghiUrl() {
    var ts = new URLSearchParams();
    if (tab) ts.set('tab', tab);
    if (boLoc.q) ts.set('q', boLoc.q);
    if (trang > 1) ts.set('trang', trang);
    var chuoi = ts.toString();
    try { history.replaceState(null, '', location.pathname + (chuoi ? '?' + chuoi : '')); } catch (e) { /* file:// có thể chặn */ }
  }

  function chonTab(ma) {
    tab = ma;
    trang = 1;
    var t = cacTab.filter(function (x) { return x.getAttribute('data-tab') === ma; })[0];
    if (t) oTim.placeholder = t.getAttribute('data-placeholder');
    veLai();
    ghiUrl();
  }

  // ---------- Sự kiện ----------
  cacTab.forEach(function (t) {
    t.addEventListener('click', function () { chonTab(t.getAttribute('data-tab')); });
  });

  formLoc.addEventListener('submit', function (e) {
    e.preventDefault();
    boLoc = docOLoc();
    trang = 1;
    $('loc-chua-ap-dung').classList.add('hidden');
    veLai();
    ghiUrl();
    D.thongBao('Đã lọc: ' + dsTrongTab().length + ' bài toán khớp điều kiện.');
  });
  function kiemTraChuaApDung() {
    var moi = docOLoc();
    var khac = Object.keys(moi).some(function (k) { return moi[k] !== boLoc[k]; });
    $('loc-chua-ap-dung').classList.toggle('hidden', !khac);
  }
  formLoc.addEventListener('input', kiemTraChuaApDung);
  formLoc.addEventListener('change', kiemTraChuaApDung);
  $('nut-dat-lai-loc').addEventListener('click', function () {
    boLoc = Object.assign({}, LOC_TRONG);
    trang = 1;
    dongBoOLoc();
    veLai();
    ghiUrl();
  });

  function denTrang(so) {
    trang = so;
    veLuoi();
    ghiUrl();
    $('rd-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('rd-pages').addEventListener('click', function (e) {
    var n = e.target.closest('[data-trang]');
    if (n) denTrang(Number(n.getAttribute('data-trang')));
  });
  $('rd-prev').addEventListener('click', function () { if (trang > 1) denTrang(trang - 1); });
  $('rd-next').addEventListener('click', function () { denTrang(trang + 1); });

  function loiLuu(err) { D.thongBao('Không lưu được: ' + err.message, 'loi'); }

  luoi.addEventListener('click', function (e) {
    var nut = e.target.closest('[data-luu]');
    if (!nut || nut.disabled) return;
    var ma = nut.getAttribute('data-luu');
    nut.disabled = true;
    S.doiLuu(ma).then(function (kq) {
      veLai();
      var noiLuu = S.laApi() ? '' : ' (lưu tạm trên trình duyệt, chưa lưu lên máy chủ)';
      if (kq) {
        D.thongBao('Đã lưu ' + ma + ' vào mục "Đã lưu"' + noiLuu + '.', null,
          tab === 'da-luu' ? null : { chu: 'Xem mục Đã lưu', lam: function () { chonTab('da-luu'); } });
      } else {
        D.thongBao('Đã bỏ lưu ' + ma + '.', null, { chu: 'Hoàn tác', lam: function () { S.doiLuu(ma, false).then(veLai, loiLuu); } });
      }
    }, function (err) { nut.disabled = false; loiLuu(err); });
  });

  // ---------- Bắt đầu ----------
  (function apThamSoUrl() {
    var ts = new URLSearchParams(location.search);
    var t = ts.get('tab') || '';
    if (cacTab.some(function (x) { return x.getAttribute('data-tab') === t; })) tab = t;
    if (ts.get('q')) boLoc.q = ts.get('q');
    var so = parseInt(ts.get('trang'), 10);
    if (so > 0) trang = so;
  })();
  dongBoOLoc();
  var tDangChon = cacTab.filter(function (x) { return x.getAttribute('data-tab') === tab; })[0];
  if (tDangChon) oTim.placeholder = tDangChon.getAttribute('data-placeholder');
  luoi.innerHTML = '<div class="col-span-full p-10 text-center text-body-sm text-text-secondary">Đang tải bài toán…</div>';
  $('rd-pagination').classList.add('hidden');

  // Nạp dữ liệu (API hoặc mẫu) rồi mới vẽ
  S.napDanhSach().then(function () {
    tatCa = S.layTatCa();
    S.veNguon($('rd-nguon'));
    veLai();
  });

  // Chế độ dữ liệu mẫu: DN đăng / sửa bài ở tab khác của cùng trình duyệt thì cập nhật danh sách ngay
  window.addEventListener('storage', function (e) {
    if (S.laApi()) return;
    if (!e.key || /^uitc\.(dn|sv)\./.test(e.key)) { tatCa = S.layTatCa(); veLai(); }
  });
})();
