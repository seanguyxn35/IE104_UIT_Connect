// SV-04: đổi ảnh đại diện. Chọn ảnh -> hộp XEM TRƯỚC có kéo để căn vị trí và thanh phóng to / thu nhỏ
// -> bấm "Lưu ảnh" mới ghi vào CSDL. Khung xem trước đúng bằng ảnh sẽ lưu (tỉ lệ 3:4, xuất 600x800 JPEG),
// ảnh được cắt ở trình duyệt rồi gửi lên POST /api/student-avatar.
(function () {
  var API_URL = '/api/student-avatar';
  var OUT_W = 600, OUT_H = 800;            // ảnh lưu 3:4
  var VIEW_W = 360, VIEW_H = 480;          // canvas xem trước (hiển thị 180x240 px, nét gấp đôi)
  var MAX_ZOOM = 4;
  var MAX_SOURCE_BYTES = 10 * 1024 * 1024; // ảnh gốc tối đa 10 MB (ảnh lưu sau khi nén còn < 2 MB)
  var ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

  var trigger = document.getElementById('avatar-trigger');
  var photo = document.getElementById('avatar-photo');
  if (!trigger || !photo) return;

  var topAvatar = document.querySelector('header [onclick="openLogoutModal()"]');
  var src = null;   // { img, name }
  var crop = null;  // { zoom, cx, cy }: cx, cy = điểm của ảnh gốc nằm ở tâm khung
  var saving = false;
  var frameQueued = false;

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  // ---------- Hiển thị ảnh đã lưu ----------
  function showAvatar(url) {
    photo.src = url;
    if (topAvatar) {
      topAvatar.textContent = '';
      topAvatar.style.backgroundImage = 'url("' + url + '")';
      topAvatar.style.backgroundSize = 'cover';
      topAvatar.style.backgroundPosition = 'center';
    }
  }

  if (location.protocol !== 'file:') {
    fetch(API_URL, { signal: AbortSignal.timeout(15000) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.avatarUrl) showAvatar(d.avatarUrl); })
      .catch(function () { /* chưa có máy chủ: giữ ảnh mặc định */ });
  }

  // ---------- Hộp xem trước ----------
  var modal = document.createElement('div');
  modal.id = 'avatar-modal';
  modal.className = 'fixed inset-0 z-[60] hidden items-center justify-center bg-black/50 p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'avatar-modal-title');
  modal.innerHTML =
    '<div class="w-full max-w-lg rounded-lg bg-white shadow-xl border border-[#E1E5EA] max-h-[95vh] overflow-y-auto">' +
      '<div class="flex items-center justify-between px-5 py-4 border-b border-[#E1E5EA]">' +
        '<h3 id="avatar-modal-title" class="text-base font-semibold text-[#1A1A1A]">Căn chỉnh ảnh đại diện</h3>' +
        '<button type="button" id="avatar-close" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Đóng">' +
          '<span class="material-symbols-outlined text-[20px]">close</span></button>' +
      '</div>' +
      '<div class="p-5 flex flex-col sm:flex-row gap-5 items-start">' +
        '<div class="shrink-0">' +
          '<canvas id="avatar-canvas" width="' + VIEW_W + '" height="' + VIEW_H + '" tabindex="0" ' +
            'aria-label="Khung ảnh đại diện: kéo để di chuyển, cuộn chuột hoặc dùng thanh trượt để phóng to" ' +
            'class="w-[180px] h-[240px] rounded border border-[#E1E5EA] bg-[#F5F7FA] cursor-grab touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4E78]"></canvas>' +
          '<p class="mt-1.5 text-[11px] text-[#5F6368] text-center w-[180px]">Kéo ảnh để di chuyển</p>' +
        '</div>' +
        '<div class="min-w-0 flex-1 w-full text-xs text-[#5F6368] space-y-4">' +
          '<div>' +
            '<label for="avatar-zoom" class="flex items-center justify-between font-semibold text-[#1A1A1A] mb-1.5">' +
              '<span>Thu phóng</span><span id="avatar-zoom-label" class="font-medium text-[#5F6368]">100%</span></label>' +
            '<div class="flex items-center gap-2">' +
              '<button type="button" id="avatar-zoom-out" class="w-7 h-7 shrink-0 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center" aria-label="Thu nhỏ">' +
                '<span class="material-symbols-outlined text-[18px]">remove</span></button>' +
              '<input id="avatar-zoom" type="range" min="1" max="' + MAX_ZOOM + '" step="0.01" value="1" class="flex-1 min-w-0 accent-[#1F4E78]">' +
              '<button type="button" id="avatar-zoom-in" class="w-7 h-7 shrink-0 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center" aria-label="Phóng to">' +
                '<span class="material-symbols-outlined text-[18px]">add</span></button>' +
            '</div>' +
            '<button type="button" id="avatar-reset" class="mt-2 text-[#1F4E78] font-semibold hover:underline">Đặt lại vị trí</button>' +
          '</div>' +
          '<div><div class="font-semibold text-[#1A1A1A] mb-1.5">Hiển thị ở thanh trên cùng</div>' +
            '<canvas id="avatar-round" width="72" height="72" class="w-9 h-9 rounded-full border border-[#E1E5EA]"></canvas></div>' +
          '<div id="avatar-info" class="leading-relaxed"></div>' +
          '<p>Chưa có gì được lưu cho đến khi bạn bấm <b>Lưu ảnh</b>.</p>' +
          '<p id="avatar-error" class="hidden text-red-600 font-medium" role="alert"></p>' +
        '</div>' +
      '</div>' +
      '<div class="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-[#E1E5EA] bg-[#F5F7FA] rounded-b-lg">' +
        '<button type="button" id="avatar-pick" class="h-9 px-3 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">Chọn ảnh khác</button>' +
        '<button type="button" id="avatar-cancel" class="h-9 px-3 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">Hủy</button>' +
        '<button type="button" id="avatar-save" class="h-9 px-4 rounded bg-[#1F4E78] text-white text-xs font-semibold hover:bg-[#163A59] disabled:opacity-60 disabled:cursor-not-allowed">Lưu ảnh</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var input = document.createElement('input');
  input.type = 'file';
  input.accept = ALLOWED.join(',');
  input.className = 'hidden';
  document.body.appendChild(input);

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('avatar-canvas');
  var round = $('avatar-round');

  function setError(msg) {
    var el = $('avatar-error');
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    canvas.focus();
  }

  function closeModal() {
    if (saving) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    src = crop = null;
    input.value = '';
    setError('');
  }

  // ---------- Hình học cắt ảnh ----------
  // Cạnh nhìn thấy của ảnh gốc ứng với khung w x h ở mức zoom hiện tại
  function visible(w, h) {
    var s = Math.max(w / src.img.naturalWidth, h / src.img.naturalHeight) * crop.zoom;
    return { s: s, vw: w / s, vh: h / s };
  }

  // Giữ khung luôn nằm trong ảnh (không để lộ nền trống)
  function clampCrop() {
    var v = visible(VIEW_W, VIEW_H);
    var iw = src.img.naturalWidth, ih = src.img.naturalHeight;
    crop.cx = Math.min(Math.max(crop.cx, v.vw / 2), iw - v.vw / 2);
    crop.cy = Math.min(Math.max(crop.cy, v.vh / 2), ih - v.vh / 2);
  }

  function drawTo(ctx, w, h) {
    var v = visible(w, h);
    ctx.drawImage(src.img, crop.cx - v.vw / 2, crop.cy - v.vh / 2, v.vw, v.vh, 0, 0, w, h);
  }

  function render() {
    frameQueued = false;
    if (!src) return;
    clampCrop();
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    drawTo(ctx, VIEW_W, VIEW_H);
    // Ô tròn nhỏ: phần giữa khung 3:4 (giống cách thanh trên cùng cắt ảnh)
    var rctx = round.getContext('2d');
    rctx.imageSmoothingQuality = 'high';
    rctx.drawImage(canvas, 0, (VIEW_H - VIEW_W) / 2, VIEW_W, VIEW_W, 0, 0, round.width, round.height);
    $('avatar-zoom').value = crop.zoom;
    $('avatar-zoom-label').textContent = Math.round(crop.zoom * 100) + '%';
  }

  function queueRender() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(render);
  }

  // Đổi zoom nhưng giữ nguyên điểm đang nằm ở tâm khung
  function setZoom(z) {
    if (!src) return;
    crop.zoom = Math.min(Math.max(z, 1), MAX_ZOOM);
    queueRender();
  }

  function resetCrop() {
    crop = { zoom: 1, cx: src.img.naturalWidth / 2, cy: src.img.naturalHeight / 2 };
    queueRender();
  }

  // ---------- Kéo, cuộn chuột, bàn phím ----------
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (!src) return;
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.replace('cursor-grab', 'cursor-grabbing');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || !src) return;
    var rect = canvas.getBoundingClientRect();
    var v = visible(VIEW_W, VIEW_H);
    var perPx = v.vw / rect.width;               // px ảnh gốc ứng với 1 px màn hình
    crop.cx -= (e.clientX - drag.x) * perPx;
    crop.cy -= (e.clientY - drag.y) * perPx;
    drag.x = e.clientX;
    drag.y = e.clientY;
    queueRender();
  });
  function endDrag() {
    drag = null;
    canvas.classList.replace('cursor-grabbing', 'cursor-grab');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    if (!src) return;
    e.preventDefault();
    setZoom(crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }, { passive: false });
  canvas.addEventListener('keydown', function (e) {
    if (!src) return;
    var step = visible(VIEW_W, VIEW_H).vw * 0.03;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      crop.cx += moves[e.key][0];
      crop.cy += moves[e.key][1];
      queueRender();
    } else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(crop.zoom * 1.1); }
    else if (e.key === '-') { e.preventDefault(); setZoom(crop.zoom / 1.1); }
  });

  $('avatar-zoom').addEventListener('input', function (e) { setZoom(parseFloat(e.target.value)); });
  $('avatar-zoom-in').addEventListener('click', function () { setZoom(crop.zoom * 1.15); });
  $('avatar-zoom-out').addEventListener('click', function () { setZoom(crop.zoom / 1.15); });
  $('avatar-reset').addEventListener('click', function () { if (src) resetCrop(); });

  // ---------- Chọn ảnh ----------
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function handleFile(file) {
    if (!file) return;
    if (ALLOWED.indexOf(file.type) === -1) {
      toast('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast('Ảnh quá lớn (tối đa 10 MB)');
      return;
    }
    loadImage(file).then(function (img) {
      src = { img: img, name: file.name };
      $('avatar-info').innerHTML =
        '<div><b class="text-[#1A1A1A]">' + escapeHtml(file.name) + '</b></div>' +
        '<div>Ảnh gốc ' + img.naturalWidth + ' × ' + img.naturalHeight + ' px → lưu ' + OUT_W + ' × ' + OUT_H + ' px</div>';
      setError('');
      resetCrop();
      openModal();
      render();
    }).catch(function () {
      toast('Không đọc được ảnh này, hãy thử tệp khác');
    });
  }

  // ---------- Lưu ----------
  function renderBlob() {
    clampCrop();
    var out = document.createElement('canvas');
    out.width = OUT_W;
    out.height = OUT_H;
    var ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    drawTo(ctx, OUT_W, OUT_H);
    return new Promise(function (resolve, reject) {
      out.toBlob(function (b) { b ? resolve(b) : reject(new Error('encode')); }, 'image/jpeg', 0.9);
    });
  }

  function save() {
    if (!src || saving) return;
    if (location.protocol === 'file:') {
      setError('Hãy mở trang qua máy chủ: http://localhost:3000/pages/sv/04_ho-so-nang-luc-cv.html');
      return;
    }
    saving = true;
    var btn = $('avatar-save');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    setError('');

    renderBlob().then(function (blob) {
      return fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
        signal: AbortSignal.timeout(30000)
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || 'Lỗi máy chủ (' + res.status + ')');
        return data;
      });
    }).then(function (data) {
      saving = false;
      showAvatar(data.avatarUrl);
      closeModal();
      toast('Đã cập nhật ảnh đại diện');
    }).catch(function (err) {
      saving = false;
      setError(err.name === 'TypeError' || err.name === 'TimeoutError'
        ? 'Không kết nối được máy chủ. Hãy chạy backend (npm start) rồi thử lại.'
        : err.message);
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Lưu ảnh';
    });
  }

  // ---------- Sự kiện chung ----------
  trigger.addEventListener('click', function () { input.click(); });
  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    input.value = '';   // cho phép chọn lại đúng tệp đó lần sau
    handleFile(file);
  });
  $('avatar-pick').addEventListener('click', function () { if (!saving) input.click(); });
  $('avatar-save').addEventListener('click', save);
  $('avatar-cancel').addEventListener('click', closeModal);
  $('avatar-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
})();
