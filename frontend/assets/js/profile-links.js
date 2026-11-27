// SV-04: sửa liên kết GitHub và LinkedIn ngay trên hồ sơ (nút bút chì cạnh mỗi liên kết).
// Lưu ở CSDL (student_profile.github_url, linkedin_url) qua /api/student-profile/links.
// Máy chủ kiểm tra liên kết; ở đây chỉ kiểm tra lại khi không có máy chủ.
// Nạp SAU đoạn script khai báo triggerToast trong trang.
(function () {
  var API_URL = '/api/student-profile/links';
  var LINKS = {
    githubUrl: { name: 'GitHub', host: /^(www\.)?github\.com$/, placeholder: 'https://github.com/ten-cua-ban' },
    linkedinUrl: { name: 'LinkedIn', host: /^((www|[a-z]{2})\.)?linkedin\.com$/, placeholder: 'https://linkedin.com/in/ten-cua-ban' }
  };
  var EMPTY_CLASSES = ['italic', 'text-slate-400'];

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  // "https://www.github.com/abc/" -> "github.com/abc"
  function shortText(url) {
    return url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
  }

  function createElement(tag, className, text) {
    var el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function iconButton(type, icon, label, className) {
    var btn = createElement('button', 'shrink-0 w-8 h-8 inline-flex items-center justify-center rounded transition-colors disabled:opacity-60 ' + className);
    btn.type = type;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.appendChild(createElement('span', 'material-symbols-outlined text-[16px]', icon));
    return btn;
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
        if (!data || !data.code) throw offlineError();
        throw new Error(data.message);
      });
    }, function () {
      throw offlineError();
    });
  }

  // Dùng khi không có máy chủ: cùng quy tắc với backend/src/sv/04-ho-so-nang-luc-cv/lien-ket.routes.js
  function parseLocal(field, value) {
    var text = value.trim();
    if (!text) return { url: null };
    try {
      var url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : 'https://' + text);
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
          LINKS[field].host.test(url.hostname) && url.pathname !== '/' && url.href.length <= 255) {
        return { url: url.href };
      }
    } catch (e) { /* không phải liên kết */ }
    return { error: 'Liên kết ' + LINKS[field].name + ' không hợp lệ (ví dụ: ' + LINKS[field].placeholder + ').' };
  }

  function setupField(row) {
    var field = row.dataset.linkField;
    var info = LINKS[field];
    var view = row.querySelector('[data-link-view]');
    var anchor = row.querySelector('[data-link-anchor]');
    var textEl = row.querySelector('[data-link-text]');
    var editBtn = row.querySelector('[data-link-edit]');
    if (!info || !view || !anchor || !textEl || !editBtn) return null;

    // Giá trị mẫu viết sẵn trong HTML, giữ lại khi không có máy chủ
    var value = anchor.getAttribute('href');

    var badge = createElement('span', 'hidden shrink-0 px-1.5 py-0.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium leading-none tracking-normal', 'Chưa lưu');
    view.insertBefore(badge, editBtn);

    // Khung sửa (ẩn cho tới khi bấm nút bút chì)
    var form = createElement('form', 'hidden w-full max-w-md tracking-normal');
    form.noValidate = true;
    var line = createElement('div', 'flex items-center gap-1.5');
    var input = createElement('input', 'flex-1 min-w-0 h-8 px-2.5 rounded border border-[#E1E5EA] bg-white text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1F4E78]');
    input.type = 'text';
    input.inputMode = 'url';
    input.maxLength = 255;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = info.placeholder;
    input.setAttribute('aria-label', 'Liên kết ' + info.name + ' (để trống để xóa)');
    var saveBtn = iconButton('submit', 'check', 'Lưu liên kết ' + info.name, 'bg-[#1F4E78] text-white hover:bg-[#163A59]');
    var cancelBtn = iconButton('button', 'close', 'Hủy', 'border border-[#E1E5EA] text-slate-600 hover:bg-slate-100');
    line.append(input, saveBtn, cancelBtn);
    var errorEl = createElement('p', 'hidden mt-1 text-xs text-red-600');
    errorEl.setAttribute('role', 'alert');
    form.append(line, errorEl);
    row.appendChild(form);

    function render(url, saved) {
      value = url;
      if (url) anchor.href = url;
      else anchor.removeAttribute('href');
      textEl.textContent = url ? shortText(url) : 'Chưa thêm liên kết ' + info.name;
      EMPTY_CLASSES.forEach(function (c) { textEl.classList.toggle(c, !url); });
      badge.classList.toggle('hidden', saved !== false);
    }

    function showError(message) {
      errorEl.textContent = message || '';
      errorEl.classList.toggle('hidden', !message);
      input.setAttribute('aria-invalid', String(Boolean(message)));
    }

    function setBusy(busy) {
      input.disabled = saveBtn.disabled = cancelBtn.disabled = busy;
      saveBtn.firstChild.textContent = busy ? 'progress_activity' : 'check';
      saveBtn.firstChild.classList.toggle('animate-spin', busy);
    }

    function setEditing(editing) {
      view.classList.toggle('hidden', editing);
      form.classList.toggle('hidden', !editing);
      showError('');
      if (editing) {
        input.value = value || '';
        input.focus();
        input.select();
      } else {
        editBtn.focus();
      }
    }

    function save() {
      var typed = input.value.trim();
      if (typed === (value || '') && badge.classList.contains('hidden')) { setEditing(false); return; }
      var body = {};
      body[field] = typed;
      showError('');
      setBusy(true);
      request('PUT', body).then(function (data) {
        setBusy(false);
        render(data[field], true);
        setEditing(false);
        toast(data[field] ? 'Đã lưu liên kết ' + info.name : 'Đã xóa liên kết ' + info.name);
      }, function (err) {
        setBusy(false);
        var local = err.offline ? parseLocal(field, typed) : { error: err.message };
        if (local.error) { showError(local.error); input.focus(); return; }
        render(local.url, false);
        setEditing(false);
        toast('Liên kết ' + info.name + ' chưa lưu: không kết nối được máy chủ');
      });
    }

    editBtn.addEventListener('click', function () { setEditing(true); });
    cancelBtn.addEventListener('click', function () { setEditing(false); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      save();
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setEditing(false);
    });

    return { field: field, editBtn: editBtn, textEl: textEl, anchor: anchor, render: render };
  }

  var fields = Array.prototype.map.call(document.querySelectorAll('[data-link-field]'), setupField).filter(Boolean);
  if (!fields.length) return;

  // Khóa nút sửa cho tới khi đọc xong, tránh kết quả đọc đến muộn đè lên giá trị vừa lưu
  fields.forEach(function (f) { f.editBtn.disabled = true; });
  request('GET').then(function (data) {
    fields.forEach(function (f) { f.render(data[f.field], true); });
  }, function (err) {
    if (err.offline) {
      toast('Chưa kết nối máy chủ: liên kết GitHub / LinkedIn sẽ không được lưu');
      return;
    }
    // Máy chủ báo lỗi: không hiện liên kết mẫu như thể là dữ liệu thật
    fields.forEach(function (f) {
      f.render(null, true);
      f.textEl.textContent = 'Không tải được liên kết';
    });
    toast('Không tải được liên kết: ' + err.message);
  }).then(function () {
    fields.forEach(function (f) { f.editBtn.disabled = false; });
  });
})();
