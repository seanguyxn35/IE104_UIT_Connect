// DN-16 Phòng đàm phán (trang phụ của "Vào phòng" / "Nhắn tin" ở DN-09).
//   ?phong=<id phòng>   vd. dp-seclab
// Logic:
//   - 3 bước Trao đổi kỹ thuật → NDA & IP → Hợp đồng; bước xong khi CẢ HAI bên xác nhận, bước sau chỉ mở khi bước trước xong.
//     Doanh nghiệp chỉ xác nhận / hủy xác nhận phía mình (hủy được khi đối tác chưa xác nhận). Đối tác xác nhận trên tài khoản của họ.
//   - "Hợp đồng" chỉ ghi nhận trạng thái đã ký ngoài hệ thống: UIT Connect không làm hợp đồng điện tử, không ký số.
//   - "Trao đổi" là tin nhắn theo lượt, KHÔNG phải chat thời gian thực (ngoài phạm vi dự án).
// Chưa có API: mọi thay đổi lưu tạm bằng DnBaiToan.capNhatPhong() (localStorage).
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var goc = document.getElementById('phong-dam-phan');
  if (!D || !goc) return;
  var esc = D.escapeHtml;
  var idPhong = new URLSearchParams(window.location.search).get('phong') || '';
  var TEN_DN = 'V-Tech Global';

  function khongThay() {
    goc.innerHTML = '<div class="bg-surface-container-lowest rounded-lg p-space-xl shadow-xs text-center flex flex-col items-center gap-3">' +
      '<span class="material-symbols-outlined text-[40px] text-text-muted">meeting_room</span>' +
      '<h1 class="font-headline-md text-headline-sm text-on-surface">Không tìm thấy phòng đàm phán' + (idPhong ? ' "' + esc(idPhong) + '"' : '') + '</h1>' +
      '<p class="font-body-md text-body-md text-on-surface-variant max-w-lg">Phòng chỉ có khi proposal đã được chấp nhận ở Hộp thư kết nối.</p>' +
      '<a class="h-10 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md inline-flex items-center gap-1.5 hover:bg-brand-navy-dark" href="09_khong-gian-dam-phan.html">' +
      '<span class="material-symbols-outlined text-[18px]">arrow_back</span>Về Không gian đàm phán</a></div>';
  }

  var ph = D.layPhong(idPhong);
  if (!ph) { khongThay(); return; }
  if (ph.chuaDoc) D.capNhatPhong(ph.id, { daDoc: true });

  function gioPhut(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function thoiDiem(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : D.dinhDangNgay(iso.slice(0, 10)) + ' ' + gioPhut(d);
  }
  function bayGioIso() {
    var d = new Date();
    return D.homNay() + 'T' + gioPhut(d);
  }

  function khoi(id, icon, tieuDe, noiDung, phu) {
    return '<section class="bg-surface-container-lowest rounded-lg p-space-lg shadow-xs scroll-mt-20" id="' + id + '">' +
      '<div class="flex items-center justify-between gap-2 mb-space-md"><h2 class="font-title-md text-headline-sm text-primary flex items-center gap-2">' +
      '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' + esc(tieuDe) + '</h2>' + (phu || '') + '</div>' + noiDung + '</section>';
  }

  // ---------- Tiến trình ----------
  function nhanXacNhan(ben, ok) {
    return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl font-label-sm text-label-sm ' +
      (ok ? 'bg-tertiary-fixed text-tertiary' : 'bg-surface-container text-text-muted') + '">' +
      '<span class="material-symbols-outlined text-[14px]">' + (ok ? 'check_circle' : 'radio_button_unchecked') + '</span>' + ben + ': ' + (ok ? 'đã xác nhận' : 'chưa xác nhận') + '</span>';
  }

  function tienTrinh() {
    var html = '<ol class="space-y-space-sm">' +
      '<li class="flex items-start gap-space-sm p-space-md rounded-lg bg-surface-container-low"><span class="w-7 h-7 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[16px]">check</span></span>' +
      '<div><p class="font-title-md text-title-md text-on-surface">Proposal</p><p class="font-body-sm text-body-sm text-text-muted">Đã chấp nhận, mở phòng ngày ' + esc(D.dinhDangNgay(ph.moPhong)) + '.</p></div></li>';
    D.BUOC_PHONG.forEach(function (b, i) {
      var x = ph.buoc[b.id];
      var xong = D.buocXong(x);
      var mo = D.buocDaMo(ph, b.id);
      var nut = '';
      if (!xong && mo && !x.dn) {
        nut = '<button class="h-9 px-4 rounded-lg ' + (x.doiTac ? 'bg-status-warning hover:opacity-90 text-white' : 'bg-primary-container hover:bg-brand-navy-dark text-on-primary') +
          ' font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors" type="button" data-xac-nhan="' + b.id + '">' +
          '<span class="material-symbols-outlined text-[18px]">task_alt</span>' + (b.id === 'hopDong' ? 'Xác nhận đã ký hợp đồng' : 'Xác nhận') + '</button>';
      } else if (!xong && x.dn) {
        nut = '<button class="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors" type="button" data-huy-xac-nhan="' + b.id + '">' +
          '<span class="material-symbols-outlined text-[18px]">undo</span>Hủy xác nhận</button>';
      }
      var trangThai = xong ? '<span class="font-label-sm text-label-sm text-tertiary">Hoàn tất</span>' :
        (!mo ? '<span class="font-label-sm text-label-sm text-text-muted inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">lock</span>Mở khi bước trước hoàn tất</span>' :
          (x.doiTac && !x.dn ? '<span class="font-label-sm text-label-sm text-status-error">Đối tác đã xác nhận, chờ bạn</span>' :
            (x.dn ? '<span class="font-label-sm text-label-sm text-primary">Chờ đối tác xác nhận</span>' : '<span class="font-label-sm text-label-sm text-primary">Đang thực hiện</span>')));
      html += '<li class="flex flex-col sm:flex-row sm:items-start gap-space-sm p-space-md rounded-lg ' + (mo && !xong ? 'bg-brand-light-blue/50' : 'bg-surface-container-low') + (mo ? '' : ' opacity-70') + '">' +
        '<span class="w-7 h-7 rounded-xl ' + (xong ? 'bg-tertiary text-on-tertiary' : (mo ? 'bg-primary text-on-primary' : 'bg-surface-container text-text-muted')) + ' flex items-center justify-center shrink-0 font-label-md text-label-md">' +
        (xong ? '<span class="material-symbols-outlined text-[16px]">check</span>' : (i + 2)) + '</span>' +
        '<div class="flex-1 min-w-0 space-y-1"><div class="flex flex-wrap items-center gap-2"><p class="font-title-md text-title-md text-on-surface">' + esc(b.ten) + '</p>' + trangThai + '</div>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(b.moTa) + (x.ghiChu ? ' <span class="text-text-muted">· ' + esc(x.ghiChu) + '</span>' : '') + '</p>' +
        '<div class="flex flex-wrap gap-1.5 pt-0.5">' + nhanXacNhan('Doanh nghiệp', x.dn) + nhanXacNhan('Đối tác', x.doiTac) + '</div></div>' +
        (nut ? '<div class="shrink-0">' + nut + '</div>' : '') + '</li>';
    });
    html += '</ol><p class="mt-space-sm font-body-sm text-body-sm text-text-muted">Mỗi bước chỉ hoàn tất khi cả doanh nghiệp và đối tác xác nhận. Đối tác xác nhận trên tài khoản của họ. ' +
      'Hợp đồng R&amp;D được ký ngoài hệ thống; UIT Connect chỉ ghi nhận trạng thái, không làm hợp đồng điện tử.</p>';
    return html;
  }

  // ---------- Trao đổi ----------
  function traoDoi() {
    var tin = ph.tinNhan.map(function (m) {
      if (m.tu === 'he-thong') {
        return '<li class="text-center"><span class="inline-block px-3 py-1 rounded-xl bg-surface-container-low font-label-sm text-label-sm text-text-muted">' +
          esc(m.noiDung) + ' · ' + esc(thoiDiem(m.luc)) + '</span></li>';
      }
      var laDn = m.tu === 'dn';
      return '<li class="flex ' + (laDn ? 'justify-end' : 'justify-start') + '"><div class="max-w-[85%] space-y-0.5">' +
        '<p class="font-label-sm text-label-sm text-text-muted ' + (laDn ? 'text-right' : '') + '">' + esc(laDn ? TEN_DN : ph.p.nguoiGui + ' · ' + ph.p.nhom) + ' · ' + esc(thoiDiem(m.luc)) + '</p>' +
        '<p class="px-3.5 py-2.5 rounded-lg font-body-md text-body-md whitespace-pre-line ' + (laDn ? 'bg-primary-container text-on-primary rounded-br-sm' : 'bg-surface-container-low text-on-surface rounded-bl-sm') + '">' + esc(m.noiDung) + '</p></div></li>';
    }).join('');
    return '<div class="rounded-lg bg-status-warning/10 px-3 py-2 mb-space-md font-body-sm text-body-sm text-on-surface flex items-start gap-2">' +
      '<span class="material-symbols-outlined text-[16px] text-status-warning">info</span><span>Trao đổi theo lượt, không phải trò chuyện thời gian thực: đối tác đọc khi mở phòng. ' +
      'Bản demo chưa có API nên tin nhắn chỉ lưu trên trình duyệt này.</span></div>' +
      '<ul class="space-y-space-md max-h-[420px] overflow-y-auto pr-1" id="ds-tin-nhan">' + tin + '</ul>' +
      '<form class="mt-space-md space-y-2" id="form-tin-nhan" novalidate><label class="sr-only" for="o-tin-nhan">Nội dung trao đổi</label>' +
      '<textarea class="w-full p-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" id="o-tin-nhan" rows="3" maxlength="1000" placeholder="Nhập nội dung gửi đối tác..."></textarea>' +
      '<div class="flex items-center justify-between gap-2"><span class="font-code-sm text-code-sm text-text-muted" id="dem-tin-nhan">0 / 1000</span>' +
      '<p class="hidden font-body-sm text-body-sm text-status-error" id="loi-tin-nhan"></p>' +
      '<button class="h-9 px-4 rounded-lg bg-primary-container hover:bg-brand-navy-dark text-on-primary font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors" type="submit">' +
      '<span class="material-symbols-outlined text-[18px]">send</span>Gửi</button></div></form>';
  }

  // ---------- Lịch, văn bản, đối tác ----------
  function lichHtml() {
    var l = ph.lich;
    return (l ? '<p class="font-title-md text-title-md text-on-surface">' + esc(D.dinhDangNgay(l.ngay) + ' · ' + l.gio) + '</p>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(l.hinhThuc) + (l.noiDung ? ' · ' + esc(l.noiDung) : '') + '</p>' +
      (l.ngay < D.homNay() ? '<p class="font-label-sm text-label-sm text-text-muted mt-1">Lịch này đã qua.</p>' : '') :
      '<p class="font-body-sm text-body-sm text-text-muted">Chưa có lịch trao đổi.</p>') +
      '<details class="mt-space-md group"><summary class="cursor-pointer list-none font-label-md text-label-md text-primary inline-flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">edit_calendar</span>' + (l ? 'Đề xuất lịch mới' : 'Đặt lịch trao đổi') + '</summary>' +
      '<form class="mt-space-sm space-y-2" id="form-lich" novalidate><div class="grid grid-cols-2 gap-2">' +
      '<label class="font-label-sm text-label-sm text-on-surface space-y-1"><span>Ngày *</span><input class="w-full h-9 px-2 bg-surface-container-low rounded font-body-sm text-body-sm" type="date" name="ngay" min="' + D.homNay() + '"></label>' +
      '<label class="font-label-sm text-label-sm text-on-surface space-y-1"><span>Giờ *</span><input class="w-full h-9 px-2 bg-surface-container-low rounded font-body-sm text-body-sm" type="time" name="gio"></label></div>' +
      '<label class="block font-label-sm text-label-sm text-on-surface space-y-1"><span>Hình thức</span><select class="w-full h-9 px-2 bg-surface-container-low rounded font-body-sm text-body-sm" name="hinhThuc">' +
      '<option>Trực tuyến (MS Teams)</option><option>Trực tuyến (Google Meet)</option><option>Tại văn phòng V-Tech Global</option><option>Tại UIT</option></select></label>' +
      '<label class="block font-label-sm text-label-sm text-on-surface space-y-1"><span>Nội dung</span><input class="w-full h-9 px-2 bg-surface-container-low rounded font-body-sm text-body-sm" type="text" name="noiDung" maxlength="120"></label>' +
      '<p class="hidden font-body-sm text-body-sm text-status-error" id="loi-lich"></p>' +
      '<button class="h-9 px-4 rounded-lg bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md inline-flex items-center gap-1.5" type="submit"><span class="material-symbols-outlined text-[18px]">event_available</span>Gửi đề xuất lịch</button></form></details>';
  }

  var dsTep = [];
  function vanBanHtml() {
    dsTep = (ph.vanBan || []).concat(ph.p.tep.map(function (t) { return { ten: t.ten, kichThuoc: t.kichThuoc, loai: t.loai + ' (proposal)' }; }));
    return '<ul class="space-y-2">' + dsTep.map(function (t, i) {
      return '<li class="flex items-center justify-between gap-2 p-2.5 rounded bg-surface-container-low"><div class="flex items-center gap-2 min-w-0">' +
        '<span class="material-symbols-outlined text-[20px] text-status-error shrink-0">picture_as_pdf</span><div class="min-w-0">' +
        '<p class="font-label-md text-label-md text-on-surface truncate" title="' + esc(t.ten) + '">' + esc(t.ten) + '</p>' +
        '<p class="font-code-sm text-[10px] text-text-muted">' + esc(t.kichThuoc + ' · ' + t.loai) + '</p></div></div>' +
        '<div class="flex shrink-0"><button class="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface-variant hover:text-primary" type="button" title="Xem" aria-label="Xem ' + esc(t.ten) + '" data-xem-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">visibility</span></button>' +
        '<button class="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface-variant hover:text-primary" type="button" title="Tải xuống" aria-label="Tải ' + esc(t.ten) + '" data-tai-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">download</span></button></div></li>';
    }).join('') + '</ul><p class="mt-2 font-code-sm text-[10px] text-text-muted">Tệp minh họa (bản demo): chưa có kho tệp trên máy chủ.</p>';
  }

  function doiTacHtml() {
    var p = ph.p;
    return '<p class="font-title-md text-title-md text-on-surface">' + esc(p.nhom) + '</p>' +
      '<p class="font-body-sm text-body-sm text-text-muted mb-space-sm">' + esc(p.mssv ? p.khoa : p.gioiThieu) + '</p>' +
      '<ul class="divide-y divide-surface-container-high">' + p.thanhVien.map(function (tv) {
        return '<li class="py-2"><p class="font-label-md text-label-md text-on-surface">' + esc(tv.ten) + (tv.truongNhom ? ' <span class="text-primary font-normal">(Trưởng nhóm)</span>' : '') + '</p>' +
          '<p class="font-body-sm text-body-sm text-text-muted">' + (tv.mssv ? 'MSSV ' + esc(tv.mssv) + ' · ' : '') + esc(tv.vaiTro) + '</p></li>';
      }).join('') + '</ul>' +
      '<a class="mt-space-sm inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline" href="08_hop-thu-ket-noi.html?proposal=' + encodeURIComponent(p.id) + '">Xem proposal gốc<span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>';
  }

  // ---------- Vẽ trang ----------
  function ve() {
    ph = D.layPhong(idPhong);
    var p = ph.p, bt = ph.baiToan;
    var tt = D.TRANG_THAI_PHONG[ph.trangThai];
    var loai = bt && D.LOAI[bt.loai];
    document.title = 'Phòng đàm phán ' + p.baiToan + ' · ' + p.nhom + ' | UIT Connect';
    document.getElementById('bc-cuoi').textContent = p.baiToan + ' · ' + p.nhom;

    var dau = '<div class="bg-surface-container-lowest rounded-lg p-space-lg shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">' +
      '<div class="space-y-space-xs min-w-0"><div class="flex flex-wrap items-center gap-space-xs">' +
      (loai ? '<span class="px-2.5 py-0.5 rounded-xl bg-brand-light-blue text-primary font-label-sm text-label-sm">' + esc(loai.ten) + '</span>' : '') +
      '<span class="px-2.5 py-0.5 rounded-xl ' + tt.mau + ' font-label-sm text-label-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-xl ' + tt.cham + '"></span>' + esc(tt.ten) + '</span>' +
      '<a class="font-code-sm text-code-sm text-on-surface-variant hover:text-primary hover:underline" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '">' + esc(p.baiToan) + '</a></div>' +
      '<p class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Phòng đàm phán</p>' +
      '<h1 class="font-headline-lg text-headline-lg text-primary tracking-tight">' + esc(bt ? bt.tieuDe : p.tieuDe) + '</h1>' +
      '<p class="font-body-md text-body-md text-on-surface-variant">Đối tác: <strong class="text-on-surface">' + esc(p.nguoiGui) + '</strong> · ' + esc(p.nhom) + ' · Mở phòng ' + esc(D.dinhDangNgay(ph.moPhong)) + '</p></div>' +
      '<div class="flex flex-wrap gap-space-xs shrink-0">' +
      '<a class="h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md inline-flex items-center gap-1.5" href="09_khong-gian-dam-phan.html#' + esc(ph.id) + '"><span class="material-symbols-outlined text-[18px]">arrow_back</span>Danh sách phòng</a>' +
      (ph.trangThai === 'da-ky' ? '<a class="h-10 px-4 rounded-lg bg-primary-container hover:bg-brand-navy-dark text-on-primary font-label-md text-label-md inline-flex items-center gap-1.5" href="15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(p.baiToan) + '#ho-so-du-an"><span class="material-symbols-outlined text-[18px]">folder_shared</span>Hồ sơ dự án</a>' : '') +
      '</div></div>';

    var canhBao = (ph.trangThai === 'cho-xac-nhan' && ph.canhBao ? '<div class="p-space-sm rounded bg-status-warning/10 text-on-surface flex items-center gap-2.5 font-label-md text-label-md">' +
      '<span class="material-symbols-outlined text-status-warning text-[20px]">warning</span><span><strong class="text-status-error">Chờ bạn xác nhận:</strong> ' + esc(ph.canhBao) + '</span></div>' : '') +
      (ph.moi || ph.luuCucBo ? '<div class="p-space-sm rounded bg-surface-container-low text-on-surface-variant flex items-center gap-2 font-body-sm text-body-sm">' +
        '<span class="material-symbols-outlined text-status-warning text-[18px]">cloud_off</span>Thay đổi trong phòng này chỉ lưu tạm trên trình duyệt, chưa lưu lên máy chủ.</div>' : '');

    goc.innerHTML = dau + canhBao +
      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">' +
      '<div class="lg:col-span-2 space-y-space-lg">' +
      khoi('tien-trinh', 'timeline', 'Tiến trình đàm phán', tienTrinh()) +
      khoi('trao-doi', 'forum', 'Trao đổi', traoDoi(), '<span class="font-label-sm text-label-sm text-text-muted">' + ph.tinNhan.length + ' tin</span>') +
      '</div><aside class="space-y-space-lg">' +
      khoi('lich', 'calendar_month', 'Lịch trao đổi', lichHtml()) +
      khoi('tai-lieu', 'folder', 'Văn bản & tài liệu', vanBanHtml()) +
      khoi('doi-tac', 'groups', 'Đối tác', doiTacHtml()) +
      '</aside></div>';

    var ds = document.getElementById('ds-tin-nhan');
    if (ds) ds.scrollTop = ds.scrollHeight;
  }

  // ---------- Sự kiện ----------
  function khongLuuDuoc() { D.thongBao('Không lưu được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); }
  function tenBuoc(id) { return D.BUOC_PHONG.filter(function (b) { return b.id === id; })[0].ten; }

  goc.addEventListener('click', function (e) {
    var xn = e.target.closest('[data-xac-nhan]');
    var huy = e.target.closest('[data-huy-xac-nhan]');
    var xem = e.target.closest('[data-xem-tep]');
    var tai = e.target.closest('[data-tai-tep]');
    if (xn) {
      var id = xn.getAttribute('data-xac-nhan');
      var cauHoi = id === 'hopDong'
        ? 'Xác nhận hai bên đã ký hợp đồng R&D (ký ngoài hệ thống)? UIT Connect chỉ ghi nhận trạng thái.'
        : 'Xác nhận hoàn tất bước "' + tenBuoc(id) + '" về phía doanh nghiệp?';
      if (!window.confirm(cauHoi)) return;
      var patch = { buoc: {} };
      patch.buoc[id] = { dn: true };
      patch.tinNhanMoi = { tu: 'he-thong', luc: bayGioIso(), noiDung: TEN_DN + ' đã xác nhận bước "' + tenBuoc(id) + '".' };
      if (!D.capNhatPhong(ph.id, patch)) { khongLuuDuoc(); return; }
      ve();
      var x = ph.buoc[id];
      D.thongBao(D.buocXong(x)
        ? (id === 'hopDong' ? 'Hai bên đã xác nhận ký hợp đồng. Phòng chuyển sang "Đã ký kết".' : 'Bước "' + tenBuoc(id) + '" hoàn tất: cả hai bên đã xác nhận.')
        : 'Đã xác nhận phía doanh nghiệp. Bước "' + tenBuoc(id) + '" chờ đối tác xác nhận.');
    } else if (huy) {
      var idH = huy.getAttribute('data-huy-xac-nhan');
      if (!window.confirm('Hủy xác nhận bước "' + tenBuoc(idH) + '"?')) return;
      var patchH = { buoc: {} };
      patchH.buoc[idH] = { dn: false };
      patchH.tinNhanMoi = { tu: 'he-thong', luc: bayGioIso(), noiDung: TEN_DN + ' đã hủy xác nhận bước "' + tenBuoc(idH) + '".' };
      if (!D.capNhatPhong(ph.id, patchH)) { khongLuuDuoc(); return; }
      ve();
      D.thongBao('Đã hủy xác nhận bước "' + tenBuoc(idH) + '".');
    } else if (xem || tai) {
      var t = dsTep[Number((xem || tai).getAttribute(xem ? 'data-xem-tep' : 'data-tai-tep'))];
      if (!t) return;
      var url = URL.createObjectURL(D.taoPdfMau([
        'UIT Connect - Tai lieu minh hoa (ban demo)', '',
        'Ten tep: ' + t.ten, 'Loai: ' + t.loai + ' - ' + t.kichThuoc,
        'Phong dam phan: ' + ph.p.baiToan + ' - ' + ph.p.nhom, '',
        'Chua co kho tep that tren may chu, day la tep tao tu dong de minh hoa.'
      ]));
      if (xem) {
        if (!window.open(url, '_blank')) D.thongBao('Trình duyệt chặn cửa sổ mới. Hãy dùng nút Tải xuống.', 'canh-bao');
      } else {
        var a = document.createElement('a');
        a.href = url; a.download = t.ten;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }
  });

  goc.addEventListener('input', function (e) {
    if (e.target.id === 'o-tin-nhan') document.getElementById('dem-tin-nhan').textContent = e.target.value.length + ' / 1000';
  });

  goc.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'form-tin-nhan') {
      var o = document.getElementById('o-tin-nhan');
      var noiDung = o.value.trim();
      var loi = document.getElementById('loi-tin-nhan');
      loi.textContent = !noiDung ? 'Nhập nội dung trước khi gửi.' : (noiDung.length > 1000 ? 'Tối đa 1000 ký tự.' : '');
      loi.classList.toggle('hidden', !loi.textContent);
      if (loi.textContent) { o.focus(); return; }
      if (!D.capNhatPhong(ph.id, { tinNhanMoi: { tu: 'dn', luc: bayGioIso(), noiDung: noiDung } })) { khongLuuDuoc(); return; }
      ve();
      document.getElementById('o-tin-nhan').focus();
      D.thongBao('Đã gửi tin nhắn (lưu tạm trên trình duyệt, chưa gửi lên máy chủ).');
    } else if (e.target.id === 'form-lich') {
      var f = e.target;
      var ngay = f.ngay.value, gio = f.gio.value;
      var loiL = '';
      if (!ngay || !gio) loiL = 'Chọn ngày và giờ.';
      else if (ngay < D.homNay() || (ngay === D.homNay() && gio <= gioPhut(new Date()))) loiL = 'Thời điểm hẹn đã qua.';
      var oLoi = document.getElementById('loi-lich');
      oLoi.textContent = loiL;
      oLoi.classList.toggle('hidden', !loiL);
      if (loiL) return;
      var lich = { ngay: ngay, gio: gio, hinhThuc: f.hinhThuc.value, noiDung: f.noiDung.value.trim() };
      if (!D.capNhatPhong(ph.id, { lich: lich, tinNhanMoi: { tu: 'he-thong', luc: bayGioIso(), noiDung: TEN_DN + ' đề xuất lịch trao đổi ' + gio + ' ngày ' + D.dinhDangNgay(ngay) + ' (' + lich.hinhThuc + ').' } })) { khongLuuDuoc(); return; }
      ve();
      D.thongBao('Đã cập nhật lịch trao đổi và báo cho đối tác trong mục Trao đổi.');
    }
  });

  ve();
  // Cuộn / focus sau khi trang tải xong: trình duyệt tự cuộn tới #... lúc tải sẽ làm mất focus đặt sớm hơn
  function denMuc() {
    var muc = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (!muc) return;
    muc.scrollIntoView({ block: 'start' });
    if (window.location.hash === '#trao-doi') { var o = document.getElementById('o-tin-nhan'); if (o) o.focus({ preventScroll: true }); }
  }
  if (document.readyState === 'complete') denMuc();
  else window.addEventListener('load', function () { setTimeout(denMuc, 0); });
})();
