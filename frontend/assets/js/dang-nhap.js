// Màn đăng nhập: auth/02 "UIT SSO" (SV, GV, Admin) và auth/01 "Email và mật khẩu" (Doanh nghiệp). Cần auth.js nạp trước.
// Cổng lấy từ <form data-cong="uit|business">.
//   - Email không thuộc cổng: báo ngay (khi rời ô email và khi bấm đăng nhập), không gửi lên máy chủ,
//     kèm nút chuyển sang đúng màn (giữ email đã nhập)
//       UIT SSO: chỉ @gm.uit.edu.vn → SV, @uit.edu.vn → GV (email Admin quy định → Admin)
//       Email và mật khẩu: email khác UIT → Doanh nghiệp
//   - Đăng nhập xong vào trang chủ theo VAI TRÒ MÁY CHỦ TRẢ VỀ; có ?next= hợp lệ (trang cùng vai trò) thì quay lại trang đó
//   - Lỗi hiện ngay trên form; đã đăng nhập sẵn thì chuyển thẳng vào trang chủ
//   - Chưa có máy chủ đăng nhập: chế độ xem thử, báo rõ trên form
(function () {
  'use strict';

  var A = window.UitAuth;
  var ts = new URLSearchParams(window.location.search);
  var tiep = ts.get('next');
  var lyDo = ts.get('ly-do');
  var form = document.querySelector('form[data-cong]');
  if (!A || !form) return;
  var CONG = form.getAttribute('data-cong');

  function $(id) { return document.getElementById(id); }

  var LY_DO = {
    'het-phien': { loai: 'canh-bao', chu: 'Bạn cần đăng nhập để tiếp tục (phiên đăng nhập chưa có hoặc đã hết hạn).' },
    'da-dang-xuat': { loai: 'thanh-cong', chu: 'Bạn đã đăng xuất.' },
    'doi-mat-khau': { loai: 'thanh-cong', chu: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.' },
    'sai-vai-tro': { loai: 'canh-bao', chu: 'Tài khoản của bạn chưa có màn hình làm việc. Hãy đăng nhập bằng tài khoản khác.' }
  };
  var MAU = {
    'loi': 'bg-red-50 border-red-200 text-red-700',
    'canh-bao': 'bg-amber-50 border-amber-200 text-amber-900',
    'thanh-cong': 'bg-emerald-50 border-emerald-200 text-emerald-800',
    'thong-tin': 'bg-blue-50 border-blue-200 text-blue-900'
  };
  var ICON = { 'loi': 'error', 'canh-bao': 'warning', 'thanh-cong': 'check_circle', 'thong-tin': 'info' };

  // lienKet (tùy chọn): { chu, href } hiện thành nút bên dưới thông báo
  function bao(el, loai, chu, lienKet) {
    if (!chu) { el.classList.add('hidden'); el.textContent = ''; return; }
    el.className = 'flex items-start gap-2 rounded-[6px] border px-3 py-2 text-[12px] leading-[1.5] mb-[16px] ' + MAU[loai];
    el.innerHTML = '<span class="material-symbols-outlined text-[16px] shrink-0">' + ICON[loai] + '</span><span class="flex-1"><span></span></span>';
    el.querySelector('.flex-1 > span').textContent = chu;
    if (lienKet) {
      var a = document.createElement('a');
      a.href = lienKet.href;
      a.className = 'mt-1.5 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline';
      a.textContent = lienKet.chu + ' →';
      a.setAttribute('data-sang-cong', '');
      el.querySelector('.flex-1').appendChild(document.createElement('br'));
      el.querySelector('.flex-1').appendChild(a);
    }
  }

  // Đường dẫn sang màn của cổng kia, giữ email đã nhập (và next nếu có)
  function sangCong(cong, email) {
    var q = [];
    if (cong === 'business') q.push('role=dn');
    if (email) q.push('email=' + encodeURIComponent(email));
    if (tiep) q.push('next=' + encodeURIComponent(tiep));
    return A.CONG[cong].trang + (q.length ? '?' + q.join('&') : '');
  }

  function baoSaiCong(saiCong, email) {
    bao($('dang-nhap-loi'), 'canh-bao', saiCong.chu, {
      chu: 'Chuyển sang ' + A.CONG[saiCong.sangCong].ten,
      href: sangCong(saiCong.sangCong, email)
    });
  }

  function nutDangGui(co) {
    var nut = $('btn-submit');
    if (!nut.dataset.chuGoc) nut.dataset.chuGoc = nut.innerHTML;
    nut.disabled = co;
    nut.innerHTML = co
      ? '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Đang xác thực...</span>'
      : nut.dataset.chuGoc;
  }

  function vaoTrang(user) {
    var dich = A.dichHopLe(tiep, user.role) || A.trangChu(user.role);
    if (!dich) {
      nutDangGui(false);
      bao($('dang-nhap-loi'), 'canh-bao', 'Đăng nhập thành công với tài khoản ' + A.VAI_TRO[user.role].ten +
        ', nhưng màn hình ' + A.VAI_TRO[user.role].ten + ' chưa được xây dựng trên UIT Connect.');
      return;
    }
    window.location.replace(dich);
  }

  function baoXemThu() {
    bao($('dang-nhap-xem-thu'), 'thong-tin', 'Chưa kết nối máy chủ đăng nhập: đang ở chế độ xem thử, không kiểm tra mật khẩu. ' +
      (CONG === 'uit'
        ? 'Vai trò suy ra từ email: @gm.uit.edu.vn → Sinh viên, @uit.edu.vn → Giảng viên, ' + A.EMAIL_ADMIN + ' → Quản trị viên.'
        : 'Email không thuộc UIT → Doanh nghiệp.'));
  }

  // Kiểm tra cổng ngay khi rời ô email.
  // Không vẽ lại khi đang báo đúng nội dung đó: nếu vẽ lại lúc người dùng bấm nút "Chuyển sang ..." thì nút bị thay mất giữa chừng.
  var oEmail = $('email');
  oEmail.addEventListener('blur', function () {
    var email = oEmail.value.trim();
    var saiCong = A.laEmail(email) ? A.kiemTraCong(email, CONG) : null;
    var hop = $('dang-nhap-loi');
    var dangBao = hop.querySelector('[data-sang-cong]');
    if (saiCong && saiCong.sangCong) {
      if (!dangBao || dangBao.getAttribute('href') !== sangCong(saiCong.sangCong, email)) baoSaiCong(saiCong, email);
    } else if (saiCong) {
      bao(hop, 'loi', saiCong.chu);
      hop.setAttribute('data-loi-email', '');
    } else if (dangBao || hop.hasAttribute('data-loi-email')) {
      bao(hop);
      hop.removeAttribute('data-loi-email');
    }
  });

  // Bộ xử lý form (onsubmit="event.preventDefault(); handleLogin();" trong HTML)
  window.handleLogin = function () {
    var oMatKhau = $('password');
    var hopLoi = $('dang-nhap-loi');
    bao(hopLoi);
    var email = oEmail.value.trim();
    if (!A.laEmail(email)) {
      bao(hopLoi, 'loi', CONG === 'uit' ? 'Nhập email UIT, ví dụ 24521228@gm.uit.edu.vn.' : 'Nhập email hợp lệ, ví dụ ten@congty.com.');
      oEmail.focus();
      return;
    }
    var saiCong = A.kiemTraCong(email, CONG);
    if (saiCong && saiCong.sangCong) { baoSaiCong(saiCong, email); $('dang-nhap-loi').querySelector('[data-sang-cong]').focus(); return; }
    if (saiCong) { bao(hopLoi, 'loi', saiCong.chu); oEmail.focus(); return; }
    if (!oMatKhau.value) { bao(hopLoi, 'loi', 'Nhập mật khẩu.'); oMatKhau.focus(); return; }
    var ghiNho = form.querySelector('input[type="checkbox"]');
    nutDangGui(true);
    A.dangNhap(email, oMatKhau.value, ghiNho && ghiNho.checked, CONG).then(function (kq) {
      if (kq.xemThu) baoXemThu();
      vaoTrang(kq.user);
    }, function (err) {
      nutDangGui(false);
      if (err.code === 'WRONG_PORTAL' && err.sangCong) { baoSaiCong({ chu: err.message, sangCong: err.sangCong }, email); return; }
      if (err.code === 'WRONG_PORTAL') {
        var khac = CONG === 'uit' ? 'business' : 'uit';
        baoSaiCong({ chu: err.message, sangCong: khac }, email);
        return;
      }
      bao(hopLoi, err.status === 429 ? 'canh-bao' : 'loi', err.message);
      if (err.code === 'INVALID_CREDENTIALS') { oMatKhau.value = ''; oMatKhau.focus(); }
    });
  };

  // ---------- Khi mở trang ----------
  if (ts.get('email')) oEmail.value = ts.get('email');
  var lb = LY_DO[lyDo];
  if (lb) bao($('dang-nhap-loi'), lb.loai, lb.chu);

  A.layPhien().then(function (kq) {
    if (kq.xemThu) { baoXemThu(); return; }
    // Đã đăng nhập thật (và không phải vừa bị chuyển về vì sai vai trò) → vào thẳng trang chủ
    if (kq.user && lyDo !== 'sai-vai-tro') vaoTrang(kq.user);
  }, function () { /* máy chủ lỗi: để người dùng thử đăng nhập, lỗi sẽ hiện trên form */ });
})();
