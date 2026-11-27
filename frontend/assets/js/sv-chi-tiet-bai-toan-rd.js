// SV-13 Chi tiết bài toán R&D & ứng tuyển (?ma=RD-xxxx).
// Hiển thị đề bài theo cấu trúc DN soạn ở DN-05 (cùng dữ liệu DN-15), cho SV lưu bài và nộp proposal.
// Nguồn dữ liệu:
//   - Có máy chủ: API /api/student-rd-problems (lưu vào CSDL; proposal hiện trong Hộp thư DN-08 của doanh nghiệp)
//   - Không có máy chủ (file://, GitHub Pages) hoặc máy chủ lỗi: dữ liệu mẫu, lưu tạm trên trình duyệt và báo "chưa lưu"
// Quy tắc nộp proposal (giao diện kiểm tra trước, máy chủ kiểm tra lại theo cùng thứ tự):
//   1. Bài toán tồn tại và còn nhận hồ sơ (đang mở, chưa quá hạn nộp)
//   2. Chưa có proposal đang hiệu lực cho bài toán này (muốn nộp lại phải rút proposal đang chờ)
//   3. Hình thức ứng tuyển thuộc đối tượng bài nhận; nộp theo nhóm thì phải là trưởng nhóm và quy mô nhóm đúng yêu cầu
//   4. Nội dung hợp lệ: tiêu đề 10–150 ký tự, tóm tắt 50–2000 ký tự, TRL, tệp PDF ≤ 10 MB (kiểm tra nội dung tệp), cam kết NDA nếu đề bài yêu cầu
(function () {
  'use strict';

  var D = window.DnBaiToan;
  var S = window.SvBaiToanRd;
  var esc = D.escapeHtml;
  var TOI_DA_TEP = 10 * 1024 * 1024;

  function $(id) { return document.getElementById(id); }

  var ma = new URLSearchParams(location.search).get('ma') || '';
  var goc = $('ct-noi-dung');
  var b = null;
  var api = false;

  var TEN_HINH_THUC = { 'ca-nhan': 'Cá nhân', 'nhom-sv': 'Nhóm sinh viên', 'lab': 'Nhóm có GV hướng dẫn (Lab)' };
  var MO_TA_HINH_THUC = { 'ca-nhan': 'Bạn tự thực hiện', 'nhom-sv': 'Chọn một nhóm bạn làm trưởng nhóm', 'lab': 'Nhóm + GV hướng dẫn' };
  var PARTNER_API = { 'ca-nhan': 'Student', 'nhom-sv': 'Team', 'lab': 'Lab' };

  // ---------- Trạng thái theo nguồn dữ liệu ----------
  function proposalHienTai() { return api ? b.proposalCuaToi : S.proposalChoBaiToan(b.ma); }
  function daLuuHienTai() { return api ? b.daLuuApi : S.laDaLuu(b.ma); }
  function kyNangCuaToi() { return api && b.kyNangCuaToi ? b.kyNangCuaToi : S.SINH_VIEN.kyNang; }

  // Nhóm của SV: [{ id, ten, laTruongNhom, thanhVien: [{ ten, mssv, vaiTro, truongNhom }] }]
  function dsNhom() {
    if (api) {
      return ((b.luaChon && b.luaChon.teams) || []).map(function (t) {
        return {
          id: String(t.id), ten: t.name, laTruongNhom: t.isLeader,
          thanhVien: t.members.map(function (m) { return { ten: m.name, mssv: m.studentCode, vaiTro: m.role || 'Thành viên', truongNhom: m.isLeader }; })
        };
      });
    }
    return S.NHOM_CUA_TOI.map(function (n) {
      var toi = n.thanhVien.filter(function (tv) { return tv.mssv === S.SINH_VIEN.mssv; })[0];
      return { id: n.id, ten: n.ten, laTruongNhom: !!(toi && toi.truongNhom), thanhVien: n.thanhVien, goc: n };
    });
  }
  // GV hướng dẫn: [{ giaTri, ten }]
  function dsGv() {
    if (api) {
      return ((b.luaChon && b.luaChon.lecturers) || []).map(function (g) {
        return { giaTri: String(g.id), ten: g.name + (g.faculty ? ' – ' + g.faculty : '') };
      });
    }
    return S.GV_HUONG_DAN.map(function (g) { return { giaTri: g, ten: g }; });
  }

  // ---------- Vẽ trang ----------
  function logo(dn, lon) {
    var c = lon ? 'size-16' : 'size-12';
    if (dn.logo) return '<div class="' + c + ' rounded-lg bg-surface-container border border-border-color overflow-hidden shrink-0"><img class="' + c + ' object-cover" alt="Logo ' + esc(dn.ten) + '" src="../../assets/img/' + esc(dn.logo) + '"></div>';
    if (dn.icon) return '<div class="' + c + ' rounded-lg bg-brand-light flex items-center justify-center text-primary-container border border-border-color shrink-0"><span class="material-symbols-outlined text-[28px]">' + esc(dn.icon) + '</span></div>';
    return '<div class="' + c + ' rounded-lg bg-primary-container text-white flex items-center justify-center font-bold border border-border-color shrink-0">' + esc(dn.kyHieu || dn.ten.slice(0, 2)) + '</div>';
  }

  function the(tieuDe, icon, noiDung, id) {
    return '<section class="bg-surface-container-lowest rounded-lg border border-border-color p-5 space-y-3"' + (id ? ' id="' + id + '"' : '') + '>' +
      '<h2 class="text-base font-bold text-text-main flex items-center gap-2"><span class="material-symbols-outlined text-[20px] text-primary-container">' + icon + '</span>' + tieuDe + '</h2>' +
      noiDung + '</section>';
  }

  function dong(nhan, giaTri) {
    return '<div class="flex items-start justify-between gap-3 py-2 border-b border-border-color last:border-0">' +
      '<dt class="text-body-sm text-text-secondary">' + nhan + '</dt><dd class="text-body-sm font-semibold text-text-main text-right">' + giaTri + '</dd></div>';
  }

  function veProposalCuaToi(p) {
    var tt = S.TRANG_THAI_PROPOSAL_SV[p.trangThai] || S.TRANG_THAI_PROPOSAL_SV['cho-phan-hoi'];
    var lich = p.lichHen ? '<div class="rounded bg-blue-50 border border-blue-200 px-3 py-2 text-body-sm text-blue-900">' +
      '<b>Lịch trao đổi:</b> ' + esc(D.dinhDangNgay(p.lichHen.ngay)) + (p.lichHen.gio ? ' lúc ' + esc(p.lichHen.gio) : '') +
      (p.lichHen.hinhThuc ? ' · ' + esc(p.lichHen.hinhThuc) : '') + (p.lichHen.ghiChu ? '<br>' + esc(p.lichHen.ghiChu) : '') + '</div>' : '';
    var ghiChu = {
      'cho-phan-hoi': 'Doanh nghiệp chưa phản hồi. Bạn có thể rút proposal để chỉnh sửa và nộp lại.',
      'da-hen': 'Doanh nghiệp muốn trao đổi thêm trước khi quyết định.',
      'dam-phan': 'Doanh nghiệp đã chấp nhận và mở phòng đàm phán (Trao đổi kỹ thuật → NDA & IP → Hợp đồng).',
      'tu-choi': 'Proposal không được chọn lần này. Bạn có thể tham khảo các bài toán khác.'
    }[p.trangThai] || '';
    var duocRut = p.tuMayChu ? p.coTheRut : (p.trangThai === 'cho-phan-hoi' && p.tuSinhVien);
    var tep = (p.tep || [])[0];
    var oTep = tep ? (p.tuMayChu && tep.id
      ? '<button class="text-primary-container hover:underline font-semibold" type="button" data-tai-tep-proposal="' + esc(tep.id) + '">' + esc(tep.ten) + '</button>'
      : esc(tep.ten)) : '';
    return '<section class="bg-surface-container-lowest rounded-lg border-2 border-primary-container/30 p-5 space-y-3" id="proposal-cua-toi">' +
      '<div class="flex items-center justify-between gap-2"><h2 class="text-base font-bold text-text-main flex items-center gap-2"><span class="material-symbols-outlined text-[20px] text-primary-container">task_alt</span>Proposal của tôi</h2>' +
      (!p.tuMayChu && (p.luuCucBo || p.tuSinhVien) ? '<span class="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Chưa lưu máy chủ</span>' : '') + '</div>' +
      '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold ' + tt.lop + '"><span class="material-symbols-outlined text-[16px]">' + tt.icon + '</span>' + esc(tt.ten) + '</span>' +
      '<p class="text-body-sm font-semibold text-text-main">' + esc(p.tieuDe) + '</p>' +
      '<dl>' + dong('Hình thức', esc(TEN_HINH_THUC[p.nguon] || p.quyMo || '')) + dong('Nhóm', esc(p.nhom || p.nguoiGui || '')) +
        (p.gvHuongDan ? dong('GV hướng dẫn', esc(p.gvHuongDan)) : '') +
        dong('Gửi lúc', esc(p.guiLuc ? new Date(p.guiLuc).toLocaleString('vi-VN') : p.thoiGian)) +
        (oTep ? dong('Tệp', oTep) : '') + '</dl>' +
      lich + (p.lyDoTuChoi ? '<p class="text-body-sm text-red-700"><b>Lý do:</b> ' + esc(p.lyDoTuChoi) + '</p>' : '') +
      '<p class="text-body-xs text-text-secondary">' + esc(ghiChu) + '</p>' +
      (duocRut ? '<button class="w-full h-9 rounded border border-red-200 text-red-700 hover:bg-red-50 text-body-sm font-semibold flex items-center justify-center gap-1.5" type="button" id="nut-rut-proposal">' +
        '<span class="material-symbols-outlined text-[18px]">undo</span>Rút proposal</button>' : '') +
      '</section>';
  }

  function veKhongThay() {
    document.title = 'Không tìm thấy bài toán | UIT Connect';
    goc.innerHTML = '<div class="bg-surface-container-lowest rounded-lg border border-dashed border-border-color py-14 px-6 text-center">' +
      '<span class="material-symbols-outlined text-[44px] text-text-secondary">search_off</span>' +
      '<p class="mt-2 text-base font-semibold text-text-main">Không tìm thấy bài toán ' + esc(ma) + '</p>' +
      '<p class="mt-1 text-body-sm text-text-secondary">Bài toán có thể đã bị doanh nghiệp gỡ, đang chờ duyệt lại hoặc đường dẫn không đúng.</p>' +
      '<a class="inline-flex mt-4 h-10 px-4 items-center gap-1.5 rounded bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-semibold" href="09_cong-doanh-nghiep-rd.html">' +
      '<span class="material-symbols-outlined text-[18px]">arrow_back</span>Về danh sách bài toán</a></div>';
  }

  function ve() {
    $('ct-ma-breadcrumb').textContent = ma || '—';
    if (!b) { veKhongThay(); return; }
    document.title = b.ma + ' – ' + b.tieuDe + ' | UIT Connect';
    var dn = b.doanhNghiep;
    var loai = S.LOAI_SV[b.loai] || S.LOAI_SV['ung-tuyen'];
    var nhan = S.tinhTrangNhan(b);
    var daLuu = daLuuHienTai();
    var p = proposalHienTai();
    var phuHop = S.mucPhuHop(b);
    var kyNangToi = kyNangCuaToi().map(D.chuanHoa);

    var nutUngTuyen;
    if (p) nutUngTuyen = '<a class="h-10 px-5 rounded border border-primary-container text-primary-container hover:bg-brand-light text-body-sm font-bold flex items-center gap-1.5" href="#proposal-cua-toi"><span class="material-symbols-outlined text-[18px]">task_alt</span>Đã ứng tuyển · Xem proposal</a>';
    else if (!nhan.moNhan) nutUngTuyen = '<button class="h-10 px-5 rounded bg-surface-container text-text-secondary text-body-sm font-bold flex items-center gap-1.5 cursor-not-allowed" type="button" disabled><span class="material-symbols-outlined text-[18px]">block</span>' + esc(nhan.ten) + '</button>';
    else nutUngTuyen = '<button class="h-10 px-5 rounded bg-primary-container hover:bg-brand-blue-hover text-white text-body-sm font-bold flex items-center gap-1.5" type="button" id="nut-ung-tuyen"><span class="material-symbols-outlined text-[18px]">send</span>Ứng tuyển / Nộp proposal</button>';

    var dau = '<section class="bg-surface-container-lowest rounded-lg border border-border-color p-5 sm:p-6 space-y-4">' +
      '<div class="flex items-start gap-4">' + logo(dn, true) +
        '<div class="min-w-0 flex-1 space-y-1">' +
          '<p class="text-sm font-bold text-text-main flex items-center gap-1">' + esc(dn.ten) +
            (b.tuLuongDn ? '<span class="material-symbols-outlined text-[16px] text-primary-container" title="Doanh nghiệp đã xác minh trên UIT Connect">verified</span>' : '') + '</p>' +
          '<p class="text-body-xs text-text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>' + esc(dn.diaChi) + '</p>' +
          '<div class="flex flex-wrap items-center gap-1.5 pt-1">' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold border ' + loai.lop + '">' + esc(loai.ten) + '</span>' +
            (b.linhVuc ? '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold bg-surface-container text-text-secondary">' + esc(D.tenLinhVuc(b.linhVuc, true)) + '</span>' : '') +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-mono bg-surface-container text-text-secondary">' + esc(b.ma) + '</span>' +
            (b.yeuCauNda ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><span class="material-symbols-outlined text-[14px]">lock</span>Yêu cầu NDA</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<h1 class="text-xl lg:text-2xl font-bold tracking-tight text-text-main">' + esc(b.tieuDe) + '</h1>' +
      '<p class="text-body-md text-text-secondary leading-relaxed">' + esc(b.tomTat || D.chuTuHtml(b.moTa)) + '</p>' +
      '<div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-text-secondary">' +
        '<span class="flex items-center gap-1 font-semibold text-primary-container"><span class="material-symbols-outlined text-[18px]">payments</span>' + esc(S.chuoiKinhPhi(b)) + '</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">event</span>Hạn nộp: ' + esc(D.dinhDangNgay(b.hanNop) || '—') + '</span>' +
        '<span class="flex items-center gap-1 ' + nhan.lop + '"><span class="material-symbols-outlined text-[18px]">schedule</span>' + esc(nhan.ten) + '</span>' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">calendar_today</span>Đăng ngày ' + esc(D.dinhDangNgay(b.ngayDang)) + '</span>' +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-2 pt-1">' + nutUngTuyen +
        '<button class="h-10 px-4 rounded border text-body-sm font-semibold flex items-center gap-1.5 transition-colors ' +
          (daLuu ? 'border-primary-container bg-brand-light text-primary-container' : 'border-border-color text-text-main hover:bg-surface-container') +
          '" type="button" id="nut-luu" aria-pressed="' + daLuu + '"><span class="material-symbols-outlined text-[18px]"' + (daLuu ? ' style="font-variation-settings:\'FILL\' 1"' : '') + '>' + (daLuu ? 'bookmark' : 'bookmark_border') + '</span>' + (daLuu ? 'Đã lưu' : 'Lưu bài toán') + '</button>' +
        '<button class="h-10 px-4 rounded border border-border-color text-text-main hover:bg-surface-container text-body-sm font-semibold flex items-center gap-1.5" type="button" data-tai-de-bai><span class="material-symbols-outlined text-[18px]">download</span>Tải đề bài (PDF)</button>' +
      '</div>' +
    '</section>';

    var trai = the('Mô tả bài toán', 'description', '<div class="rte text-body-md text-text-main">' + D.lamSachHtml(b.moTa) + '</div>') +
      ((b.kyNang || []).length ? the('Kỹ năng yêu cầu', 'psychology', '<div class="flex flex-wrap gap-1.5">' + b.kyNang.map(function (k) {
        var co = kyNangToi.indexOf(D.chuanHoa(k)) !== -1;
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-body-xs font-medium ' + (co ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-surface-container text-text-secondary') + '">' +
          (co ? '<span class="material-symbols-outlined text-[14px]">check</span>' : '') + esc(k) + '</span>';
      }).join('') + '</div><p class="text-body-xs text-text-secondary">Màu xanh: kỹ năng đã có trong Hồ sơ năng lực của bạn.</p>') : '') +
      ((b.sanPham || []).length ? the('Sản phẩm bàn giao', 'inventory_2', '<ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">' + b.sanPham.map(function (sp) {
        return '<li class="flex items-center gap-2 text-body-sm text-text-main"><span class="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>' + esc(sp) + '</li>';
      }).join('') + '</ul>') : '') +
      ((b.moc || []).length ? the('Kế hoạch & mốc nghiệm thu', 'flag', '<ol class="space-y-2">' + b.moc.map(function (m, i) {
        return '<li class="flex items-center gap-3 rounded border border-border-color px-3 py-2"><span class="size-7 rounded-full bg-brand-light text-primary-container text-xs font-bold flex items-center justify-center shrink-0">' + (i + 1) + '</span>' +
          '<span class="flex-1 text-body-sm text-text-main">' + esc(m.ten) + '</span><span class="text-body-xs text-text-secondary whitespace-nowrap">Tuần ' + esc(m.tuan) + (m.phanTram ? ' · ' + esc(m.phanTram) + '% kinh phí' : '') + '</span></li>';
      }).join('') + '</ol>') : '') +
      (b.tieuChi ? the('Tiêu chí chọn đối tác', 'rule', '<p class="text-body-md text-text-main leading-relaxed">' + esc(b.tieuChi) + '</p>') : '') +
      ((b.tepDinhKem || []).length ? the('Tài liệu đính kèm', 'attach_file', '<ul class="space-y-2">' + b.tepDinhKem.map(function (t, i) {
        return '<li class="flex items-center gap-3 rounded border border-border-color px-3 py-2"><span class="material-symbols-outlined text-[22px] text-red-600">picture_as_pdf</span>' +
          '<span class="flex-1 min-w-0"><span class="block text-body-sm font-semibold text-text-main truncate">' + esc(t.ten) + '</span><span class="text-body-xs text-text-secondary">' + esc(t.kichThuoc || '') + '</span></span>' +
          '<button class="h-8 px-3 rounded border border-border-color text-body-xs font-semibold text-primary-container hover:bg-brand-light flex items-center gap-1" type="button" data-tai-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">download</span>Tải</button></li>';
      }).join('') + '</ul><p class="text-body-xs text-text-secondary">' + (api ? 'Liên kết tải có hiệu lực 60 giây.' : 'Tệp minh họa tạo trên trình duyệt (chưa có kho tệp thật).') +
        (b.yeuCauNda ? ' Tài liệu chi tiết chỉ gửi sau khi ký NDA.' : '') + '</p>') : '');

    var doiTuong = (b.doiTuong || []).map(function (d) { return D.DOI_TUONG[d] || d; }).join('<br>');
    var quyMo = b.quyMoNhom ? (b.quyMoNhom.min === b.quyMoNhom.max ? b.quyMoNhom.min : b.quyMoNhom.min + ' – ' + b.quyMoNhom.max) + ' người' : '—';
    var phai = (p ? veProposalCuaToi(p) : '') +
      the('Thông tin nhanh', 'info', '<dl>' +
        dong('Kinh phí', esc(S.chuoiKinhPhi(b))) +
        dong('Thời gian thực hiện', b.thoiGian ? esc(b.thoiGian) + ' tuần' : '—') +
        dong('Bắt đầu dự kiến', esc(D.dinhDangNgay(b.ngayBatDau) || '—')) +
        dong('Hình thức làm việc', esc(D.HINH_THUC[b.hinhThuc] || '—')) +
        dong('Địa điểm', esc(b.diaDiem || dn.diaChi)) +
        dong('Đối tượng nhận', doiTuong || '—') +
        dong('Quy mô nhóm', esc(quyMo)) +
        dong('Mức sẵn sàng (TRL)', b.trl ? 'TRL ' + esc(b.trl) : '—') +
        dong('Thỏa thuận bảo mật', b.yeuCauNda ? 'Bắt buộc' : 'Không yêu cầu') + '</dl>') +
      the('Mức phù hợp với bạn', 'insights', '<div class="flex items-center gap-3"><div class="flex-1 h-2 rounded-full bg-surface-container overflow-hidden"><div class="h-full bg-primary-container" style="width:' + phuHop + '%"></div></div>' +
        '<span class="text-lg font-bold text-primary-container">' + phuHop + '%</span></div><p class="text-body-xs text-text-secondary">Ước tính theo số kỹ năng yêu cầu trùng với Hồ sơ năng lực &amp; CV của bạn.</p>') +
      the('Về ' + esc(dn.ten), 'corporate_fare', '<div class="flex items-center gap-3">' + logo(dn) + '<div class="min-w-0"><p class="text-body-sm font-semibold text-text-main">' + esc(dn.ten) + '</p>' +
        '<p class="text-body-xs text-text-secondary">' + esc(dn.linhVucHD || '') + '</p></div></div>' +
        '<dl>' + (dn.quyMo ? dong('Quy mô', esc(dn.quyMo)) : '') + dong('Trụ sở', esc(dn.diaChi)) + '</dl>' +
        (dn.gioiThieu ? '<p class="text-body-sm text-text-secondary leading-relaxed">' + esc(dn.gioiThieu) + '</p>' : ''));

    goc.innerHTML = '<div class="space-y-5">' + dau +
      '<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"><div class="lg:col-span-8 space-y-5">' + trai + '</div>' +
      '<aside class="lg:col-span-4 space-y-5 lg:sticky lg:top-20">' + phai + '</aside></div></div>';

    if (location.hash === '#proposal-cua-toi' && p) {
      setTimeout(function () { var el = $('proposal-cua-toi'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    }
  }

  // Nạp lại bài toán (API hoặc mẫu) rồi vẽ. Promise.
  function taiLai() {
    return S.napChiTiet(ma).then(function (x) {
      b = x;
      api = S.laApi();
      S.veNguon($('ct-nguon'));
      ve();
    });
  }

  // ---------- Tải tệp ----------
  function taiPdf(tenTep, cacDong) {
    var url = URL.createObjectURL(D.taoPdfMau(cacDong));
    var a = document.createElement('a');
    a.href = url;
    a.download = tenTep;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Tệp trên máy chủ: lấy liên kết ký tạm rồi mở
  function taiTuMayChu(duongDan) {
    S.goi(duongDan + '?download=1').then(function (r) { window.location.href = r.url; },
      function (err) { D.thongBao('Không tải được tệp: ' + err.message, 'loi'); });
  }

  goc.addEventListener('click', function (e) {
    if (!b) return;
    if (e.target.closest('#nut-ung-tuyen')) { moHop(); return; }
    var nutLuu = e.target.closest('#nut-luu');
    if (nutLuu) {
      nutLuu.disabled = true;
      S.doiLuu(b.ma, daLuuHienTai()).then(function (kq) {
        if (api) b.daLuuApi = kq;
        ve();
        D.thongBao(kq ? 'Đã lưu vào mục "Đã lưu" của Bài toán DN & R&D' + (api ? '.' : ' (chưa lưu lên máy chủ).') : 'Đã bỏ lưu bài toán.', null,
          kq ? { chu: 'Xem mục Đã lưu', lam: function () { location.href = '09_cong-doanh-nghiep-rd.html?tab=da-luu'; } } : null);
      }, function (err) {
        nutLuu.disabled = false;
        D.thongBao('Không lưu được: ' + err.message, 'loi');
      });
      return;
    }
    if (e.target.closest('[data-tai-de-bai]')) {
      taiPdf(b.ma + '_de-bai.pdf', ['UIT Connect - De bai R&D ' + b.ma, b.tieuDe, 'Doanh nghiep: ' + b.doanhNghiep.ten,
        'Kinh phi: ' + S.chuoiKinhPhi(b), 'Han nop: ' + D.dinhDangNgay(b.hanNop), '', 'Ban tom tat tao tren trinh duyet.']);
      return;
    }
    var nutTep = e.target.closest('[data-tai-tep]');
    if (nutTep) {
      var t = b.tepDinhKem[Number(nutTep.getAttribute('data-tai-tep'))];
      if (api && t.id) { taiTuMayChu(S.API + '/' + encodeURIComponent(b.ma) + '/attachments/' + t.id); return; }
      taiPdf(t.ten.replace(/\.[a-z0-9]+$/i, '') + '.pdf', ['UIT Connect - Tai lieu dinh kem', t.ten, 'Bai toan: ' + b.ma, '', 'Tep minh hoa tao tren trinh duyet.']);
      return;
    }
    var nutTepP = e.target.closest('[data-tai-tep-proposal]');
    if (nutTepP) {
      var pp = proposalHienTai();
      taiTuMayChu(S.API + '/' + encodeURIComponent(b.ma) + '/proposals/' + pp.idApi + '/attachments/' + nutTepP.getAttribute('data-tai-tep-proposal'));
      return;
    }
    if (e.target.closest('#nut-rut-proposal')) rutProposal();
  });

  function rutProposal() {
    var p = proposalHienTai();
    if (!p) return;
    if (!window.confirm('Rút proposal "' + p.tieuDe + '"? Doanh nghiệp sẽ không thấy proposal này nữa.')) return;
    if (api) {
      S.goi(S.API + '/' + encodeURIComponent(b.ma) + '/proposals/' + p.idApi + '/withdraw', { method: 'POST' }).then(function () {
        D.thongBao('Đã rút proposal. Bạn có thể nộp lại khi bài toán còn nhận hồ sơ.');
        return taiLai();
      }, function (err) {
        D.thongBao('Không rút được: ' + err.message, err.status === 409 ? 'canh-bao' : 'loi');
        taiLai();
      });
      return;
    }
    if (p.trangThai !== 'cho-phan-hoi') { D.thongBao('Doanh nghiệp đã phản hồi nên không rút được proposal.', 'canh-bao'); ve(); return; }
    if (!D.rutProposalSv(p.id)) { D.thongBao('Không rút được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); return; }
    ve();
    D.thongBao('Đã rút proposal. Bạn có thể nộp lại khi bài toán còn nhận hồ sơ.');
  }

  // ---------- Hộp ứng tuyển ----------
  var hop = $('hop-ung-tuyen');
  var form = $('form-ung-tuyen');
  var oTruoc = null;
  var hinhThuc = '';
  var dangGui = false;

  function doLuaChon() {
    var chonNhom = $('ut-nhom');
    chonNhom.length = 1;
    dsNhom().forEach(function (n) {
      var o = document.createElement('option');
      o.value = n.id;
      o.textContent = n.ten + ' (' + n.thanhVien.length + ' thành viên' + (n.laTruongNhom ? ', bạn là trưởng nhóm' : '') + ')';
      chonNhom.appendChild(o);
    });
    var chonGv = $('ut-gv');
    chonGv.length = 1;
    dsGv().forEach(function (g) {
      var o = document.createElement('option');
      o.value = g.giaTri;
      o.textContent = g.ten;
      chonGv.appendChild(o);
    });
  }

  function nhomDangChon() {
    var id = $('ut-nhom').value;
    return dsNhom().filter(function (n) { return n.id === id; })[0] || null;
  }

  function veHinhThuc() {
    var ds = (b.doiTuong || []).filter(function (d) { return TEN_HINH_THUC[d]; });
    $('ut-hinh-thuc').innerHTML = ds.map(function (d) {
      return '<label class="flex items-start gap-2 rounded border border-border-color p-3 cursor-pointer hover:bg-surface-container-low has-[:checked]:border-primary-container has-[:checked]:bg-brand-light">' +
        '<input class="mt-0.5 text-primary-container focus:ring-primary-container" type="radio" name="hinhThuc" value="' + d + '"' + (ds.length === 1 ? ' checked' : '') + '>' +
        '<span><span class="block text-body-sm font-semibold text-text-main">' + TEN_HINH_THUC[d] + '</span><span class="block text-body-xs text-text-secondary">' + MO_TA_HINH_THUC[d] + '</span></span></label>';
    }).join('');
    hinhThuc = ds.length === 1 ? ds[0] : '';
    capNhatKhoiNhom();
  }

  function capNhatKhoiNhom() {
    var canNhom = hinhThuc === 'nhom-sv' || hinhThuc === 'lab';
    $('ut-khoi-nhom').classList.toggle('hidden', !canNhom);
    $('ut-khoi-gv').classList.toggle('hidden', hinhThuc !== 'lab');
    var q = b.quyMoNhom;
    $('ut-quy-mo-goi-y').textContent = q ? 'Doanh nghiệp yêu cầu nhóm từ ' + q.min + ' đến ' + q.max + ' thành viên. Chỉ trưởng nhóm được nộp thay cho nhóm.' : 'Chỉ trưởng nhóm được nộp thay cho nhóm.';
    var n = nhomDangChon();
    $('ut-thanh-vien').innerHTML = canNhom && n ? n.thanhVien.map(function (tv) {
      return '<li>• ' + esc(tv.ten) + (tv.mssv ? ' (' + esc(tv.mssv) + ')' : '') + (tv.truongNhom ? ' – trưởng nhóm' : '') + (tv.vaiTro ? ' · ' + esc(tv.vaiTro) : '') + '</li>';
    }).join('') : '';
  }

  function demKyTu(id, toiDa) {
    var o = $(id);
    var nhan = form.querySelector('[data-dem-cho="' + id + '"]');
    o.addEventListener('input', function () { nhan.textContent = o.value.length + ' / ' + toiDa; });
  }
  demKyTu('ut-noi-dung', 2000);
  demKyTu('ut-thu', 1000);

  function datLoi(ten, loi) {
    var el = form.querySelector('[data-loi-cho="' + ten + '"]');
    if (!el) return;
    el.textContent = loi || '';
    el.classList.toggle('hidden', !loi);
  }
  function xoaLoi() {
    Array.prototype.forEach.call(form.querySelectorAll('[data-loi-cho]'), function (el) { el.textContent = ''; el.classList.add('hidden'); });
    $('ut-loi-chung').classList.add('hidden');
  }
  function loiChung(noiDung) {
    $('ut-loi-chung').textContent = noiDung;
    $('ut-loi-chung').classList.remove('hidden');
    $('ut-loi-chung').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function moHop() {
    oTruoc = document.activeElement;
    form.reset();
    xoaLoi();
    form.querySelector('[data-dem-cho="ut-noi-dung"]').textContent = '0 / 2000';
    form.querySelector('[data-dem-cho="ut-thu"]').textContent = '0 / 1000';
    $('ut-bai-toan').textContent = b.ma + ' · ' + b.tieuDe + ' – ' + b.doanhNghiep.ten;
    $('ut-khoi-nda').classList.toggle('hidden', !b.yeuCauNda);
    $('ut-khoi-nda').classList.toggle('flex', !!b.yeuCauNda);
    doLuaChon();
    veHinhThuc();
    hop.classList.remove('hidden');
    hop.classList.add('flex');
    document.body.style.overflow = 'hidden';
    var dau = form.querySelector('input[name="hinhThuc"]:not(:checked)') || $('ut-tieu-de');
    dau.focus();
  }
  function dongHop() {
    hop.classList.add('hidden');
    hop.classList.remove('flex');
    document.body.style.overflow = '';
    if (oTruoc && oTruoc.focus) oTruoc.focus();
  }
  hop.addEventListener('click', function (e) {
    if (dangGui) return;
    if (e.target === hop || e.target.closest('[data-dong-hop]')) dongHop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !hop.classList.contains('hidden') && !dangGui) dongHop();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'hinhThuc') { hinhThuc = e.target.value; datLoi('hinhThuc', ''); capNhatKhoiNhom(); }
    if (e.target.id === 'ut-nhom') { datLoi('nhom', ''); capNhatKhoiNhom(); }
  });

  // Đọc 5 byte đầu của tệp: PDF thật bắt đầu bằng "%PDF-" (không tin phần mở rộng / Content-Type)
  function laPdfThat(tep) {
    return new Promise(function (ok) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result) === '%PDF-'); };
      r.onerror = function () { ok(false); };
      r.readAsText(tep.slice(0, 5));
    });
  }

  function kichThuocChu(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function datDangGui(co) {
    dangGui = co;
    var nut = $('ut-nut-gui');
    nut.disabled = co;
    nut.innerHTML = co
      ? '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Đang gửi…'
      : '<span class="material-symbols-outlined text-[18px]">send</span>Gửi proposal';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (dangGui) return;
    xoaLoi();
    if (!S.tinhTrangNhan(b).moNhan) { loiChung('Bài toán đã ngừng nhận hồ sơ (' + S.tinhTrangNhan(b).ten.toLowerCase() + ').'); return; }
    if (!api) {
      // Dữ liệu mẫu: kiểm tra lại trên dữ liệu mới nhất (DN có thể vừa đóng / sửa bài ở tab khác)
      var moi = S.layTheoMa(ma);
      if (!moi) { loiChung('Bài toán không còn công khai, không nộp được proposal.'); return; }
      b = moi;
      if (S.proposalChoBaiToan(b.ma)) { loiChung('Bạn đã nộp proposal cho bài toán này. Rút proposal đang chờ nếu muốn nộp lại.'); return; }
    } else if (proposalHienTai()) {
      loiChung('Bạn đã nộp proposal cho bài toán này. Rút proposal đang chờ nếu muốn nộp lại.');
      return;
    }

    var loi = {};
    var nhom = nhomDangChon();
    if (!hinhThuc || (b.doiTuong || []).indexOf(hinhThuc) === -1) loi.hinhThuc = 'Chọn hình thức ứng tuyển.';
    if (hinhThuc === 'nhom-sv' || hinhThuc === 'lab') {
      var q = b.quyMoNhom;
      if (!nhom) loi.nhom = 'Chọn nhóm ứng tuyển.';
      else if (!nhom.laTruongNhom) loi.nhom = 'Bạn không phải trưởng nhóm "' + nhom.ten + '". Chỉ trưởng nhóm được nộp thay cho nhóm.';
      else if (q && (nhom.thanhVien.length < q.min || nhom.thanhVien.length > q.max)) {
        loi.nhom = 'Nhóm "' + nhom.ten + '" có ' + nhom.thanhVien.length + ' thành viên, doanh nghiệp yêu cầu ' + q.min + '–' + q.max + ' thành viên.';
      }
    }
    if (hinhThuc === 'lab' && !$('ut-gv').value) loi.gv = 'Hình thức Lab cần giảng viên hướng dẫn.';
    var tieuDe = $('ut-tieu-de').value.trim();
    if (tieuDe.length < 10 || tieuDe.length > 150) loi.tieuDe = 'Tiêu đề cần từ 10 đến 150 ký tự.';
    var noiDung = $('ut-noi-dung').value.trim();
    if (noiDung.length < 50 || noiDung.length > 2000) loi.noiDung = 'Tóm tắt giải pháp cần từ 50 đến 2000 ký tự (hiện có ' + noiDung.length + ').';
    if (!$('ut-trl').value) loi.trl = 'Chọn mức sẵn sàng công nghệ hiện tại.';
    var tg = $('ut-thoi-gian').value;
    if (tg && (!(Number(tg) >= 1 && Number(tg) <= 104) || Math.floor(Number(tg)) !== Number(tg))) loi.thoiGian = 'Nhập số tuần nguyên từ 1 đến 104.';
    var tep = $('ut-tep').files[0];
    if (!tep) loi.tep = 'Đính kèm tệp proposal kỹ thuật (PDF).';
    else if (tep.size > TOI_DA_TEP) loi.tep = 'Tệp lớn hơn 10 MB (' + kichThuocChu(tep.size) + ').';
    else if (tep.size === 0) loi.tep = 'Tệp rỗng.';
    if (b.yeuCauNda && !$('ut-nda').checked) loi.nda = 'Đề bài yêu cầu đồng ý ký NDA.';
    if (!$('ut-xac-nhan').checked) loi.xacNhan = 'Cần xác nhận trước khi gửi.';

    var kiemTep = tep && !loi.tep ? laPdfThat(tep) : Promise.resolve(true);
    datDangGui(true);
    kiemTep.then(function (laPdf) {
      if (!laPdf) loi.tep = 'Tệp không phải PDF hợp lệ (nội dung tệp không đúng định dạng PDF).';
      var cacLoi = Object.keys(loi);
      if (cacLoi.length) {
        datDangGui(false);
        cacLoi.forEach(function (k) { datLoi(k, loi[k]); });
        var dau = form.querySelector('[data-loi-cho="' + cacLoi[0] + '"]');
        if (dau) dau.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var v = { tieuDe: tieuDe, noiDung: noiDung, nhom: nhom, tep: tep };
      if (api) guiLenMayChu(v);
      else { datDangGui(false); guiCucBo(v); }
    });
  });

  // Lỗi máy chủ → đặt vào đúng ô của form
  var O_THEO_MA_LOI = {
    NDA_REQUIRED: 'nda', TEAM_NOT_FOUND: 'nhom', NOT_TEAM_LEADER: 'nhom', TEAM_SIZE_MISMATCH: 'nhom',
    LECTURER_NOT_FOUND: 'gv', UPLOAD_NOT_FOUND: 'tep', FILE_TOO_LARGE: 'tep', UNSUPPORTED_TYPE: 'tep', PARTNER_TYPE_NOT_ACCEPTED: 'hinhThuc'
  };

  function guiLenMayChu(v) {
    var duong = S.API + '/' + encodeURIComponent(b.ma);
    S.goi(S.API + '/proposal-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(v.tep.name) },
      body: v.tep
    }).then(function (tai) {
      var tg = $('ut-thoi-gian').value;
      return S.goi(duong + '/proposals', {
        method: 'POST',
        json: {
          partnerType: PARTNER_API[hinhThuc],
          teamId: hinhThuc === 'ca-nhan' ? undefined : Number(v.nhom.id),
          lecturerId: hinhThuc === 'lab' ? Number($('ut-gv').value) : undefined,
          title: v.tieuDe,
          content: v.noiDung,
          trlLabel: $('ut-trl').value,
          durationWeeks: tg ? Number(tg) : undefined,
          coverLetter: $('ut-thu').value.trim() || undefined,
          ndaAccepted: $('ut-nda').checked,
          confirmed: true,
          uploadId: tai.uploadId
        }
      });
    }).then(function () {
      datDangGui(false);
      dongHop();
      D.thongBao('Đã gửi proposal tới ' + b.doanhNghiep.ten + '. Doanh nghiệp thấy ngay trong Hộp thư kết nối.');
      return taiLai().then(function () {
        var el = $('proposal-cua-toi');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, function (err) {
      datDangGui(false);
      var o = O_THEO_MA_LOI[err.code];
      if (o) { datLoi(o, err.message); var el = form.querySelector('[data-loi-cho="' + o + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else loiChung(err.status ? err.message : 'Không kết nối được máy chủ, proposal chưa được gửi.');
    });
  }

  // Dữ liệu mẫu: lưu tạm trên trình duyệt (DnBaiToan.nopProposalSv), hiện trong Hộp thư DN-08 cùng trình duyệt
  function guiCucBo(v) {
    var sv = S.SINH_VIEN;
    var laNhom = hinhThuc !== 'ca-nhan';
    var thanhVien = laNhom ? v.nhom.thanhVien : [{ ten: sv.ten, truongNhom: true, mssv: sv.mssv, vaiTro: 'Thực hiện toàn bộ đề tài', gpa: sv.gpa }];
    var thu = $('ut-thu').value.trim();
    var gv = hinhThuc === 'lab' ? $('ut-gv').value : '';
    var tg = $('ut-thoi-gian').value;
    var p = {
      id: 'sv-' + Date.now().toString(36),
      baiToan: b.ma,
      trangThai: 'cho-phan-hoi',
      nguon: hinhThuc,
      tieuDe: v.tieuDe,
      nguoiGui: sv.ten, kyHieu: sv.kyHieu, mau: 'bg-blue-100 text-blue-700',
      quyMo: laNhom ? 'Nhóm ' + thanhVien.length + ' SV' + (gv ? ' · có GV hướng dẫn' : '') : 'Cá nhân',
      moi: true,
      guiLuc: new Date().toISOString(),
      phuHop: S.mucPhuHop(b),
      nhom: laNhom ? v.nhom.ten : sv.ten,
      mssv: sv.mssv, khoa: sv.khoa, lop: sv.lop, gpa: sv.gpa, drl: sv.drl,
      noiDung: v.noiDung + (tg ? ' Thời gian thực hiện đề xuất: ' + tg + ' tuần.' : ''),
      the: (b.kyNang || []).slice(0, 4),
      trl: $('ut-trl').value,
      thu: (thu ? thu.split(/\n+/) : ['Em là ' + sv.ten + ' (MSSV ' + sv.mssv + '), xin gửi proposal cho bài toán ' + b.ma + '.'])
        .concat(gv ? ['Giảng viên hướng dẫn: ' + gv + '.'] : []),
      tep: [{ ten: v.tep.name, kichThuoc: kichThuocChu(v.tep.size), loai: 'Proposal kỹ thuật' }],
      thanhVien: thanhVien,
      gvHuongDan: gv || undefined,
      camKetNda: !!b.yeuCauNda
    };
    if (!D.nopProposalSv(p)) { loiChung('Không gửi được: trình duyệt đang chặn lưu dữ liệu cục bộ.'); return; }
    dongHop();
    ve();
    D.thongBao(b.tuLuongDn
      ? 'Đã gửi proposal tới ' + b.doanhNghiep.ten + '. Doanh nghiệp thấy ngay trong Hộp thư kết nối (lưu tạm trên trình duyệt, chưa lưu lên máy chủ).'
      : 'Đã gửi proposal (lưu tạm trên trình duyệt, chưa lưu lên máy chủ).');
    var el = $('proposal-cua-toi');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Bắt đầu ----------
  taiLai();
  // Chế độ dữ liệu mẫu: DN phản hồi / sửa bài ở tab khác của cùng trình duyệt thì vẽ lại
  window.addEventListener('storage', function (e) {
    if (api) return;
    if ((!e.key || /^uitc\.(dn|sv)\./.test(e.key)) && hop.classList.contains('hidden')) { b = S.layTheoMa(ma); ve(); }
  });
})();
