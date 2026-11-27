// Chi tiết bài toán R&D cho người chưa đăng nhập (pages/khach/01_chi-tiet-bai-toan-rd.html?ma=RD-xxxx).
// Bản rút gọn của SV-13: xem mô tả, kỹ năng, sản phẩm, mốc, tiêu chí, kinh phí, hạn.
// KHÔNG hiện: tệp đính kèm (có thể thuộc NDA), nút nộp proposal, mức phù hợp, bài đã lưu, proposal.
// Nút hành động theo người xem:
//   khách          → "Đăng nhập để ứng tuyển" (UIT SSO, đăng nhập xong vào thẳng trang ứng tuyển SV-13)
//   sinh viên      → "Mở trang ứng tuyển" (SV-13)
//   vai trò khác   → báo chỉ sinh viên ứng tuyển, nút "Vào trang của tôi"
// Cần cong-khai.js nạp trước.
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var S = window.SvBaiToanRd;
  var A = window.UitAuth;
  var C = window.CongKhai;
  var esc = D.escapeHtml;
  var ma = new URLSearchParams(window.location.search).get('ma') || '';
  var goc = document.getElementById('kc-noi-dung');

  function the(tieuDe, icon, noiDung) {
    return '<section class="bg-surface-container-lowest rounded-lg border border-border-color p-5 space-y-3">' +
      '<h2 class="text-base font-bold text-text-main flex items-center gap-2"><span class="material-symbols-outlined text-[20px] text-primary-container">' + icon + '</span>' + tieuDe + '</h2>' +
      noiDung + '</section>';
  }
  function dong(nhan, giaTri) {
    return '<div class="flex items-start justify-between gap-3 py-2 border-b border-border-color last:border-0">' +
      '<dt class="text-body-sm text-text-secondary">' + nhan + '</dt><dd class="text-body-sm font-semibold text-text-main text-right">' + giaTri + '</dd></div>';
  }

  function hopHanhDong(b, user) {
    var nhan = S.tinhTrangNhan(b);
    if (!nhan.moNhan) {
      return '<div class="rounded-lg bg-surface-container px-4 py-3 text-body-sm text-text-secondary flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">block</span>' + esc(nhan.ten) + '</div>';
    }
    if (user && user.role === 'Student') {
      return '<a class="h-11 px-5 rounded-lg bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-bold flex items-center justify-center gap-1.5" href="' +
        C.GOC + 'pages/sv/13_chi-tiet-bai-toan-rd.html?ma=' + encodeURIComponent(b.ma) + '"><span class="material-symbols-outlined text-[18px]">send</span>Mở trang ứng tuyển</a>';
    }
    if (user) {
      var nha = C.trangChu(user.role);
      return '<p class="text-body-sm text-text-secondary">Chỉ sinh viên (cá nhân, nhóm hoặc nhóm có giảng viên hướng dẫn) ứng tuyển bài toán. Bạn đang đăng nhập với vai trò ' +
        esc(A.VAI_TRO[user.role].ten) + '.</p>' +
        (nha ? '<a class="h-10 px-4 rounded-lg border border-primary-container text-primary-container hover:bg-brand-light text-body-sm font-semibold flex items-center justify-center" href="' + nha + '">Vào trang của tôi</a>' : '');
    }
    return '<a class="h-11 px-5 rounded-lg bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-bold flex items-center justify-center gap-1.5" href="' + C.dangNhapDeUngTuyen(b.ma) + '" data-dang-nhap-ung-tuyen>' +
      '<span class="material-symbols-outlined text-[18px]">login</span>Đăng nhập để ứng tuyển</a>' +
      '<p class="text-body-xs text-text-secondary">Sinh viên đăng nhập UIT SSO (MSSV@gm.uit.edu.vn) để nộp proposal. Đăng nhập xong sẽ vào thẳng trang ứng tuyển bài này.</p>';
  }

  function ve(b, user, mau) {
    document.getElementById('kc-ma').textContent = ma || '–';
    if (!b) {
      document.title = 'Không tìm thấy bài toán | UIT Connect';
      goc.innerHTML = '<div class="bg-surface-container-lowest rounded-lg border border-dashed border-border-color py-14 px-6 text-center">' +
        '<span class="material-symbols-outlined text-[44px] text-text-secondary">search_off</span>' +
        '<p class="mt-2 text-base font-semibold text-text-main">Không tìm thấy bài toán ' + esc(ma) + '</p>' +
        '<p class="mt-1 text-body-sm text-text-secondary">Bài toán có thể chưa được duyệt công khai hoặc đã bị gỡ.</p>' +
        '<a class="inline-flex mt-4 h-10 px-4 items-center gap-1.5 rounded bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold" href="' + C.GOC + 'index.html#bai-toan">Xem các bài toán khác</a></div>';
      return;
    }
    document.title = b.ma + ' – ' + b.tieuDe + ' | UIT Connect';
    var dn = b.doanhNghiep;
    var loai = S.LOAI_SV[b.loai] || S.LOAI_SV['ung-tuyen'];
    var nhan = S.tinhTrangNhan(b);
    var dau = '<section class="bg-surface-container-lowest rounded-lg border border-border-color p-5 sm:p-6 space-y-4">' +
      '<div class="flex items-start gap-4">' + C.logo(dn, 'size-16') +
        '<div class="min-w-0 space-y-1">' +
          '<p class="text-sm font-bold text-text-main">' + esc(dn.ten) + '</p>' +
          '<p class="text-body-xs text-text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>' + esc(dn.diaChi) + '</p>' +
          '<div class="flex flex-wrap gap-1.5 pt-1">' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold border ' + loai.lop + '">' + esc(loai.ten) + '</span>' +
            (b.linhVuc ? '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold bg-surface-container text-text-secondary">' + esc(D.tenLinhVuc(b.linhVuc, true)) + '</span>' : '') +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-mono bg-surface-container text-text-secondary">' + esc(b.ma) + '</span>' +
            (b.yeuCauNda ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><span class="material-symbols-outlined text-[14px]">lock</span>Yêu cầu NDA</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<h1 class="text-xl lg:text-2xl font-bold tracking-tight text-text-main">' + esc(b.tieuDe) + '</h1>' +
      '<p class="text-body-md text-text-secondary leading-relaxed">' + esc(b.tomTat || D.chuTuHtml(b.moTa)) + '</p>' +
      '<div class="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-text-secondary">' +
        '<span class="flex items-center gap-1 font-semibold text-primary-container"><span class="material-symbols-outlined text-[18px]">payments</span>' + esc(S.chuoiKinhPhi(b)) + '</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">event</span>Hạn nộp: ' + esc(D.dinhDangNgay(b.hanNop) || '–') + '</span>' +
        '<span class="flex items-center gap-1 ' + nhan.lop + '"><span class="material-symbols-outlined text-[18px]">schedule</span>' + esc(nhan.ten) + '</span>' +
      '</div>' +
      (mau ? '<p class="text-body-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 w-fit">Dữ liệu minh họa (chưa kết nối máy chủ)</p>' : '') +
    '</section>';

    var trai = the('Mô tả bài toán', 'description', '<div class="rte text-body-md text-text-main">' + D.lamSachHtml(b.moTa) + '</div>') +
      ((b.kyNang || []).length ? the('Kỹ năng yêu cầu', 'psychology', '<div class="flex flex-wrap gap-1.5">' + b.kyNang.map(function (k) {
        return '<span class="px-2.5 py-1 rounded bg-surface-container text-text-secondary text-body-xs font-medium">' + esc(k) + '</span>';
      }).join('') + '</div>') : '') +
      ((b.sanPham || []).length ? the('Sản phẩm bàn giao', 'inventory_2', '<ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">' + b.sanPham.map(function (sp) {
        return '<li class="flex items-center gap-2 text-body-sm text-text-main"><span class="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>' + esc(sp) + '</li>';
      }).join('') + '</ul>') : '') +
      ((b.moc || []).length ? the('Kế hoạch & mốc nghiệm thu', 'flag', '<ol class="space-y-2">' + b.moc.map(function (m, i) {
        return '<li class="flex items-center gap-3 rounded border border-border-color px-3 py-2"><span class="size-7 rounded-full bg-brand-light text-primary-container text-xs font-bold flex items-center justify-center shrink-0">' + (i + 1) + '</span>' +
          '<span class="flex-1 text-body-sm text-text-main">' + esc(m.ten) + '</span><span class="text-body-xs text-text-secondary whitespace-nowrap">Tuần ' + esc(m.tuan) + (m.phanTram ? ' · ' + esc(m.phanTram) + '% kinh phí' : '') + '</span></li>';
      }).join('') + '</ol>') : '') +
      (b.tieuChi ? the('Tiêu chí chọn đối tác', 'rule', '<p class="text-body-md text-text-main leading-relaxed">' + esc(b.tieuChi) + '</p>') : '');

    var doiTuong = (b.doiTuong || []).map(function (d) { return D.DOI_TUONG[d] || d; }).join('<br>');
    var quyMo = b.quyMoNhom ? (b.quyMoNhom.min === b.quyMoNhom.max ? b.quyMoNhom.min : b.quyMoNhom.min + ' – ' + b.quyMoNhom.max) + ' người' : '–';
    var phai = '<section class="bg-surface-container-lowest rounded-lg border-2 border-primary-container/30 p-5 space-y-3" id="kc-hanh-dong">' +
        '<h2 class="text-base font-bold text-text-main">Ứng tuyển bài toán này</h2>' + hopHanhDong(b, user) + '</section>' +
      the('Thông tin nhanh', 'info', '<dl>' +
        dong('Kinh phí', esc(S.chuoiKinhPhi(b))) +
        dong('Thời gian thực hiện', b.thoiGian ? esc(b.thoiGian) + ' tuần' : '–') +
        dong('Bắt đầu dự kiến', esc(D.dinhDangNgay(b.ngayBatDau) || '–')) +
        dong('Hình thức làm việc', esc(D.HINH_THUC[b.hinhThuc] || '–')) +
        dong('Địa điểm', esc(b.diaDiem || dn.diaChi)) +
        dong('Đối tượng nhận', doiTuong || '–') +
        dong('Quy mô nhóm', esc(quyMo)) +
        dong('Mức sẵn sàng (TRL)', b.trl ? 'TRL ' + esc(b.trl) : '–') +
        dong('Thỏa thuận bảo mật', b.yeuCauNda ? 'Bắt buộc' : 'Không yêu cầu') + '</dl>') +
      the('Tài liệu đề bài', 'lock', '<p class="text-body-sm text-text-secondary">Tệp đính kèm của doanh nghiệp chỉ hiện sau khi đăng nhập' +
        (b.yeuCauNda ? ', và tài liệu chi tiết chỉ gửi sau khi ký NDA' : '') + '.</p>') +
      the('Về ' + esc(dn.ten), 'corporate_fare', '<div class="flex items-center gap-3">' + C.logo(dn) + '<div class="min-w-0"><p class="text-body-sm font-semibold text-text-main">' + esc(dn.ten) + '</p>' +
        '<p class="text-body-xs text-text-secondary">' + esc(dn.linhVucHD || '') + '</p></div></div>' +
        (dn.gioiThieu ? '<p class="text-body-sm text-text-secondary leading-relaxed">' + esc(dn.gioiThieu) + '</p>' : ''));

    goc.innerHTML = '<div class="space-y-5">' + dau +
      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"><div class="lg:col-span-8 space-y-5">' + trai + '</div>' +
      '<aside class="lg:col-span-4 space-y-5 lg:sticky lg:top-20">' + phai + '</aside></div></div>';
  }

  // Nạp song song: phiên đăng nhập (đổi nút hành động) và bài toán công khai
  Promise.all([C.veTaiKhoan(), C.napBaiToan(ma)]).then(function (kq) {
    ve(kq[1].baiToan, kq[0], kq[1].mau);
  }, function () {
    goc.innerHTML = '<div class="bg-surface-container-lowest rounded-lg border border-border-color p-10 text-center text-body-sm text-error">Không tải được bài toán. Hãy tải lại trang.</div>';
  });
})();
