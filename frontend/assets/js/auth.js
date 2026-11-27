// Đăng nhập theo vai trò: gọi API phiên đăng nhập phía máy chủ (cookie HttpOnly) và chế độ xem thử khi chưa có máy chủ.
// Dùng ở màn đăng nhập (dang-nhap.js) và mọi trang pages/sv, pages/gv, pages/dn (auth-guard.js).
//
// ===== Hai cổng đăng nhập (portal) =====
//   'uit'      : màn auth/02 "UIT SSO" – chỉ email UIT: <MSSV 8 chữ số>@gm.uit.edu.vn (SV),
//                <tên, bắt đầu bằng chữ cái>@uit.edu.vn (GV, Admin); sai định dạng → 400 INVALID_EMAIL
//   'business' : màn auth/01 "Email và mật khẩu" – Doanh nghiệp, mọi email KHÔNG thuộc UIT
//   Admin là tài khoản riêng (account.role = 'Admin', email @uit.edu.vn), đăng nhập qua cổng 'uit'.
//   Email Admin quy định: EMAIL_ADMIN bên dưới (backend seed đúng email này).
//
// ===== Hợp đồng API (backend làm theo; cookie phiên do máy chủ đặt, JS không đọc được) =====
//   POST /api/auth/login   { email, password, remember, portal }  (remember: true = phiên 30 ngày, false = 8 giờ)
//        200 { user: { accountId, role, email, fullName } }  + Set-Cookie: uitc_session=...; HttpOnly; SameSite=Lax; Path=/
//        400 INVALID_INPUT | 401 INVALID_CREDENTIALS (sai email hoặc mật khẩu, không nói rõ cái nào)
//        403 WRONG_PORTAL (vai trò không thuộc cổng này) | 403 EMAIL_NOT_VERIFIED | 403 ACCOUNT_DISABLED
//        429 TOO_MANY_ATTEMPTS (sai 5 lần / 15 phút)
//   GET  /api/auth/me      200 { user } | 401 UNAUTHENTICATED
//   POST /api/auth/logout  204 (thu hồi phiên, xóa cookie; gọi khi chưa đăng nhập vẫn 204)
//   Quên mật khẩu (bảng verification_code, purpose 'Password_Reset'; mã 6 chữ số, hết hạn 10 phút, sai tối đa 5 lần):
//   POST /api/auth/password-reset/request { email, portal }
//        202 { resendAfter: 60 } (luôn 202 kể cả email không tồn tại, để không lộ tài khoản)
//        400 INVALID_INPUT | 403 WRONG_PORTAL | 429 RESEND_TOO_SOON { retryAfter } (gửi lại trước 60 giây)
//   POST /api/auth/password-reset/verify  { email, portal, code }
//        200 { resetToken } | 400 INVALID_CODE | 410 CODE_EXPIRED | 429 TOO_MANY_ATTEMPTS
//   POST /api/auth/password-reset/confirm { resetToken, newPassword }
//        204 | 400 WEAK_PASSWORD (≥ 8 ký tự, có hoa, thường, số, ký tự đặc biệt) | 410 TOKEN_EXPIRED
//   Mọi API khác: không có phiên → 401 UNAUTHENTICATED; sai vai trò → 403 FORBIDDEN_ROLE.
//   role ∈ Student | Lecturer | Business | Admin (account.role).
//
// ===== Chế độ xem thử =====
// Mở bằng file:// / GitHub Pages, hoặc máy chủ chưa có /api/auth (trả 404 NOT_FOUND) hay không kết nối được:
// không xác thực thật. Vai trò suy ra từ email (EMAIL_ADMIN → Admin, @gm.uit.edu.vn → SV, @uit.edu.vn → GV,
// khác → DN), lưu trong sessionStorage của tab, và các trang luôn báo rõ "chế độ xem thử".
// Quên mật khẩu ở chế độ xem thử: nhận mã 6 chữ số bất kỳ.
(function () {
  'use strict';

  var API = '/api/auth';
  var KHOA_XEM_THU = 'uitc.auth.xemThu.v1';
  var EMAIL_ADMIN = 'admin.uitconnect@uit.edu.vn';

  // Màn đăng nhập của từng cổng (trong pages/auth/)
  var CONG = {
    uit: { ten: 'UIT SSO', trang: '02_dang-nhap-sso-microsoft365.html', quenMk: '07_quen-mat-khau-b1-kiem-tra-email.html' },
    business: { ten: 'Email và mật khẩu', trang: '01_dang-nhap-email.html', quenMk: '14_quen-mat-khau-dn-b1-kiem-tra-email.html' }
  };
  var CONG_THEO_MA = { sv: 'uit', gv: 'uit', admin: 'uit', dn: 'business' };

  // Trang chủ theo vai trò, tính từ thư mục pages/ (mọi trang đăng nhập và trang vai trò đều ở pages/<thư mục>/)
  var VAI_TRO = {
    Student: { ma: 'sv', ten: 'Sinh viên', trangChu: 'sv/01_trang-chu.html' },
    Lecturer: { ma: 'gv', ten: 'Giảng viên', trangChu: 'gv/01_trang-chu.html' },
    Business: { ma: 'dn', ten: 'Doanh nghiệp', trangChu: 'dn/01_ban-lam-viec.html' },
    Admin: { ma: 'admin', ten: 'Quản trị viên', trangChu: null }
  };
  var VAI_TRO_THEO_MA = { sv: 'Student', gv: 'Lecturer', dn: 'Business' };

  var THONG_BAO_LOI = {
    INVALID_INPUT: 'Email hoặc mật khẩu chưa đúng định dạng.',
    INVALID_EMAIL: 'Email UIT không đúng định dạng.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    EMAIL_NOT_VERIFIED: 'Tài khoản chưa xác thực email. Hãy nhập mã xác thực đã gửi tới email của bạn.',
    ACCOUNT_DISABLED: 'Tài khoản đang bị khóa. Liên hệ Ban quản trị UIT Connect để được hỗ trợ.',
    TOO_MANY_ATTEMPTS: 'Bạn đã nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.',
    WRONG_PORTAL: 'Tài khoản này không đăng nhập ở cổng này.',
    RESEND_TOO_SOON: 'Bạn vừa yêu cầu gửi mã. Hãy chờ hết thời gian đếm ngược rồi gửi lại.',
    INVALID_CODE: 'Mã xác thực không đúng.',
    CODE_EXPIRED: 'Mã xác thực đã hết hạn. Hãy bấm "Gửi lại email" để nhận mã mới.',
    WEAK_PASSWORD: 'Mật khẩu chưa đủ mạnh: cần ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
    TOKEN_EXPIRED: 'Phiên đặt lại mật khẩu đã hết hạn. Hãy làm lại từ bước nhập email.'
  };

  function coMayChu() { return /^https?:$/.test(window.location.protocol); }

  // fetch JSON (cùng nguồn nên trình duyệt tự gửi cookie phiên); lỗi thành Error mang status, code
  function goi(duongDan, tuyChon) {
    tuyChon = Object.assign({ credentials: 'same-origin' }, tuyChon || {});
    if (tuyChon.json !== undefined) {
      tuyChon.body = JSON.stringify(tuyChon.json);
      tuyChon.headers = { 'Content-Type': 'application/json' };
      delete tuyChon.json;
    }
    return fetch(duongDan, tuyChon).then(function (res) {
      if (res.status === 204) return {};
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var e = new Error(THONG_BAO_LOI[data.code] || data.message || 'Máy chủ trả lỗi ' + res.status);
          e.status = res.status;
          e.code = data.code;
          throw e;
        }
        return data;
      });
    }, function () {
      var e = new Error('Không kết nối được máy chủ.');
      e.status = 0;
      throw e;
    });
  }

  // Không có API đăng nhập → chế độ xem thử:
  //   - không kết nối được (status 0)
  //   - backend dự án chưa có /api/auth (404 NOT_FOUND của bộ xử lý /api chung)
  //   - máy chủ KHÔNG phải backend dự án: Live Server / Live Preview của VS Code, GitHub Pages...
  //     trả 404 trang HTML hoặc 405 Method Not Allowed cho lệnh POST, không có { code } như backend dự án
  function chuaCoApi(err) {
    return err.status === 0 || !err.code || (err.status === 404 && err.code === 'NOT_FOUND');
  }

  // ---------- Phiên xem thử ----------
  function docXemThu() {
    try {
      var p = JSON.parse(window.sessionStorage.getItem(KHOA_XEM_THU) || 'null');
      return p && VAI_TRO[p.role] ? p : null;
    } catch (e) { return null; }
  }
  function ghiXemThu(user) {
    try {
      if (user) window.sessionStorage.setItem(KHOA_XEM_THU, JSON.stringify(user));
      else window.sessionStorage.removeItem(KHOA_XEM_THU);
    } catch (e) { /* trình duyệt chặn lưu: phiên xem thử chỉ sống trong trang hiện tại */ }
  }

  function laEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

  // Định dạng email UIT:
  //   Sinh viên : đúng 8 chữ số MSSV + @gm.uit.edu.vn          (vd 24521228@gm.uit.edu.vn)
  //   Giảng viên: email công vụ đặt theo tên + @uit.edu.vn       (vd khangtg@uit.edu.vn)
  //               phần trước @ bắt đầu bằng chữ cái; chỉ gồm a–z, 0–9, dấu . _ -; không được toàn số (tránh MSSV gắn đuôi GV)
  //   Admin     : EMAIL_ADMIN (cũng đuôi @uit.edu.vn, khớp định dạng GV)
  var RE_SV = /^\d{8}@gm\.uit\.edu\.vn$/;
  var RE_GV = /^[a-z][a-z0-9._-]*@uit\.edu\.vn$/;
  function chuan(email) { return String(email || '').trim().toLowerCase(); }
  function duoiSv(email) { return /@gm\.uit\.edu\.vn$/.test(chuan(email)); }
  function duoiGv(email) { return /@uit\.edu\.vn$/.test(chuan(email)); }
  // Thuộc tên miền UIT (dù đúng hay sai định dạng) → phải đăng nhập ở cổng UIT SSO
  function laEmailUit(email) { return duoiSv(email) || duoiGv(email); }
  function laEmailSv(email) { return RE_SV.test(chuan(email)); }
  function laEmailGv(email) { return RE_GV.test(chuan(email)); }

  function vaiTroTuEmail(email) {
    var e = chuan(email);
    if (e === EMAIL_ADMIN) return 'Admin';
    if (laEmailSv(e)) return 'Student';
    if (laEmailGv(e)) return 'Lecturer';
    return 'Business';
  }

  // Lỗi định dạng của email UIT (đã đúng tên miền), null nếu hợp lệ
  function loiDinhDangUit(email) {
    var e = chuan(email);
    if (duoiSv(e) && !laEmailSv(e)) {
      return 'Email sinh viên phải là MSSV gồm 8 chữ số, ví dụ 24521228@gm.uit.edu.vn.';
    }
    if (duoiGv(e) && !laEmailGv(e)) {
      return /^\d+@/.test(e)
        ? 'MSSV dùng đuôi @gm.uit.edu.vn (ví dụ ' + e.split('@')[0] + '@gm.uit.edu.vn). Đuôi @uit.edu.vn dành cho giảng viên.'
        : 'Email giảng viên không hợp lệ: phần trước @ bắt đầu bằng chữ cái, chỉ gồm chữ không dấu, số, dấu . _ -';
    }
    return null;
  }

  // Email có dùng được ở cổng đăng nhập này không. Trả về null nếu hợp lệ, hoặc
  //   { chu, sangCong } : sai cổng, báo người dùng chuyển sang cổng kia
  //   { chu }           : đúng cổng UIT nhưng sai định dạng (MSSV không đủ 8 số...)
  function kiemTraCong(email, cong) {
    if (cong === 'uit') {
      if (!laEmailUit(email)) return { chu: 'Vui lòng chuyển sang đăng nhập bằng "Email và mật khẩu"', sangCong: 'business' };
      var sai = loiDinhDangUit(email);
      return sai ? { chu: sai } : null;
    }
    if (cong === 'business' && laEmailUit(email)) {
      return { chu: 'Email Sinh viên / Giảng viên UIT vui lòng chuyển sang đăng nhập bằng "UIT SSO"', sangCong: 'uit' };
    }
    return null;
  }

  function tenTuEmail(email) {
    if (laEmailSv(email)) return 'Sinh viên ' + chuan(email).split('@')[0];
    var ten = String(email).split('@')[0].replace(/[._-]+/g, ' ').trim();
    return ten ? ten.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : 'Người dùng';
  }

  // ---------- API ----------
  function loi(code, status, chu) {
    var e = new Error(chu || THONG_BAO_LOI[code]);
    e.status = status; e.code = code;
    return e;
  }

  // Kết quả kiemTraCong → lỗi: sai cổng (403 WRONG_PORTAL, kèm sangCong) hoặc sai định dạng email UIT (400 INVALID_EMAIL)
  function loiCong(kq, chu) {
    if (kq.sangCong) { var e = loi('WRONG_PORTAL', 403, chu || kq.chu); e.sangCong = kq.sangCong; return e; }
    return loi('INVALID_EMAIL', 400, kq.chu);
  }

  // Promise → { user, xemThu }. Lỗi đăng nhập thật thì reject (Error có code, status, message tiếng Việt).
  // cong: 'uit' | 'business' (màn đăng nhập đang dùng)
  function dangNhap(email, matKhau, ghiNho, cong) {
    email = String(email || '').trim();
    if (!laEmail(email) || !matKhau) return Promise.reject(loi('INVALID_INPUT', 400));
    var saiCong = kiemTraCong(email, cong);
    if (saiCong) return Promise.reject(loiCong(saiCong));
    function xemThu() {
      var user = { accountId: null, role: vaiTroTuEmail(email), email: email, fullName: tenTuEmail(email), xemThu: true };
      ghiXemThu(user);
      return { user: user, xemThu: true };
    }
    if (!coMayChu()) return Promise.resolve(xemThu());
    return goi(API + '/login', { method: 'POST', json: { email: email, password: matKhau, remember: !!ghiNho, portal: cong } })
      .then(function (data) {
        ghiXemThu(null);
        return { user: data.user, xemThu: false };
      }, function (err) {
        if (chuaCoApi(err)) return xemThu();
        throw err;
      });
  }

  // Phiên hiện tại. Promise → { user (null nếu chưa đăng nhập), xemThu }.
  function layPhien() {
    if (!coMayChu()) return Promise.resolve({ user: docXemThu(), xemThu: true });
    return goi(API + '/me').then(function (data) {
      return { user: data.user, xemThu: false };
    }, function (err) {
      if (err.status === 401) return { user: null, xemThu: false };
      if (chuaCoApi(err)) return { user: docXemThu(), xemThu: true };
      throw err;
    });
  }

  function dangXuat() {
    ghiXemThu(null);
    if (!coMayChu()) return Promise.resolve();
    return goi(API + '/logout', { method: 'POST' }).catch(function () { /* phiên đã hết / chưa có API: vẫn coi là đã đăng xuất */ });
  }

  // Đường dẫn trang chủ theo vai trò, tính từ một trang nằm trong pages/<thư mục>/
  function trangChu(role) {
    var v = VAI_TRO[role];
    return v && v.trangChu ? '../' + v.trangChu : null;
  }

  // Trang đăng nhập đúng cổng của vai trò (SV/GV/Admin → UIT SSO, DN → Email và mật khẩu),
  // tính từ một trang nằm trong pages/<thư mục>/ (giữ ?role= để router.js hiện đúng nội dung)
  function trangDangNhap(maVaiTro, tiep, lyDo) {
    var ts = [];
    if (maVaiTro === 'gv' || maVaiTro === 'dn') ts.push('role=' + maVaiTro);
    if (tiep) ts.push('next=' + encodeURIComponent(tiep));
    if (lyDo) ts.push('ly-do=' + lyDo);
    return '../auth/' + CONG[CONG_THEO_MA[maVaiTro] || 'uit'].trang + (ts.length ? '?' + ts.join('&') : '');
  }

  // ---------- Quên mật khẩu ----------
  // Promise → { resendAfter, xemThu }
  function yeuCauDatLai(email, cong) {
    email = String(email || '').trim();
    if (!laEmail(email)) return Promise.reject(loi('INVALID_INPUT', 400, 'Nhập email hợp lệ.'));
    var saiCong = kiemTraCong(email, cong);
    if (saiCong) {
      return Promise.reject(loiCong(saiCong, cong === 'uit'
        ? 'Chỉ nhận email @gm.uit.edu.vn hoặc @uit.edu.vn. Tài khoản Doanh nghiệp dùng "Quên mật khẩu" ở màn Email và mật khẩu.'
        : 'Email UIT dùng "Quên mật khẩu" ở màn UIT SSO.'));
    }
    function xemThu() { return { resendAfter: 60, xemThu: true }; }
    if (!coMayChu()) return Promise.resolve(xemThu());
    return goi(API + '/password-reset/request', { method: 'POST', json: { email: email, portal: cong } }).then(function (d) {
      return { resendAfter: d.resendAfter || 60, xemThu: false };
    }, function (err) {
      if (chuaCoApi(err)) return xemThu();
      throw err;
    });
  }

  // Promise → { resetToken, xemThu }
  function xacThucMa(email, cong, ma) {
    if (!/^\d{6}$/.test(String(ma || ''))) return Promise.reject(loi('INVALID_INPUT', 400, 'Nhập đủ 6 chữ số của mã xác thực.'));
    function xemThu() { return { resetToken: 'xem-thu', xemThu: true }; }
    if (!coMayChu()) return Promise.resolve(xemThu());
    return goi(API + '/password-reset/verify', { method: 'POST', json: { email: email, portal: cong, code: ma } }).then(function (d) {
      return { resetToken: d.resetToken, xemThu: false };
    }, function (err) {
      if (chuaCoApi(err)) return xemThu();
      throw err;
    });
  }

  // Kiểm tra mật khẩu mới theo cùng quy tắc với máy chủ: { du8, hoaThuong, so, dacBiet, dat }
  function doManhMatKhau(mk) {
    mk = String(mk || '');
    var kq = { du8: mk.length >= 8, hoaThuong: /[a-z]/.test(mk) && /[A-Z]/.test(mk), so: /\d/.test(mk), dacBiet: /[^A-Za-z0-9]/.test(mk) };
    kq.diem = [kq.du8, kq.hoaThuong, kq.so, kq.dacBiet].filter(Boolean).length;
    kq.dat = kq.diem === 4;
    return kq;
  }

  // Promise → { xemThu }
  function datMatKhauMoi(resetToken, matKhauMoi) {
    if (!doManhMatKhau(matKhauMoi).dat) return Promise.reject(loi('WEAK_PASSWORD', 400));
    if (!coMayChu() || resetToken === 'xem-thu') return Promise.resolve({ xemThu: true });
    return goi(API + '/password-reset/confirm', { method: 'POST', json: { resetToken: resetToken, newPassword: matKhauMoi } }).then(function () {
      return { xemThu: false };
    }, function (err) {
      if (chuaCoApi(err)) return { xemThu: true };
      throw err;
    });
  }

  // Chỉ nhận đích quay lại là trang trong thư mục của đúng vai trò (chặn chuyển hướng ra ngoài)
  function dichHopLe(tiep, role) {
    var v = VAI_TRO[role];
    if (!tiep || !v || !v.trangChu) return null;
    var re = new RegExp('^\\.\\./' + v.ma + '/[\\w-]+\\.html(\\?[\\w=&%.-]*)?(#[\\w-]*)?$');
    return re.test(tiep) ? tiep : null;
  }

  window.UitAuth = {
    VAI_TRO: VAI_TRO,
    VAI_TRO_THEO_MA: VAI_TRO_THEO_MA,
    EMAIL_ADMIN: EMAIL_ADMIN,
    CONG: CONG,
    coMayChu: coMayChu,
    laEmail: laEmail,
    laEmailUit: laEmailUit,
    vaiTroTuEmail: vaiTroTuEmail,
    kiemTraCong: kiemTraCong,
    yeuCauDatLai: yeuCauDatLai,
    xacThucMa: xacThucMa,
    doManhMatKhau: doManhMatKhau,
    datMatKhauMoi: datMatKhauMoi,
    dangNhap: dangNhap,
    layPhien: layPhien,
    dangXuat: dangXuat,
    trangChu: trangChu,
    trangDangNhap: trangDangNhap,
    dichHopLe: dichHopLe
  };
})();
