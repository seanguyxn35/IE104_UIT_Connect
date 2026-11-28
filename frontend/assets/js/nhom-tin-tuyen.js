// SV-06 tab "Tin tuyển quân". Nạp sau nhom-thong-tin.js (dùng chung popup, request qua window.UitTeamPage).
// - GET /api/student-teams/:teamId/recruitments; mọi thành viên xem.
// - CHỈ Leader (máy chủ quyết định qua viewer.canManage, canEdit / canClose / canDelete của từng tin):
//   đăng tin mới, sửa, đóng, xóa tin chưa có đơn. "Mở lại đợt mới" = mở biểu mẫu tin mới chép nội dung tin cũ.
// - Không có máy chủ: giữ thẻ mẫu trong trang.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var T = window.UitTeamPage;
  if (!T) return;
  var h = T.h, icon = T.icon, toggle = T.toggle, C = T.classes, button = T.button;

  var MAX_SLOTS = 20, MAX_SKILLS = 10; // khớp máy chủ
  var STATE = {
    Open: { border: 'border-l-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    Filled: { border: 'border-l-sky-600', badge: 'bg-sky-50 text-sky-800 border-sky-200' },
    Expired: { border: 'border-l-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    Closed: { border: 'border-l-slate-300', badge: 'bg-slate-100 text-slate-600 border-slate-200' }
  };
  var SMALL_BTN = 'px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200';
  var SMALL_DANGER = 'px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors border border-red-200';

  var list = document.getElementById('recruit-list');
  var newButton = document.getElementById('recruit-new');
  var data = null;
  var teamId = null;
  var seq = 0;
  var lastKey = '';

  function todayVn() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); }

  function stateLabel(p) {
    if (p.state === 'Open') {
      var free = p.slots - p.applications.accepted;
      return 'Đang mở tuyển (' + free + '/' + p.slots + ' chỗ trống)';
    }
    return { Filled: 'Đủ chỉ tiêu', Expired: 'Hết hạn nộp', Closed: 'Đã đóng' }[p.state];
  }

  function card(p) {
    var s = STATE[p.state];
    var actions = h('div', 'flex flex-wrap items-center gap-2 ml-auto');
    if (p.canEdit) actions.appendChild(button(SMALL_BTN, ['Chỉnh sửa'], function (e) { openForm(p, false, e.currentTarget); }));
    if (p.canClose) actions.appendChild(button(SMALL_DANGER, ['Đóng tin tuyển'], function (e) { openConfirm(p, 'close', e.currentTarget); }));
    if ((p.state === 'Closed' || p.state === 'Expired') && data.viewer.canManage) {
      actions.appendChild(button(SMALL_BTN, ['Mở lại đợt mới'], function (e) { openForm(p, true, e.currentTarget); }));
    }
    if (p.canDelete) actions.appendChild(button(SMALL_DANGER, [icon('delete', 'text-[16px] align-middle'), ' Xóa'], function (e) { openConfirm(p, 'delete', e.currentTarget); }));

    var pending = p.applications.pending;
    return h('article', 'p-5 sm:p-6 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-4 border-l-4 ' + s.border + (p.state === 'Closed' ? ' opacity-80' : ''), [
      h('div', 'flex flex-col gap-1', [
        h('div', 'flex flex-wrap items-center justify-between gap-2', [
          h('span', 'px-2.5 py-0.5 rounded-xl text-xs font-semibold border flex items-center gap-1 ' + s.badge, [
            p.state === 'Open' && h('span', 'w-1.5 h-1.5 rounded-xl bg-emerald-600 animate-pulse'), stateLabel(p)
          ]),
          h('span', 'text-xs text-slate-500', ['Đăng ngày ' + T.viDate(p.createdAt) + (p.deadline ? ' · Hạn nộp ' + T.viDate(p.deadline) : '')])
        ]),
        h('h3', 'text-sm font-bold text-[#1A1A1A] mt-2 break-words', [p.title]),
        p.relatedResource && h('div', 'flex flex-wrap items-center gap-x-2 mt-1', [
          h('span', 'text-xs text-slate-500', ['Gắn với đề tài:']),
          h('span', 'text-xs font-bold text-[#1F4E78]', [p.relatedResource.title + (p.relatedResource.trlLevel ? ' (TRL ' + p.relatedResource.trlLevel + ')' : '')])
        ]),
        (p.field || p.isInterdisciplinary) && h('div', 'flex flex-wrap gap-1.5 mt-1', [
          p.field && h('span', 'px-2 py-0.5 rounded-xl text-[11px] font-semibold bg-[#E6F0F7] text-[#1F4E78]', [p.field.name]),
          p.isInterdisciplinary && h('span', 'px-2 py-0.5 rounded-xl text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200', ['Liên ngành'])
        ]),
        p.requirement
          ? h('p', 'text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line break-words', [p.requirement])
          : h('p', 'text-xs text-slate-400 italic mt-2', ['Chưa ghi yêu cầu.']),
        p.skills.length > 0 && h('div', 'flex flex-wrap gap-1.5 mt-2', p.skills.map(function (name) {
          return h('span', 'px-2 py-0.5 rounded-sm text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200', [name]);
        }))
      ]),
      h('div', 'pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3', [
        h('div', 'flex flex-col gap-0.5 text-xs', [
          h('span', 'flex items-center gap-1 font-bold ' + (pending ? 'text-[#DC2626]' : 'text-slate-500'), [icon('group'), pending ? pending + ' hồ sơ chờ duyệt' : 'Không có hồ sơ chờ duyệt']),
          h('span', 'text-slate-500', ['Đã nhận ' + p.applications.accepted + '/' + p.slots])
        ]),
        actions
      ])
    ]);
  }

  function render() {
    toggle(newButton, data.viewer.canManage);
    newButton.classList.toggle('inline-flex', data.viewer.canManage);
    var cards = data.posts.map(card);
    list.replaceChildren.apply(list, cards.length ? cards : [h('p', 'md:col-span-2 p-8 rounded-lg bg-white border border-dashed border-slate-300 text-center text-sm text-slate-500', [
      data.viewer.canManage ? 'Nhóm chưa có tin tuyển nào. Bấm "Đăng tin tuyển mới" để bắt đầu.' : 'Nhóm chưa có tin tuyển nào.'
    ])]);
  }

  function load(id) {
    var mine = ++seq;
    return T.request('GET', '/' + id + '/recruitments').then(function (result) {
      if (mine !== seq || id !== teamId) return;
      data = result;
      render();
    }, function (err) {
      if (mine !== seq || err.offline) return;
      if (data) T.toast('Không tải lại được tin tuyển: ' + err.message);
    });
  }

  function errorLine() {
    var el = h('p', 'hidden w-full sm:w-auto sm:mr-auto text-sm font-medium text-red-600');
    el.setAttribute('role', 'alert');
    return el;
  }

  function fail(error, err) {
    error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message;
    error.classList.remove('hidden');
  }

  function select(id, items, value, emptyLabel) {
    var el = h('select', C.input);
    el.id = id;
    [{ value: '', label: emptyLabel }].concat(items).forEach(function (item) {
      var o = h('option', null, [item.label]);
      o.value = String(item.value);
      el.appendChild(o);
    });
    el.value = value === null || value === undefined ? '' : String(value);
    return el;
  }

  // copy = true: "Mở lại đợt mới" (tin mới, chép nội dung tin cũ, bỏ hạn nộp cũ)
  function openForm(post, copy, opener) {
    var editing = post && !copy;
    var opts = data.options || { fields: [], resources: [] };
    var modal = T.buildModal(editing ? 'Chỉnh sửa tin tuyển' : copy ? 'Mở lại đợt tuyển mới' : 'Đăng tin tuyển mới', 'max-w-2xl');

    var title = h('input', C.input);
    title.id = 'recruit-title';
    title.maxLength = 255;
    title.value = post ? post.title : '';
    title.placeholder = 'Ví dụ: Cần 1 bạn mảng AI & Edge Computing';
    var requirement = h('textarea', C.input + ' h-28 py-2 leading-relaxed');
    requirement.id = 'recruit-requirement';
    requirement.maxLength = 4000;
    requirement.value = post && post.requirement ? post.requirement : '';
    var slots = h('input', C.input);
    slots.id = 'recruit-slots';
    slots.type = 'number';
    slots.min = editing ? String(Math.max(1, post.applications.accepted)) : '1';
    slots.max = String(MAX_SLOTS);
    slots.value = String(post ? (copy ? Math.max(1, post.slots - post.applications.accepted) : post.slots) : 1);
    var deadline = h('input', C.input);
    deadline.id = 'recruit-deadline';
    deadline.type = 'date';
    deadline.min = todayVn();
    deadline.value = editing && post.deadline ? post.deadline : '';
    var field = select('recruit-field', opts.fields.map(function (f) { return { value: f.fieldId, label: f.name }; }), post && post.field ? post.field.fieldId : null, 'Không chọn');
    var resource = select('recruit-resource', opts.resources.map(function (r) {
      return { value: r.resourceId, label: r.title + (r.trlLevel ? ' (TRL ' + r.trlLevel + ')' : '') };
    }), post && post.relatedResource ? post.relatedResource.resourceId : null, 'Không gắn đề tài');
    var inter = h('input', 'rounded border-slate-300 text-[#1F4E78] focus:ring-[#1F4E78]/30');
    inter.type = 'checkbox';
    inter.id = 'recruit-inter';
    inter.checked = !!(post && post.isInterdisciplinary);
    var interLabel = h('label', 'flex items-center gap-2 text-sm text-slate-700 cursor-pointer', [inter, 'Tuyển liên ngành (nhận sinh viên ngoài lĩnh vực chính)']);
    var skills = h('input', C.input);
    skills.id = 'recruit-skills';
    skills.value = post ? post.skills.join(', ') : '';
    skills.placeholder = 'Ví dụ: PyTorch, C++, TensorRT';

    var form = h('form', 'flex flex-col gap-4', [
      copy && h('p', 'p-3 rounded-lg bg-[#E6F0F7] text-xs text-[#1F4E78]', ['Tin mới được tạo với nội dung chép từ tin cũ. Đơn của tin cũ giữ nguyên.']),
      T.labelled('Tiêu đề', title),
      T.labelled('Yêu cầu & mô tả công việc', requirement, 'Tối đa 4000 ký tự.'),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [
        T.labelled('Chỉ tiêu (người)', slots, editing && post.applications.accepted ? 'Đã nhận ' + post.applications.accepted + ' người: không đặt thấp hơn.' : 'Từ 1 đến ' + MAX_SLOTS + '.'),
        T.labelled('Hạn nộp (không bắt buộc)', deadline, editing && post.deadline && post.deadline < todayVn() ? 'Hạn cũ đã qua: chọn hạn mới hoặc xóa trống.' : '')
      ]),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [T.labelled('Lĩnh vực', field), T.labelled('Gắn với đề tài của nhóm', resource)]),
      interLabel,
      T.labelled('Kỹ năng yêu cầu', skills, 'Ngăn cách bằng dấu phẩy, tối đa ' + MAX_SKILLS + ' kỹ năng.')
    ]);
    form.id = 'recruit-form';
    form.noValidate = true;
    modal.body.appendChild(form);
    var error = errorLine();
    var save = h('button', C.primary, [editing ? 'Lưu thay đổi' : 'Đăng tin']);
    save.type = 'submit';
    save.setAttribute('form', 'recruit-form');
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);

    function values() {
      var names = skills.value.split(',').map(T.tidy).filter(Boolean);
      var seen = {};
      names = names.filter(function (n) { var k = n.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; });
      return {
        title: T.tidy(title.value),
        requirement: requirement.value.replace(/\r\n/g, '\n').trim() || null,
        slots: Number(slots.value),
        deadline: deadline.value || null,
        fieldId: field.value ? Number(field.value) : null,
        isInterdisciplinary: inter.checked,
        relatedResourceId: resource.value ? Number(resource.value) : null,
        skills: names
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = values();
      var problem = v.title.length < 5 ? ['Tiêu đề cần từ 5 đến 255 ký tự.', title]
        : !Number.isInteger(v.slots) || v.slots < 1 || v.slots > MAX_SLOTS ? ['Chỉ tiêu là số nguyên từ 1 đến ' + MAX_SLOTS + '.', slots]
        : v.skills.length > MAX_SKILLS ? ['Tối đa ' + MAX_SKILLS + ' kỹ năng yêu cầu.', skills]
        : v.skills.some(function (n) { return n.length > 100; }) ? ['Mỗi kỹ năng tối đa 100 ký tự.', skills] : null;
      if (problem) { fail(error, { message: problem[0] }); problem[1].focus(); return; }

      var payload = v;
      if (editing) {
        // Chỉ gửi phần đã đổi; hạn nộp cũ đã qua mà không đổi thì không gửi lại
        var before = {
          title: post.title, requirement: post.requirement, slots: post.slots, deadline: post.deadline,
          fieldId: post.field ? post.field.fieldId : null, isInterdisciplinary: post.isInterdisciplinary,
          relatedResourceId: post.relatedResource ? post.relatedResource.resourceId : null
        };
        payload = {};
        Object.keys(before).forEach(function (k) { if (v[k] !== before[k]) payload[k] = v[k]; });
        var lower = function (a) { return a.map(function (n) { return n.toLowerCase(); }).sort().join('|'); };
        if (lower(v.skills) !== lower(post.skills)) payload.skills = v.skills;
        if (!Object.keys(payload).length) { T.closeModal(); T.toast('Không có thay đổi nào.'); return; }
      }
      error.classList.add('hidden');
      save.disabled = true;
      T.request(editing ? 'PATCH' : 'POST', '/' + teamId + '/recruitments' + (editing ? '/' + post.recruitId : ''), payload).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        T.toast(editing ? 'Đã lưu tin tuyển.' : 'Đã đăng tin tuyển.');
        load(teamId);
        T.refresh();
      }, function (err) {
        save.disabled = false;
        fail(error, err);
        if (err.code === 'NOT_TEAM_LEADER' || err.code === 'TEAM_INACTIVE' || err.code === 'POST_CLOSED' || err.code === 'POST_NOT_FOUND') load(teamId);
      });
    });
    T.showModal(modal, opener || newButton);
    title.focus();
  }

  function openConfirm(post, action, opener) {
    var closing = action === 'close';
    var modal = T.buildModal(closing ? 'Đóng tin tuyển' : 'Xóa tin tuyển', 'max-w-md');
    modal.body.append(
      h('p', 'text-sm text-slate-700 leading-relaxed', [closing ? 'Đóng tin ' : 'Xóa hẳn tin ', h('strong', null, ['"' + post.title + '"']), '?']),
      h('p', 'text-xs text-slate-500 leading-relaxed', [closing
        ? 'Tin đã đóng không nhận đơn mới và không sửa được. ' + (post.applications.pending ? 'Bạn vẫn xử lý nốt ' + post.applications.pending + ' đơn đang chờ.' : '')
        : 'Tin chưa có đơn nào nên có thể xóa. Không khôi phục lại được.']));
    var error = errorLine();
    var save = button('h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60', [closing ? 'Đóng tin' : 'Xóa tin']);
    save.addEventListener('click', function () {
      error.classList.add('hidden');
      save.disabled = true;
      var path = '/' + teamId + '/recruitments/' + post.recruitId + (closing ? '/close' : '');
      T.request(closing ? 'POST' : 'DELETE', path).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        T.toast(closing ? 'Đã đóng tin tuyển.' : 'Đã xóa tin tuyển.');
        load(teamId);
        T.refresh();
      }, function (err) {
        save.disabled = false;
        fail(error, err);
        load(teamId);
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);
    T.showModal(modal, opener);
  }

  newButton.addEventListener('click', function () {
    if (!data) { T.toast('Chưa kết nối máy chủ nên chưa đăng tin được.'); return; }
    openForm(null, false, newButton);
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
