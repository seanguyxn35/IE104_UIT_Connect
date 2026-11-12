// Nối các màn prototype: đọc data-path / data-screen-link (do Stitch gắn sẵn) và chuyển sang file tương ứng.
(function () {
  // Vai trò lấy từ ?role=... : SV.html -> sinh viên (mặc định), GV.html -> ?role=gv (giảng viên), DN.html -> ?role=dn (doanh nghiệp)
  var m = /[?&]role=(sv|gv|dn)\b/.exec(window.location.search);
  var ROLE = m ? m[1] : 'sv';

  // Các màn sau khi đăng nhập / đăng ký, theo vai trò (pages/sv, pages/gv hoặc pages/dn)
  var APPS = {
    sv: { home: '../sv/01_trang-chu.html', profile: '../sv/04_ho-so-nang-luc-cv.html' },
    gv: { home: '../gv/01_trang-chu.html', profile: '../gv/02_ho-so-khoa-hoc.html' },
    dn: { home: '../dn/01_ban-lam-viec.html', profile: '../dn/02_ho-so-doanh-nghiep.html' }
  };

  // Giữ vai trò khi chuyển giữa các màn Login (sinh viên giữ URL gốc, không thêm tham số)
  function withRole(url, role) {
    role = role || ROLE;
    return role === 'sv' ? url : url + '?role=' + role;
  }

  var ROUTES = {
    'dang-nhap': withRole('01_dang-nhap-email.html'),
    'dang-nhap-sso': withRole('02_dang-nhap-sso-microsoft365.html'),
    'dang-ky-buoc-1': withRole('03_dang-ky-b1-chon-vai-tro.html'),
    'dang-ky-buoc-2': withRole('04_dang-ky-b2-thong-tin-sinh-vien.html'),
    'dang-ky-buoc-3': withRole('05_dang-ky-b3-xac-thuc-email.html'),
    'kich-hoat-thanh-cong': withRole('06_dang-ky-b4-kich-hoat-thanh-cong.html'),
    'quen-mk-1': withRole('07_quen-mat-khau-b1-kiem-tra-email.html'),
    'quen-mk-2': withRole('08_quen-mat-khau-b2-dat-lai-mat-khau.html'),
    // Đăng ký doanh nghiệp (màn 09–13); các tab vai trò trên đó chuyển sang form SV / GV
    'dang-ky-dn-1': withRole('09_dang-ky-dn-b1-tai-khoan.html', 'dn'),
    'dang-ky-dn-2': withRole('10_dang-ky-dn-b2-thong-tin.html', 'dn'),
    'dang-ky-dn-3': withRole('11_dang-ky-dn-b3-giay-to-xac-minh.html', 'dn'),
    'dang-ky-dn-4': withRole('12_dang-ky-dn-b4-xac-thuc-email.html', 'dn'),
    'dang-ky-dn-xong': withRole('13_dang-ky-dn-thanh-cong.html', 'dn'),
    'ban-lam-viec-dn': APPS.dn.home,
    'dang-ky-sv': withRole('04_dang-ky-b2-thong-tin-sinh-vien.html', 'sv'),
    'dang-ky-gv': withRole('04_dang-ky-b2-thong-tin-sinh-vien.html', 'gv'),
    // Sau khi đăng nhập / kích hoạt tài khoản -> không gian làm việc theo vai trò
    'trang-chu': APPS[ROLE].home,
    'ban-lam-viec-sinh-vien': APPS[ROLE].home,
    'thiet-lap-ho-so': APPS[ROLE].profile
  };
  // Đích sau khi đăng nhập thành công (màn 01, 02) và sau khi đặt lại mật khẩu (màn 08)
  window.LOGIN_SUCCESS_URL = APPS[ROLE].home;
  window.LOGIN_PAGE_URL = ROUTES['dang-nhap'];

  function connect() {
    var els = document.querySelectorAll('[data-path], [data-screen-link]');
    els.forEach(function (el) {
      var key = el.getAttribute('data-path') || el.getAttribute('data-screen-link');
      var target = ROUTES[key];
      if (!target) return; // màn chưa thiết kế -> giữ nguyên href="#"

      // Màn 03 (chọn vai trò): bấm "Tiếp tục" thì đi theo vai trò vừa chọn (Doanh nghiệp có luồng đăng ký riêng, màn 09)
      if (el.id === 'btn-next' && key === 'dang-ky-buoc-2') {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var picked = typeof selectedRole !== 'undefined' && APPS[selectedRole] ? selectedRole : ROLE;
          window.location.href = picked === 'dn'
            ? ROUTES['dang-ky-dn-1']
            : withRole('04_dang-ky-b2-thong-tin-sinh-vien.html', picked);
        });
        return;
      }

      if (el.tagName === 'A') {
        el.setAttribute('href', target);
        return;
      }

      el.addEventListener('click', function (e) {
        // Nút submit trong form: để trình duyệt báo lỗi các trường required trước khi chuyển trang
        if (el.form && el.type === 'submit' && !el.form.checkValidity()) return;
        e.preventDefault();
        window.location.href = target;
      });
    });

    // Màn 03: chọn sẵn thẻ vai trò đang dùng (vào từ GV.html -> Giảng viên)
    if (ROLE !== 'sv' && typeof selectRole === 'function' && document.getElementById('role-' + ROLE)) {
      selectRole(ROLE);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
