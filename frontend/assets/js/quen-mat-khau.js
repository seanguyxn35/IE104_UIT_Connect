// Quên mật khẩu, dùng chung cho 2 cổng (cần auth.js nạp trước):
//   UIT SSO (SV, GV, Admin): auth/07 (email + mã) → auth/08 (mật khẩu mới)
//   Doanh nghiệp:            auth/14 (email + mã) → auth/15 (mật khẩu mới)
// Trang khai báo bằng <section data-quen-mk="b1|b2" data-cong="uit|business" data-buoc-kia="..." data-dang-nhap="...">.
//   b1: nhập email (đúng cổng) → gửi mã 6 chữ số → nhập mã. Nút "Gửi lại email" khóa 60 giây, đếm ngược
//       "Gửi lại email (60s)"; hết giờ thành "Gửi lại email", bấm thì gửi mã mới và đếm lại từ 60.
//       Mở lại trang trong lúc đang chờ thì vẫn giữ email và thời gian đếm còn lại.
//   b2: mật khẩu mới (≥ 8 ký tự, hoa, thường, số, ký tự đặc biệt) + nhập lại; xong về màn đăng nhập của cổng.
// Trạng thái giữa 2 bước lưu trong sessionStorage của tab (email, lúc gửi, mã đặt lại); không lưu mật khẩu.
(function () {
  'use strict';

  var A = window.UitAuth;
  var goc = document.querySelector('[data-quen-mk]');
  if (!A || !goc) return;
  var BUOC = goc.getAttribute('data-quen-mk');
  var CONG = goc.getAttribute('data-cong');
  var KHOA = 'uitc.auth.quenMk.' + CONG + '.v1';
  var HET_HAN_MA_MS = 10 * 60 * 1000;

  function $(id) { return document.getElementById(id); }

  function docTrangThai() {
    try {
      var t = JSON.parse(window.sessionStorage.getItem(KHOA) || 'null');
      return t && t.email ? t : null;
    } catch (e) { return null; }
  }
  function ghiTrangThai(t) {
    try {
      if (t) window.sessionStorage.setItem(KHOA, JSON.stringify(t));
      else window.sessionStorage.removeItem(KHOA);
    } catch (e) { /* trình duyệt chặn lưu: trạng thái chỉ sống trong trang hiện tại */ }
  }

  // Che bớt email: nguyenvana@gm.uit.edu.vn → ngu*****@gm.uit.edu.vn
  function emailAn(email) {
    var p = String(email).split('@');
    var ten = p[0];
    return (ten.length <= 3 ? ten[0] + '**' : ten.slice(0, 3) + '*'.repeat(Math.min(ten.length - 3, 5))) + '@' + p[1];
  }

  var MAU = {
    'loi': 'bg-red-50 border-red-200 text-red-700',
    'canh-bao': 'bg-amber-50 border-amber-200 text-amber-900',
    'thanh-cong': 'bg-emerald-50 border-emerald-200 text-emerald-800',
    'thong-tin': 'bg-blue-50 border-blue-200 text-blue-900'
  };
  var ICON = { 'loi': 'error', 'canh-bao': 'warning', 'thanh-cong': 'check_circle', 'thong-tin': 'info' };
  function bao(el, loai, chu, lienKet) {
    if (!el) return;
    if (!chu) { el.className = 'hidden'; el.textContent = ''; return; }
    el.className = 'flex items-start gap-2 rounded-lg border px-3 py-2 mb-4 text-[12px] leading-[1.5] text-left ' + MAU[loai];
    el.innerHTML = '<span class="material-symbols-outlined text-[16px] shrink-0">' + ICON[loai] + '</span><span class="flex-1"><span></span></span>';
    el.querySelector('.flex-1 > span').textContent = chu;
    if (lienKet) {
      var a = document.createElement('a');
      a.href = lienKet.href;
      a.className = 'block mt-1 font-semibold underline underline-offset-2 hover:no-underline';
      a.textContent = lienKet.chu + ' →';
      el.querySelector('.flex-1').appendChild(a);
    }
  }

  function nutBan(nut, ban, chuBan) {
    if (!nut.dataset.chuGoc) nut.dataset.chuGoc = nut.innerHTML;
    nut.disabled = ban;
    nut.innerHTML = ban
      ? '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>' + chuBan + '</span>'
      : nut.dataset.chuGoc;
  }

  function baoXemThu(el) {
    bao(el, 'thong-tin', 'Chưa kết nối máy chủ: đang ở chế độ xem thử, không gửi email thật. Nhập 6 chữ số bất kỳ để tiếp tục.');
  }

  // ======================= BƯỚC 1: email + mã =======================
  function buoc1() {
    var hopLoi = $('qm-loi');
    var dem = null;
    var tt = docTrangThai();

    function hienBuoc(ten) {
      $('qm-buoc-email').classList.toggle('hidden', ten !== 'email');
      $('qm-buoc-ma').classList.toggle('hidden', ten !== 'ma');
      bao(hopLoi);
      if (ten === 'email') { $('qm-email').focus(); return; }
      $('qm-email-an').textContent = emailAn(tt.email);
      oMa[0].focus();
    }

    // ---- Đếm ngược gửi lại ----
    var nutGuiLai = $('qm-gui-lai');
    function veDemNguoc() {
      var con = tt ? Math.ceil((tt.guiLuc + tt.choGuiLai * 1000 - Date.now()) / 1000) : 0;
      if (con > 0) {
        nutGuiLai.disabled = true;
        nutGuiLai.innerHTML = '<span class="material-symbols-outlined text-[18px]">schedule</span><span>Gửi lại email (' + con + 's)</span>';
        nutGuiLai.setAttribute('aria-label', 'Gửi lại email, còn ' + con + ' giây');
      } else {
        clearInterval(dem);
        dem = null;
        nutGuiLai.disabled = false;
        nutGuiLai.innerHTML = '<span class="material-symbols-outlined text-[18px]">forward_to_inbox</span><span>Gửi lại email</span>';
        nutGuiLai.setAttribute('aria-label', 'Gửi lại email');
      }
    }
    function batDemNguoc() {
      clearInterval(dem);
      veDemNguoc();
      dem = setInterval(veDemNguoc, 1000);
    }

    // ---- Gửi mã (lần đầu hoặc gửi lại) ----
    function guiMa(email, nut, laGuiLai) {
      bao(hopLoi);
      nutBan(nut, true, 'Đang gửi...');
      return A.yeuCauDatLai(email, CONG).then(function (kq) {
        nutBan(nut, false);
        tt = { email: email, guiLuc: Date.now(), choGuiLai: kq.resendAfter || 60, xemThu: kq.xemThu };
        ghiTrangThai(tt);
        oMa.forEach(function (o) { o.value = ''; });
        hienBuoc('ma');
        batDemNguoc();
        if (kq.xemThu) baoXemThu(hopLoi);
        else if (laGuiLai) bao(hopLoi, 'thanh-cong', 'Đã gửi mã mới. Mã cũ không còn dùng được.');
      }, function (err) {
        nutBan(nut, false);
        if (err.code === 'RESEND_TOO_SOON') { batDemNguoc(); }
        var lienKet = err.sangCong ? { chu: 'Chuyển sang ' + A.CONG[err.sangCong].ten, href: A.CONG[err.sangCong].trang + (err.sangCong === 'business' ? '?role=dn' : '') } : null;
        bao(hopLoi, err.status === 429 ? 'canh-bao' : 'loi', err.message, lienKet);
      });
    }

    $('qm-form-email').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('qm-email').value.trim();
      guiMa(email, $('qm-nut-gui'), false);
    });

    nutGuiLai.addEventListener('click', function () {
      if (nutGuiLai.disabled || !tt) return;
      guiMa(tt.email, nutGuiLai, true).then(function () { if (!dem) batDemNguoc(); });
    });

    $('qm-doi-email').addEventListener('click', function () {
      clearInterval(dem);
      var cu = tt ? tt.email : '';
      tt = null;
      ghiTrangThai(null);
      $('qm-email').value = cu;
      hienBuoc('email');
      $('qm-email').select();
    });

    // ---- 6 ô nhập mã: tự nhảy ô, dán cả mã, xóa lùi ----
    var oMa = Array.prototype.slice.call(document.querySelectorAll('.qm-o-ma'));
    oMa.forEach(function (o, i) {
      o.addEventListener('input', function () {
        var so = o.value.replace(/\D/g, '');
        if (so.length > 1) {
          // Dán cả mã vào một ô
          so.slice(0, 6 - i).split('').forEach(function (c, k) { oMa[i + k].value = c; });
          oMa[Math.min(i + so.length, 5)].focus();
          return;
        }
        o.value = so;
        if (so && i < 5) oMa[i + 1].focus();
      });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !o.value && i > 0) { oMa[i - 1].focus(); oMa[i - 1].value = ''; e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i > 0) oMa[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 5) oMa[i + 1].focus();
      });
    });

    $('qm-form-ma').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!tt) { hienBuoc('email'); return; }
      var ma = oMa.map(function (o) { return o.value; }).join('');
      if (!/^\d{6}$/.test(ma)) { bao(hopLoi, 'loi', 'Nhập đủ 6 chữ số của mã xác thực.'); oMa[ma.length < 6 ? ma.length : 0].focus(); return; }
      if (Date.now() - tt.guiLuc > HET_HAN_MA_MS) { bao(hopLoi, 'loi', 'Mã xác thực đã hết hạn (10 phút). Hãy bấm "Gửi lại email" để nhận mã mới.'); return; }
      var nut = $('qm-nut-xac-nhan');
      nutBan(nut, true, 'Đang kiểm tra...');
      A.xacThucMa(tt.email, CONG, ma).then(function (kq) {
        tt.resetToken = kq.resetToken;
        ghiTrangThai(tt);
        window.location.href = goc.getAttribute('data-buoc-kia');
      }, function (err) {
        nutBan(nut, false);
        bao(hopLoi, err.status === 429 ? 'canh-bao' : 'loi', err.message);
        oMa.forEach(function (o) { o.value = ''; });
        oMa[0].focus();
      });
    });

    // ---- Khi mở trang ----
    var emailUrl = new URLSearchParams(window.location.search).get('email');
    if (tt && !tt.resetToken && Date.now() - tt.guiLuc < HET_HAN_MA_MS) {
      hienBuoc('ma');
      batDemNguoc();
      if (tt.xemThu) baoXemThu(hopLoi);
    } else {
      if (tt && !tt.resetToken) ghiTrangThai(null);
      tt = null;
      if (emailUrl) $('qm-email').value = emailUrl;
      hienBuoc('email');
    }
  }

  // ======================= BƯỚC 2: mật khẩu mới =======================
  function buoc2() {
    var hopLoi = $('qm-loi');
    var tt = docTrangThai();
    if (!tt || !tt.resetToken) {
      $('qm-form-mk').classList.add('hidden');
      bao(hopLoi, 'canh-bao', 'Bạn cần nhập email và mã xác thực trước khi đặt mật khẩu mới.',
        { chu: 'Bắt đầu từ bước nhập email', href: goc.getAttribute('data-buoc-kia') });
      return;
    }
    $('qm-email-an').textContent = emailAn(tt.email);
    var oMk = $('qm-mk');
    var oMk2 = $('qm-mk2');
    var TEN_MUC = ['Yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
    var MAU_MUC = ['bg-error', 'bg-error', 'bg-amber-500', 'bg-secondary', 'bg-tertiary-container'];

    function veDoManh() {
      var m = A.doManhMatKhau(oMk.value);
      Array.prototype.forEach.call(document.querySelectorAll('[data-tieu-chi]'), function (el) {
        var dat = m[el.getAttribute('data-tieu-chi')];
        el.classList.toggle('text-tertiary-container', dat);
        el.classList.toggle('text-on-surface-variant', !dat);
        el.querySelector('.material-symbols-outlined').textContent = dat ? 'check_circle' : 'radio_button_unchecked';
      });
      Array.prototype.forEach.call(document.querySelectorAll('#qm-thanh > div'), function (v, i) {
        v.className = 'rounded-full h-full ' + (oMk.value && i < m.diem ? MAU_MUC[m.diem] : 'bg-surface-variant');
      });
      $('qm-muc').textContent = oMk.value ? TEN_MUC[m.diem] : 'Chưa nhập';
      veKhop();
      return m;
    }
    function veKhop() {
      var khop = $('qm-khop');
      if (!oMk2.value) { khop.textContent = ''; return; }
      var dung = oMk.value === oMk2.value;
      khop.className = 'font-caption text-caption flex items-center gap-0.5 ' + (dung ? 'text-tertiary-container' : 'text-error');
      khop.innerHTML = '<span class="material-symbols-outlined text-[14px]">' + (dung ? 'done_all' : 'close') + '</span>' + (dung ? 'Khớp' : 'Chưa khớp');
    }
    oMk.addEventListener('input', veDoManh);
    oMk2.addEventListener('input', veKhop);
    veDoManh();

    Array.prototype.forEach.call(document.querySelectorAll('[data-hien-mk]'), function (nut) {
      nut.addEventListener('click', function () {
        var o = $(nut.getAttribute('data-hien-mk'));
        var hien = o.type === 'password';
        o.type = hien ? 'text' : 'password';
        nut.querySelector('.material-symbols-outlined').textContent = hien ? 'visibility_off' : 'visibility';
        nut.setAttribute('aria-label', hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      });
    });

    $('qm-form-mk').addEventListener('submit', function (e) {
      e.preventDefault();
      bao(hopLoi);
      var m = veDoManh();
      if (!m.dat) { bao(hopLoi, 'loi', 'Mật khẩu chưa đạt đủ 4 tiêu chí bên dưới.'); oMk.focus(); return; }
      if (oMk.value !== oMk2.value) { bao(hopLoi, 'loi', 'Mật khẩu nhập lại chưa khớp.'); oMk2.focus(); return; }
      var nut = $('qm-nut-dat');
      nutBan(nut, true, 'Đang lưu...');
      A.datMatKhauMoi(tt.resetToken, oMk.value).then(function () {
        ghiTrangThai(null);
        window.location.replace(goc.getAttribute('data-dang-nhap'));
      }, function (err) {
        nutBan(nut, false);
        var lienKet = err.code === 'TOKEN_EXPIRED' ? { chu: 'Làm lại từ bước nhập email', href: goc.getAttribute('data-buoc-kia') } : null;
        if (err.code === 'TOKEN_EXPIRED') ghiTrangThai(null);
        bao(hopLoi, 'loi', err.message, lienKet);
      });
    });
  }

  if (BUOC === 'b1') buoc1();
  else buoc2();
})();
