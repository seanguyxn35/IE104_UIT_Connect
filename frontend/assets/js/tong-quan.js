// Trang tổng quan công khai (index.html) cho người chưa đăng nhập. Cần cong-khai.js nạp trước.
//   - Số liệu, bài toán tiêu điểm, bài toán R&D đang công khai (lọc khi bấm "Lọc", "Xem thêm" mỗi lần 6 bài), đối tác
//   - Chỉ hiện dữ liệu đã duyệt công khai, không có thông tin cá nhân; mọi hành động cần đăng nhập
//   - Đã đăng nhập: thanh trên cùng đổi thành "Vào trang của tôi"
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var S = window.SvBaiToanRd;
  var C = window.CongKhai;
  var esc = D.escapeHtml;
  var MOI_LAN = 6;

  function $(id) { return document.getElementById(id); }

  var tatCa = [];
  var soHien = MOI_LAN;
  var boLoc = { q: '', linhVuc: '', loai: '' };

  // ---------- Đầu trang ----------
  var ts = new URLSearchParams(window.location.search);
  if (ts.get('ly-do') === 'da-dang-xuat') {
    C.baoDauTrang('Bạn đã đăng xuất. Hẹn gặp lại!', 'thanh-cong');
    try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) { /* file:// */ }
  }
  C.veTaiKhoan().then(function (user) {
    // Đã đăng nhập: nút trong khối giới thiệu cũng dẫn vào trang của tôi
    if (!user) return;
    var nha = C.trangChu(user.role);
    Array.prototype.forEach.call(document.querySelectorAll('[data-cta-khach]'), function (el) { el.classList.add('hidden'); });
    var vao = $('tq-cta-da-dang-nhap');
    if (vao && nha) { vao.classList.remove('hidden'); vao.href = nha; }
  });

  // ---------- Thẻ bài toán ----------
  function the(b) {
    var loai = S.LOAI_SV[b.loai] || S.LOAI_SV['ung-tuyen'];
    var nhan = S.tinhTrangNhan(b);
    var url = C.LINK.chiTiet(b.ma);
    return '<article class="bg-surface-container-lowest rounded-lg border border-border-color p-5 flex flex-col justify-between hover:shadow-md transition-shadow">' +
      '<div class="space-y-3">' +
        '<div class="flex items-center gap-3 min-w-0">' + C.logo(b.doanhNghiep) +
          '<div class="min-w-0"><p class="text-sm font-bold text-text-main line-clamp-1">' + esc(b.doanhNghiep.ten) + '</p>' +
          '<p class="text-body-xs text-text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span><span class="line-clamp-1">' + esc(b.doanhNghiep.diaChi) + '</span></p></div>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-x-2 gap-y-1">' +
          '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold border whitespace-nowrap ' + loai.lop + '">' + esc(loai.ten) + '</span>' +
          '<span class="text-[11px] font-mono text-text-secondary">' + esc(b.ma) + (b.linhVuc ? ' · ' + esc(D.tenLinhVuc(b.linhVuc, true)) : '') + '</span>' +
        '</div>' +
        '<h3 class="text-base font-bold text-text-main line-clamp-2"><a class="hover:text-primary-container" href="' + url + '">' + esc(b.tieuDe) + '</a></h3>' +
        '<p class="text-body-sm text-text-secondary line-clamp-3 leading-relaxed">' + esc(b.tomTat || D.chuTuHtml(b.moTa)) + '</p>' +
        '<div class="flex flex-wrap gap-1.5">' + (b.kyNang || []).slice(0, 3).map(function (k) {
          return '<span class="px-2 py-0.5 rounded-sm bg-surface-container text-text-secondary text-body-xs font-medium">' + esc(k) + '</span>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="mt-4 pt-3 border-t border-border-color space-y-3">' +
        '<div class="flex items-center justify-between gap-2 text-body-xs text-text-secondary">' +
          '<span class="flex items-center gap-1.5 font-medium text-primary-container"><span class="material-symbols-outlined text-[18px]">payments</span>' + esc(S.chuoiKinhPhi(b)) + '</span>' +
          '<span class="flex items-center gap-1 ' + nhan.lop + '"><span class="material-symbols-outlined text-[16px]">schedule</span>' +
            (nhan.moNhan ? 'Hạn: ' + esc(D.dinhDangNgay(b.hanNop)) : esc(nhan.ten)) + '</span>' +
        '</div>' +
        '<a class="h-9 rounded bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold flex items-center justify-center gap-1.5" href="' + url + '">' +
          'Xem chi tiết<span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>' +
      '</div>' +
    '</article>';
  }

  function khop(b) {
    if (boLoc.linhVuc && b.linhVuc !== boLoc.linhVuc) return false;
    if (boLoc.loai && b.loai !== boLoc.loai) return false;
    if (!boLoc.q) return true;
    var chu = D.chuanHoa([b.ma, b.tieuDe, b.tomTat, b.doanhNghiep.ten, (b.kyNang || []).join(' ')].join(' '));
    return D.chuanHoa(boLoc.q).split(/\s+/).filter(Boolean).every(function (t) { return chu.indexOf(t) !== -1; });
  }

  // Bài còn nhận hồ sơ lên trước, trong nhóm thì bài mới đăng trước
  function sapXep(ds) {
    return ds.sort(function (a, b) {
      var ma = S.tinhTrangNhan(a).moNhan ? 0 : 1;
      var mb = S.tinhTrangNhan(b).moNhan ? 0 : 1;
      if (ma !== mb) return ma - mb;
      return String(b.ngayDang).localeCompare(String(a.ngayDang));
    });
  }

  function veLuoi() {
    var ds = sapXep(tatCa.filter(khop));
    $('tq-luoi').innerHTML = ds.slice(0, soHien).map(the).join('');
    $('tq-rong').classList.toggle('hidden', ds.length > 0);
    $('tq-xem-them').classList.toggle('hidden', ds.length <= soHien);
    $('tq-dem').textContent = ds.length;
  }

  function veTieuDiem() {
    var mo = tatCa.filter(function (b) { return S.tinhTrangNhan(b).moNhan; });
    if (!mo.length) { $('tq-tieu-diem').classList.add('hidden'); return; }
    var b = mo.sort(function (x, y) { return S.nganSachMax(y) - S.nganSachMax(x); })[0];
    var nhan = S.tinhTrangNhan(b);
    $('tq-tieu-diem-noi-dung').innerHTML =
      '<p class="text-body-sm text-white/80 flex items-center gap-2">' + esc(b.doanhNghiep.ten) + ' · ' + esc(S.LOAI_SV[b.loai].ten) + '</p>' +
      '<h3 class="text-xl md:text-2xl font-bold text-white leading-snug">' + esc(b.tieuDe) + '</h3>' +
      '<p class="text-body-md text-white/85 line-clamp-2">' + esc(b.tomTat || D.chuTuHtml(b.moTa)) + '</p>' +
      '<div class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-white/90">' +
        '<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">payments</span>' + esc(S.chuoiKinhPhi(b)) + '</span>' +
        '<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">schedule</span>' + esc(nhan.ten) + '</span>' +
      '</div>' +
      '<a class="inline-flex w-fit h-10 px-5 rounded-lg bg-white text-primary-container hover:bg-brand-light text-body-sm font-bold items-center gap-1.5" href="' + C.LINK.chiTiet(b.ma) + '">' +
        'Xem chi tiết<span class="material-symbols-outlined text-[18px]">arrow_forward</span></a>';
  }

  function veDoiTac(ds) {
    $('tq-doi-tac').innerHTML = ds.slice(0, 12).map(function (d) {
      return '<div class="bg-surface-container-lowest rounded-lg border border-border-color p-4 flex items-center gap-3">' + C.logo(d, 'size-11') +
        '<div class="min-w-0"><p class="text-body-md font-semibold text-text-main line-clamp-1">' + esc(d.ten) + '</p>' +
        '<p class="text-body-xs text-text-secondary line-clamp-1">' + esc(d.linhVucHD || d.diaChi || '') + '</p>' +
        '<p class="text-body-xs text-primary-container font-medium">' + d.soBai + ' bài toán công khai</p></div></div>';
    }).join('');
  }

  function veThongKe(tk) {
    $('tq-so-dang-mo').textContent = tk.dangMo;
    $('tq-so-doi-tac').textContent = tk.doiTac;
    $('tq-so-kinh-phi').textContent = C.chuKinhPhi(tk.tongKinhPhi);
    $('tq-so-thuc-hien').textContent = tk.dangThucHien;
  }

  // ---------- Lọc ----------
  D.LINH_VUC.forEach(function (lv) {
    var o = document.createElement('option');
    o.value = lv.id;
    o.textContent = lv.ngan;
    $('tq-loc-linh-vuc').appendChild(o);
  });
  $('tq-form-loc').addEventListener('submit', function (e) {
    e.preventDefault();
    boLoc = { q: $('tq-tim').value.trim(), linhVuc: $('tq-loc-linh-vuc').value, loai: $('tq-loc-loai').value };
    soHien = MOI_LAN;
    veLuoi();
  });
  $('tq-dat-lai').addEventListener('click', function () {
    $('tq-form-loc').reset();
    boLoc = { q: '', linhVuc: '', loai: '' };
    soHien = MOI_LAN;
    veLuoi();
  });
  $('tq-xem-them').addEventListener('click', function () { soHien += MOI_LAN; veLuoi(); });

  // ---------- Nạp dữ liệu ----------
  $('tq-luoi').innerHTML = '<div class="col-span-full p-10 text-center text-body-sm text-text-secondary">Đang tải bài toán…</div>';
  C.napTongQuan().then(function (kq) {
    tatCa = kq.baiToan;
    veThongKe(kq.thongKe);
    veTieuDiem();
    veDoiTac(kq.doiTac);
    veLuoi();
    if (kq.mau) $('tq-nguon').classList.remove('hidden');
  }, function () {
    $('tq-luoi').innerHTML = '<div class="col-span-full p-10 text-center text-body-sm text-error">Không tải được dữ liệu. Hãy tải lại trang.</div>';
  });
})();
