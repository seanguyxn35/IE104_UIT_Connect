// Bảo vệ các trang theo vai trò (pages/sv, pages/gv, pages/dn). Nạp trong <head>, ngay sau auth.js.
//   - Có máy chủ đăng nhập: ẩn trang cho tới khi kiểm tra xong phiên
//       chưa đăng nhập      → về màn đăng nhập, kèm ?next= để quay lại đúng trang
//       sai vai trò          → về trang chủ của vai trò đang đăng nhập (SV không mở được trang DN, ...)
//       đúng vai trò         → hiện trang, điền tên người dùng vào hộp thoại đăng xuất và ảnh đại diện
//   - Chế độ xem thử (file://, GitHub Pages, máy chủ chưa có /api/auth): không chặn, hiện dải báo "chế độ xem thử"
// Hộp thoại đăng xuất gọi dangXuat() (định nghĩa ở đây).
(function () {
  'use strict';

  var A = window.UitAuth;
  var m = /\/pages\/(sv|gv|dn)\/([\w-]+\.html)/.exec(window.location.pathname);
  if (!A || !m) return;
  var MA = m[1];
  var CAN = A.VAI_TRO_THEO_MA[MA];
  var trangNay = '../' + MA + '/' + m[2] + window.location.search + window.location.hash;
  var KHOA_AN_DAI_BAO = 'uitc.auth.anDaiBao.v1';
  var root = document.documentElement;

  // Ẩn nội dung trong lúc kiểm tra phiên (tránh lộ trang rồi mới chuyển hướng)
  var kieu = document.createElement('style');
  kieu.textContent = 'html[data-auth="dang-kiem-tra"] body{visibility:hidden}' +
    '#uitc-xem-thu{position:fixed;left:12px;bottom:12px;z-index:45;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:8px;' +
    'padding:6px 8px 6px 12px;border-radius:999px;background:#fff7e6;border:1px solid #f5d08a;color:#7a4b00;font:500 12px/16px Inter,sans-serif;' +
    'box-shadow:0 1px 4px rgba(0,0,0,.08)}#uitc-xem-thu button{border:0;background:transparent;color:inherit;cursor:pointer;padding:2px 4px;font-size:14px;line-height:1}';
  document.head.appendChild(kieu);

  function hienTrang() { root.removeAttribute('data-auth'); }

  function sauKhiTai(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function kyHieu(ten) {
    // Bỏ học hàm và các cụm toàn số (MSSV) trước khi lấy chữ cái: "Sinh viên 24521228" → "SV"
    var t = String(ten || '').replace(/^(GS\.TS|PGS\.TS|TS|ThS)\.?\s*/, '').trim().split(/\s+/)
      .filter(function (w) { return !/^\d+$/.test(w); });
    if (!t[0]) return '?';
    return (t.length > 1 ? t[t.length - 2][0] + t[t.length - 1][0] : t[0].slice(0, 2)).toUpperCase();
  }

  // Điền tên người dùng: dòng "Phiên làm việc: ..." trong hộp thoại đăng xuất và ô chữ viết tắt trên thanh trên cùng
  function dienNguoiDung(user) {
    sauKhiTai(function () {
      var the = document.getElementById('logout-modal-card');
      if (the) {
        Array.prototype.forEach.call(the.querySelectorAll('p'), function (p) {
          if (/^\s*Phiên làm việc:/.test(p.textContent)) {
            p.textContent = 'Phiên làm việc: ' + (user.fullName || user.email) + (user.email ? ' (' + user.email + ')' : '') + (user.xemThu ? ' · xem thử' : '');
          }
        });
      }
      // Khối người dùng trên thanh trên cùng: SV chỉ có ô chữ viết tắt; GV/DN có thêm tên và một dòng phụ
      Array.prototype.forEach.call(document.querySelectorAll('header [onclick*="openLogoutModal"]'), function (el) {
        if (el.querySelector('img')) return;
        var la = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*'))).filter(function (x) {
          return !x.children.length && x.textContent.trim().length >= 1 && x.textContent.trim().length <= 3;
        })[0];
        if (la) la.textContent = kyHieu(user.fullName || user.email);
        var ten = Array.prototype.slice.call(el.querySelectorAll('span')).filter(function (x) { return x.textContent.trim().length > 3; })[0];
        if (ten) {
          ten.textContent = user.fullName || user.email;
          var phu = ten.nextElementSibling;
          if (phu && phu.tagName === 'SPAN') phu.textContent = user.email || A.VAI_TRO[user.role].ten;
        }
      });
    });
  }

  function daiBaoXemThu(user) {
    try { if (window.sessionStorage.getItem(KHOA_AN_DAI_BAO)) return; } catch (e) { /* bỏ qua */ }
    sauKhiTai(function () {
      if (document.getElementById('uitc-xem-thu')) return;
      var dai = document.createElement('div');
      dai.id = 'uitc-xem-thu';
      dai.setAttribute('role', 'status');
      var ai = user ? (user.fullName || user.email) + ' – ' + A.VAI_TRO[user.role].ten : 'chưa đăng nhập';
      dai.innerHTML = '<span>Chế độ xem thử: chưa xác thực thật (' + ai.replace(/[<>&"]/g, '') + ')</span>' +
        '<button type="button" aria-label="Ẩn thông báo chế độ xem thử">×</button>';
      dai.querySelector('button').addEventListener('click', function () {
        dai.remove();
        try { window.sessionStorage.setItem(KHOA_AN_DAI_BAO, '1'); } catch (e) { /* bỏ qua */ }
      });
      document.body.appendChild(dai);
    });
  }

  // ---------- Đăng xuất (nút trong hộp thoại đăng xuất) ----------
  // dich: 'dang-ky' → sang màn chọn vai trò để đăng ký tài khoản mới; mặc định → màn đăng nhập
  window.dangXuat = function (dich) {
    var nut = document.activeElement;
    if (nut && nut.tagName === 'BUTTON') nut.disabled = true;
    A.dangXuat().then(function () {
      var vaiTro = MA === 'sv' ? '' : '?role=' + MA;
      window.location.replace(dich === 'dang-ky' ? '../auth/03_dang-ky-b1-chon-vai-tro.html' + vaiTro : A.trangDangNhap(MA, null, 'da-dang-xuat'));
    });
  };

  // ---------- Kiểm tra phiên ----------
  if (!A.coMayChu()) {
    var p = null;
    A.layPhien().then(function (kq) { p = kq.user; if (p) dienNguoiDung(p); daiBaoXemThu(p); });
    return;
  }

  root.setAttribute('data-auth', 'dang-kiem-tra');
  // Máy chủ treo: sau 8 giây vẫn hiện trang (API của trang sẽ tự báo lỗi), không để trang trắng
  var hetGio = setTimeout(hienTrang, 8000);

  A.layPhien().then(function (kq) {
    if (kq.xemThu) {
      clearTimeout(hetGio);
      hienTrang();
      if (kq.user) dienNguoiDung(kq.user);
      daiBaoXemThu(kq.user);
      return;
    }
    if (!kq.user) {
      window.location.replace(A.trangDangNhap(MA, trangNay, 'het-phien'));
      return;
    }
    if (kq.user.role !== CAN) {
      var nha = A.trangChu(kq.user.role);
      window.location.replace(nha ? nha : A.trangDangNhap(MA, null, 'sai-vai-tro'));
      return;
    }
    clearTimeout(hetGio);
    window.UIT_USER = kq.user;
    dienNguoiDung(kq.user);
    hienTrang();
  }, function () {
    // Lỗi máy chủ khác (500...): hiện trang, các API của trang sẽ tự báo lỗi
    clearTimeout(hetGio);
    hienTrang();
  });
})();
