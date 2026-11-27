// Dùng chung cho các trang công khai (người chưa đăng nhập): index.html (trang tổng quan) và pages/khach/.
// Cần nạp trước: dn-bai-toan-data.js, sv-bai-toan-rd-data.js, auth.js.
// <body data-goc="">: đường dẫn từ trang tới thư mục frontend/ ('' ở index.html, '../../' ở pages/khach/).
//
// ===== Hợp đồng API công khai (backend làm theo; KHÔNG cần đăng nhập, chỉ trả trường an toàn) =====
//   GET /api/public/overview
//       200 { stats: { openProblems, inProgressProblems, partners, totalFunding },
//             problems: [tóm tắt bài toán Open / In_Progress, cùng dạng /api/student-rd-problems nhưng
//                        KHÔNG có saved, myProposal, fitScore],
//             partners: [{ id, name, industry, address, logoUrl, problemCount }] (chỉ DN đã xác minh / có bài công khai) }
//   GET /api/public/problems/:code
//       200 chi tiết như /api/student-rd-problems/:code nhưng KHÔNG có attachments (có thể thuộc NDA),
//           myProposal, mySkills, options, fitScore | 404 PROBLEM_NOT_FOUND
//   Không bao giờ trả: tên / MSSV / điểm sinh viên, proposal, email liên hệ, tệp đính kèm.
// Không có máy chủ / máy chủ chưa có API này: dùng dữ liệu mẫu (cùng nguồn với SV-09) và báo "dữ liệu minh họa".
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var S = window.SvBaiToanRd;
  var A = window.UitAuth;
  var esc = D.escapeHtml;
  var GOC = document.body.getAttribute('data-goc') || '';

  var LINK = {
    sso: GOC + 'pages/auth/02_dang-nhap-sso-microsoft365.html',
    emailDn: GOC + 'pages/auth/01_dang-nhap-email.html?role=dn',
    dangKy: GOC + 'pages/auth/03_dang-ky-b1-chon-vai-tro.html',
    dangKyDn: GOC + 'pages/auth/09_dang-ky-dn-b1-tai-khoan.html?role=dn',
    tongQuan: GOC + 'index.html',
    chiTiet: function (ma) { return GOC + 'pages/khach/01_chi-tiet-bai-toan-rd.html?ma=' + encodeURIComponent(ma); }
  };

  // Trang chủ của vai trò, tính từ trang công khai
  function trangChu(role) {
    var v = A.VAI_TRO[role];
    return v && v.trangChu ? GOC + 'pages/' + v.trangChu : null;
  }

  // Đăng nhập rồi quay lại trang ứng tuyển của SV (next tính từ pages/auth/)
  function dangNhapDeUngTuyen(ma) {
    return LINK.sso + '?next=' + encodeURIComponent('../sv/13_chi-tiet-bai-toan-rd.html?ma=' + encodeURIComponent(ma));
  }

  // ---------- Dữ liệu ----------
  function khongCoApi(err) { return err.status === 0 || !err.code || err.code === 'NOT_FOUND'; }

  function thongKe(ds) {
    var mo = ds.filter(function (b) { return b.trangThai === 'dang-mo'; });
    var dn = {};
    ds.forEach(function (b) { dn[b.doanhNghiep.ten] = 1; });
    return {
      dangMo: mo.length,
      dangThucHien: ds.filter(function (b) { return b.trangThai === 'dang-thuc-hien'; }).length,
      doiTac: Object.keys(dn).length,
      tongKinhPhi: mo.reduce(function (t, b) { return t + S.nganSachMax(b); }, 0) // triệu VNĐ
    };
  }

  function doiTacTu(ds) {
    var theoTen = {};
    ds.forEach(function (b) {
      var dn = b.doanhNghiep;
      if (!theoTen[dn.ten]) theoTen[dn.ten] = { ten: dn.ten, logo: dn.logo, icon: dn.icon, kyHieu: dn.kyHieu, linhVucHD: dn.linhVucHD, diaChi: dn.diaChi, soBai: 0 };
      theoTen[dn.ten].soBai++;
    });
    return Object.keys(theoTen).map(function (k) { return theoTen[k]; }).sort(function (a, b) { return b.soBai - a.soBai; });
  }

  // Promise → { mau (dữ liệu minh họa?), baiToan, doiTac, thongKe }
  function napTongQuan() {
    function mau() {
      var ds = S.layTatCa();
      return { mau: true, baiToan: ds, doiTac: doiTacTu(ds), thongKe: thongKe(ds) };
    }
    if (!A.coMayChu()) return Promise.resolve(mau());
    return S.goi('/api/public/overview').then(function (d) {
      var ds = d.problems.map(S.baiToanTuApi);
      var tk = d.stats || {};
      return {
        mau: false,
        baiToan: ds,
        doiTac: (d.partners || []).map(function (p) {
          var logo = p.logoUrl && /^\/assets\/img\/[\w.-]+$/.test(p.logoUrl) ? p.logoUrl.replace('/assets/img/', '') : '';
          return { ten: p.name, logo: logo, linhVucHD: p.industry, diaChi: p.address, soBai: p.problemCount,
            kyHieu: String(p.name || '?').split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase() };
        }),
        thongKe: { dangMo: tk.openProblems, dangThucHien: tk.inProgressProblems, doiTac: tk.partners, tongKinhPhi: Math.round((tk.totalFunding || 0) / 1e6) }
      };
    }, function (err) {
      if (khongCoApi(err)) return mau();
      throw err;
    });
  }

  // Promise → { mau, baiToan (null nếu không có / chưa công khai) }
  function napBaiToan(ma) {
    function mau() { return { mau: true, baiToan: S.layTheoMa(ma) }; }
    if (!A.coMayChu()) return Promise.resolve(mau());
    return S.goi('/api/public/problems/' + encodeURIComponent(ma)).then(function (p) {
      return { mau: false, baiToan: S.baiToanTuApi(p) };
    }, function (err) {
      if (err.code === 'PROBLEM_NOT_FOUND' || err.status === 400) return { mau: false, baiToan: null };
      if (khongCoApi(err)) return mau();
      throw err;
    });
  }

  // ---------- Hiển thị ----------
  function logo(dn, lop) {
    lop = lop || 'size-12';
    if (dn.logo) return '<div class="' + lop + ' rounded-lg bg-surface-container border border-border-color overflow-hidden shrink-0"><img class="w-full h-full object-cover" alt="Logo ' + esc(dn.ten) + '" src="' + GOC + 'assets/img/' + esc(dn.logo) + '"></div>';
    if (dn.icon) return '<div class="' + lop + ' rounded-lg bg-brand-light flex items-center justify-center text-primary-container border border-border-color shrink-0"><span class="material-symbols-outlined text-[24px]">' + esc(dn.icon) + '</span></div>';
    return '<div class="' + lop + ' rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm border border-border-color shrink-0">' + esc(dn.kyHieu || String(dn.ten).slice(0, 2)) + '</div>';
  }

  function chuKinhPhi(trieu) {
    if (!trieu) return '0';
    return trieu >= 1000 ? (Math.round(trieu / 100) / 10).toLocaleString('vi-VN') + ' tỷ' : trieu.toLocaleString('vi-VN') + ' triệu';
  }

  // Khu vực tài khoản trên thanh trên cùng (#ck-tai-khoan): khách → Đăng nhập (2 cổng) + Đăng ký; đã đăng nhập → Vào trang của tôi
  function veTaiKhoan() {
    var goc = document.getElementById('ck-tai-khoan');
    if (!goc) return Promise.resolve(null);
    return A.layPhien().then(function (kq) { return kq.user; }, function () { return null; }).then(function (user) {
      if (user) {
        var nha = trangChu(user.role);
        goc.innerHTML = '<span class="hidden md:inline text-body-sm text-text-secondary max-w-[200px] truncate" title="' + esc(user.email) + '">' + esc(user.fullName || user.email) + '</span>' +
          (nha ? '<a class="h-10 px-4 rounded-lg bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold flex items-center gap-1.5" href="' + nha + '" data-vao-trang>' +
            '<span class="material-symbols-outlined text-[18px]">dashboard</span>Vào trang của tôi</a>' : '') +
          '<button class="h-10 px-3 rounded-lg border border-border-color text-text-main hover:bg-surface-container text-body-sm font-semibold" type="button" data-dang-xuat>Đăng xuất</button>';
        goc.querySelector('[data-dang-xuat]').addEventListener('click', function () {
          A.dangXuat().then(function () { window.location.replace(LINK.tongQuan + '?ly-do=da-dang-xuat'); });
        });
        return user;
      }
      goc.innerHTML = '<div class="relative" data-menu-dang-nhap>' +
        '<button class="h-10 px-4 rounded-lg border border-primary-container text-primary-container hover:bg-brand-light text-body-sm font-semibold flex items-center gap-1" type="button" aria-haspopup="menu" aria-expanded="false" data-mo-menu>' +
        'Đăng nhập<span class="material-symbols-outlined text-[18px]">expand_more</span></button>' +
        '<div class="hidden absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] bg-white rounded-xl border border-border-color shadow-lg p-2 z-50" role="menu">' +
        '<a class="flex items-start gap-3 rounded-lg p-3 hover:bg-surface-container-low" role="menuitem" href="' + LINK.sso + '">' +
        '<span class="material-symbols-outlined text-[22px] text-primary-container mt-0.5">school</span><span><span class="block text-body-md font-semibold text-text-main">Sinh viên / Giảng viên</span>' +
        '<span class="block text-body-xs text-text-secondary">UIT SSO, email @gm.uit.edu.vn hoặc @uit.edu.vn</span></span></a>' +
        '<a class="flex items-start gap-3 rounded-lg p-3 hover:bg-surface-container-low" role="menuitem" href="' + LINK.emailDn + '">' +
        '<span class="material-symbols-outlined text-[22px] text-primary-container mt-0.5">corporate_fare</span><span><span class="block text-body-md font-semibold text-text-main">Doanh nghiệp</span>' +
        '<span class="block text-body-xs text-text-secondary">Email và mật khẩu</span></span></a></div></div>' +
        '<a class="h-10 px-4 rounded-lg bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold flex items-center" href="' + LINK.dangKy + '">Đăng ký</a>';
      var menu = goc.querySelector('[role="menu"]');
      var nut = goc.querySelector('[data-mo-menu]');
      function dong() { menu.classList.add('hidden'); nut.setAttribute('aria-expanded', 'false'); }
      nut.addEventListener('click', function (e) {
        e.stopPropagation();
        var mo = menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !mo);
        nut.setAttribute('aria-expanded', String(mo));
        if (mo) menu.querySelector('a').focus();
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('[data-menu-dang-nhap]')) dong(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { dong(); nut.focus(); } });
      return null;
    });
  }

  // Thông báo đầu trang (#ck-thong-bao): đã đăng xuất / dữ liệu minh họa
  function baoDauTrang(chu, loai) {
    var el = document.getElementById('ck-thong-bao');
    if (!el || !chu) return;
    var mau = loai === 'thanh-cong' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900';
    var icon = loai === 'thanh-cong' ? 'check_circle' : 'info';
    el.className = 'max-w-[1200px] mx-auto px-4 sm:px-6 mt-4';
    el.innerHTML = '<div class="flex items-start gap-2 rounded-lg border px-4 py-2.5 text-body-sm ' + mau + '" role="status">' +
      '<span class="material-symbols-outlined text-[18px] shrink-0">' + icon + '</span><p class="flex-1"></p>' +
      '<button class="shrink-0 text-current opacity-70 hover:opacity-100" type="button" aria-label="Đóng thông báo"><span class="material-symbols-outlined text-[18px]">close</span></button></div>';
    el.querySelector('p').textContent = chu;
    el.querySelector('button').addEventListener('click', function () { el.innerHTML = ''; });
  }

  window.CongKhai = {
    GOC: GOC,
    LINK: LINK,
    trangChu: trangChu,
    dangNhapDeUngTuyen: dangNhapDeUngTuyen,
    napTongQuan: napTongQuan,
    napBaiToan: napBaiToan,
    logo: logo,
    chuKinhPhi: chuKinhPhi,
    veTaiKhoan: veTaiKhoan,
    baoDauTrang: baoDauTrang
  };
})();
