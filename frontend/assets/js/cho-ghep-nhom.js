// SV-07 Chợ ghép nhóm: thanh tìm kiếm, lọc theo khoa / lĩnh vực và phân trang đề tài Lab.
// - Có máy chủ: GET /api/lab-topics?q=&faculty=&field=&page=  (hợp đồng ở đầu backend/src/sv/07-cho-ghep-nhom/de-tai-lab.routes.js)
//   rồi vẽ lại thẻ. Nút "Ứng tuyển ngay" giữ data-topic-id để lab-application.js xử lý như cũ.
// - Gõ thì tìm sau 350 ms; Enter / "Lọc kết quả" tìm ngay; đổi khoa, bấm lĩnh vực, sang trang thì tìm ngay.
//   Bộ lọc ghi lên địa chỉ (?q=&faculty=&field=&page=) nên tải lại trang hay gửi đường dẫn vẫn giữ kết quả.
// - Không có máy chủ (file://, GitHub Pages, máy chủ cũ chưa có API): lọc ngay trên các thẻ mẫu trong trang
//   và báo "dữ liệu mẫu".
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var API_URL = '/api/lab-topics';
  var PAGE_SIZE = 6;
  var DEBOUNCE = 350;

  var form = document.getElementById('market-form');
  var input = document.getElementById('market-search');
  var faculty = document.getElementById('market-faculty');
  var fieldsBox = document.getElementById('market-fields');
  var count = document.getElementById('market-count');
  var note = document.getElementById('market-note');
  var grid = document.getElementById('market-grid');
  var pages = document.getElementById('market-pages');
  if (!form || !grid) return;

  var PILL_ON = 'px-3.5 py-1.5 rounded-xl bg-[#1F4E78] text-white font-medium shrink-0 shadow-xs cursor-pointer';
  var PILL_OFF = 'px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#1F4E78] hover:bg-[#E6F0F7] font-medium shrink-0 transition-colors cursor-pointer';
  var PAGE_BTN = 'w-9 h-9 rounded-lg border border-slate-200 bg-white text-[#1A1A1A] font-semibold text-xs flex items-center justify-center hover:bg-[#F5F7FA] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  var PAGE_ON = 'w-9 h-9 rounded-lg bg-[#1F4E78] text-white font-semibold text-xs flex items-center justify-center';
  var CHIP = 'text-[11px] px-2.5 py-1 rounded-md bg-[#F5F7FA] text-[#1F4E78] border border-slate-200 font-medium shrink-0';

  var state = { q: '', faculty: '', field: '', page: 1 };
  var mode = 'loading'; // loading | online | sample
  var seq = 0;
  var timer = null;
  var sampleCards = Array.prototype.slice.call(grid.querySelectorAll('[data-sample-card]'));

  // ---------- Tiện ích ----------
  function h(tag, className, children) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false || c === '') return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function icon(name, className) { return h('span', 'material-symbols-outlined ' + (className || 'text-[13px]'), [name]); }
  function normalize(text) {
    return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  }
  function viDate(iso) {
    return new Date(iso + 'T00:00:00+07:00').toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function showNote(text) {
    note.textContent = text || '';
    note.classList.toggle('hidden', !text);
    note.classList.toggle('flex', !!text);
  }

  // ---------- Trạng thái <-> địa chỉ ----------
  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = (p.get('q') || '').slice(0, 100);
    state.faculty = /^\d+$/.test(p.get('faculty') || '') ? p.get('faculty') : '';
    state.field = /^\d+$/.test(p.get('field') || '') ? p.get('field') : '';
    state.page = Math.max(1, Number(p.get('page')) || 1);
    input.value = state.q;
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.faculty) p.set('faculty', state.faculty);
    if (state.field) p.set('field', state.field);
    if (state.page > 1) p.set('page', String(state.page));
    var query = p.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }

  // ---------- Nút lĩnh vực ----------
  function pill(fieldId, label) {
    var on = String(fieldId) === state.field;
    var b = h('button', on ? PILL_ON : PILL_OFF, [label]);
    b.type = 'button';
    b.setAttribute('data-field', String(fieldId));
    b.setAttribute('aria-pressed', String(on));
    return b;
  }
  function renderFields(fields, allCount) {
    var label = fieldsBox.querySelector('span');
    var buttons = [pill('', 'Tất cả (' + allCount + ')')].concat(fields.map(function (f) {
      return pill(f.fieldId, f.name + ' (' + f.count + ')');
    }));
    fieldsBox.replaceChildren.apply(fieldsBox, [label].concat(buttons));
  }
  function markFields() {
    Array.prototype.forEach.call(fieldsBox.querySelectorAll('button[data-field]'), function (b) {
      var on = b.getAttribute('data-field') === state.field;
      b.className = on ? PILL_ON : PILL_OFF;
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function renderFaculties(list) {
    var options = [h('option', null, ['Tất cả khoa & bộ môn'])];
    options[0].value = '';
    list.forEach(function (f) {
      var o = h('option', null, [f.name]);
      o.value = String(f.facultyId);
      options.push(o);
    });
    faculty.replaceChildren.apply(faculty, options);
    faculty.value = state.faculty;
    if (faculty.value !== state.faculty) { state.faculty = ''; faculty.value = ''; }
  }

  // ---------- Thẻ đề tài ----------
  function badge(text, className) { return h('span', 'whitespace-nowrap px-2.5 py-0.5 rounded-xl text-xs font-semibold ' + className, [text]); }

  function infoRow(iconName, content) {
    return h('div', 'flex items-start gap-2', [
      h('div', 'w-5 h-5 rounded-xl bg-[#E6F0F7] text-[#1F4E78] flex items-center justify-center shrink-0', [icon(iconName)]),
      h('span', 'min-w-0 leading-5', content)
    ]);
  }

  function applyButton(t) {
    var b = h('button', 'col-span-2 h-10 px-2 whitespace-nowrap text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs');
    b.type = 'button';
    if (t.applied) {
      b.disabled = true;
      b.className += ' bg-slate-200 text-slate-600 cursor-not-allowed';
      b.appendChild(h('span', null, ['Đã ứng tuyển']));
    } else if (t.isFull) {
      b.disabled = true;
      b.className += ' bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed';
      b.appendChild(h('span', null, ['Đã đủ chỗ']));
    } else {
      b.setAttribute('data-topic-id', String(t.topicId)); // lab-application.js gửi POST /api/lab-applications
      b.className += ' text-white bg-[#1F4E78] hover:bg-[#163A59] cursor-pointer';
      b.append(h('span', null, ['Ứng tuyển ngay']), icon('arrow_forward', 'text-[16px]'));
    }
    b.setAttribute('aria-label', (t.applied ? 'Đã ứng tuyển' : t.isFull ? 'Đã đủ chỗ' : 'Ứng tuyển') + ': ' + t.title);
    return b;
  }

  function card(t) {
    var skills = t.skills.slice(0, 3).map(function (name) { return h('span', CHIP, [name]); });
    if (t.skills.length > 3) {
      var more = h('span', 'text-[11px] px-2 py-1 rounded-md bg-[#E6F0F7] text-[#1F4E78] font-bold shrink-0', ['+' + (t.skills.length - 3)]);
      more.title = t.skills.slice(3).join(', ');
      skills.push(more);
    }
    var where = [t.lab && t.lab.name, t.faculty && t.faculty.name].filter(Boolean).join(' · ');
    var slotText = t.isFull ? 'Đã đủ ' + t.slots + '/' + t.slots + ' chỗ' : 'Còn ' + t.remaining + '/' + t.slots + ' chỗ';
    return h('article', 'bg-white border border-slate-200 rounded-lg p-5 min-w-0 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col' + (t.isFull ? ' opacity-80' : ''), [
      h('div', 'flex-1 flex flex-col gap-3', [
        h('div', 'flex items-start justify-between gap-2', [
          h('div', 'flex flex-wrap items-center gap-2 min-w-0', [
            t.isFull ? badge('Đã đủ chỗ', 'bg-slate-100 text-slate-600 border border-slate-200') : badge('Đang tuyển', 'bg-emerald-50 text-emerald-700 border border-emerald-200'),
            t.isInterdisciplinary && badge('Ưu tiên liên khoa', 'bg-[#E6F0F7] text-[#1F4E78]'),
            t.applied && badge('Bạn đã ứng tuyển', 'bg-amber-50 text-amber-800 border border-amber-200')
          ]),
          t.trlLevel && h('span', 'shrink-0 whitespace-nowrap font-mono text-xs px-2 py-0.5 bg-[#F5F7FA] border border-slate-200 text-[#1F4E78] font-bold rounded-sm', ['TRL-' + t.trlLevel])
        ]),
        h('h3', '@2xl:min-h-[4.125rem] text-base font-bold text-[#1A1A1A] line-clamp-3 leading-snug break-words', [t.title]),
        h('div', 'space-y-2 text-xs text-slate-600', [
          infoRow('person', [
            h('span', 'block', ['GVHD: ', h('strong', 'text-[#1A1A1A]', [t.lecturer || 'Chưa cập nhật'])]),
            where && h('span', 'block text-slate-500', [where])
          ]),
          infoRow('category', [t.typeLabel + (t.field ? ' · ' + t.field.name : '')]),
          infoRow('event', [slotText + (t.deadline ? ' · Hạn nộp ' + viDate(t.deadline) : '')]),
          t.partnerName && infoRow('handshake', ['Đối tác: ' + t.partnerName])
        ]),
        t.description && h('p', 'text-xs text-slate-600 line-clamp-3 leading-relaxed', [t.description]),
        skills.length > 0 && h('div', 'mt-auto pt-2 flex flex-wrap items-center gap-1.5', skills)
      ]),
      h('div', 'mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3', [applyButton(t)])
    ]);
  }

  function emptyState(message) {
    var clear = h('button', 'mt-3 h-9 px-4 rounded-lg border border-[#1F4E78] text-[#1F4E78] text-xs font-semibold hover:bg-[#E6F0F7] cursor-pointer', ['Xóa bộ lọc']);
    clear.type = 'button';
    clear.addEventListener('click', clearFilters);
    return h('div', 'col-span-full p-10 rounded-lg bg-white border border-dashed border-slate-300 text-center', [
      icon('search_off', 'text-[36px] text-slate-400'),
      h('p', 'mt-2 text-sm text-slate-600', [message]),
      (state.q || state.faculty || state.field) && clear
    ]);
  }

  // ---------- Phân trang ----------
  function pageButton(label, page, options) {
    var b = h('button', options.current ? PAGE_ON : PAGE_BTN, [label]);
    b.type = 'button';
    if (options.current) b.setAttribute('aria-current', 'page');
    if (options.disabled) b.disabled = true;
    if (options.aria) b.setAttribute('aria-label', options.aria);
    else b.setAttribute('aria-label', 'Trang ' + page);
    b.addEventListener('click', function () { if (!b.disabled && !options.current) go(page); });
    return b;
  }
  function renderPages(page, total) {
    pages.classList.toggle('hidden', total <= 1);
    pages.classList.toggle('flex', total > 1);
    if (total <= 1) { pages.replaceChildren(); return; }
    var list = [1];
    for (var i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) list.push(i);
    if (total > 1) list.push(total);
    var items = [pageButton(icon('chevron_left', 'text-[16px]'), page - 1, { disabled: page === 1, aria: 'Trang trước' })];
    list.forEach(function (n, idx) {
      if (idx > 0 && n - list[idx - 1] > 1) items.push(h('span', 'text-slate-400 px-1', ['…']));
      items.push(pageButton(String(n), n, { current: n === page }));
    });
    items.push(pageButton(icon('chevron_right', 'text-[16px]'), page + 1, { disabled: page === total, aria: 'Trang sau' }));
    pages.replaceChildren.apply(pages, items);
  }
  function go(page) {
    state.page = page;
    search(true);
    grid.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Có máy chủ ----------
  function fetchTopics() {
    var p = new URLSearchParams({ page: String(state.page), pageSize: String(PAGE_SIZE) });
    if (state.q) p.set('q', state.q);
    if (state.faculty) p.set('faculty', state.faculty);
    if (state.field) p.set('field', state.field);
    return fetch(API_URL + '?' + p.toString(), { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok) return data;
        throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), {
          status: res.status, offline: res.status === 404 && (!data.code || data.code === 'NOT_FOUND')
        });
      });
    }, function () { throw Object.assign(new Error('Không kết nối được máy chủ'), { offline: true }); });
  }

  function renderOnline(data) {
    mode = 'online';
    showNote('');
    state.page = data.page;
    renderFaculties(data.faculties);
    renderFields(data.fields, data.summary.matchedBeforeField);
    var from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
    var to = Math.min(data.total, data.page * data.pageSize);
    count.textContent = data.total
      ? 'Hiển thị ' + from + '–' + to + ' trong ' + data.total + ' đề tài'
      : 'Không có đề tài phù hợp';
    grid.replaceChildren.apply(grid, data.items.length ? data.items.map(card)
      : [emptyState(data.summary.visible ? 'Không tìm thấy đề tài phù hợp với bộ lọc.' : 'Hiện chưa có đề tài nào đang tuyển.')]);
    renderPages(data.page, data.totalPages);
    writeUrl();
  }

  // ---------- Không có máy chủ: lọc trên thẻ mẫu ----------
  function sampleText(cardEl) { return normalize(cardEl.textContent); }
  function filterSample() {
    var words = normalize(state.q).split(/\s+/).filter(Boolean);
    var shown = 0;
    sampleCards.forEach(function (c) {
      var ok = words.every(function (w) { return sampleText(c).indexOf(w) !== -1; })
        && (!state.faculty || c.getAttribute('data-faculty') === state.faculty)
        && (!state.field || c.getAttribute('data-field') === state.field);
      c.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    var empty = grid.querySelector('[data-sample-empty]');
    if (!shown && !empty) {
      empty = emptyState('Không có thẻ mẫu nào khớp bộ lọc.');
      empty.setAttribute('data-sample-empty', '');
      grid.appendChild(empty);
    } else if (shown && empty) empty.remove();
    markFields();
    count.textContent = 'Hiển thị ' + shown + ' trong ' + sampleCards.length + ' đề tài mẫu';
    pages.classList.add('hidden');
    pages.classList.remove('flex');
    if (location.protocol !== 'file:') writeUrl();
  }

  function useSample(err) {
    mode = 'sample';
    showNote(err && !err.offline
      ? 'Không tải được danh sách đề tài (' + err.message + '): đang lọc trên dữ liệu mẫu.'
      : 'Chưa kết nối máy chủ: đang tìm và lọc trên dữ liệu mẫu, không phải danh sách thật.');
    filterSample();
  }

  // ---------- Tìm kiếm ----------
  function search(keepPage) {
    clearTimeout(timer);
    if (!keepPage) state.page = 1;
    if (mode === 'sample') { filterSample(); return; }
    var mine = ++seq;
    grid.setAttribute('aria-busy', 'true');
    fetchTopics().then(function (data) {
      if (mine === seq) renderOnline(data);
    }, function (err) {
      if (mine !== seq) return;
      if (mode === 'online' && !err.offline) {
        showNote('Không tải được danh sách đề tài: ' + err.message);
        return;
      }
      useSample(err);
    }).then(function () { if (mine === seq) grid.removeAttribute('aria-busy'); });
  }

  function clearFilters() {
    state.q = ''; state.faculty = ''; state.field = '';
    input.value = '';
    faculty.value = '';
    search(false);
    input.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    state.q = input.value.replace(/\s+/g, ' ').trim().slice(0, 100);
    search(false);
  });
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var q = input.value.replace(/\s+/g, ' ').trim().slice(0, 100);
      if (q === state.q) return;
      state.q = q;
      search(false);
    }, DEBOUNCE);
  });
  faculty.addEventListener('change', function () {
    state.faculty = faculty.value;
    search(false);
  });
  fieldsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-field]');
    if (!b) return;
    var value = b.getAttribute('data-field');
    state.field = value === state.field ? '' : value; // bấm lại lĩnh vực đang chọn để bỏ chọn
    search(false);
  });

  readUrl();
  faculty.value = state.faculty;
  if (location.protocol === 'file:') useSample(null);
  else search(true);
})();
