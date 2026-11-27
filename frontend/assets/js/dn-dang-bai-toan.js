// DN-05 Đăng / sửa bài toán R&D: trình soạn 4 bước trên một trang.
//   ?ma=<mã>  soạn tiếp bản nháp (trạng thái "nhap") hoặc sửa bài toán đang mở ("dang-mo")
//   ?mau=1    điền sẵn khung mô tả theo Biểu mẫu đề bài (DN-14)
// Chưa có API: bản nháp / bài gửi duyệt lưu tạm bằng DnBaiToan.luu() (localStorage), trang báo rõ "chưa lưu lên máy chủ".
// Cần dn-bai-toan-data.js nạp trước.
(function () {
  'use strict';
  var D = window.DnBaiToan;
  var form = document.getElementById('form-bai-toan');
  if (!D || !form) return;
  var esc = D.escapeHtml;
  var $ = function (id) { return document.getElementById(id); };

  var TEN_BUOC = ['Thông tin bài toán', 'Yêu cầu & kỹ năng', 'Ngân sách & thời hạn', 'Xem lại & gửi duyệt'];
  var TOI_DA_MO_TA = 3000;
  var TOI_DA_TEP = 10;
  var TOI_DA_DUNG_LUONG = 25 * 1024 * 1024;

  // Lĩnh vực gợi ý theo lĩnh vực đang chọn (thẻ dưới ô "Lĩnh vực chuyên môn chủ đạo")
  var LIEN_QUAN = {
    '': ['ai', 'iot', 'sec', 'edge'],
    ai: ['edge', 'data', 'iot', 'cloud'],
    iot: ['edge', 'robot', 'sec', 'ai'],
    sec: ['cloud', 'edge', 'blockchain', 'ai'],
    data: ['ai', 'cloud', 'blockchain', 'sec'],
    cloud: ['sec', 'edge', 'data', 'iot'],
    edge: ['ai', 'iot', 'cloud', 'sec'],
    ic: ['ai', 'iot', 'edge', 'robot'],
    robot: ['iot', 'ai', 'edge', 'ic'],
    blockchain: ['sec', 'data', 'cloud', 'ai']
  };

  // Khung mô tả theo Biểu mẫu đề bài (DN-14)
  var MAU_MO_TA = '<p><b>1. Bối cảnh &amp; hiện trạng</b></p><p>Doanh nghiệp đang ... Hiện tại hệ thống ...</p>' +
    '<p><b>2. Thách thức kỹ thuật</b></p><ol><li>...</li><li>...</li></ol>' +
    '<p><b>3. Đầu ra mong đợi (deliverables)</b></p><ul><li>...</li></ul>' +
    '<p><b>4. Dữ liệu &amp; môi trường thử nghiệm</b></p><p>...</p>' +
    '<p><b>5. Chỉ số đánh giá thành công</b></p><ul><li>...</li></ul>';

  // ---------- Khởi tạo dữ liệu ----------
  var thamSo = new URLSearchParams(window.location.search);
  var maUrl = thamSo.get('ma');
  var goc = maUrl ? D.layTheoMa(maUrl) : null;
  var cheDo = 'moi'; // moi | nhap | sua
  var bt;

  function macDinh() {
    return {
      ma: null, tieuDe: '', loai: 'ung-tuyen', linhVuc: '', trangThai: 'nhap',
      moTa: thamSo.get('mau') ? MAU_MO_TA : '', tepDinhKem: [],
      kyNang: [], doiTuong: ['nhom-sv'], quyMoNhom: { min: 2, max: 5 }, trl: 0,
      sanPham: ['Mã nguồn', 'Báo cáo kỹ thuật'], tieuChi: '', yeuCauNda: false,
      nganSach: null, thoaThuanNganSach: false, hanNop: '', ngayBatDau: '', thoiGian: 12,
      hinhThuc: 'ket-hop', diaDiem: '', moc: [], ngayTao: D.homNay()
    };
  }

  if (maUrl && !goc) {
    khoaTrang('Không tìm thấy bài toán có mã <strong>' + esc(maUrl) + '</strong>. Có thể bản nháp đã bị xóa hoặc chỉ lưu trên trình duyệt khác.',
      '04_bai-toan-rd.html', 'Về danh sách bài toán');
    return;
  }
  if (goc && goc.trangThai !== 'nhap' && goc.trangThai !== 'dang-mo') {
    var lyDo = goc.trangThai === 'cho-duyet' ? 'đang chờ Admin duyệt' : (goc.trangThai === 'dang-thuc-hien' ? 'đang thực hiện' : 'đã đóng');
    khoaTrang('Bài toán <strong>' + esc(goc.ma) + '</strong> ' + lyDo + ' nên không sửa được nội dung.',
      '15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(goc.ma), 'Xem chi tiết bài toán');
    return;
  }
  if (goc) {
    cheDo = goc.trangThai === 'nhap' ? 'nhap' : 'sua';
    bt = goc;
    if (!bt.quyMoNhom) bt.quyMoNhom = { min: 2, max: 5 };
    bt.thoaThuanNganSach = !!bt.thoaThuanNganSach;
  } else {
    bt = macDinh();
  }

  var buoc = 1;
  var daSua = false;
  var daGui = false;
  var tepMoi = {}; // tên tệp -> File, để mở xem trước tệp vừa chọn

  function khoaTrang(htmlThongBao, href, chuLink) {
    var tb = $('thong-bao-che-do');
    if (tb) {
      tb.className = 'rounded-xl px-4 py-4 bg-error-container text-on-error-container flex items-start gap-3 font-body-md text-body-md';
      tb.innerHTML = '<span class="material-symbols-outlined text-[20px] shrink-0">block</span><div>' + htmlThongBao +
        ' <a class="underline font-semibold" href="' + href + '">' + esc(chuLink) + '</a></div>';
    }
    ['khung-stepper', 'form-bai-toan'].forEach(function (id) { var el = $(id); if (el) el.hidden = true; });
    // Dùng class "hidden": thuộc tính hidden thua class inline-flex của Tailwind
    var badge = $('trang-thai-luu');
    if (badge) badge.classList.add('hidden');
  }

  // ---------- Tiêu đề trang theo chế độ ----------
  (function () {
    var tieuDe = cheDo === 'sua' ? 'Chỉnh sửa bài toán R&D' : (cheDo === 'nhap' ? 'Tiếp tục soạn bản nháp' : 'Đăng bài toán R&D mới');
    $('tieu-de-trang').textContent = tieuDe;
    $('bc-cuoi').textContent = cheDo === 'sua' ? 'Chỉnh sửa ' + bt.ma : (cheDo === 'nhap' ? 'Soạn tiếp ' + bt.ma : 'Đăng bài toán mới');
    document.title = tieuDe + ' | UIT Connect';
    var noiDung = $('thong-bao-che-do').querySelector('[data-noi-dung]');
    var luuY = 'Chưa có API bài toán R&D: thay đổi chỉ được lưu tạm trên trình duyệt này, <strong>chưa lưu lên máy chủ</strong>.';
    if (cheDo === 'sua') noiDung.innerHTML = 'Bạn đang sửa bài toán đang mở <strong>' + esc(bt.ma) + '</strong>. Sau khi lưu, bài toán quay về <strong>Chờ Admin duyệt</strong> (gắn nhãn "Đã sửa") và tạm ẩn với sinh viên cho tới khi được duyệt lại. ' + luuY;
    else if (cheDo === 'nhap') noiDung.innerHTML = 'Đang soạn tiếp bản nháp <strong>' + esc(bt.ma) + '</strong>. ' + luuY;
    else noiDung.innerHTML = luuY;
    if (cheDo === 'sua') { $('nut-luu-nhap').classList.add('hidden'); $('nut-luu-nhap').classList.remove('flex'); }
  })();

  function capNhatHuyHieuLuu(chu, mauCham) {
    var badge = $('trang-thai-luu');
    badge.querySelector('[data-chu]').textContent = chu;
    var cham = badge.querySelector('[data-cham]');
    cham.className = 'w-2 h-2 rounded-full ' + mauCham;
  }
  if (cheDo !== 'moi') {
    capNhatHuyHieuLuu('Lưu gần nhất: ' + D.dinhDangNgay(bt.ngayLuu) + (bt.luuCucBo ? ' (trình duyệt)' : ''), 'bg-tertiary-fixed-dim');
  }

  function danhDauDaSua() {
    if (daSua) return;
    daSua = true;
    capNhatHuyHieuLuu('Có thay đổi chưa lưu', 'bg-status-warning animate-pulse');
  }

  // ---------- Bước 1: các ô nhập ----------
  var oTieuDe = $('rd-title');
  var chonLinhVuc = $('rd-field');
  var editor = $('rd-desc');

  chonLinhVuc.insertAdjacentHTML('beforeend', D.LINH_VUC.map(function (lv) {
    return '<option value="' + lv.id + '">' + esc(lv.ten) + '</option>';
  }).join(''));

  function demTieuDe() { $('title-char-count').textContent = oTieuDe.value.length + ' / 150 ký tự'; }
  oTieuDe.addEventListener('input', demTieuDe);

  // Thẻ gợi ý lĩnh vực: bấm để điền vào ô "Lĩnh vực chuyên môn chủ đạo"
  function veGoiYLinhVuc() {
    var ds = LIEN_QUAN[chonLinhVuc.value] || LIEN_QUAN[''];
    $('goi-y-linh-vuc').innerHTML = ds.map(function (id) {
      return '<button class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors" type="button" data-chon-linh-vuc="' + id + '" title="Đặt làm lĩnh vực chủ đạo">' +
        '<span class="material-symbols-outlined text-[14px]">add</span>' + esc(D.tenLinhVuc(id, true)) + '</button>';
    }).join('');
  }
  $('goi-y-linh-vuc').addEventListener('click', function (e) {
    var nut = e.target.closest('[data-chon-linh-vuc]');
    if (!nut) return;
    chonLinhVuc.value = nut.getAttribute('data-chon-linh-vuc');
    chonLinhVuc.dispatchEvent(new Event('change', { bubbles: true }));
    // Nháy viền để người dùng thấy ô đã được điền
    chonLinhVuc.classList.add('ring-2', 'ring-secondary');
    setTimeout(function () { chonLinhVuc.classList.remove('ring-2', 'ring-secondary'); }, 900);
  });
  chonLinhVuc.addEventListener('change', function () { veGoiYLinhVuc(); veGoiYKyNang(); });

  // ---------- Khung soạn mô tả có định dạng ----------
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* trình duyệt cũ */ }

  function doDaiMoTa() { return (editor.innerText || '').replace(/\s+$/, '').length; }
  function demMoTa() {
    var n = doDaiMoTa();
    var o = $('desc-char-count');
    o.textContent = n + ' / ' + TOI_DA_MO_TA + ' ký tự';
    o.classList.toggle('text-status-error', n > TOI_DA_MO_TA);
    o.classList.toggle('text-text-muted', n <= TOI_DA_MO_TA);
  }
  function chuanHoaEditor() {
    // Xóa <br> thừa khi người dùng xóa hết chữ để chữ gợi ý hiện lại
    if (!editor.textContent.trim() && !editor.querySelector('li,img')) editor.innerHTML = '';
  }

  var vungChon = null;
  function luuVungChon() {
    var sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) vungChon = sel.getRangeAt(0).cloneRange();
  }
  function khoiPhucVungChon() {
    editor.focus();
    var sel = window.getSelection();
    if (vungChon) { sel.removeAllRanges(); sel.addRange(vungChon); return; }
    if (!editor.contains(sel.anchorNode)) {
      var r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  function khoiHienTai() {
    try { return String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); }
    catch (e) { return ''; }
  }

  function capNhatThanhDinhDang() {
    var sel = window.getSelection();
    var trongEditor = sel.rangeCount && editor.contains(sel.anchorNode);
    var khoi = trongEditor ? khoiHienTai() : '';
    document.querySelectorAll('#thanh-dinh-dang [data-lenh]').forEach(function (nut) {
      if (!nut.hasAttribute('aria-pressed')) return;
      var lenh = nut.getAttribute('data-lenh');
      var bat = false;
      if (trongEditor) {
        if (lenh === 'code') bat = khoi === 'pre';
        else if (lenh === 'quote') bat = khoi === 'blockquote';
        else { try { bat = document.queryCommandState(lenh); } catch (e) { bat = false; } }
      }
      nut.setAttribute('aria-pressed', bat ? 'true' : 'false');
    });
  }

  function doiKhoi(the) {
    var hienTai = khoiHienTai();
    document.execCommand('formatBlock', false, hienTai === the ? '<p>' : '<' + the + '>');
  }

  var thanhDinhDang = $('thanh-dinh-dang');
  // Giữ vùng chọn trong khung soạn khi bấm nút
  thanhDinhDang.addEventListener('mousedown', function (e) {
    if (e.target.closest('[data-lenh]')) e.preventDefault();
  });
  thanhDinhDang.addEventListener('click', function (e) {
    var nut = e.target.closest('[data-lenh]');
    if (!nut) return;
    var lenh = nut.getAttribute('data-lenh');
    khoiPhucVungChon();
    if (lenh === 'createLink') {
      var sel = window.getSelection();
      var coChu = sel.rangeCount && !sel.getRangeAt(0).collapsed;
      var url = window.prompt('Nhập địa chỉ liên kết (bắt đầu bằng https://):', 'https://');
      if (url === null) return;
      url = url.trim();
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(url)) {
        D.thongBao('Liên kết không hợp lệ: cần bắt đầu bằng http:// hoặc https://', 'loi');
        return;
      }
      khoiPhucVungChon();
      if (coChu) document.execCommand('createLink', false, url);
      else document.execCommand('insertHTML', false, '<a href="' + esc(url) + '">' + esc(url) + '</a>&nbsp;');
    } else if (lenh === 'code') {
      doiKhoi('pre');
    } else if (lenh === 'quote') {
      doiKhoi('blockquote');
    } else if (lenh === 'removeFormat') {
      document.execCommand('removeFormat');
      document.execCommand('unlink');
      if (khoiHienTai() === 'pre' || khoiHienTai() === 'blockquote') document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand(lenh);
    }
    luuVungChon();
    capNhatThanhDinhDang();
    demMoTa();
    danhDauDaSua();
  });

  editor.addEventListener('input', function () { chuanHoaEditor(); demMoTa(); danhDauDaSua(); });
  editor.addEventListener('keyup', luuVungChon);
  editor.addEventListener('mouseup', luuVungChon);
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) { luuVungChon(); capNhatThanhDinhDang(); }
  });
  // Dán: chỉ lấy chữ thuần để không mang theo định dạng / mã lạ từ trang khác
  editor.addEventListener('paste', function (e) {
    e.preventDefault();
    var chu = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, chu);
  });
  editor.addEventListener('drop', function (e) { e.preventDefault(); });

  // ---------- Tệp đính kèm ----------
  var vungTep = $('vung-tai-tep');
  var oTep = $('rd-files');

  function dungLuong(byte) {
    if (byte >= 1024 * 1024) return (byte / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(byte / 1024)) + ' KB';
  }
  function iconTep(ten) {
    var duoi = (ten.split('.').pop() || '').toLowerCase();
    if (duoi === 'pdf') return { icon: 'picture_as_pdf', mau: 'bg-error-container text-on-error-container' };
    if (duoi === 'docx') return { icon: 'description', mau: 'bg-primary-fixed text-primary' };
    return { icon: 'folder_zip', mau: 'bg-surface-container-high text-on-surface-variant' };
  }
  function veDsTep() {
    $('ds-tep').innerHTML = bt.tepDinhKem.map(function (t, i) {
      var ic = iconTep(t.ten);
      var coXem = !!tepMoi[t.ten];
      return '<li class="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-surface-container-low shadow-xs">' +
        '<div class="flex items-center gap-3 min-w-0"><div class="w-9 h-9 rounded-lg ' + ic.mau + ' flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">' + ic.icon + '</span></div><div class="min-w-0">' +
        '<div class="font-title-md text-title-md text-on-surface truncate">' + esc(t.ten) + '</div>' +
        '<span class="font-code-sm text-code-sm text-text-muted">' + esc(t.kichThuoc) +
        (t.moi ? ' • <span class="text-status-warning">Chưa tải lên máy chủ</span>' : '') + '</span></div></div>' +
        '<div class="flex items-center gap-2 shrink-0">' +
        (coXem ? '<button class="h-8 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1" type="button" data-xem-tep="' + i + '"><span class="material-symbols-outlined text-[16px]">visibility</span>Xem</button>' : '') +
        '<button class="h-8 w-8 rounded-full bg-error-container text-on-error-container hover:opacity-80 transition-opacity flex items-center justify-center" title="Xóa tài liệu" aria-label="Xóa ' + esc(t.ten) + '" type="button" data-xoa-tep="' + i + '">' +
        '<span class="material-symbols-outlined text-[16px]">delete</span></button></div></li>';
    }).join('');
  }
  function themTep(files) {
    var loi = [];
    Array.prototype.forEach.call(files, function (f) {
      if (!/\.(pdf|docx|zip|rar)$/i.test(f.name)) { loi.push(f.name + ': chỉ nhận PDF, DOCX, ZIP, RAR'); return; }
      if (f.size > TOI_DA_DUNG_LUONG) { loi.push(f.name + ': vượt quá 25MB'); return; }
      if (bt.tepDinhKem.some(function (t) { return t.ten === f.name; })) { loi.push(f.name + ': đã có trong danh sách'); return; }
      if (bt.tepDinhKem.length >= TOI_DA_TEP) { loi.push(f.name + ': tối đa ' + TOI_DA_TEP + ' tệp'); return; }
      bt.tepDinhKem.push({ ten: f.name, kichThuoc: dungLuong(f.size), moi: true });
      tepMoi[f.name] = f;
      danhDauDaSua();
    });
    hienLoi({ tep: loi.join('; ') }, ['tep']);
    veDsTep();
  }
  vungTep.addEventListener('click', function () { oTep.click(); });
  vungTep.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oTep.click(); }
  });
  oTep.addEventListener('click', function (e) { e.stopPropagation(); });
  oTep.addEventListener('change', function () { themTep(oTep.files); oTep.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    vungTep.addEventListener(ev, function (e) { e.preventDefault(); vungTep.classList.add('ring-2', 'ring-primary'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    vungTep.addEventListener(ev, function () { vungTep.classList.remove('ring-2', 'ring-primary'); });
  });
  vungTep.addEventListener('drop', function (e) { e.preventDefault(); themTep(e.dataTransfer.files); });
  $('ds-tep').addEventListener('click', function (e) {
    var nutXoa = e.target.closest('[data-xoa-tep]');
    var nutXem = e.target.closest('[data-xem-tep]');
    if (nutXoa) {
      var t = bt.tepDinhKem.splice(Number(nutXoa.getAttribute('data-xoa-tep')), 1)[0];
      if (t) delete tepMoi[t.ten];
      danhDauDaSua();
      veDsTep();
    } else if (nutXem) {
      var tep = bt.tepDinhKem[Number(nutXem.getAttribute('data-xem-tep'))];
      if (tep && tepMoi[tep.ten]) window.open(URL.createObjectURL(tepMoi[tep.ten]), '_blank', 'noopener');
    }
  });

  // ---------- Bước 2 ----------
  var oKyNang = $('rd-skill');

  function veKyNang() {
    $('ds-ky-nang').innerHTML = bt.kyNang.map(function (k, i) {
      return '<li class="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md">' + esc(k) +
        '<button class="w-6 h-6 rounded-full hover:bg-secondary-fixed-dim flex items-center justify-center" type="button" aria-label="Bỏ ' + esc(k) + '" data-bo-ky-nang="' + i + '">' +
        '<span class="material-symbols-outlined text-[16px]">close</span></button></li>';
    }).join('');
    veGoiYKyNang();
  }
  function veGoiYKyNang() {
    var daCo = bt.kyNang.map(D.chuanHoa);
    var ds = (D.GOI_Y_KY_NANG[chonLinhVuc.value] || D.GOI_Y_KY_NANG.ai).filter(function (k) { return daCo.indexOf(D.chuanHoa(k)) === -1; });
    $('goi-y-ky-nang').innerHTML = ds.length ? ds.map(function (k) {
      return '<button class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors" type="button" data-them-ky-nang="' + esc(k) + '">' +
        '<span class="material-symbols-outlined text-[14px]">add</span>' + esc(k) + '</button>';
    }).join('') : '<span class="font-body-sm text-body-sm text-text-muted">Đã thêm hết gợi ý.</span>';
  }
  function themKyNang(k) {
    k = String(k || '').trim().replace(/\s+/g, ' ');
    if (!k) return;
    if (bt.kyNang.length >= 10) { hienLoi({ kyNang: 'Tối đa 10 kỹ năng.' }, ['kyNang']); return; }
    if (bt.kyNang.some(function (x) { return D.chuanHoa(x) === D.chuanHoa(k); })) { hienLoi({ kyNang: '"' + k + '" đã có trong danh sách.' }, ['kyNang']); return; }
    bt.kyNang.push(k);
    hienLoi({}, ['kyNang']);
    danhDauDaSua();
    veKyNang();
  }
  oKyNang.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); themKyNang(oKyNang.value); oKyNang.value = ''; }
  });
  $('nut-them-ky-nang').addEventListener('click', function () { themKyNang(oKyNang.value); oKyNang.value = ''; oKyNang.focus(); });
  $('goi-y-ky-nang').addEventListener('click', function (e) {
    var nut = e.target.closest('[data-them-ky-nang]');
    if (nut) themKyNang(nut.getAttribute('data-them-ky-nang'));
  });
  $('ds-ky-nang').addEventListener('click', function (e) {
    var nut = e.target.closest('[data-bo-ky-nang]');
    if (!nut) return;
    bt.kyNang.splice(Number(nut.getAttribute('data-bo-ky-nang')), 1);
    danhDauDaSua();
    veKyNang();
  });

  $('ds-doi-tuong').innerHTML = Object.keys(D.DOI_TUONG).map(function (id) {
    return '<label class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low has-[:checked]:bg-brand-light-blue has-[:checked]:ring-2 has-[:checked]:ring-primary-container cursor-pointer transition-all">' +
      '<input class="w-4 h-4 rounded text-primary focus:ring-primary" type="checkbox" name="doi_tuong" value="' + id + '"/>' +
      '<span class="font-body-md text-body-md text-on-surface">' + esc(D.DOI_TUONG[id]) + '</span></label>';
  }).join('');

  $('ds-san-pham').innerHTML = D.SAN_PHAM.map(function (sp) {
    return '<label class="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-container-low has-[:checked]:bg-brand-light-blue cursor-pointer transition-colors">' +
      '<input class="w-4 h-4 rounded text-primary focus:ring-primary" type="checkbox" name="san_pham" value="' + esc(sp) + '"/>' +
      '<span class="font-body-md text-body-md text-on-surface">' + esc(sp) + '</span></label>';
  }).join('');

  $('rd-criteria').addEventListener('input', function () {
    $('criteria-char-count').textContent = this.value.length + ' / 1000 ký tự';
  });

  // ---------- Bước 3 ----------
  $('rd-mode').innerHTML = Object.keys(D.HINH_THUC).map(function (id) {
    return '<option value="' + id + '">' + esc(D.HINH_THUC[id]) + '</option>';
  }).join('');

  var oThoaThuan = $('rd-budget-tbd');
  function capNhatNganSach() {
    $('rd-budget-min').disabled = oThoaThuan.checked;
    $('rd-budget-max').disabled = oThoaThuan.checked;
  }
  oThoaThuan.addEventListener('change', capNhatNganSach);

  var LOP_O_MOC = 'w-full h-11 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-xs';
  function veMoc() {
    $('ds-moc').innerHTML = bt.moc.length ? bt.moc.map(function (m, i) {
      return '<li class="grid grid-cols-12 gap-3 items-center p-2 rounded-lg bg-surface-container-low/60">' +
        '<div class="col-span-12 md:col-span-6"><label class="sr-only" for="moc-ten-' + i + '">Tên mốc ' + (i + 1) + '</label>' +
        '<input class="' + LOP_O_MOC + '" id="moc-ten-' + i + '" data-moc="' + i + '" data-truong="ten" maxlength="120" placeholder="Mốc ' + (i + 1) + ': VD Mô hình chạy trên thiết bị biên" value="' + esc(m.ten) + '"/></div>' +
        '<div class="col-span-5 md:col-span-2"><label class="sr-only" for="moc-tuan-' + i + '">Tuần thứ</label>' +
        '<input class="' + LOP_O_MOC + '" id="moc-tuan-' + i + '" data-moc="' + i + '" data-truong="tuan" type="number" min="1" max="104" placeholder="Tuần" value="' + esc(m.tuan) + '"/></div>' +
        '<div class="col-span-5 md:col-span-3 flex items-center gap-1.5"><label class="sr-only" for="moc-pt-' + i + '">% giải ngân</label>' +
        '<input class="' + LOP_O_MOC + '" id="moc-pt-' + i + '" data-moc="' + i + '" data-truong="phanTram" type="number" min="0" max="100" placeholder="%" value="' + esc(m.phanTram) + '"/><span class="text-text-muted">%</span></div>' +
        '<div class="col-span-2 md:col-span-1 flex justify-end"><button class="w-9 h-9 rounded-lg hover:bg-error-container hover:text-on-error-container text-text-muted flex items-center justify-center transition-colors" type="button" aria-label="Xóa mốc ' + (i + 1) + '" data-xoa-moc="' + i + '">' +
        '<span class="material-symbols-outlined text-[18px]">delete</span></button></div></li>';
    }).join('') : '<li class="p-4 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-text-muted">Chưa có mốc nào. Bấm "Thêm mốc" để bắt đầu.</li>';
    capNhatTongPhanTram();
  }
  function capNhatTongPhanTram() {
    var tong = bt.moc.reduce(function (t, m) { return t + (Number(m.phanTram) || 0); }, 0);
    var o = $('tong-phan-tram');
    o.textContent = 'Tổng: ' + tong + '%';
    o.classList.toggle('text-status-error', bt.moc.length > 0 && tong !== 100);
    o.classList.toggle('text-tertiary', tong === 100);
  }
  $('ds-moc').addEventListener('input', function (e) {
    var o = e.target.closest('[data-moc]');
    if (!o) return;
    var m = bt.moc[Number(o.getAttribute('data-moc'))];
    var truong = o.getAttribute('data-truong');
    m[truong] = truong === 'ten' ? o.value : (o.value === '' ? '' : Number(o.value));
    capNhatTongPhanTram();
    danhDauDaSua();
  });
  $('ds-moc').addEventListener('click', function (e) {
    var nut = e.target.closest('[data-xoa-moc]');
    if (!nut) return;
    bt.moc.splice(Number(nut.getAttribute('data-xoa-moc')), 1);
    danhDauDaSua();
    veMoc();
  });
  $('nut-them-moc').addEventListener('click', function () {
    if (bt.moc.length >= 8) { hienLoi({ moc: 'Tối đa 8 mốc.' }, ['moc']); return; }
    var conLai = 100 - bt.moc.reduce(function (t, m) { return t + (Number(m.phanTram) || 0); }, 0);
    bt.moc.push({ ten: '', tuan: '', phanTram: conLai > 0 ? conLai : '' });
    danhDauDaSua();
    veMoc();
    var o = $('moc-ten-' + (bt.moc.length - 1));
    if (o) o.focus();
  });

  // ---------- Đổ dữ liệu vào form / đọc từ form ----------
  function dienForm() {
    oTieuDe.value = bt.tieuDe || '';
    demTieuDe();
    form.querySelectorAll('[name="project_type"]').forEach(function (r) { r.checked = r.value === bt.loai; });
    chonLinhVuc.value = bt.linhVuc || '';
    editor.innerHTML = D.lamSachHtml(bt.moTa || '');
    demMoTa();
    veGoiYLinhVuc();
    veDsTep();
    veKyNang();
    form.querySelectorAll('[name="doi_tuong"]').forEach(function (c) { c.checked = (bt.doiTuong || []).indexOf(c.value) !== -1; });
    $('rd-team-min').value = bt.quyMoNhom.min || '';
    $('rd-team-max').value = bt.quyMoNhom.max || '';
    $('rd-trl').value = String(bt.trl || 0);
    form.querySelectorAll('[name="san_pham"]').forEach(function (c) { c.checked = (bt.sanPham || []).indexOf(c.value) !== -1; });
    $('rd-criteria').value = bt.tieuChi || '';
    $('criteria-char-count').textContent = $('rd-criteria').value.length + ' / 1000 ký tự';
    $('rd-nda').checked = !!bt.yeuCauNda;
    oThoaThuan.checked = !!bt.thoaThuanNganSach;
    $('rd-budget-min').value = bt.nganSach ? bt.nganSach.min : '';
    $('rd-budget-max').value = bt.nganSach ? bt.nganSach.max : '';
    capNhatNganSach();
    $('rd-deadline').value = bt.hanNop || '';
    $('rd-start').value = bt.ngayBatDau || '';
    $('rd-duration').value = bt.thoiGian || '';
    $('rd-mode').value = bt.hinhThuc || 'ket-hop';
    $('rd-location').value = bt.diaDiem || '';
    bt.moc = (bt.moc || []).map(function (m) { return Object.assign({}, m); });
    veMoc();
  }

  function soNguyen(v) { return v === '' || v == null ? NaN : Number(v); }

  function docForm() {
    bt.tieuDe = oTieuDe.value.trim();
    var loai = form.querySelector('[name="project_type"]:checked');
    bt.loai = loai ? loai.value : '';
    bt.linhVuc = chonLinhVuc.value;
    bt.moTa = D.lamSachHtml(editor.innerHTML);
    bt.doiTuong = Array.prototype.map.call(form.querySelectorAll('[name="doi_tuong"]:checked'), function (c) { return c.value; });
    bt.quyMoNhom = { min: soNguyen($('rd-team-min').value), max: soNguyen($('rd-team-max').value) };
    bt.trl = Number($('rd-trl').value) || 0;
    bt.sanPham = Array.prototype.map.call(form.querySelectorAll('[name="san_pham"]:checked'), function (c) { return c.value; });
    bt.tieuChi = $('rd-criteria').value.trim();
    bt.yeuCauNda = $('rd-nda').checked;
    bt.thoaThuanNganSach = oThoaThuan.checked;
    var nsMin = soNguyen($('rd-budget-min').value);
    var nsMax = soNguyen($('rd-budget-max').value);
    bt.nganSach = bt.thoaThuanNganSach || (isNaN(nsMin) && isNaN(nsMax)) ? null : { min: nsMin, max: nsMax };
    bt.hanNop = $('rd-deadline').value;
    bt.ngayBatDau = $('rd-start').value;
    bt.thoiGian = soNguyen($('rd-duration').value);
    bt.hinhThuc = $('rd-mode').value;
    bt.diaDiem = $('rd-location').value.trim();
  }

  // ---------- Kiểm tra từng bước ----------
  function laSoNguyenTrongKhoang(n, min, max) { return Number.isInteger(n) && n >= min && n <= max; }

  function kiemTra(so) {
    var loi = {};
    if (so === 1) {
      if (!bt.tieuDe) loi.tieuDe = 'Nhập tiêu đề bài toán.';
      else if (bt.tieuDe.length < 10) loi.tieuDe = 'Tiêu đề cần ít nhất 10 ký tự.';
      if (!D.LOAI[bt.loai]) loi.loai = 'Chọn loại hình bài toán.';
      if (!bt.linhVuc) loi.linhVuc = 'Chọn lĩnh vực chủ đạo (hoặc bấm một thẻ gợi ý bên dưới).';
      var n = doDaiMoTa();
      if (n < 50) loi.moTa = 'Mô tả cần ít nhất 50 ký tự (hiện có ' + n + ').';
      else if (n > TOI_DA_MO_TA) loi.moTa = 'Mô tả vượt quá ' + TOI_DA_MO_TA + ' ký tự (hiện có ' + n + ').';
    } else if (so === 2) {
      if (!bt.kyNang.length) loi.kyNang = 'Thêm ít nhất một kỹ năng / công nghệ.';
      if (!bt.doiTuong.length) loi.doiTuong = 'Chọn ít nhất một đối tượng.';
      var q = bt.quyMoNhom;
      if (!laSoNguyenTrongKhoang(q.min, 1, 20) || !laSoNguyenTrongKhoang(q.max, 1, 20)) loi.quyMoNhom = 'Quy mô nhóm là số nguyên từ 1 đến 20.';
      else if (q.min > q.max) loi.quyMoNhom = 'Số thành viên tối thiểu không được lớn hơn tối đa.';
      if (!bt.sanPham.length) loi.sanPham = 'Chọn ít nhất một sản phẩm bàn giao.';
      if (bt.tieuChi.length > 1000) loi.tieuChi = 'Tiêu chí tối đa 1000 ký tự.';
    } else if (so === 3) {
      if (!bt.thoaThuanNganSach) {
        var ns = bt.nganSach;
        if (!ns || !laSoNguyenTrongKhoang(ns.min, 1, 100000) || !laSoNguyenTrongKhoang(ns.max, 1, 100000)) loi.nganSach = 'Nhập ngân sách (số nguyên, triệu VNĐ) ở cả hai ô, hoặc chọn "Thỏa thuận sau".';
        else if (ns.min > ns.max) loi.nganSach = 'Mức "Từ" không được lớn hơn mức "Đến".';
      }
      if (!bt.hanNop) loi.hanNop = 'Chọn hạn nhận proposal.';
      else if (bt.hanNop <= D.homNay()) loi.hanNop = 'Hạn nhận proposal phải sau hôm nay.';
      if (bt.ngayBatDau && bt.hanNop && bt.ngayBatDau < bt.hanNop) loi.ngayBatDau = 'Ngày bắt đầu không được trước hạn nhận proposal.';
      if (!laSoNguyenTrongKhoang(bt.thoiGian, 1, 104)) loi.thoiGian = 'Thời gian thực hiện từ 1 đến 104 tuần.';
      if (!bt.moc.length) loi.moc = 'Thêm ít nhất một mốc nghiệm thu.';
      else {
        var tong = 0;
        for (var i = 0; i < bt.moc.length; i++) {
          var m = bt.moc[i];
          if (!String(m.ten || '').trim()) { loi.moc = 'Mốc ' + (i + 1) + ': nhập tên mốc.'; break; }
          if (!laSoNguyenTrongKhoang(m.tuan, 1, laSoNguyenTrongKhoang(bt.thoiGian, 1, 104) ? bt.thoiGian : 104)) { loi.moc = 'Mốc ' + (i + 1) + ': tuần phải từ 1 đến ' + (bt.thoiGian || 104) + '.'; break; }
          if (!laSoNguyenTrongKhoang(m.phanTram, 0, 100)) { loi.moc = 'Mốc ' + (i + 1) + ': % giải ngân là số nguyên từ 0 đến 100.'; break; }
          tong += m.phanTram;
        }
        if (!loi.moc && tong !== 100) loi.moc = 'Tổng % giải ngân phải bằng 100% (hiện là ' + tong + '%).';
      }
    } else if (so === 4) {
      if (!$('rd-agree').checked) loi.camKet = 'Cần xác nhận trước khi gửi.';
    }
    return loi;
  }

  var O_NHAP_THEO_LOI = {
    tieuDe: 'rd-title', linhVuc: 'rd-field', kyNang: 'rd-skill', quyMoNhom: 'rd-team-min',
    tieuChi: 'rd-criteria', nganSach: 'rd-budget-min', hanNop: 'rd-deadline', ngayBatDau: 'rd-start', thoiGian: 'rd-duration'
  };
  var TRUONG_THEO_BUOC = {
    1: ['tieuDe', 'loai', 'linhVuc', 'moTa', 'tep'],
    2: ['kyNang', 'doiTuong', 'quyMoNhom', 'sanPham', 'tieuChi'],
    3: ['nganSach', 'hanNop', 'ngayBatDau', 'thoiGian', 'moc'],
    4: ['camKet']
  };

  function hienLoi(loi, cacTruong) {
    cacTruong.forEach(function (truong) {
      var o = form.querySelector('[data-loi="' + truong + '"]');
      if (o) { o.textContent = loi[truong] || ''; o.classList.toggle('hidden', !loi[truong]); }
      var nhap = O_NHAP_THEO_LOI[truong] && $(O_NHAP_THEO_LOI[truong]);
      if (nhap) nhap.setAttribute('aria-invalid', loi[truong] ? 'true' : 'false');
    });
  }

  function kiemTraVaHien(so) {
    docForm();
    var loi = kiemTra(so);
    hienLoi(loi, TRUONG_THEO_BUOC[so]);
    var dauTien = TRUONG_THEO_BUOC[so].filter(function (t) { return loi[t]; })[0];
    if (dauTien) {
      var o = form.querySelector('[data-loi="' + dauTien + '"]');
      var nhap = O_NHAP_THEO_LOI[dauTien] && $(O_NHAP_THEO_LOI[dauTien]);
      (nhap || o).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (nhap) nhap.focus({ preventScroll: true });
      if (dauTien === 'moTa') editor.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  // Phần trăm hoàn thiện bản nháp: số trường bắt buộc của bước 1–3 đã hợp lệ
  function tinhTienDo() {
    var tong = 0, dat = 0;
    [1, 2, 3].forEach(function (so) {
      var loi = kiemTra(so);
      TRUONG_THEO_BUOC[so].forEach(function (t) {
        if (t === 'tep' || t === 'tieuChi' || t === 'ngayBatDau') return; // không bắt buộc
        tong++;
        if (!loi[t]) dat++;
      });
    });
    return Math.round(dat / tong * 100);
  }

  // ---------- Bước 4: xem lại ----------
  function dongXemLai(nhan, giaTri) {
    return '<div class="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2"><dt class="font-label-md text-label-md text-text-muted">' + esc(nhan) +
      '</dt><dd class="sm:col-span-2 font-body-md text-body-md text-on-surface">' + (giaTri || '<span class="text-text-muted">Chưa nhập</span>') + '</dd></div>';
  }
  function khoiXemLai(so, noiDung) {
    return '<section class="rounded-xl bg-surface-container-low p-5"><div class="flex items-center justify-between mb-2">' +
      '<h3 class="font-title-md text-title-md text-primary">Bước ' + so + ': ' + esc(TEN_BUOC[so - 1]) + '</h3>' +
      '<button class="h-8 px-3 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1" type="button" data-den-buoc="' + so + '">' +
      '<span class="material-symbols-outlined text-[16px]">edit</span>Sửa</button></div><dl class="divide-y divide-surface-container-high">' + noiDung + '</dl></section>';
  }
  function veXemLai() {
    var chip = function (ds) {
      return ds.length ? '<span class="flex flex-wrap gap-1.5">' + ds.map(function (k) {
        return '<span class="px-2 py-0.5 rounded bg-surface-container-lowest font-code-sm text-code-sm">' + esc(k) + '</span>';
      }).join('') + '</span>' : '';
    };
    var b1 = dongXemLai('Tiêu đề', esc(bt.tieuDe)) +
      dongXemLai('Loại hình', D.LOAI[bt.loai] ? esc(D.LOAI[bt.loai].day) : '') +
      dongXemLai('Lĩnh vực chủ đạo', esc(D.tenLinhVuc(bt.linhVuc))) +
      dongXemLai('Mô tả', '<div class="rte max-h-64 overflow-y-auto">' + D.lamSachHtml(bt.moTa) + '</div>') +
      dongXemLai('Tài liệu đính kèm', bt.tepDinhKem.length ? esc(bt.tepDinhKem.map(function (t) { return t.ten; }).join(', ')) : '<span class="text-text-muted">Không có</span>');
    var b2 = dongXemLai('Kỹ năng yêu cầu', chip(bt.kyNang)) +
      dongXemLai('Đối tượng', esc(bt.doiTuong.map(function (d) { return D.DOI_TUONG[d]; }).join('; '))) +
      dongXemLai('Quy mô nhóm', esc(bt.quyMoNhom.min + ' – ' + bt.quyMoNhom.max + ' người')) +
      dongXemLai('TRL tối thiểu', bt.trl ? 'TRL ' + bt.trl : 'Không yêu cầu') +
      dongXemLai('Sản phẩm bàn giao', chip(bt.sanPham)) +
      dongXemLai('Tiêu chí đánh giá', esc(bt.tieuChi)) +
      dongXemLai('Yêu cầu NDA', bt.yeuCauNda ? 'Có' : 'Không');
    var moc = bt.moc.map(function (m, i) {
      return '<li>Mốc ' + (i + 1) + ': ' + esc(m.ten) + ' · tuần ' + esc(m.tuan) + ' · ' + esc(m.phanTram) + '%</li>';
    }).join('');
    var b3 = dongXemLai('Ngân sách', bt.thoaThuanNganSach ? 'Thỏa thuận sau' : esc(D.dinhDangNganSach(bt.nganSach))) +
      dongXemLai('Hạn nhận proposal', esc(D.dinhDangNgay(bt.hanNop))) +
      dongXemLai('Ngày dự kiến bắt đầu', esc(D.dinhDangNgay(bt.ngayBatDau))) +
      dongXemLai('Thời gian thực hiện', bt.thoiGian ? esc(bt.thoiGian + ' tuần') : '') +
      dongXemLai('Hình thức / địa điểm', esc(D.HINH_THUC[bt.hinhThuc] + (bt.diaDiem ? ' · ' + bt.diaDiem : ''))) +
      dongXemLai('Mốc nghiệm thu', moc ? '<ol class="space-y-1">' + moc + '</ol>' : '');
    $('xem-lai').innerHTML = khoiXemLai(1, b1) + khoiXemLai(2, b2) + khoiXemLai(3, b3);
  }

  // ---------- Điều hướng giữa các bước ----------
  function veStepper() {
    $('stepper').innerHTML = TEN_BUOC.map(function (ten, i) {
      var so = i + 1;
      var dangO = so === buoc;
      var xong = so < buoc;
      var vongTron = dangO ? 'bg-primary-container text-on-primary shadow-sm' : (xong ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-highest text-on-surface-variant');
      return '<li><button class="relative w-full flex items-center gap-3.5 p-2 rounded-lg text-left transition-colors ' +
        (dangO ? 'bg-surface-container-low/70' : 'hover:bg-surface-container-low/60' + (xong ? '' : ' opacity-60')) + '" type="button" data-den-buoc="' + so + '"' +
        (dangO ? ' aria-current="step"' : '') + '>' +
        '<span class="w-9 h-9 rounded-full ' + vongTron + ' font-label-md text-label-md flex items-center justify-center shrink-0">' +
        (xong ? '<span class="material-symbols-outlined text-[18px]">check</span>' : so) + '</span>' +
        '<span class="min-w-0 flex-1"><span class="font-label-sm text-label-sm ' + (dangO ? 'text-primary' : 'text-text-muted') + ' tracking-wider uppercase block">Bước ' + so + '</span>' +
        '<span class="' + (dangO ? 'font-title-md text-title-md text-on-surface' : 'font-body-md text-body-md text-on-surface-variant') + ' block truncate">' + esc(ten) + '</span></span>' +
        (dangO ? '<span class="absolute bottom-0 left-3 right-3 h-0.5 bg-primary-container rounded-full"></span>' : '') +
        '</button></li>';
    }).join('');
  }

  function hienNut(id, hien) {
    var el = $(id);
    el.classList.toggle('hidden', !hien);
    el.classList.toggle('flex', hien);
  }

  function denBuoc(so, khongCuon) {
    form.querySelectorAll('[data-buoc]').forEach(function (s) { s.hidden = Number(s.getAttribute('data-buoc')) !== so; });
    buoc = so;
    veStepper();
    if (so === 4) veXemLai();
    hienNut('nut-quay-lai', so > 1);
    hienNut('nut-tiep-tuc', so < 4);
    hienNut('nut-gui', so === 4);
    if (so < 4) $('nut-tiep-tuc').querySelector('[data-chu]').textContent = 'Tiếp tục: ' + TEN_BUOC[so];
    $('nut-gui').querySelector('[data-chu]').textContent = cheDo === 'sua' ? 'Lưu & gửi duyệt lại' : 'Gửi duyệt';
    if (history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#buoc-' + so);
    if (!khongCuon) {
      $('khung-stepper').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var h = $('tieu-de-buoc-' + so);
      if (h) h.focus({ preventScroll: true });
    }
  }

  // Đi tới bước "dich": lùi thì đi luôn, tiến thì các bước trước phải hợp lệ
  function thuDenBuoc(dich) {
    if (dich <= buoc) { docForm(); denBuoc(dich); return; }
    for (var so = buoc; so < dich; so++) {
      if (so !== buoc) { denBuoc(so); }
      if (!kiemTraVaHien(so)) return;
    }
    denBuoc(dich);
  }

  document.addEventListener('click', function (e) {
    var nut = e.target.closest('[data-den-buoc]');
    if (!nut || !form.contains(nut) && !$('khung-stepper').contains(nut)) return;
    e.preventDefault();
    thuDenBuoc(Number(nut.getAttribute('data-den-buoc')));
  });
  $('nut-tiep-tuc').addEventListener('click', function () { thuDenBuoc(buoc + 1); });
  $('nut-quay-lai').addEventListener('click', function () { thuDenBuoc(buoc - 1); });

  // ---------- Lưu / gửi ----------
  function ghi(trangThaiMoi) {
    var ban = JSON.parse(JSON.stringify(bt));
    if (!ban.ma) ban.ma = D.taoMaTam();
    ban.trangThai = trangThaiMoi;
    ban.tepDinhKem = ban.tepDinhKem.map(function (t) { return { ten: t.ten, kichThuoc: t.kichThuoc, moi: !!t.moi }; });
    // Mô tả đã đổi thì bỏ tóm tắt cũ, danh sách sẽ lấy đoạn đầu của mô tả mới
    if (goc && goc.moTa !== ban.moTa) delete ban.tomTat;
    if (trangThaiMoi === 'nhap') ban.tienDoSoanThao = tinhTienDo();
    else delete ban.tienDoSoanThao;
    if (trangThaiMoi === 'cho-duyet') ban.ngayNop = D.homNay();
    // Sửa bài đã được duyệt: phải duyệt lại, gắn nhãn "Đã sửa" (nhóm chốt 26/11/2026)
    if (cheDo === 'sua') { ban.daSua = true; ban.daTungDuyet = true; }
    if (!D.luu(ban)) return null;
    bt.ma = ban.ma;
    return ban;
  }

  function gioPhut() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  $('nut-luu-nhap').addEventListener('click', function () {
    docForm();
    if (!bt.tieuDe) {
      hienLoi({ tieuDe: 'Cần có tiêu đề để lưu bản nháp.' }, ['tieuDe']);
      if (buoc !== 1) denBuoc(1);
      oTieuDe.focus();
      return;
    }
    var ban = ghi('nhap');
    if (!ban) { D.thongBao('Không lưu được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); return; }
    daSua = false;
    if (cheDo === 'moi') {
      cheDo = 'nhap';
      if (history.replaceState) history.replaceState(null, '', window.location.pathname + '?ma=' + encodeURIComponent(ban.ma) + '#buoc-' + buoc);
    }
    capNhatHuyHieuLuu('Đã lưu tạm lúc ' + gioPhut() + ' (trình duyệt)', 'bg-tertiary-fixed-dim');
    D.thongBao('Đã lưu bản nháp ' + ban.ma + ' (hoàn thiện ' + ban.tienDoSoanThao + '%) trên trình duyệt này. Chưa lưu lên máy chủ.');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Enter trong một ô nhập ở bước 1–3 không được tự gửi form
    if (buoc !== 4) return;
    // Kiểm tra lại cả 4 bước, dừng ở bước đầu tiên còn lỗi
    for (var so = 1; so <= 4; so++) {
      docForm();
      if (Object.keys(kiemTra(so)).length) {
        if (so !== buoc) denBuoc(so);
        kiemTraVaHien(so);
        return;
      }
    }
    var ban = ghi('cho-duyet');
    if (!ban) { D.thongBao('Không lưu được: trình duyệt đang chặn lưu dữ liệu cục bộ.', 'loi'); return; }
    daSua = false;
    daGui = true;
    var kq = $('ket-qua-gui');
    kq.querySelector('[data-tieu-de]').textContent = cheDo === 'sua' ? 'Đã gửi duyệt lại' : 'Đã gửi duyệt';
    kq.querySelector('[data-noi-dung]').innerHTML = (cheDo === 'sua'
      ? 'Bài toán <strong>' + esc(ban.ma) + '</strong> đã được cập nhật, gắn nhãn <strong>Đã sửa</strong> và quay về <strong>Chờ Admin duyệt</strong>.'
      : 'Bài toán <strong>' + esc(ban.ma) + '</strong> đã chuyển sang trạng thái <strong>Chờ Admin duyệt</strong>.') +
      ' Đây là bản demo: dữ liệu chỉ lưu tạm trên trình duyệt này, <strong>chưa gửi lên máy chủ</strong> vì chưa có API bài toán R&amp;D.';
    kq.querySelector('[data-link-chi-tiet]').href = '15_chi-tiet-bai-toan.html?ma=' + encodeURIComponent(ban.ma);
    form.hidden = true;
    $('khung-stepper').hidden = true;
    kq.classList.remove('hidden');
    kq.classList.add('flex');
    capNhatHuyHieuLuu('Đã lưu tạm lúc ' + gioPhut() + ' (trình duyệt)', 'bg-tertiary-fixed-dim');
    kq.scrollIntoView({ behavior: 'smooth', block: 'center' });
    kq.focus({ preventScroll: true });
  });

  $('nut-huy').addEventListener('click', function () {
    if (daSua && !window.confirm('Bỏ các thay đổi chưa lưu?')) return;
    daSua = false;
    window.location.href = '04_bai-toan-rd.html';
  });

  form.addEventListener('input', function (e) {
    if (e.target.closest('#rd-desc') || e.target.closest('#ds-moc')) return; // đã xử lý riêng
    danhDauDaSua();
  });
  form.addEventListener('change', danhDauDaSua);
  window.addEventListener('beforeunload', function (e) {
    if (daSua && !daGui) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- Bắt đầu ----------
  dienForm();
  daSua = false;
  if (thamSo.get('mau') && cheDo === 'moi') {
    D.thongBao('Đã điền khung mô tả theo Biểu mẫu đề bài. Thay các dấu "..." bằng nội dung của doanh nghiệp.');
  }
  var buocUrl = Number((window.location.hash.match(/^#buoc-(\d)$/) || [])[1]);
  denBuoc(1, true);
  if (buocUrl > 1 && buocUrl <= 4) {
    // Chỉ mở thẳng bước sau nếu các bước trước đã hợp lệ (vd. khi soạn tiếp bản nháp)
    docForm();
    var dich = 1;
    while (dich < buocUrl && !Object.keys(kiemTra(dich)).length) dich++;
    if (dich > 1) denBuoc(dich, true);
  }
})();
