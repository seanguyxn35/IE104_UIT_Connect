// SV-04: Công trình & Project trưng bày trên CV – chọn từ tài nguyên học thuật đã được GV thẩm định,
// ghi vai trò + kết quả nổi bật, ẩn/hiện trên CV, sắp xếp thứ tự, gỡ khỏi danh sách.
// Dữ liệu qua /api/student-showcase. CV (assets/js/cv-preview.js) đọc cùng dữ liệu này.
// Khi không có máy chủ: hiện danh sách mẫu, thay đổi chỉ nằm trong trang và được báo "chưa lưu".
// Mọi nội dung được gán bằng textContent, không ghép chuỗi HTML từ dữ liệu.
// Nạp SAU đoạn script khai báo triggerToast trong trang.
(function () {
  var API_URL = '/api/student-showcase';

  var TYPES = {
    Project: { label: 'Dự án', chip: 'bg-[#E6F0F7] text-[#1F4E78] border-[#cfe2f0]' },
    Product: { label: 'Sản phẩm', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    Paper: { label: 'Bài báo', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
    Thesis: { label: 'Khóa luận', chip: 'bg-violet-50 text-violet-800 border-violet-200' },
    Textbook: { label: 'Giáo trình', chip: 'bg-slate-100 text-slate-700 border-slate-200' },
    Slide: { label: 'Bài giảng', chip: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  // Dữ liệu mẫu (giả) khi không có máy chủ
  var SAMPLE_ITEMS = [
    { resourceId: -1, type: 'Product', title: 'Hệ thống AI Edge giám sát an toàn giao thông (EdgeVision-Traffic)', trlLevel: 6, venue: 'Lab CV&PR', reviewerName: 'TS. Giảng viên Mẫu', role: 'Trưởng nhóm (Lead AI Engineer)', highlights: 'Đạt 94% mAP\nTriển khai trên NVIDIA Jetson', isShownOnCv: true, eligible: true },
    { resourceId: -2, type: 'Paper', title: 'Tối ưu mô hình phát hiện vật thể trên thiết bị biên', trlLevel: 4, venue: 'Hội nghị mẫu 2025', reviewerName: 'TS. Giảng viên Mẫu', role: 'Đồng tác giả', highlights: null, isShownOnCv: false, eligible: true }
  ];
  var SAMPLE_AVAILABLE = [
    { resourceId: -3, type: 'Project', title: 'Nền tảng gán nhãn dữ liệu cho nhóm nghiên cứu', trlLevel: 5, venue: 'Đồ án chuyên ngành', reviewerName: 'TS. Giảng viên Mẫu' }
  ];

  var listEl = document.getElementById('projects-container');
  var counterEl = document.getElementById('cv-showcase-counter');
  var filtersEl = document.getElementById('showcase-filters');
  var modal = document.getElementById('modal-showcase');
  var form = document.getElementById('form-showcase');
  var picker = document.getElementById('showcase-picker');
  var pickerLabel = document.getElementById('showcase-picker-label');
  var titleEl = document.getElementById('showcase-modal-title');
  var errorEl = document.getElementById('showcase-error');
  var submitBtn = document.getElementById('showcase-submit');
  if (!listEl || !counterEl || !filtersEl || !modal || !form || !picker || !submitBtn) return;

  var items = [];
  var offline = false;    // true: không có máy chủ API, mọi thay đổi chỉ nằm trong trang
  var loaded = false;
  var filter = 'all';
  var editing = null;     // mục đang sửa; null = đang thêm mới
  var saving = false;
  var reordering = false;
  var lastFocus = null;
  var pickerRequest = 0;
  var offlinePool = SAMPLE_AVAILABLE.slice();

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }
  var UNSAVED = 'Thay đổi chưa lưu: không kết nối được máy chủ';

  function h(tag, className, children) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function icon(name, size) { return h('span', 'material-symbols-outlined ' + (size || 'text-[16px]'), [name]); }
  function lines(text) {
    return (text || '').split(/\r?\n/).map(function (s) { return s.replace(/^[\s•\-–]+/, '').trim(); }).filter(Boolean);
  }
  function metaText(r) {
    return [r.venue, r.reviewerName ? 'Thẩm định: ' + r.reviewerName : null].filter(Boolean).join(' • ');
  }

  // ---------- Gọi máy chủ ----------
  function offlineError() {
    return Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
  }
  function request(path, method, json) {
    if (location.protocol === 'file:') return Promise.reject(offlineError());
    return fetch(API_URL + path, {
      method: method || 'GET',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : undefined,
      signal: AbortSignal.timeout(15000)
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.ok && data) return data;
        if (!data || !data.code) throw offlineError();
        throw new Error(data.message);
      });
    }, function () { throw offlineError(); });
  }

  // ---------- Danh sách ----------
  function message(text, retry) {
    var box = h('div', 'p-5 rounded-lg border border-dashed border-slate-300 text-center text-sm text-[#5F6368]', [h('p', null, [text])]);
    if (retry) {
      var again = h('button', 'mt-3 h-8 px-3 rounded bg-[#1F4E78] text-white text-xs font-semibold', ['Thử lại']);
      again.type = 'button';
      again.addEventListener('click', load);
      box.appendChild(again);
    }
    return box;
  }

  function renderFilters() {
    var shown = items.filter(function (i) { return i.isShownOnCv; }).length;
    var counts = { all: items.length, shown: shown, hidden: items.length - shown };
    var labels = { all: 'Tất cả', shown: 'Hiển thị trên CV', hidden: 'Đang ẩn' };
    filtersEl.querySelectorAll('[data-showcase-filter]').forEach(function (btn) {
      var key = btn.dataset.showcaseFilter;
      var active = key === filter;
      btn.textContent = labels[key] + ' (' + counts[key] + ')';
      btn.setAttribute('aria-pressed', String(active));
      btn.className = 'px-3 py-1 rounded-md text-xs ' + (active
        ? 'bg-white border border-[#E1E5EA] text-[#1F4E78] font-semibold shadow-xs'
        : 'text-[#5F6368] hover:text-[#1F4E78] font-medium');
    });
    var onCv = items.filter(function (i) { return i.isShownOnCv && i.eligible; }).length;
    counterEl.textContent = 'Đang hiển thị trên CV: ' + onCv + ' / ' + items.length;
  }

  function render() {
    renderFilters();
    var visible = items.filter(function (i) {
      return filter === 'all' || (filter === 'shown') === i.isShownOnCv;
    });
    var content = visible.length ? visible.map(card) : [message(items.length
      ? 'Không có công trình nào trong bộ lọc này.'
      : 'Chưa chọn công trình nào. Bấm "Thêm dự án" để chọn từ các công trình đã được thẩm định.')];
    if (offline) content.unshift(h('p', 'text-xs text-amber-700', ['Chưa kết nối máy chủ: đang hiển thị dữ liệu mẫu, thay đổi sẽ không được lưu.']));
    listEl.replaceChildren.apply(listEl, content);
  }

  function smallButton(iconName, label, onClick, extra, text) {
    var btn = h('button', 'inline-flex items-center justify-center gap-1 h-7 min-w-[28px] px-1.5 rounded text-xs font-semibold hover:bg-[#E6F0F7] disabled:opacity-30 disabled:cursor-not-allowed ' + (extra || 'text-[#1F4E78]'), [icon(iconName), text]);
    btn.type = 'button';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', function () { onClick(btn); });
    return btn;
  }

  function card(item) {
    var index = items.indexOf(item);
    var type = TYPES[item.type] || TYPES.Project;
    var canReorder = filter === 'all'; // đang lọc thì thứ tự nhìn thấy không phải thứ tự thật

    var up = smallButton('keyboard_arrow_up', 'Đưa lên: ' + item.title, function () { move(item, -1); });
    var down = smallButton('keyboard_arrow_down', 'Đưa xuống: ' + item.title, function () { move(item, 1); });
    up.disabled = !canReorder || index === 0;
    down.disabled = !canReorder || index === items.length - 1;
    up.dataset.move = 'up';
    down.dataset.move = 'down';

    var checkbox = h('input', 'sr-only peer');
    checkbox.type = 'checkbox';
    checkbox.checked = item.isShownOnCv;
    checkbox.setAttribute('aria-label', 'Hiển thị trên CV: ' + item.title);
    checkbox.addEventListener('change', function () { toggleShown(item, checkbox); });
    var toggle = h('label', 'relative inline-flex items-center gap-2 cursor-pointer select-none', [
      h('span', 'text-xs font-semibold ' + (item.isShownOnCv ? 'text-[#1F4E78]' : 'text-[#5F6368]'), [item.isShownOnCv ? 'Hiển thị trên CV' : 'Ẩn khỏi CV']),
      checkbox,
      h('span', "relative w-9 h-5 shrink-0 bg-[#E1E5EA] rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-[#2E86AB] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-xl after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-[#1F4E78]")
    ]);

    toggle.dataset.noRipple = ''; // cùng cách hoạt động với các công tắc ẩn/hiện khác trên trang

    var bullets = lines(item.highlights);
    var el = h('article', 'rounded-lg bg-white p-4 sm:p-5 border shadow-xs flex items-start gap-3 ' + (item.isShownOnCv && item.eligible ? 'border-[#E1E5EA]' : 'border-dashed border-slate-300'), [
      h('div', 'flex flex-col items-center gap-1 shrink-0', [
        up,
        h('span', 'w-5 h-5 rounded-sm bg-[#1F4E78] text-white text-xs font-bold flex items-center justify-center', [index + 1]),
        down
      ]),
      h('div', 'flex-1 min-w-0', [
        h('div', 'flex flex-wrap items-center justify-between gap-2 mb-2', [
          h('div', 'flex flex-wrap items-center gap-2', [
            h('span', 'px-2.5 py-0.5 rounded-xl text-xs font-semibold border ' + type.chip, [type.label]),
            item.eligible
              ? h('span', 'px-2.5 py-0.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200', ['✓ Đã thẩm định'])
              : h('span', 'px-2.5 py-0.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200', ['Không còn đủ điều kiện']),
            item.trlLevel && h('span', 'px-1.5 py-0.5 rounded-sm bg-[#1F4E78] text-white font-mono text-xs font-medium', ['TRL ' + item.trlLevel])
          ]),
          toggle
        ]),
        h('h3', 'text-base font-semibold text-[#1F4E78] break-words', [item.title]),
        item.role && h('p', 'text-xs font-medium text-[#1A1A1A] mt-0.5 break-words', [item.role]),
        metaText(item) && h('p', 'text-xs text-[#5F6368] mt-0.5 break-words', [metaText(item)]),
        !item.eligible && h('p', 'mt-1 text-xs text-amber-700', ['Công trình này hiện không đạt điều kiện thẩm định nên không được đưa lên CV.']),
        bullets.length > 0 && h('ul', 'mt-2 list-disc pl-4 text-xs text-[#334155] space-y-0.5 break-words', bullets.map(function (b) { return h('li', null, [b]); })),
        h('div', 'mt-3 pt-2 border-t border-[#E1E5EA] flex flex-wrap items-center gap-1', [
          smallButton('edit', 'Sửa vai trò và kết quả nổi bật', function (btn) { openModal(btn, item); }, null, 'Sửa mô tả'),
          smallButton('remove_circle', 'Gỡ khỏi danh sách trưng bày', function (btn) { remove(item, btn); }, 'ml-auto text-red-700', 'Gỡ')
        ])
      ])
    ]);
    el.dataset.resourceId = item.resourceId;
    return el;
  }

  // ---------- Thao tác trên từng mục ----------
  function replaceItem(updated) {
    items = items.map(function (i) { return i.resourceId === updated.resourceId ? updated : i; });
  }

  function toggleShown(item, checkbox) {
    var next = checkbox.checked;
    var done = function (updated, text) {
      replaceItem(updated);
      render();
      toast(text);
    };
    if (offline) { done(Object.assign({}, item, { isShownOnCv: next }), UNSAVED); return; }
    checkbox.disabled = true;
    request('/' + item.resourceId, 'PATCH', { isShownOnCv: next }).then(function (data) {
      done(data, data.isShownOnCv ? 'Đã đưa công trình lên CV' : 'Đã ẩn công trình khỏi CV');
    }, function (err) {
      checkbox.checked = !next;
      checkbox.disabled = false;
      toast('Chưa lưu được: ' + err.message);
    });
  }

  function move(item, step) {
    if (reordering) return;
    var from = items.indexOf(item);
    var to = from + step;
    if (from < 0 || to < 0 || to >= items.length) return;
    var previous = items.slice();
    items.splice(from, 1);
    items.splice(to, 0, item);
    render();
    // Giữ focus ở nút vừa bấm để dùng bàn phím liên tục
    var button = listEl.querySelector('[data-resource-id="' + item.resourceId + '"] [data-move="' + (step < 0 ? 'up' : 'down') + '"]');
    if (button && !button.disabled) button.focus();
    if (offline) { toast(UNSAVED); return; }
    reordering = true;
    request('/order', 'PUT', { resourceIds: items.map(function (i) { return i.resourceId; }) }).then(function (data) {
      reordering = false;
      items = data.items;
      render();
      toast('Đã lưu thứ tự trên CV');
    }, function (err) {
      reordering = false;
      items = previous;
      render();
      toast('Chưa lưu được thứ tự: ' + err.message);
    });
  }

  function remove(item, btn) {
    if (!window.confirm('Gỡ "' + item.title + '" khỏi danh sách trưng bày?\nCông trình gốc vẫn được giữ nguyên.')) return;
    var drop = function (text) {
      items = items.filter(function (i) { return i.resourceId !== item.resourceId; });
      render();
      toast(text);
    };
    if (offline) { offlinePool.push(item); drop(UNSAVED); return; }
    btn.disabled = true;
    request('/' + item.resourceId, 'DELETE').then(function () {
      drop('Đã gỡ công trình khỏi danh sách trưng bày');
    }, function (err) {
      btn.disabled = false;
      toast('Chưa gỡ được: ' + err.message);
    });
  }

  // ---------- Hộp thoại thêm / sửa ----------
  function showError(text) {
    errorEl.textContent = text || '';
    errorEl.classList.toggle('hidden', !text);
  }

  function setSaving(value) {
    saving = value;
    submitBtn.disabled = value;
    submitBtn.textContent = value ? 'Đang lưu…' : (editing ? 'Lưu thay đổi' : 'Thêm vào CV');
  }

  function option(resource, checked) {
    var radio = h('input', 'mt-0.5 text-[#1F4E78] focus:ring-[#1F4E78]');
    radio.type = 'radio';
    radio.name = 'resourceId';
    radio.value = resource.resourceId;
    radio.checked = checked;
    var type = TYPES[resource.type] || TYPES.Project;
    return h('label', 'flex items-start gap-2.5 p-3 rounded-lg border border-[#E1E5EA] cursor-pointer hover:bg-[#F5F7FA] has-[:checked]:bg-[#E6F0F7] has-[:checked]:border-[#1F4E78]', [
      radio,
      h('span', 'min-w-0', [
        h('span', 'block text-sm font-semibold text-[#1A1A1A] break-words', [resource.title]),
        h('span', 'block text-xs text-[#5F6368] mt-0.5 break-words', [
          [type.label, resource.trlLevel ? 'TRL ' + resource.trlLevel : null, metaText(resource)].filter(Boolean).join(' • ')
        ])
      ])
    ]);
  }

  function pickerMessage(nodes) {
    picker.replaceChildren(h('p', 'p-4 rounded-lg border border-dashed border-slate-300 text-xs text-[#5F6368] text-center', nodes));
  }

  function showAvailable(resources) {
    if (!resources.length) {
      var link = h('a', 'font-semibold text-[#1F4E78] hover:underline', ['Đề tài của tôi']);
      link.href = '05_de-tai-cua-toi.html';
      pickerMessage(['Không còn công trình nào đã được thẩm định để chọn. Xem trạng thái thẩm định ở ', link, '.']);
      return;
    }
    picker.replaceChildren.apply(picker, resources.map(function (r, i) { return option(r, i === 0); }));
    submitBtn.disabled = false;
  }

  function loadAvailable() {
    var id = ++pickerRequest;
    submitBtn.disabled = true;
    pickerMessage(['Đang tải danh sách công trình…']);
    if (offline) { showAvailable(offlinePool); return; }
    request('/available').then(function (data) {
      if (id === pickerRequest) showAvailable(data.resources);
    }, function (err) {
      if (id === pickerRequest) pickerMessage(['Không tải được danh sách: ' + err.message]);
    });
  }

  function openModal(trigger, item) {
    if (!loaded) { toast('Danh sách công trình chưa tải xong'); return; }
    lastFocus = trigger;
    editing = item || null;
    form.reset();
    showError('');
    setSaving(false);
    titleEl.textContent = editing ? 'Sửa thông tin trên CV' : 'Thêm công trình vào CV';
    pickerLabel.textContent = editing ? 'Công trình' : 'Công trình đã được GV thẩm định *';
    modal.classList.remove('hidden');
    if (editing) {
      pickerRequest++;
      picker.replaceChildren(h('p', 'p-3 rounded-lg bg-[#F5F7FA] border border-[#E1E5EA] text-sm font-semibold text-[#1A1A1A] break-words', [editing.title]));
      form.elements.role.value = editing.role || '';
      form.elements.highlights.value = editing.highlights || '';
      form.elements.isShownOnCv.checked = editing.isShownOnCv;
    } else {
      loadAvailable();
    }
    form.elements.role.focus();
  }

  function closeModal() {
    if (saving) return;
    pickerRequest++;
    modal.classList.add('hidden');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }

  function finish(text) {
    render();
    setSaving(false);
    closeModal();
    toast(text);
  }

  function submit(event) {
    event.preventDefault();
    if (saving || submitBtn.disabled) return;
    var values = {
      role: form.elements.role.value.trim(),
      highlights: form.elements.highlights.value.trim(),
      isShownOnCv: form.elements.isShownOnCv.checked
    };
    var selected = null;
    if (!editing) {
      var checked = picker.querySelector('input[name="resourceId"]:checked');
      if (!checked) { showError('Hãy chọn một công trình.'); return; }
      selected = Number(checked.value);
    }
    showError('');

    if (offline) {
      if (editing) {
        replaceItem(Object.assign({}, editing, values));
      } else {
        var resource = offlinePool.filter(function (r) { return r.resourceId === selected; })[0];
        offlinePool = offlinePool.filter(function (r) { return r.resourceId !== selected; });
        items.push(Object.assign({ eligible: true }, resource, values));
      }
      finish(UNSAVED);
      return;
    }

    setSaving(true);
    var call = editing
      ? request('/' + editing.resourceId, 'PATCH', values)
      : request('', 'POST', Object.assign({ resourceId: selected }, values));
    call.then(function (data) {
      var added = !editing;
      if (added) items.push(data);
      else replaceItem(data);
      finish(added ? 'Đã thêm công trình vào danh sách trưng bày' : 'Đã lưu thay đổi');
    }, function (err) {
      setSaving(false);
      showError(err.offline ? 'Không kết nối được máy chủ, chưa lưu được. Hãy thử lại.' : err.message);
      form.elements.role.focus(); // nút Lưu vừa bị khóa nên focus đã rời khỏi hộp thoại
    });
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest && event.target.closest('[data-showcase-open]');
    if (opener) openModal(opener, null);
  });
  filtersEl.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-showcase-filter]');
    if (!btn || !loaded) return;
    filter = btn.dataset.showcaseFilter;
    render();
  });
  modal.addEventListener('click', function (event) {
    if (event.target === modal || event.target.closest('[data-showcase-close]')) closeModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
  form.addEventListener('submit', submit);

  function load() {
    loaded = false;
    listEl.replaceChildren(message('Đang tải công trình…'));
    request('').then(function (data) {
      loaded = true;
      items = data.items;
      render();
    }, function (err) {
      if (err.offline) {
        loaded = true;
        offline = true;
        items = SAMPLE_ITEMS.map(function (i) { return Object.assign({}, i); });
        render();
        return;
      }
      counterEl.textContent = 'Chưa tải được';
      listEl.replaceChildren(message('Không tải được danh sách trưng bày: ' + err.message, true));
    });
  }

  load();
})();
