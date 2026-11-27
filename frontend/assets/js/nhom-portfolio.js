// SV-06 tab "Portfolio & Thành tích". Nạp sau nhom-thong-tin.js (dùng chung popup, request qua window.UitTeamPage).
// - GET /api/student-teams/:teamId/portfolio: thành tích nhóm + công trình đã công khai (đã thẩm định).
// - CHỈ Leader thêm / sửa / xóa thành tích (máy chủ quyết định qua viewer.canEdit). Thành tích là tự khai,
//   không qua duyệt: luôn gắn nhãn "Nhóm tự khai". Công trình đã công khai chỉ đọc.
// - Không có máy chủ: giữ thẻ mẫu trong trang.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var T = window.UitTeamPage;
  if (!T) return;
  var h = T.h, icon = T.icon, toggle = T.toggle, C = T.classes, button = T.button;

  var CATEGORIES = [ // khớp máy chủ
    { value: 'Award', label: 'Giải thưởng', icon: 'emoji_events', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'Publication', label: 'Bài báo / Công bố', icon: 'article', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { value: 'Patent', label: 'Bằng sáng chế / Giải pháp hữu ích', icon: 'workspace_premium', tone: 'bg-sky-50 text-[#1F4E78] border-sky-200' },
    { value: 'Certificate', label: 'Chứng nhận', icon: 'military_tech', tone: 'bg-[#E6F0F7] text-[#1F4E78] border-[#1F4E78]/20' },
    { value: 'Other', label: 'Khác', icon: 'star', tone: 'bg-slate-100 text-slate-700 border-slate-200' }
  ];
  var TYPE_LABEL = { Project: 'Đề tài', Product: 'Sản phẩm', Paper: 'Bài báo', Thesis: 'Luận văn' };

  var list = document.getElementById('achievement-list');
  var works = document.getElementById('works-list');
  var newButton = document.getElementById('achievement-new');
  var data = null;
  var teamId = null;
  var seq = 0;
  var lastKey = '';

  function category(value) {
    return CATEGORIES.filter(function (c) { return c.value === value; })[0] || CATEGORIES[CATEGORIES.length - 1];
  }

  function todayVn() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); }

  function externalLink(url, label) {
    if (!/^https:\/\//i.test(url || '')) return null;
    var a = h('a', 'inline-flex items-center gap-1 text-xs font-semibold text-[#1F4E78] hover:underline', [icon('open_in_new', 'text-[14px]'), label]);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function achievementCard(a) {
    var c = category(a.category);
    var meta = [a.issuedBy, a.issuedDate && T.viDate(a.issuedDate)].filter(Boolean).join(' · ');
    var tools = null;
    if (data.viewer.canEdit) {
      var edit = button('p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100', [icon('edit', 'text-[16px]')], function () { openForm(a, edit); });
      edit.setAttribute('aria-label', 'Sửa thành tích ' + a.title);
      edit.title = 'Sửa';
      var remove = button('p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50', [icon('delete', 'text-[16px]')], function () { openDelete(a, remove); });
      remove.setAttribute('aria-label', 'Xóa thành tích ' + a.title);
      remove.title = 'Xóa';
      tools = h('div', 'absolute top-3 right-3 flex items-center gap-0.5', [edit, remove]);
    }
    var doiUrl = a.doi ? 'https://doi.org/' + a.doi : null;
    return h('article', 'p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col gap-2 relative', [
      tools,
      h('div', 'w-9 h-9 rounded-lg flex items-center justify-center border ' + c.tone, [icon(c.icon, 'text-[22px]')]),
      h('span', 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1', [c.label]),
      h('h3', 'text-xs font-bold text-[#1A1A1A] break-words' + (tools ? ' pr-12' : ''), [a.title]),
      meta && h('p', 'text-xs text-slate-500', [meta]),
      a.detail && h('p', 'text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words', [a.detail]),
      h('div', 'mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 text-xs', [
        h('div', 'flex flex-wrap items-center gap-2', [
          a.certificateCode && h('span', 'font-mono px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-bold border border-slate-200', [a.certificateCode]),
          doiUrl && externalLink(doiUrl, 'DOI: ' + a.doi),
          externalLink(a.externalUrl, 'Liên kết')
        ]),
        h('span', 'px-2 py-0.5 rounded-xl text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200', ['Nhóm tự khai'])
      ])
    ]);
  }

  function workCard(w) {
    var meta = [TYPE_LABEL[w.type] || w.type, w.trlLevel && 'TRL ' + w.trlLevel, w.venue].filter(Boolean).join(' · ');
    return h('article', 'p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col gap-1.5', [
      h('span', 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider', [meta]),
      h('h3', 'text-sm font-bold text-[#1A1A1A] break-words', [w.title]),
      w.reviewerName && h('p', 'text-xs text-emerald-800 flex items-center gap-1', [icon('verified', 'text-[16px]'), 'Đã thẩm định bởi ' + w.reviewerName]),
      h('div', 'flex flex-wrap items-center gap-3 text-xs text-slate-500', [
        w.code && h('span', 'font-mono', [w.code]),
        w.publishedAt && h('span', null, ['Công khai ' + T.viDate(w.publishedAt)]),
        w.doi && externalLink('https://doi.org/' + w.doi, 'DOI: ' + w.doi)
      ])
    ]);
  }

  function empty(text, span) {
    return h('p', span + ' p-8 rounded-lg bg-white border border-dashed border-slate-300 text-center text-sm text-slate-500', [text]);
  }

  function render() {
    toggle(newButton, data.viewer.canEdit);
    newButton.classList.toggle('inline-flex', data.viewer.canEdit);
    var cards = data.achievements.map(achievementCard);
    list.replaceChildren.apply(list, cards.length ? cards : [empty(data.viewer.canEdit
      ? 'Nhóm chưa khai thành tích nào. Bấm "Thêm thành tích" để bắt đầu.' : 'Nhóm chưa khai thành tích nào.', 'md:col-span-3')]);
    var items = data.works.map(workCard);
    works.replaceChildren.apply(works, items.length ? items : [empty('Nhóm chưa có công trình nào được thẩm định và công khai.', 'md:col-span-2')]);
  }

  function load(id) {
    var mine = ++seq;
    return T.request('GET', '/' + id + '/portfolio').then(function (result) {
      if (mine !== seq || id !== teamId) return;
      data = result;
      render();
    }, function (err) {
      if (mine !== seq || err.offline) return;
      if (data) T.toast('Không tải lại được portfolio: ' + err.message);
    });
  }

  function input(id, value, max, placeholder, type) {
    var el = h('input', C.input);
    el.id = id;
    if (type) el.type = type;
    if (max) el.maxLength = max;
    el.value = value || '';
    el.placeholder = placeholder || '';
    return el;
  }

  function errorLine() {
    var el = h('p', 'hidden w-full sm:w-auto sm:mr-auto text-sm font-medium text-red-600');
    el.setAttribute('role', 'alert');
    return el;
  }

  function openForm(a, opener) {
    var editing = !!a;
    if (!editing && data.achievements.length >= data.maxAchievements) {
      T.toast('Mỗi nhóm khai tối đa ' + data.maxAchievements + ' thành tích.');
      return;
    }
    var modal = T.buildModal(editing ? 'Sửa thành tích nhóm' : 'Thêm thành tích nhóm', 'max-w-2xl');
    var kind = h('select', C.input);
    kind.id = 'ach-category';
    CATEGORIES.forEach(function (c) { var o = h('option', null, [c.label]); o.value = c.value; kind.appendChild(o); });
    kind.value = a ? a.category : 'Award';
    var title = input('ach-title', a && a.title, 255, 'Ví dụ: Giải Nhất NCKH Sinh viên cấp Trường 2024');
    var issuedBy = input('ach-issued-by', a && a.issuedBy, 150, 'Ví dụ: Trường ĐH Công nghệ Thông tin');
    var issuedDate = input('ach-date', a && a.issuedDate, null, '', 'date');
    issuedDate.max = todayVn();
    var code = input('ach-code', a && a.certificateCode, 50, 'Ví dụ: UIT-NCKH-01');
    var doi = input('ach-doi', a && a.doi, 100, '10.1109/...');
    var url = input('ach-url', a && a.externalUrl, 255, 'https://...', 'url');
    var detail = h('textarea', C.input + ' h-20 py-2 leading-relaxed');
    detail.id = 'ach-detail';
    detail.maxLength = 500;
    detail.value = a && a.detail ? a.detail : '';

    var form = h('form', 'flex flex-col gap-4', [
      h('p', 'p-3 rounded-lg bg-[#E6F0F7] text-xs text-[#1F4E78]', ['Thành tích nhóm là tự khai, không qua duyệt, và luôn gắn nhãn "Nhóm tự khai". Nên ghi mã chứng nhận, DOI hoặc liên kết để người xem kiểm tra.']),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [T.labelled('Loại thành tích', kind), T.labelled('Ngày đạt', issuedDate)]),
      T.labelled('Tên thành tích', title),
      T.labelled('Đơn vị trao / nơi công bố', issuedBy),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [T.labelled('Mã chứng nhận', code), T.labelled('DOI', doi, 'Dạng 10.xxxx/...')]),
      T.labelled('Liên kết minh chứng', url, 'Bắt đầu bằng https://'),
      T.labelled('Mô tả ngắn', detail, 'Tối đa 500 ký tự.')
    ]);
    form.id = 'ach-form';
    form.noValidate = true;
    modal.body.appendChild(form);
    var error = errorLine();
    var save = h('button', C.primary, [editing ? 'Lưu thay đổi' : 'Thêm thành tích']);
    save.type = 'submit';
    save.setAttribute('form', 'ach-form');
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {
        category: kind.value,
        title: T.tidy(title.value),
        issuedBy: T.tidy(issuedBy.value) || null,
        issuedDate: issuedDate.value || null,
        certificateCode: T.tidy(code.value) || null,
        doi: T.tidy(doi.value) || null,
        externalUrl: url.value.trim() || null,
        detail: detail.value.replace(/\r\n/g, '\n').trim() || null
      };
      var problem = v.title.length < 3 ? ['Tên thành tích cần từ 3 đến 255 ký tự.', title]
        : v.doi && !/^10\.\d{4,9}\/\S+$/.test(v.doi) ? ['DOI có dạng 10.xxxx/...', doi]
        : v.externalUrl && !/^https:\/\/\S+$/i.test(v.externalUrl) ? ['Liên kết phải bắt đầu bằng https://', url]
        : v.issuedDate && v.issuedDate > todayVn() ? ['Ngày đạt không được ở tương lai.', issuedDate] : null;
      if (problem) { error.textContent = problem[0]; error.classList.remove('hidden'); problem[1].focus(); return; }
      var payload = v;
      if (editing) {
        payload = {};
        Object.keys(v).forEach(function (k) { if (v[k] !== (a[k] === undefined ? null : a[k])) payload[k] = v[k]; });
        if (!Object.keys(payload).length) { T.closeModal(); T.toast('Không có thay đổi nào.'); return; }
      }
      error.classList.add('hidden');
      save.disabled = true;
      T.request(editing ? 'PATCH' : 'POST', '/' + teamId + '/achievements' + (editing ? '/' + a.achievementId : ''), payload).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        T.toast(editing ? 'Đã lưu thành tích.' : 'Đã thêm thành tích.');
        load(teamId);
        T.refresh();
      }, function (err) {
        save.disabled = false;
        error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message;
        error.classList.remove('hidden');
        if (err.code === 'NOT_TEAM_LEADER' || err.code === 'TEAM_INACTIVE' || err.code === 'ACHIEVEMENT_NOT_FOUND') load(teamId);
      });
    });
    T.showModal(modal, opener || newButton);
    title.focus();
  }

  function openDelete(a, opener) {
    var modal = T.buildModal('Xóa thành tích', 'max-w-md');
    modal.body.appendChild(h('p', 'text-sm text-slate-700', ['Xóa thành tích ', h('strong', null, ['"' + a.title + '"']), '? Không khôi phục lại được.']));
    var error = errorLine();
    var save = button('h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60', ['Xóa']);
    save.addEventListener('click', function () {
      save.disabled = true;
      error.classList.add('hidden');
      T.request('DELETE', '/' + teamId + '/achievements/' + a.achievementId).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        T.toast('Đã xóa thành tích.');
        load(teamId);
        T.refresh();
      }, function (err) {
        save.disabled = false;
        error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa xóa.' : err.message;
        error.classList.remove('hidden');
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);
    T.showModal(modal, opener);
  }

  newButton.addEventListener('click', function () {
    if (!data) { T.toast('Chưa kết nối máy chủ nên chưa thêm được thành tích.'); return; }
    openForm(null, newButton);
  });

  window.addEventListener('uit:team-profile', function (e) {
    var p = e.detail;
    var key = p.teamId + '|' + p.role + '|' + p.status;
    if (key === lastKey) return;
    lastKey = key;
    if (p.teamId !== teamId) data = null;
    teamId = p.teamId;
    load(teamId);
  });
  window.addEventListener('uit:team-data-changed', function () { if (teamId) load(teamId); });
})();
