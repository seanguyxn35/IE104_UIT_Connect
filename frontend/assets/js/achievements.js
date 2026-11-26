// SV-04: thành tích / chứng chỉ SV tự khai – thêm, xem, đổi chế độ hiển thị, minh chứng, gửi xác minh, xóa.
// Dữ liệu qua /api/student-achievements. Mục Riêng tư không đưa lên CV (xem assets/js/cv-preview.js).
// Khi không có máy chủ: hiện danh sách mẫu, mục thêm mới chỉ nằm trong trang và có nhãn "Chưa lưu".
// Mọi nội dung được gán bằng textContent, không ghép chuỗi HTML từ dữ liệu.
// Nạp SAU đoạn script khai báo triggerToast trong trang.
(function () {
  var API_URL = '/api/student-achievements';
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  var CATEGORIES = {
    Award: { label: 'Giải thưởng', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
    Publication: { label: 'Công bố', chip: 'bg-[#E6F0F7] text-[#1F4E78] border-[#cfe2f0]' },
    Language_Cert: { label: 'Chứng chỉ ngoại ngữ', chip: 'bg-violet-50 text-violet-800 border-violet-200' },
    Tech_Cert: { label: 'Chứng chỉ công nghệ', chip: 'bg-sky-50 text-sky-800 border-sky-200' }
  };
  var STATUSES = {
    Self_Declared: { label: 'Tự khai', icon: 'edit_note', color: 'text-slate-600' },
    Pending: { label: 'Chờ xác minh', icon: 'hourglass_top', color: 'text-amber-700' },
    Verified: { label: 'Đã xác minh', icon: 'verified', color: 'text-emerald-700' },
    Rejected: { label: 'Xác minh bị từ chối', icon: 'cancel', color: 'text-red-700' }
  };
  var VISIBILITIES = { Public: 'Công khai', Partners_Only: 'Chỉ DN đối tác', Private: 'Riêng tư' };

  // Dữ liệu mẫu (giả) khi không có máy chủ
  var SAMPLE = [
    { achievementId: -1, category: 'Award', title: 'Giải Nhì – Sinh viên NCKH Euréka 2024', issuedBy: 'Thành Đoàn TP.HCM', issuedDate: '2024-11-20', detail: 'Đề tài: Hệ thống EdgeVision-Traffic', visibility: 'Public', status: 'Self_Declared', hasEvidence: false },
    { achievementId: -2, category: 'Language_Cert', title: 'IELTS 7.5', issuedBy: 'British Council', issuedDate: '2024-03-10', detail: null, visibility: 'Partners_Only', status: 'Self_Declared', hasEvidence: false }
  ];

  var listEl = document.getElementById('achievement-list');
  var modal = document.getElementById('modal-add-achievement');
  var form = document.getElementById('form-achievement');
  var errorEl = document.getElementById('achievement-error');
  var submitBtn = document.getElementById('achievement-submit');
  if (!listEl || !modal || !form || !errorEl || !submitBtn) return;

  var items = [];
  var online = true;   // false: không có máy chủ API
  var saving = false;
  var localId = -100;  // mã âm cho mục chỉ nằm trong trang
  var lastFocus = null;

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  function h(tag, className, children) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function icon(name, size) { return h('span', 'material-symbols-outlined ' + (size || 'text-[14px]'), [name]); }

  // '2024-11-05' -> '05/11/2024'
  function viDate(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- Gọi máy chủ ----------
  function offlineError() {
    return Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
  }
  // options: { method, json, file }
  function request(path, options) {
    var opts = options || {};
    if (location.protocol === 'file:') return Promise.reject(offlineError());
    var headers, body;
    if (opts.json) { headers = { 'Content-Type': 'application/json' }; body = JSON.stringify(opts.json); }
    if (opts.file) { headers = { 'Content-Type': opts.file.type }; body = opts.file; }
    return fetch(API_URL + (path || ''), {
      method: opts.method || 'GET',
      headers: headers,
      body: body,
      signal: AbortSignal.timeout(opts.file ? 60000 : 15000)
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.ok && data) return data;
        if (!data || !data.code) throw offlineError();
        throw new Error(data.message);
      });
    }, function () { throw offlineError(); });
  }

  function checkFile(file) {
    if (FILE_TYPES.indexOf(file.type) < 0) return 'Minh chứng chỉ nhận tệp PDF, JPG hoặc PNG.';
    if (file.size === 0) return 'Tệp minh chứng rỗng.';
    if (file.size > MAX_FILE_BYTES) return 'Tệp minh chứng tối đa 5 MB.';
    return '';
  }

  // ---------- Danh sách ----------
  function sortItems() {
    items.sort(function (a, b) { return String(b.issuedDate || '').localeCompare(String(a.issuedDate || '')); });
  }
  function replaceItem(updated) {
    items = items.map(function (i) { return i.achievementId === updated.achievementId ? updated : i; });
    render();
  }

  function message(text, retry) {
    var box = h('div', 'col-span-full p-5 rounded-lg border border-dashed border-slate-300 text-center text-sm text-[#5F6368]', [h('p', null, [text])]);
    if (retry) {
      var again = h('button', 'mt-3 h-8 px-3 rounded bg-[#1F4E78] text-white text-xs font-semibold', ['Thử lại']);
      again.type = 'button';
      again.addEventListener('click', load);
      box.appendChild(again);
    }
    listEl.replaceChildren(box);
  }

  function render() {
    if (!items.length) {
      message('Chưa có thành tích nào. Bấm "Thêm thành tích" để bắt đầu.');
      return;
    }
    listEl.replaceChildren.apply(listEl, items.map(card));
  }

  function actionButton(iconName, text, onClick, className) {
    var btn = h('button', 'inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-semibold hover:bg-[#E6F0F7] disabled:opacity-50 ' + (className || 'text-[#1F4E78]'), [icon(iconName), text]);
    btn.type = 'button';
    btn.addEventListener('click', function () { onClick(btn); });
    return btn;
  }

  function card(item) {
    var category = CATEGORIES[item.category] || CATEGORIES.Award;
    var status = STATUSES[item.status] || STATUSES.Self_Declared;
    var editable = item.status === 'Self_Declared' || item.status === 'Rejected';
    var local = item.achievementId < 0; // mục mẫu hoặc chưa lưu: không gọi được máy chủ

    var select = h('select', 'h-7 py-0 pl-2 pr-7 rounded border border-[#E1E5EA] bg-white text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#1F4E78]',
      Object.keys(VISIBILITIES).map(function (v) {
        var option = h('option', null, [VISIBILITIES[v]]);
        option.value = v;
        return option;
      }));
    select.value = item.visibility;
    select.setAttribute('aria-label', 'Chế độ hiển thị của ' + item.title);
    select.addEventListener('change', function () { changeVisibility(item, select); });

    var actions = [];
    if (item.hasEvidence && !local) {
      var view = h('a', 'inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-semibold text-[#1F4E78] hover:bg-[#E6F0F7]', [icon('attach_file'), 'Xem minh chứng']);
      view.href = API_URL + '/' + item.achievementId + '/evidence';
      view.target = '_blank';
      view.rel = 'noopener noreferrer';
      actions.push(view);
    }
    if (editable && !local) {
      var picker = h('input', 'hidden');
      picker.type = 'file';
      picker.accept = '.pdf,.jpg,.jpeg,.png';
      var uploadBtn = actionButton('upload_file', item.hasEvidence ? 'Đổi tệp' : 'Tải minh chứng', function () { picker.click(); });
      picker.addEventListener('change', function () { if (picker.files[0]) upload(item, picker.files[0], uploadBtn); });
      actions.push(uploadBtn, picker);
      if (item.hasEvidence) {
        actions.push(actionButton('how_to_reg', 'Gửi xác minh', function (btn) { askVerification(item, btn); }));
      }
    }
    actions.push(actionButton('delete', 'Xóa', function (btn) { remove(item, btn); }, 'ml-auto text-red-700'));

    var el = h('article', 'p-4 rounded-lg bg-white border border-[#E1E5EA] shadow-xs flex flex-col gap-3 hover:border-[#1F4E78] transition-colors min-w-0', [
      h('div', null, [
        h('div', 'flex flex-wrap items-center justify-between gap-2 mb-2', [
          h('span', 'px-2.5 py-0.5 rounded-xl text-xs font-semibold border ' + category.chip, [category.label]),
          h('span', 'text-xs text-[#5F6368] whitespace-nowrap', [viDate(item.issuedDate)])
        ]),
        h('h3', 'text-base font-semibold text-[#1F4E78] break-words', [item.title]),
        h('p', 'text-xs text-[#5F6368] mt-1 break-words', [item.issuedBy || '']),
        item.detail && h('p', 'text-xs text-[#5F6368] mt-0.5 break-words', [item.detail])
      ]),
      h('div', 'mt-auto pt-3 border-t border-[#E1E5EA] flex flex-wrap items-center justify-between gap-2', [
        h('span', 'inline-flex items-center gap-1 text-xs font-medium ' + status.color, [
          icon(status.icon), status.label,
          item.unsaved && h('span', 'ml-1 px-1.5 py-0.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] leading-none', ['Chưa lưu'])
        ]),
        select
      ]),
      h('div', 'flex flex-wrap items-center gap-1 -mx-2 -mb-1', actions)
    ]);
    el.dataset.achievementId = item.achievementId;
    return el;
  }

  // ---------- Thao tác trên từng mục ----------
  function changeVisibility(item, select) {
    var next = select.value;
    if (item.achievementId < 0) {
      item.visibility = next;
      toast('Thay đổi chưa lưu: không kết nối được máy chủ');
      return;
    }
    select.disabled = true;
    request('/' + item.achievementId, { method: 'PATCH', json: { visibility: next } }).then(function (data) {
      replaceItem(data);
      toast('Đã lưu chế độ hiển thị: ' + VISIBILITIES[data.visibility]);
    }, function (err) {
      select.value = item.visibility;
      select.disabled = false;
      toast('Chưa lưu được: ' + err.message);
    });
  }

  function upload(item, file, btn) {
    var problem = checkFile(file);
    if (problem) { toast(problem); return; }
    btn.disabled = true;
    toast('Đang tải minh chứng…');
    request('/' + item.achievementId + '/evidence', { method: 'PUT', file: file }).then(function (data) {
      replaceItem(data);
      toast('Đã lưu tệp minh chứng');
    }, function (err) {
      btn.disabled = false;
      toast('Chưa tải được minh chứng: ' + err.message);
    });
  }

  function askVerification(item, btn) {
    if (!window.confirm('Gửi xác minh "' + item.title + '"?\nSau khi gửi, bạn không đổi được tệp minh chứng.')) return;
    btn.disabled = true;
    request('/' + item.achievementId + '/verification-request', { method: 'POST' }).then(function (data) {
      replaceItem(data);
      toast('Đã gửi yêu cầu xác minh');
    }, function (err) {
      btn.disabled = false;
      toast('Chưa gửi được: ' + err.message);
    });
  }

  function remove(item, btn) {
    if (!window.confirm('Xóa "' + item.title + '" khỏi hồ sơ?')) return;
    var drop = function () {
      items = items.filter(function (i) { return i.achievementId !== item.achievementId; });
      render();
    };
    if (item.achievementId < 0) { drop(); toast('Chỉ xóa trên trang này: không kết nối được máy chủ'); return; }
    btn.disabled = true;
    request('/' + item.achievementId, { method: 'DELETE' }).then(function () {
      drop();
      toast('Đã xóa thành tích');
    }, function (err) {
      btn.disabled = false;
      toast('Chưa xóa được: ' + err.message);
    });
  }

  // ---------- Hộp thoại thêm mới ----------
  function showError(text, field) {
    errorEl.textContent = text || '';
    errorEl.classList.toggle('hidden', !text);
    if (field) form.elements[field].focus();
  }

  function setSaving(value) {
    saving = value;
    submitBtn.disabled = value;
    submitBtn.textContent = value ? 'Đang lưu…' : 'Lưu thành tích';
  }

  function openModal(trigger) {
    lastFocus = trigger;
    form.reset();
    form.elements.issuedDate.max = today();
    showError('');
    setSaving(false);
    modal.classList.remove('hidden');
    form.elements.title.focus();
  }
  function closeModal() {
    if (saving) return; // đang lưu thì không đóng, tránh mất thông báo kết quả
    modal.classList.add('hidden');
    if (lastFocus) lastFocus.focus();
  }

  // Cùng quy tắc với backend/src/routes/studentAchievements.js (máy chủ vẫn kiểm tra lại)
  function readForm() {
    var values = {
      category: form.elements.category.value,
      title: form.elements.title.value.trim(),
      issuedBy: form.elements.issuedBy.value.trim(),
      issuedDate: form.elements.issuedDate.value,
      detail: form.elements.detail.value.trim(),
      visibility: form.elements.visibility.value
    };
    if (!values.title) return { error: 'Hãy nhập tên thành tích.', field: 'title' };
    if (!values.issuedBy) return { error: 'Hãy nhập tổ chức cấp.', field: 'issuedBy' };
    if (!values.issuedDate) return { error: 'Hãy chọn ngày cấp hợp lệ.', field: 'issuedDate' };
    if (values.issuedDate > today()) return { error: 'Ngày cấp không được sau hôm nay.', field: 'issuedDate' };
    if (values.issuedDate < '1950-01-01') return { error: 'Ngày cấp không được trước năm 1950.', field: 'issuedDate' };
    var file = form.elements.evidence.files[0] || null;
    if (file && checkFile(file)) return { error: checkFile(file), field: 'evidence' };
    return { values: values, file: file };
  }

  function finish(item, text) {
    items.push(item);
    sortItems();
    render();
    setSaving(false);
    closeModal();
    toast(text);
  }

  function submit(event) {
    event.preventDefault();
    if (saving) return;
    var input = readForm();
    if (input.error) { showError(input.error, input.field); return; }
    showError('');
    setSaving(true);

    request('', { method: 'POST', json: input.values }).then(function (created) {
      online = true;
      if (!input.file) { finish(created, 'Đã thêm thành tích (Tự khai)'); return null; }
      return request('/' + created.achievementId + '/evidence', { method: 'PUT', file: input.file }).then(function (withFile) {
        finish(withFile, 'Đã thêm thành tích kèm minh chứng (Tự khai)');
      }, function (err) {
        finish(created, 'Đã lưu thành tích nhưng chưa tải được minh chứng: ' + err.message + ' Hãy tải lại trên thẻ.');
      });
    }, function (err) {
      if (err.offline && !online) {
        var local = Object.assign({ achievementId: --localId, status: 'Self_Declared', hasEvidence: false, unsaved: true }, input.values);
        finish(local, 'Thành tích chưa lưu: không kết nối được máy chủ');
        return;
      }
      setSaving(false);
      showError(err.offline ? 'Không kết nối được máy chủ, chưa lưu được. Hãy thử lại.' : err.message);
      form.elements.title.focus(); // nút Lưu vừa bị khóa nên focus đã rời khỏi hộp thoại
    });
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest && event.target.closest('[data-achievement-open]');
    if (opener) openModal(opener);
  });
  modal.addEventListener('click', function (event) {
    if (event.target === modal || event.target.closest('[data-achievement-close]')) closeModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
  form.addEventListener('submit', submit);

  function load() {
    message('Đang tải thành tích…');
    request('').then(function (data) {
      online = true;
      items = data.achievements;
      render();
    }, function (err) {
      if (err.offline) {
        online = false;
        items = SAMPLE.map(function (i) { return Object.assign({}, i); });
        render();
        listEl.prepend(h('p', 'col-span-full text-xs text-amber-700',['Chưa kết nối máy chủ: đang hiển thị dữ liệu mẫu, thay đổi sẽ không được lưu.']));
        return;
      }
      message('Không tải được thành tích: ' + err.message, true);
    });
  }

  load();
})();
