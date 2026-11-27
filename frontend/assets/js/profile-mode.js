// SV-04: menu chế độ hiển thị của cả hồ sơ – Công khai / Chỉ DN đối tác / Riêng tư.
// Trạng thái lưu ở CSDL (student_profile.profile_visibility) qua /api/profile-visibility/mode.
// Nút có các trạng thái: đang tải, đang lưu, đã lưu, "Chưa lưu" (không có máy chủ).
// Nạp SAU đoạn script khai báo triggerToast trong trang.
(function () {
  var API_URL = '/api/profile-visibility/mode';
  var MODES = {
    Public: { label: 'Công khai', icon: 'public', color: 'text-emerald-600' },
    Partners_Only: { label: 'Chỉ DN đối tác', icon: 'corporate_fare', color: 'text-[#2E86AB]' },
    Private: { label: 'Riêng tư', icon: 'lock', color: 'text-[#5F6368]' }
  };
  var ICON_BASE = 'material-symbols-outlined text-[16px] ';
  var SCREEN_MARGIN = 8; // px chừa lại ở mép khi canh menu

  var wrapper = document.getElementById('visibility-dropdown-wrapper');
  var toggleBtn = document.getElementById('visibility-toggle');
  var menu = document.getElementById('visibility-menu');
  var labelEl = document.getElementById('current-visibility-label');
  var iconEl = document.getElementById('current-visibility-icon');
  var unsavedEl = document.getElementById('current-visibility-unsaved');
  if (!wrapper || !toggleBtn || !menu || !labelEl || !iconEl || !unsavedEl) return;

  var options = Array.prototype.slice.call(menu.querySelectorAll('[data-profile-mode]'));
  var current = null;   // chế độ đang hiển thị; null = chưa đọc được từ máy chủ
  var saved = true;     // false: lựa chọn trên giao diện chưa được lưu vào CSDL

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  function setButton(label, icon, color) {
    labelEl.textContent = label;
    iconEl.textContent = icon;
    iconEl.className = ICON_BASE + color;
  }

  function showBusy(label) {
    setButton(label, 'progress_activity', 'text-[#1F4E78] animate-spin');
    unsavedEl.classList.add('hidden');
    toggleBtn.disabled = true;
    toggleBtn.setAttribute('aria-busy', 'true');
  }

  function render() {
    var mode = MODES[current];
    if (mode) setButton(mode.label, mode.icon, mode.color);
    else setButton('Chọn chế độ', 'help', 'text-[#5F6368]');
    unsavedEl.classList.toggle('hidden', saved);
    toggleBtn.disabled = false;
    toggleBtn.removeAttribute('aria-busy');
    toggleBtn.title = 'Chế độ hiển thị hồ sơ: ' + (mode ? mode.label : 'chưa rõ') + (saved ? '' : ' (chưa lưu)');
    options.forEach(function (option) {
      var selected = option.dataset.profileMode === current;
      option.setAttribute('aria-checked', String(selected));
      option.classList.toggle('bg-[#E6F0F7]', selected);
      option.querySelector('[data-mode-check]').classList.toggle('invisible', !selected);
    });
  }

  // Canh menu theo mép phải của nút, nhưng không cho tràn ra ngoài vùng nội dung
  // (khi hàng nút xuống dòng, nút nằm bên trái nên menu sẽ bị cắt chữ hoặc đè lên sidebar)
  function placeMenu() {
    var area = (wrapper.closest('[data-profile-toolbar]') || document.body).getBoundingClientRect();
    var minLeft = Math.max(area.left, SCREEN_MARGIN);
    var maxRight = Math.min(area.right, document.documentElement.clientWidth - SCREEN_MARGIN);
    var box = wrapper.getBoundingClientRect();
    menu.style.maxWidth = (maxRight - minLeft) + 'px';
    var width = menu.offsetWidth;
    var left = Math.max(minLeft, Math.min(box.right - width, maxRight - width));
    menu.style.left = (left - box.left) + 'px';
    menu.style.right = 'auto';
  }

  function isMenuOpen() { return !menu.classList.contains('hidden'); }

  function setMenuOpen(open) {
    menu.classList.toggle('hidden', !open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) placeMenu();
  }

  // offline = true: không có máy chủ API (mở bằng file://, GitHub Pages, máy chủ chưa chạy)
  function offlineError() {
    return Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
  }

  function request(method, body) {
    if (location.protocol === 'file:') return Promise.reject(offlineError());
    return fetch(API_URL, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.ok && data) return data;
        // Phản hồi không đúng dạng { code, message } nghĩa là địa chỉ này không có API
        if (!data || !data.code) throw offlineError();
        throw new Error(data.message);
      });
    }, function () {
      throw offlineError();
    });
  }

  function choose(mode) {
    setMenuOpen(false);
    toggleBtn.focus();
    if (mode === current && saved) return;
    showBusy('Đang lưu…');
    request('PUT', { visibility: mode }).then(function (data) {
      current = data.visibility;
      saved = true;
      render();
      toast('Đã lưu chế độ hiển thị: ' + MODES[current].label);
    }, function (err) {
      if (err.offline) {
        current = mode;
        saved = false;
        render();
        toast('Chế độ "' + MODES[mode].label + '" chưa lưu: không kết nối được máy chủ');
      } else {
        render(); // giữ nguyên chế độ trước đó
        toast('Chưa lưu được: ' + err.message);
      }
    });
  }

  toggleBtn.addEventListener('click', function () { setMenuOpen(!isMenuOpen()); });
  options.forEach(function (option) {
    option.addEventListener('click', function () { choose(option.dataset.profileMode); });
  });
  document.addEventListener('click', function (event) {
    if (!wrapper.contains(event.target)) setMenuOpen(false);
  });
  wrapper.addEventListener('keydown', function (event) {
    if (!isMenuOpen()) return;
    if (event.key === 'Escape') {
      setMenuOpen(false);
      toggleBtn.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      var step = event.key === 'ArrowDown' ? 1 : -1;
      var index = options.indexOf(document.activeElement);
      if (index < 0) index = step > 0 ? -1 : 0;
      options[(index + step + options.length) % options.length].focus();
    }
  });
  window.addEventListener('resize', function () { if (isMenuOpen()) placeMenu(); });

  showBusy('Đang tải…');
  request('GET').then(function (data) {
    current = data.visibility;
    render();
  }, function (err) {
    if (err.offline) {
      current = 'Public'; // giá trị mẫu để trang vẫn dùng được khi không có máy chủ
      saved = false;
    }
    render();
    toast(err.offline
      ? 'Chưa kết nối máy chủ: chế độ hiển thị sẽ không được lưu'
      : 'Không tải được chế độ hiển thị: ' + err.message);
  });
})();
