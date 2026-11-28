// SV-06 tab "Thành viên". Nạp sau nhom-thong-tin.js (dùng chung popup, request qua window.UitTeamPage).
// - GET /api/student-teams/:teamId/members: danh sách và quyền theo từng dòng (máy chủ quyết định).
// - Leader: sửa chức danh / đóng góp, chuyển quyền Leader, mời ra khỏi nhóm (bắt buộc lý do).
//   Thành viên: sửa "đóng góp" của chính mình, tự rời nhóm. Leader phải chuyển quyền trước khi rời.
// - "Xuất danh sách (CSV)" tạo tệp ngay trên trình duyệt từ danh sách đang xem.
// - Không có máy chủ: giữ bảng mẫu trong trang.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var T = window.UitTeamPage;
  if (!T) return;
  var h = T.h, icon = T.icon, toggle = T.toggle, C = T.classes, button = T.button;

  var body = document.getElementById('members-body');
  var heading = document.getElementById('members-heading');
  var semester = document.getElementById('members-semester');
  var leaveButton = document.getElementById('members-leave');
  var exportButton = document.getElementById('members-export');
  var data = null;
  var teamId = null;
  var seq = 0;
  var lastKey = '';

  var ICON_BTN = 'p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50';
  var AVATAR_COLORS = ['bg-[#1F4E78]', 'bg-emerald-700', 'bg-sky-700', 'bg-slate-700', 'bg-amber-700', 'bg-rose-700'];

  function initials(name) {
    var words = name.trim().split(/\s+/);
    return ((words.length > 1 ? words[words.length - 2][0] : '') + words[words.length - 1][0]).toUpperCase();
  }

  function avatar(m, i) {
    var box = h('div', 'w-8 h-8 shrink-0 rounded-xl overflow-hidden text-white font-bold flex items-center justify-center text-xs ' + AVATAR_COLORS[i % AVATAR_COLORS.length], [initials(m.fullName)]);
    if (m.avatarUrl) {
      var img = h('img', 'w-full h-full object-cover');
      img.alt = '';
      img.addEventListener('error', function () { box.replaceChildren(initials(m.fullName)); });
      img.src = m.avatarUrl;
      box.replaceChildren(img);
    }
    return box;
  }

  function roleBadge(m) {
    var leader = m.role === 'Leader';
    return h('span', 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ' +
      (leader ? 'bg-[#E6F0F7] text-[#1F4E78]' : 'bg-slate-100 text-slate-700 border border-slate-200'), [
      h('span', 'w-1.5 h-1.5 rounded-xl ' + (leader ? 'bg-[#1F4E78]' : 'bg-slate-500')),
      leader ? 'Trưởng nhóm (Leader)' : 'Thành viên'
    ]);
  }

  function row(m, i) {
    var actions = h('div', 'inline-flex items-center gap-1');
    if (m.canEditTitle || m.canEditContribution) {
      var edit = button(ICON_BTN, [icon('tune')], function () { openEdit(m, edit); });
      edit.title = edit.ariaLabel = m.canEditTitle ? 'Sửa chức danh và đóng góp của ' + m.fullName : 'Sửa đóng góp của bạn';
      edit.setAttribute('aria-label', edit.title);
      actions.appendChild(edit);
    }
    if (m.canMakeLeader) {
      var promote = button(ICON_BTN, [icon('workspace_premium')], function () { openTransfer(m, promote); });
      promote.title = 'Chuyển quyền trưởng nhóm cho ' + m.fullName;
      promote.setAttribute('aria-label', promote.title);
      actions.appendChild(promote);
    }
    if (m.canRemove) {
      var remove = button('p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors', [icon('person_remove')], function () { openRemove(m, remove); });
      remove.title = 'Mời ' + m.fullName + ' ra khỏi nhóm';
      remove.setAttribute('aria-label', remove.title);
      actions.appendChild(remove);
    }
    if (!actions.childNodes.length) actions.appendChild(h('span', 'text-xs text-slate-400 italic', [m.role === 'Leader' ? 'Nhóm trưởng' : '—']));

    var name = h('div', 'flex items-center gap-1 font-semibold text-[#1A1A1A]', [m.fullName, m.isMe && h('span', 'text-[11px] font-medium text-slate-500', ['(Bạn)'])]);
    return h('tr', 'hover:bg-slate-50 transition-colors' + (m.isMe ? ' bg-[#E6F0F7]/30' : ''), [
      h('td', 'py-3.5 px-6', [h('div', 'flex items-center gap-3', [avatar(m, i), h('div', 'flex flex-col min-w-0', [
        name, h('span', 'text-[11px] text-slate-500 whitespace-nowrap', [m.email || ''])
      ])])]),
      h('td', 'py-3.5 px-4', [h('div', 'flex flex-col', [
        h('span', 'font-mono font-bold text-slate-800', [m.studentCode]),
        h('span', 'text-[11px] text-slate-500', [[m.major, m.cohort].filter(Boolean).join(' · ') || '—'])
      ])]),
      h('td', 'py-3.5 px-4', [h('div', 'flex flex-col items-start gap-1', [
        roleBadge(m), m.positionTitle && h('span', 'text-[11px] text-slate-600', [m.positionTitle])
      ])]),
      h('td', 'py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap', [T.viDate(m.joinedAt)]),
      h('td', 'py-3.5 px-4', [m.contribution
        ? h('span', 'inline-block min-w-[160px] max-w-[240px] text-xs leading-snug text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md break-words', [m.contribution])
        : h('span', 'text-xs text-slate-400 italic', ['Chưa cập nhật'])]),
      h('td', 'py-3.5 px-6 text-right', [actions])
    ]);
  }

  function render() {
    heading.textContent = 'Danh sách thành viên hiện diện (' + data.team.memberCount + '/' + data.team.maxMembers + ')';
    semester.textContent = data.team.semester || '';
    toggle(semester, !!data.team.semester);
    leaveButton.classList.remove('hidden');
    leaveButton.classList.add('inline-flex');
    body.replaceChildren.apply(body, data.members.map(row));
  }

  function load(id) {
    var mine = ++seq;
    return T.request('GET', '/' + id + '/members').then(function (result) {
      if (mine !== seq || id !== teamId) return;
      data = result;
      render();
    }, function (err) {
      if (mine !== seq || err.offline) return;
      if (data) T.toast('Không tải lại được danh sách thành viên: ' + err.message);
    });
  }

  // ---------- Popup dùng chung ----------
  function errorLine() {
    var el = h('p', 'hidden w-full sm:w-auto sm:mr-auto text-sm font-medium text-red-600');
    el.setAttribute('role', 'alert');
    return el;
  }

  // Gửi một thao tác; thành công thì đóng popup, tải lại và cập nhật số liệu
  function submit(modal, save, error, method, path, payload, done) {
    error.classList.add('hidden');
    save.disabled = true;
    return T.request(method, path, payload).then(function (result) {
      if (T.isOpen(modal.overlay)) T.closeModal();
      done(result);
      T.refresh();
    }, function (err) {
      save.disabled = false;
      error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message;
      error.classList.remove('hidden');
      if (['NOT_TEAM_LEADER', 'TEAM_INACTIVE', 'MEMBER_NOT_FOUND', 'TEAM_NOT_FOUND'].indexOf(err.code) !== -1) T.reload(teamId);
    });
  }

  function textInput(id, value, max, placeholder) {
    var el = h('input', C.input);
    el.id = id;
    el.maxLength = max;
    el.value = value || '';
    el.placeholder = placeholder || '';
    return el;
  }

  function openEdit(m, opener) {
    var modal = T.buildModal(m.isMe && !m.canEditTitle ? 'Sửa đóng góp của bạn' : 'Sửa thông tin thành viên', 'max-w-lg');
    var title = m.canEditTitle ? textInput('member-title', m.positionTitle, 100, 'Ví dụ: Kỹ sư AI (ML Engineer)') : null;
    var contribution = textInput('member-contribution', m.contribution, 255, 'Ví dụ: Huấn luyện mô hình, gán nhãn dữ liệu');
    var form = h('form', 'flex flex-col gap-4', [
      h('p', 'text-sm text-slate-700', [h('strong', null, [m.fullName]), ' · ', m.studentCode]),
      title && T.labelled('Chức danh trong nhóm', title, 'Do trưởng nhóm đặt. Để trống để xóa.'),
      T.labelled('Đóng góp chính', contribution, 'Tối đa 255 ký tự. Để trống để xóa.')
    ]);
    form.id = 'member-form';
    form.noValidate = true;
    modal.body.appendChild(form);
    var error = errorLine();
    var cancel = button(C.plain, ['Hủy'], T.closeModal);
    var save = h('button', C.primary, ['Lưu']);
    save.type = 'submit';
    save.setAttribute('form', 'member-form');
    modal.footer.append(error, cancel, save);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var changes = {};
      var newContribution = T.tidy(contribution.value) || null;
      if (newContribution !== (m.contribution || null)) changes.contribution = newContribution;
      if (title) {
        var newTitle = T.tidy(title.value) || null;
        if (newTitle !== (m.positionTitle || null)) changes.positionTitle = newTitle;
      }
      if (!Object.keys(changes).length) { T.closeModal(); T.toast('Không có thay đổi nào.'); return; }
      submit(modal, save, error, 'PATCH', '/' + teamId + '/members/' + m.studentCode, changes, function () {
        T.toast('Đã lưu thông tin thành viên.');
        load(teamId);
      });
    });
    T.showModal(modal, opener);
    (title || contribution).focus();
  }

  function openTransfer(m, opener) {
    var modal = T.buildModal('Chuyển quyền trưởng nhóm', 'max-w-md');
    modal.body.append(
      h('p', 'text-sm text-slate-700 leading-relaxed', ['Chuyển quyền trưởng nhóm cho ', h('strong', null, [m.fullName]), ' (' + m.studentCode + ')?']),
      h('p', 'p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed',
        ['Sau khi chuyển, bạn trở thành thành viên thường: không còn duyệt đơn, mời thành viên, sửa hồ sơ nhóm hay quản lý tin tuyển. Lời mời đã gửi vẫn còn hiệu lực.']));
    var error = errorLine();
    var save = button(C.primary, [icon('workspace_premium'), 'Chuyển quyền']);
    save.addEventListener('click', function () {
      submit(modal, save, error, 'POST', '/' + teamId + '/transfer-leader', { student: m.studentCode }, function () {
        T.toast('Đã chuyển quyền trưởng nhóm cho ' + m.fullName + '.');
        T.reload(teamId); // vai trò của mình đổi: tải lại cả trang nhóm
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);
    T.showModal(modal, opener);
  }

  function openRemove(m, opener) {
    var modal = T.buildModal('Mời thành viên ra khỏi nhóm', 'max-w-md');
    var reason = h('textarea', C.input + ' h-24 py-2 leading-relaxed');
    reason.id = 'remove-reason';
    reason.maxLength = 500;
    reason.placeholder = 'Ví dụ: Không tham gia họp nhóm và không phản hồi trong 4 tuần.';
    var counter = h('span', 'text-xs text-slate-500', ['0/500 ký tự (tối thiểu 10)']);
    reason.addEventListener('input', function () { counter.textContent = reason.value.trim().length + '/500 ký tự (tối thiểu 10)'; });
    modal.body.append(
      h('p', 'text-sm text-slate-700 leading-relaxed', [h('strong', null, [m.fullName]), ' (' + m.studentCode + ') sẽ không còn là thành viên và nhận được thông báo kèm lý do.']),
      T.labelled('Lý do', reason), counter);
    var error = errorLine();
    var save = button('h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-1.5', [icon('person_remove'), 'Mời ra khỏi nhóm']);
    save.addEventListener('click', function () {
      var text = reason.value.trim();
      if (text.length < 10) { error.textContent = 'Lý do cần từ 10 đến 500 ký tự.'; error.classList.remove('hidden'); reason.focus(); return; }
      submit(modal, save, error, 'POST', '/' + teamId + '/members/' + m.studentCode + '/remove', { reason: text }, function () {
        T.toast('Đã mời ' + m.fullName + ' ra khỏi nhóm.');
        load(teamId);
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);
    T.showModal(modal, opener);
    reason.focus();
  }

  function openLeave() {
    var profile = T.profile();
    var modal = T.buildModal('Rời nhóm', 'max-w-md');
    if (!data.viewer.canLeave) {
      modal.body.appendChild(h('p', 'text-sm text-slate-700 leading-relaxed', [data.team.memberCount > 1
        ? 'Bạn đang là trưởng nhóm. Hãy chuyển quyền cho một thành viên khác (nút biểu tượng huy hiệu ở cột Thao tác) trước khi rời nhóm.'
        : 'Nhóm chỉ còn mình bạn. Hệ thống chưa hỗ trợ giải tán nhóm.']));
      modal.footer.appendChild(button(C.primary, ['Đã hiểu'], T.closeModal));
      T.showModal(modal, leaveButton);
      return;
    }
    modal.body.append(
      h('p', 'text-sm text-slate-700 leading-relaxed', ['Rời nhóm ', h('strong', null, [profile ? profile.name : '']), '?']),
      h('p', 'p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed',
        ['Bạn sẽ không còn xem được nhóm và không được ghi tác quyền công trình của nhóm trên hồ sơ, CV. Muốn quay lại phải được mời hoặc nộp đơn mới.']));
    var error = errorLine();
    var save = button('h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-1.5', [icon('logout'), 'Rời nhóm']);
    save.addEventListener('click', function () {
      submit(modal, save, error, 'POST', '/' + teamId + '/leave', null, function () {
        location.href = location.pathname + '?left=1'; // về nhóm khác (nếu còn) hoặc màn "chưa có nhóm"
      });
    });
    modal.footer.append(error, button(C.plain, ['Ở lại'], T.closeModal), save);
    T.showModal(modal, leaveButton);
  }

  // ---------- Xuất CSV ----------
  function csvCell(value) {
    var text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // tránh bảng tính hiểu là công thức
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    if (!data) { T.toast('Đang xem dữ liệu mẫu nên chưa xuất được danh sách.'); return; }
    var head = ['Họ tên', 'MSSV', 'Email', 'Ngành', 'Khóa', 'Vai trò', 'Chức danh', 'Ngày gia nhập', 'Đóng góp chính'];
    var rows = data.members.map(function (m) {
      return [m.fullName, m.studentCode, m.email, m.major, m.cohort, m.role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên',
        m.positionTitle, T.viDate(m.joinedAt), m.contribution];
    });
    var csv = '﻿' + [head].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var profile = T.profile();
    var name = 'thanh-vien-' + ((profile && profile.code) || 'nhom-' + teamId).replace(/[^A-Za-z0-9-]+/g, '-') + '.csv';
    var link = h('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  // ---------- Sự kiện ----------
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
  leaveButton.addEventListener('click', function () { if (data) openLeave(); });
  exportButton.addEventListener('click', exportCsv);

  if (new URLSearchParams(location.search).get('left') === '1') {
    T.toast('Bạn đã rời nhóm.');
    history.replaceState(null, '', location.pathname);
  }
})();
