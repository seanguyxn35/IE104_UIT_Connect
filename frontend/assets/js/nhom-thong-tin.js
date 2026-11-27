// SV-06 Quản trị nhóm: đầu trang, thẻ thống kê và tab "Thông tin nhóm".
// - Dữ liệu: GET /api/student-teams, GET .../:teamId (thống kê), GET .../:teamId/profile (hồ sơ + cố vấn).
// - Thẻ thống kê và số trên thanh tab tự cập nhật bằng UitLive (dem-don-nhom.js, hỏi lại ~10 giây một lần).
// - Ảnh nhóm (chỉ Leader): PUT | DELETE .../:teamId/avatar.
// - "Cập nhật hồ sơ" (chỉ Leader, máy chủ quyết định qua canEdit): PATCH .../:teamId/profile, chỉ gửi phần đã đổi.
// - "Gửi báo cáo tiến độ tuần": soạn email cho cố vấn, hệ thống KHÔNG lưu báo cáo.
// - Không có máy chủ (file://, GitHub Pages): giữ nội dung mẫu có sẵn trong trang và báo "chưa lưu".
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var API_URL = '/api/student-teams';
  var MAX_FIELDS = 3; // khớp giới hạn của máy chủ
  var MAX_SKILLS = 15;
  var MAX_REPORT = 1500; // thư mở bằng liên kết mailto không nên quá dài
  var MAX_AVATAR_BYTES = 2 * 1024 * 1024; // khớp giới hạn của máy chủ
  var AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var STATUS_LABELS = { Active: 'Đang hoạt động', Inactive: 'Tạm ngừng hoạt động', Disbanded: 'Đã giải tán' };
  var FIELD_CHIP = 'px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#E6F0F7] text-[#1F4E78] border border-[#1F4E78]/20';
  var SKILL_CHIP = 'px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200';
  var INPUT = 'w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1F4E78]/30 focus:border-[#1F4E78]';
  var BTN_PRIMARY = 'h-10 px-4 rounded-lg bg-[#1F4E78] text-white text-sm font-semibold hover:bg-[#163A59] disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-1.5';
  var BTN_PLAIN = 'h-10 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center justify-center gap-1.5';

  var page = document.getElementById('team-page');
  var picker = document.getElementById('team-picker');
  var editButton = document.getElementById('profile-edit');
  var reportButton = document.getElementById('report-btn');
  var avatarButton = document.getElementById('team-avatar-btn');
  var online = false;
  var teams = [];
  var profile = null;
  var options = null;
  var loadSeq = 0; // bỏ qua kết quả của lần tải cũ khi đổi nhóm liên tục
  var statsKey = ''; // số liệu đang hiển thị, để biết khi nào có thay đổi
  var live = null;

  // ---------- Tiện ích ----------
  function $(id) { return document.getElementById(id); }
  // h('div', 'cls', [con...]) – con là chuỗi (gán làm chữ) hoặc phần tử
  function h(tag, className, children) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false || c === '') return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function icon(name, className) { return h('span', 'material-symbols-outlined ' + (className || 'text-[18px]'), [name]); }
  function text(id, value) { $(id).textContent = String(value); }
  function toggle(el, show) { el.classList.toggle('hidden', !show); }
  function bar(id, ratio) { $(id).style.width = Math.max(0, Math.min(1, ratio || 0)) * 100 + '%'; }
  function tidy(value) { return value.replace(/\s+/g, ' ').trim(); }

  var toastEl = null, toastTimer = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = h('div', 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm shadow-lg hidden');
      toastEl.id = 'team-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add('hidden'); }, 4000);
  }

  function request(method, path, body) {
    if (location.protocol === 'file:') return Promise.reject(Object.assign(new Error('file'), { offline: true }));
    return fetch(API_URL + (path || ''), {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        // Máy chủ tĩnh hoặc bản máy chủ cũ không có API này: coi như chưa kết nối
        if (!res.ok) throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), { code: data.code, offline: res.status === 404 && (!data.code || data.code === 'NOT_FOUND') });
        return data;
      });
    }, function () {
      throw Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
    });
  }

  function note(message) {
    var el = $('team-note');
    el.textContent = message || '';
    toggle(el, !!message);
  }
  function doneLoading() { page.removeAttribute('data-loading'); }

  // ---------- Đầu trang và thẻ thống kê ----------
  function teamInitials(p) {
    return (p.shortName || p.name.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).map(function (w) { return w[0]; }).join('')).slice(0, 4).toUpperCase();
  }

  // Ảnh nhóm; chưa có hoặc tải lỗi thì hiện chữ viết tắt
  function logoContent(box, p, url) {
    if (!url) { box.replaceChildren(teamInitials(p)); return; }
    var img = h('img', 'w-full h-full object-cover');
    img.alt = 'Ảnh nhóm ' + p.name;
    img.addEventListener('error', function () { box.replaceChildren(teamInitials(p)); });
    img.src = url;
    box.replaceChildren(img);
  }

  function renderHeader(p) {
    logoContent($('team-logo'), p, p.avatarUrl);
    toggle(avatarButton, p.canEdit);
    text('team-title', p.name);
    var active = p.status === 'Active';
    $('team-status').className = 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold border ' +
      (active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300');
    $('team-status-dot').className = 'w-2.5 h-2.5 shrink-0 rounded-xl ' + (active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400');
    text('team-status-text', (STATUS_LABELS[p.status] || p.status) + (p.semester ? ' (' + p.semester + ')' : ''));
  }

  function renderStats(o) {
    var free = o.maxMembers - o.memberCount;
    text('kpi-members', o.memberCount);
    text('kpi-members-max', '/ ' + o.maxMembers + ' SV');
    text('kpi-members-hint', free > 0 ? 'Còn ' + free + ' chỗ trống' : 'Nhóm đã đủ thành viên');
    bar('kpi-members-bar', o.memberCount / o.maxMembers);

    text('kpi-pending', o.applications.pending);
    text('kpi-pending-hint', o.applications.newLast24h + ' đơn nộp trong 24 giờ qua');
    bar('kpi-pending-bar', o.applications.pending ? o.applications.newLast24h / o.applications.pending : 0);

    var r = o.recruitments;
    text('kpi-posts', r.total);
    text('kpi-posts-hint', [r.open && r.open + ' đang mở', r.filled && r.filled + ' đủ chỉ tiêu', r.closed && r.closed + ' đã đóng', r.expired && r.expired + ' hết hạn']
      .filter(Boolean).join(' • ') || 'Chưa có tin tuyển');
    bar('kpi-posts-bar', r.total ? r.open / r.total : 0);

    var trl = o.highestTrl;
    text('kpi-trl', trl ? 'TRL ' + trl.level : '—');
    text('kpi-trl-hint', trl ? trl.title : 'Chưa có đề tài ghi mức TRL');
    $('kpi-trl-hint').title = trl ? trl.title : '';
    bar('kpi-trl-bar', trl ? trl.level / 9 : 0);

    text('count-members', o.memberCount);
    text('count-applicants', o.applications.pending);
    text('count-recruitment', r.total);
    toggle($('count-portfolio'), false); // tab Portfolio chưa có dữ liệu thật
  }

  // ---------- Tab Thông tin nhóm ----------
  function chips(container, items, tag, className, emptyText) {
    container.replaceChildren.apply(container, items.length
      ? items.map(function (item) { return h(tag, className, [item]); })
      : [h(tag, 'text-sm text-slate-500 italic', [emptyText])]);
  }

  function renderProfile(p) {
    text('profile-name', p.name);
    text('profile-code', p.code || 'Chưa cấp mã');
    var description = $('profile-description');
    description.textContent = p.description || 'Chưa có tôn chỉ & hướng nghiên cứu.';
    description.classList.toggle('italic', !p.description);
    description.classList.toggle('text-slate-500', !p.description);
    text('profile-faculty', p.faculty ? p.faculty.name : 'Chưa chọn khoa');
    var majors = $('profile-majors');
    majors.textContent = p.memberMajors.length ? 'Ngành của thành viên: ' + p.memberMajors.join(', ') : '';
    toggle(majors, p.memberMajors.length > 0);
    chips($('profile-fields'), p.fields.map(function (f) { return f.name; }), 'li', FIELD_CHIP, 'Chưa chọn lĩnh vực');
    chips($('profile-skills'), p.skills.map(function (s) { return s.name; }), 'span', SKILL_CHIP, 'Chưa có kỹ năng chủ lực');
    toggle(editButton, p.canEdit);
  }

  // ---------- Cố vấn ----------
  function advisorName(a) { return [a.academicTitle, a.fullName].filter(Boolean).join('. '); }
  function dayName(day) { return day === 8 ? 'Chủ nhật' : 'Thứ ' + day; }

  function renderAdvisor(a) {
    var empty = $('advisor-empty');
    toggle(empty, !a);
    empty.classList.toggle('flex', !a);
    toggle($('advisor-body'), !!a);
    toggle($('advisor-badge'), !!a);
    toggle(reportButton, !!a);
    if (!a) return;
    var words = a.fullName.trim().split(/\s+/);
    text('advisor-initials', words.slice(-3).map(function (w) { return w[0]; }).join('').toUpperCase());
    text('advisor-name', advisorName(a));
    text('advisor-position', a.positionTitle || (a.lab ? 'Giảng viên · ' + a.lab.name : 'Giảng viên'));
    var email = $('advisor-email');
    email.textContent = a.email || 'Chưa cập nhật';
    if (a.email) email.href = 'mailto:' + a.email;
    else email.removeAttribute('href');
    text('advisor-office', a.lab ? [a.lab.room && 'Phòng ' + a.lab.room, a.lab.name].filter(Boolean).join(' · ') : 'Chưa cập nhật');
    text('advisor-schedule', a.officeHours.map(function (o) {
      return dayName(o.dayOfWeek) + ' (' + o.start + ' - ' + o.end + ')' + (o.location ? ' · ' + o.location : '');
    }).join('\n') || 'Chưa cập nhật');
    reportButton.disabled = !a.email;
    reportButton.title = a.email ? '' : 'Cố vấn chưa có email';
  }

  // ---------- Khung popup ----------
  var openModalEl = null, lastFocus = null;

  function buildModal(titleText, panelClass) {
    var id = 'team-modal-title-' + Date.now();
    var close = h('button', 'w-9 h-9 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center', [icon('close', 'text-[20px]')]);
    close.type = 'button';
    close.setAttribute('aria-label', 'Đóng');
    close.addEventListener('click', closeModal);
    var title = h('h2', 'text-base font-bold text-[#1A1A1A]', [titleText]);
    title.id = id;
    var body = h('div', 'p-5 overflow-y-auto flex flex-col gap-4');
    var footer = h('div', 'flex flex-wrap items-center justify-end gap-2 p-4 border-t border-slate-200');
    var panel = h('div', 'relative w-full bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col max-h-[calc(100dvh-2rem)] ' + panelClass, [
      h('div', 'flex items-center justify-between gap-3 p-4 border-b border-slate-200', [title, close]), body, footer
    ]);
    var overlay = h('div', 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs', [panel]);
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', id);
    overlay.setAttribute('data-no-ripple', '');
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
      if (e.key === 'Tab') {
        var items = Array.prototype.filter.call(panel.querySelectorAll('button, a[href], input, select, textarea'), function (el) {
          return !el.disabled && el.offsetParent !== null;
        });
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { overlay: overlay, body: body, footer: footer, close: close };
  }

  function showModal(modal, opener) {
    closeModal();
    lastFocus = opener || document.activeElement;
    openModalEl = modal.overlay;
    document.body.appendChild(openModalEl);
    document.body.style.overflow = 'hidden';
    modal.close.focus();
  }

  function closeModal() {
    if (!openModalEl) return;
    openModalEl.remove();
    openModalEl = null;
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function labelled(labelText, control, hint) {
    var id = control.id;
    var label = h('label', 'text-xs font-semibold text-slate-600', [labelText]);
    label.htmlFor = id;
    return h('div', 'flex flex-col gap-1.5', [label, control, hint && h('span', 'text-xs text-slate-500', [hint])]);
  }

  // ---------- Biểu mẫu cập nhật hồ sơ ----------
  function fieldKey(ids) { return ids.length ? ids[0] + '|' + ids.slice(1).sort().join(',') : ''; } // lĩnh vực đầu là chính
  function skillKey(names) { return names.map(function (n) { return n.toLowerCase(); }).sort().join('|'); }

  function openEdit() {
    var modal = buildModal('Cập nhật hồ sơ nhóm', 'max-w-2xl');
    modal.body.appendChild(h('p', 'text-sm text-slate-500', ['Đang tải biểu mẫu…']));
    showModal(modal, editButton);
    var teamId = profile.teamId;
    (options ? Promise.resolve(options) : request('GET', '/profile-options')).then(function (data) {
      options = data;
      if (openModalEl === modal.overlay && profile.teamId === teamId) fillEdit(modal, data);
    }, function (err) {
      if (openModalEl !== modal.overlay) return;
      modal.body.replaceChildren(h('p', 'text-sm text-red-600', ['Không tải được biểu mẫu: ' + err.message]));
    });
  }

  function fillEdit(modal, data) {
    var p = profile;
    var name = h('input', INPUT);
    name.id = 'edit-name';
    name.maxLength = 150;
    name.value = p.name;
    var description = h('textarea', INPUT + ' h-28 py-2 leading-relaxed');
    description.id = 'edit-description';
    description.maxLength = 2000;
    description.value = p.description || '';
    var faculty = h('select', INPUT);
    faculty.id = 'edit-faculty';
    [{ facultyId: '', name: 'Chưa chọn' }].concat(data.faculties).forEach(function (f) {
      var o = h('option', null, [f.name]);
      o.value = String(f.facultyId);
      faculty.appendChild(o);
    });
    faculty.value = p.faculty ? String(p.faculty.facultyId) : '';

    // Lĩnh vực: giữ thứ tự chọn, mục đầu tiên là lĩnh vực chính
    var chosen = p.fields.map(function (f) { return f.fieldId; });
    var boxes = data.fields.map(function (f) {
      var box = h('input', 'rounded border-slate-300 text-[#1F4E78] focus:ring-[#1F4E78]/30');
      box.type = 'checkbox';
      box.value = String(f.fieldId);
      box.checked = chosen.indexOf(f.fieldId) !== -1;
      var main = h('span', 'hidden ml-auto px-1.5 rounded text-[10px] font-bold bg-[#1F4E78] text-white', ['Chính']);
      box.addEventListener('change', function () {
        if (box.checked) chosen.push(f.fieldId);
        else chosen.splice(chosen.indexOf(f.fieldId), 1);
        syncFields();
      });
      return { box: box, main: main, row: h('label', 'flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-50', [box, h('span', null, [f.name]), main]) };
    });
    function syncFields() {
      boxes.forEach(function (b) {
        var id = Number(b.box.value);
        b.box.disabled = !b.box.checked && chosen.length >= MAX_FIELDS;
        b.row.classList.toggle('opacity-50', b.box.disabled);
        toggle(b.main, chosen[0] === id);
      });
    }
    syncFields();
    var fieldSet = h('fieldset', 'flex flex-col gap-1.5', [
      h('legend', 'text-xs font-semibold text-slate-600 mb-1.5', ['Lĩnh vực trọng tâm (tối đa ' + MAX_FIELDS + ')']),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-2', boxes.map(function (b) { return b.row; })),
      h('span', 'text-xs text-slate-500', ['Mục chọn đầu tiên là lĩnh vực chính của nhóm.'])
    ]);

    // Kỹ năng: gõ rồi Enter; gõ trùng gợi ý thì dùng đúng cách viết của gợi ý
    var skills = p.skills.map(function (s) { return s.name; });
    var skillList = h('div', 'flex flex-wrap gap-2');
    skillList.id = 'edit-skill-list';
    var skillInput = h('input', INPUT);
    skillInput.id = 'edit-skill';
    skillInput.maxLength = 100;
    skillInput.setAttribute('list', 'team-skill-options');
    skillInput.placeholder = 'Nhập kỹ năng rồi nhấn Enter';
    var datalist = h('datalist', null, data.skills.map(function (n) { var o = h('option'); o.value = n; return o; }));
    datalist.id = 'team-skill-options';

    var error = h('p', 'hidden text-sm font-medium text-red-600 mr-auto');
    error.id = 'edit-error';
    error.setAttribute('role', 'alert');
    function fail(message) { error.textContent = message; toggle(error, !!message); }

    function renderSkills() {
      skillList.replaceChildren.apply(skillList, skills.length ? skills.map(function (s, i) {
        var remove = h('button', 'text-slate-400 hover:text-red-600 flex items-center', [icon('close', 'text-[14px]')]);
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Bỏ kỹ năng ' + s);
        remove.addEventListener('click', function () { skills.splice(i, 1); renderSkills(); skillInput.focus(); });
        return h('span', SKILL_CHIP + ' inline-flex items-center gap-1', [s, remove]);
      }) : [h('span', 'text-xs text-slate-500 italic', ['Chưa có kỹ năng nào'])]);
    }
    function addSkill() {
      var value = tidy(skillInput.value);
      if (!value) return true;
      var lower = value.toLowerCase();
      if (skills.some(function (s) { return s.toLowerCase() === lower; })) { skillInput.value = ''; return true; }
      if (skills.length >= MAX_SKILLS) { fail('Tối đa ' + MAX_SKILLS + ' kỹ năng chủ lực.'); return false; }
      skills.push(data.skills.filter(function (s) { return s.toLowerCase() === lower; })[0] || value);
      skillInput.value = '';
      fail('');
      renderSkills();
      return true;
    }
    skillInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
    });
    var addButton = h('button', BTN_PLAIN + ' shrink-0', ['Thêm']);
    addButton.type = 'button';
    addButton.addEventListener('click', function () { addSkill(); skillInput.focus(); });
    renderSkills();
    var skillLabel = h('label', 'text-xs font-semibold text-slate-600', ['Bộ công nghệ & kỹ năng chủ lực (tối đa ' + MAX_SKILLS + ')']);
    skillLabel.htmlFor = 'edit-skill';

    var form = h('form', 'flex flex-col gap-4', [
      labelled('Tên chính thức', name),
      labelled('Tôn chỉ & hướng nghiên cứu cốt lõi', description),
      labelled('Khoa trực thuộc', faculty, 'Ngành được lấy từ hồ sơ của các thành viên.'),
      fieldSet,
      h('div', 'flex flex-col gap-1.5', [skillLabel, skillList, h('div', 'flex gap-2', [skillInput, addButton]), datalist])
    ]);
    form.id = 'profile-form';
    form.noValidate = true;
    modal.body.replaceChildren(form);

    var cancel = h('button', BTN_PLAIN, ['Hủy']);
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    var save = h('button', BTN_PRIMARY, ['Lưu hồ sơ']);
    save.type = 'submit';
    save.setAttribute('form', 'profile-form');
    modal.footer.replaceChildren(error, cancel, save);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!addSkill()) return; // kỹ năng đang gõ dở cũng được tính
      var newName = tidy(name.value);
      if (newName.length < 3) { fail('Tên nhóm cần từ 3 đến 150 ký tự.'); name.focus(); return; }
      // Chỉ gửi phần đã đổi, để không ghi đè phần người khác vừa sửa
      var changes = {};
      if (newName !== p.name) changes.name = newName;
      var newDescription = description.value.replace(/\r\n/g, '\n').trim() || null;
      if (newDescription !== p.description) changes.description = newDescription;
      var newFaculty = faculty.value ? Number(faculty.value) : null;
      if (newFaculty !== (p.faculty ? p.faculty.facultyId : null)) changes.facultyId = newFaculty;
      if (fieldKey(chosen) !== fieldKey(p.fields.map(function (f) { return f.fieldId; }))) changes.fieldIds = chosen;
      if (skillKey(skills) !== skillKey(p.skills.map(function (s) { return s.name; }))) changes.skills = skills;
      if (!Object.keys(changes).length) { closeModal(); toast('Không có thay đổi nào.'); return; }

      fail('');
      save.disabled = true;
      request('PATCH', '/' + p.teamId + '/profile', changes).then(function (updated) {
        options = null; // có thể vừa thêm kỹ năng mới vào danh mục
        if (profile.teamId === updated.teamId) {
          profile = updated;
          renderHeader(updated);
          renderProfile(updated);
          renderAdvisor(updated.advisor);
          teams.forEach(function (t) { if (t.teamId === updated.teamId) t.name = updated.name; });
          renderPicker(updated.teamId);
        }
        if (openModalEl === modal.overlay) closeModal();
        toast('Đã lưu hồ sơ nhóm.');
      }, function (err) {
        save.disabled = false;
        fail(err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message);
        // Vai trò hoặc trạng thái nhóm vừa đổi: tải lại để ẩn nút không còn quyền
        if (err.code === 'NOT_TEAM_LEADER' || err.code === 'TEAM_INACTIVE' || err.code === 'TEAM_NOT_FOUND') loadTeam(p.teamId);
      });
    });
    name.focus();
  }

  // ---------- Soạn email báo cáo tiến độ tuần ----------
  function shortDate(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }

  function openReport() {
    var a = profile.advisor;
    var monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    var week = shortDate(monday) + ' – ' + shortDate(sunday) + '/' + sunday.getFullYear();

    var subject = h('input', INPUT);
    subject.id = 'report-subject';
    subject.value = '[UIT Connect] Báo cáo tiến độ tuần ' + week + ' – ' + profile.name;
    var body = h('textarea', INPUT + ' h-64 py-2 leading-relaxed');
    body.id = 'report-body';
    body.maxLength = MAX_REPORT;
    var sender = window.UIT_USER && window.UIT_USER.fullName ? window.UIT_USER.fullName : '';
    body.value = 'Kính gửi ' + advisorName(a) + ',\n\nNhóm ' + profile.name + ' gửi báo cáo tiến độ tuần ' + week + ':\n\n' +
      '1. Công việc đã hoàn thành:\n- \n\n2. Công việc đang thực hiện:\n- \n\n3. Khó khăn cần hỗ trợ:\n- \n\n4. Kế hoạch tuần tới:\n- \n\n' +
      'Trân trọng,\n' + sender;

    var modal = buildModal('Báo cáo tiến độ tuần cho cố vấn', 'max-w-2xl');
    var to = h('p', 'text-sm text-slate-700 break-all', [h('span', 'text-slate-500', ['Gửi tới: ']), h('strong', null, [a.email])]);
    modal.body.append(
      h('p', 'p-3 rounded-lg bg-[#E6F0F7] text-xs text-[#1F4E78]', ['Email được gửi bằng ứng dụng email trên máy bạn. UIT Connect không gửi và không lưu báo cáo này.']),
      to, labelled('Tiêu đề', subject), labelled('Nội dung', body));

    var copy = h('button', BTN_PLAIN, [icon('content_copy'), 'Sao chép']);
    copy.type = 'button';
    copy.addEventListener('click', function () {
      var all = 'Gửi tới: ' + a.email + '\nTiêu đề: ' + subject.value + '\n\n' + body.value;
      var done = function () { toast('Đã sao chép nội dung báo cáo.'); };
      var manual = function () { body.focus(); body.select(); toast('Không sao chép tự động được: hãy nhấn Ctrl+C.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(all).then(done, manual);
      else manual();
    });
    var send = h('a', BTN_PRIMARY, [icon('mail'), 'Mở ứng dụng email']);
    send.id = 'report-send';
    function syncLink() {
      send.href = 'mailto:' + encodeURIComponent(a.email).replace('%40', '@') +
        '?subject=' + encodeURIComponent(subject.value) + '&body=' + encodeURIComponent(body.value.replace(/\n/g, '\r\n'));
    }
    subject.addEventListener('input', syncLink);
    body.addEventListener('input', syncLink);
    syncLink();
    modal.footer.append(copy, send);
    showModal(modal, reportButton);
  }

  // ---------- Ảnh nhóm ----------
  function sendAvatar(method, teamId, file) {
    return fetch(API_URL + '/' + teamId + '/avatar', {
      method: method,
      headers: file ? { 'Content-Type': file.type } : undefined,
      body: file || undefined,
      signal: AbortSignal.timeout(180000) // tải ảnh lên có thể chậm
    }).then(function (res) {
      if (res.status === 204) return { avatarUrl: null };
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), { code: data.code });
        return data;
      });
    }, function () { throw new Error('Không kết nối được máy chủ nên chưa lưu ảnh.'); });
  }

  function openAvatar() {
    var p = profile;
    var picked = null, previewUrl = null, busy = false;
    var modal = buildModal('Đổi ảnh nhóm', 'max-w-md');
    var preview = h('div', 'w-32 h-32 mx-auto rounded-lg overflow-hidden bg-[#1F4E78] text-white flex items-center justify-center text-2xl font-bold tracking-wider shadow-sm');
    preview.id = 'avatar-preview';
    logoContent(preview, p, p.avatarUrl);

    var input = h('input', 'block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-[#E6F0F7] file:text-[#1F4E78] file:text-sm file:font-semibold file:cursor-pointer');
    input.type = 'file';
    input.id = 'avatar-file';
    input.accept = AVATAR_TYPES.join(',');

    var error = h('p', 'hidden w-full text-sm font-medium text-red-600');
    error.id = 'avatar-error';
    error.setAttribute('role', 'alert');
    function fail(message) { error.textContent = message; toggle(error, !!message); }

    modal.body.append(preview, labelled('Chọn ảnh', input, 'JPG, PNG hoặc WebP, tối đa 2 MB. Nên dùng ảnh vuông. Ảnh nhóm là ảnh công khai.'));

    var save = h('button', BTN_PRIMARY, ['Lưu ảnh']);
    save.type = 'button';
    save.disabled = true;
    save.classList.replace('disabled:cursor-wait', 'disabled:cursor-not-allowed');
    var cancel = h('button', BTN_PLAIN, ['Hủy']);
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    var remove = h('button', BTN_PLAIN + ' mr-auto !text-red-600', [icon('delete'), 'Xóa ảnh']);
    remove.type = 'button';
    modal.footer.append(error);
    if (p.avatarUrl) modal.footer.append(remove);
    modal.footer.append(cancel, save);

    input.addEventListener('change', function () {
      var file = input.files[0] || null;
      picked = null;
      save.disabled = true;
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      fail('');
      logoContent(preview, p, p.avatarUrl);
      if (!file) return;
      if (AVATAR_TYPES.indexOf(file.type) === -1) { fail('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'); return; }
      if (file.size > MAX_AVATAR_BYTES) { fail('Ảnh tối đa 2 MB.'); return; }
      picked = file;
      previewUrl = URL.createObjectURL(file);
      logoContent(preview, p, previewUrl);
      save.disabled = false;
    });

    function run(method, file, doneMessage) {
      if (busy) return;
      busy = true;
      fail('');
      save.disabled = remove.disabled = true;
      sendAvatar(method, p.teamId, file).then(function (data) {
        if (profile.teamId === p.teamId) {
          profile.avatarUrl = data.avatarUrl;
          renderHeader(profile);
        }
        if (openModalEl === modal.overlay) closeModal();
        toast(doneMessage);
      }, function (err) {
        busy = false;
        remove.disabled = false;
        save.disabled = !picked;
        fail(err.message);
        if (err.code === 'NOT_TEAM_LEADER' || err.code === 'TEAM_INACTIVE' || err.code === 'TEAM_NOT_FOUND') loadTeam(p.teamId);
      });
    }
    save.addEventListener('click', function () { if (picked) run('PUT', picked, 'Đã đổi ảnh nhóm.'); });
    remove.addEventListener('click', function () { run('DELETE', null, 'Đã xóa ảnh nhóm.'); });
    showModal(modal, avatarButton);
  }

  // ---------- Cập nhật số liệu định kỳ ----------
  function refreshStats() {
    if (!online || !profile) return Promise.resolve();
    var seq = loadSeq, teamId = profile.teamId;
    return window.UitLive.getJson(API_URL + '/' + teamId).then(function (o) {
      if (seq !== loadSeq) return null;
      note('');
      var key = JSON.stringify([o.memberCount, o.maxMembers, o.applications, o.recruitments, o.highestTrl]);
      if (key !== statsKey) {
        statsKey = key;
        renderStats(o);
        window.dispatchEvent(new Event('uit:team-data-changed')); // huy hiệu menu trái cập nhật cùng lúc
      }
      // Số thành viên, vai trò, trạng thái hay tên nhóm đổi: tải lại hồ sơ (ngành, quyền sửa phụ thuộc vào đó)
      if (o.memberCount === profile.memberCount && o.role === profile.role && o.status === profile.status && o.name === profile.name) return null;
      return window.UitLive.getJson(API_URL + '/' + teamId + '/profile').then(function (updated) {
        if (seq !== loadSeq) return;
        profile = updated;
        renderHeader(updated);
        renderProfile(updated);
        renderAdvisor(updated.advisor);
      });
    }).catch(function (err) {
      if (seq !== loadSeq) return;
      if (err.code === 'TEAM_NOT_FOUND') { location.reload(); err.stop = true; }
      else note(err.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy tải lại trang để đăng nhập lại.'
        : 'Mất kết nối máy chủ: số liệu đang hiển thị có thể đã cũ.');
      throw err;
    });
  }

  function startLive() {
    if (live || !window.UitLive) return;
    live = window.UitLive.poll(refreshStats);
    live.start();
  }

  // ---------- Tải dữ liệu ----------
  function renderPicker(selected) {
    picker.replaceChildren.apply(picker, teams.map(function (t) {
      var o = h('option', null, [t.name + (t.role === 'Leader' ? ' (Leader)' : '')]);
      o.value = String(t.teamId);
      return o;
    }));
    picker.value = String(selected);
    toggle(picker, teams.length > 1);
  }

  function showSample(err) {
    online = false;
    note(err.offline
      ? 'Chưa kết nối máy chủ: đang hiển thị dữ liệu mẫu, thay đổi sẽ không được lưu.'
      : 'Không tải được thông tin nhóm (' + err.message + '): đang hiển thị dữ liệu mẫu.');
    doneLoading();
  }

  function loadTeam(teamId) {
    var seq = ++loadSeq;
    return Promise.all([request('GET', '/' + teamId + '/profile'), request('GET', '/' + teamId)]).then(function (results) {
      if (seq !== loadSeq) return;
      online = true;
      profile = results[0];
      renderHeader(profile);
      renderProfile(profile);
      renderAdvisor(profile.advisor);
      renderStats(results[1]);
      statsKey = JSON.stringify([results[1].memberCount, results[1].maxMembers, results[1].applications, results[1].recruitments, results[1].highestTrl]);
      startLive();
      note('');
      Array.prototype.forEach.call(document.querySelectorAll('.sample-tab-note'), function (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
      });
      doneLoading();
    }, function (err) {
      if (seq !== loadSeq) return;
      if (profile) { toast('Không tải được nhóm: ' + err.message); picker.value = String(profile.teamId); doneLoading(); return; }
      showSample(err);
    });
  }

  function showNoTeam() {
    online = true;
    Array.prototype.forEach.call(page.querySelectorAll('[data-team-region]'), function (el) { el.classList.add('hidden'); });
    Array.prototype.forEach.call(page.querySelectorAll('.tab-content'), function (el) { el.classList.remove('active'); });
    toggle($('team-empty'), true);
    doneLoading();
  }

  avatarButton.addEventListener('click', function () {
    if (online && profile) openAvatar();
  });
  editButton.addEventListener('click', function () {
    if (!online || !profile) { toast('Chưa kết nối máy chủ nên chưa cập nhật được hồ sơ.'); return; }
    openEdit();
  });
  reportButton.addEventListener('click', function () {
    if (!online || !profile) { toast('Đang xem dữ liệu mẫu nên chưa soạn được báo cáo.'); return; }
    if (profile.advisor && profile.advisor.email) openReport();
  });
  // Liên kết email trong dữ liệu mẫu không được mở tới địa chỉ giả
  $('advisor-email').addEventListener('click', function (e) {
    if (!online) { e.preventDefault(); toast('Đây là địa chỉ trong dữ liệu mẫu.'); }
  });
  picker.addEventListener('change', function () {
    var id = Number(picker.value);
    var url = new URL(location.href);
    url.searchParams.set('team', String(id));
    history.replaceState(null, '', url);
    closeModal();
    loadTeam(id);
  });

  if (location.protocol !== 'file:') {
    page.setAttribute('data-loading', '');
    setTimeout(doneLoading, 12000); // máy chủ treo thì vẫn hiện trang
  }
  request('GET').then(function (data) {
    teams = data.teams;
    if (!teams.length) { showNoTeam(); return; }
    // ?team= trên địa chỉ; không có thì ưu tiên nhóm mình làm Leader
    var wanted = Number(new URLSearchParams(location.search).get('team'));
    var first = teams.filter(function (t) { return t.teamId === wanted; })[0]
      || teams.filter(function (t) { return t.role === 'Leader'; })[0] || teams[0];
    renderPicker(first.teamId);
    loadTeam(first.teamId);
  }, showSample);
})();
