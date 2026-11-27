// SV-06: lời mời vào nhóm. Nạp sau nhom-thong-tin.js (dùng chung popup, thông báo qua window.UitTeamPage).
// - Người được mời: khối "Lời mời dành cho bạn" (GET /api/student-invitations), tự cập nhật; Đồng ý / Từ chối.
// - Leader: popup "Mời thành viên": tra đúng MSSV / email, gửi lời mời, xem và thu hồi lời mời đang chờ.
//   Quyền do máy chủ quyết định (canEdit của hồ sơ nhóm); nút chỉ ẩn / hiện theo đó.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var T = window.UitTeamPage;
  if (!T || !window.UitLive) return;
  var h = T.h, icon = T.icon, toggle = T.toggle, C = T.classes;

  var MINE_URL = '/api/student-invitations';
  var TEAMS_URL = '/api/student-teams';
  var MAX_TEXT = 500; // khớp giới hạn của máy chủ

  function viDate(value) {
    return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function request(method, url, body) {
    return fetch(url, {
      method: method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), { code: data.code });
        return data;
      });
    }, function () { throw new Error('Không kết nối được máy chủ nên chưa thực hiện được.'); });
  }

  function textArea(id, placeholder) {
    var el = h('textarea', C.input + ' h-20 py-2 leading-relaxed');
    el.id = id;
    el.maxLength = MAX_TEXT;
    el.placeholder = placeholder;
    return el;
  }

  function button(className, children, onClick) {
    var el = h('button', className, children);
    el.type = 'button';
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  // ============ Người được mời ============
  var section = document.getElementById('my-invitations');
  var list = document.getElementById('my-invitations-list');
  var shownKey = null;
  var busyId = null; // đang gửi trả lời: không vẽ lại thẻ giữa chừng
  var errors = {}; // invitationId -> lỗi lần bấm gần nhất

  function showSection(show) {
    toggle(section, show);
    section.classList.toggle('flex', show);
  }

  function card(inv) {
    var team = inv.team;
    var logo = h('div', 'w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-[#1F4E78] text-white flex items-center justify-center text-sm font-bold');
    T.logoContent(logo, team, team.avatarUrl);

    var info = h('div', 'min-w-0 flex-1 flex flex-col gap-1', [
      h('p', 'text-sm font-bold text-[#1A1A1A] break-words', [team.name]),
      h('p', 'text-xs text-slate-500', [[inv.invitedBy && inv.invitedBy + ' mời bạn', team.memberCount + '/' + team.maxMembers + ' thành viên', team.field, 'Hết hạn ' + viDate(inv.expiresAt)].filter(Boolean).join(' · ')]),
      team.description && h('p', 'text-xs text-slate-600 line-clamp-2 break-words', [team.description]),
      inv.message && h('p', 'mt-1 pl-3 border-l-4 border-[#1F4E78]/25 text-sm text-slate-700 whitespace-pre-line break-words', [inv.message]),
      !inv.canAccept && h('p', 'text-xs font-semibold text-amber-700', [inv.acceptBlockedReason === 'TEAM_FULL' ? 'Nhóm đã đủ thành viên nên bạn chưa thể tham gia.' : 'Nhóm đang tạm ngừng hoạt động.']),
      errors[inv.invitationId] && h('p', 'text-xs font-semibold text-red-600', [errors[inv.invitationId]])
    ]);

    var accept = button(C.primary, [icon('check'), 'Đồng ý'], function () { answerAccept(inv); });
    accept.disabled = !inv.canAccept || busyId !== null;
    accept.classList.replace('disabled:cursor-wait', 'disabled:cursor-not-allowed');
    var decline = button(C.plain, ['Từ chối'], function () { openDecline(inv, decline); });
    decline.disabled = busyId !== null;
    var el = h('article', 'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50', [
      logo, info, h('div', 'flex items-center gap-2 shrink-0 self-end sm:self-center', [decline, accept])
    ]);
    el.dataset.invitation = String(inv.invitationId);
    return el;
  }

  var current = [];
  function renderMine() {
    showSection(current.length > 0);
    list.replaceChildren.apply(list, current.map(card));
  }

  var mine = window.UitLive.poll(function () {
    return window.UitLive.getJson(MINE_URL).then(function (data) {
      if (busyId !== null) return;
      var key = JSON.stringify(data.invitations);
      if (key === shownKey) return; // không đổi thì không vẽ lại, tránh mất focus
      shownKey = key;
      current = data.invitations;
      renderMine();
      window.dispatchEvent(new Event('uit:team-data-changed'));
    }, function (err) {
      if (err.stop) { current = []; shownKey = null; renderMine(); } // hết phiên / không có API
      throw err;
    });
  });

  function refreshMine() {
    shownKey = null;
    mine.now();
  }

  function answerAccept(inv) {
    if (busyId !== null) return;
    busyId = inv.invitationId;
    delete errors[inv.invitationId];
    renderMine();
    request('POST', MINE_URL + '/' + inv.invitationId + '/accept').then(function (data) {
      // Tải lại trang để danh sách nhóm, ô chọn nhóm và quyền cùng đúng
      var url = new URL(location.href);
      url.searchParams.set('team', String(data.teamId));
      url.searchParams.set('joined', '1');
      location.replace(url.toString());
    }, function (err) {
      busyId = null;
      errors[inv.invitationId] = err.message;
      T.toast(err.message);
      renderMine();
      refreshMine();
    });
  }

  function openDecline(inv, opener) {
    var modal = T.buildModal('Từ chối lời mời', 'max-w-md');
    var reason = textArea('decline-reason', 'Ví dụ: mình đang bận đồ án');
    var error = h('p', 'hidden w-full text-sm font-medium text-red-600');
    error.setAttribute('role', 'alert');
    modal.body.append(
      h('p', 'text-sm text-slate-700 break-words', ['Bạn từ chối lời mời vào nhóm ', h('strong', null, [inv.team.name]), '. Nhóm chỉ có thể mời lại sau 7 ngày.']),
      T.labelled('Lý do (không bắt buộc)', reason, 'Trưởng nhóm sẽ nhận được lý do này.'));
    var confirm = button(C.primary, ['Xác nhận từ chối'], function () {
      confirm.disabled = true;
      request('POST', MINE_URL + '/' + inv.invitationId + '/decline', { reason: reason.value.trim() || null }).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        T.toast('Đã từ chối lời mời.');
        refreshMine();
      }, function (err) {
        confirm.disabled = false;
        error.textContent = err.message;
        toggle(error, true);
        refreshMine();
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), confirm);
    T.showModal(modal, opener);
  }

  // ============ Leader: mời thành viên ============
  var openers = ['invite-open', 'invite-open-members'].map(function (id) { return document.getElementById(id); }).filter(Boolean);

  window.addEventListener('uit:team-profile', function (e) {
    openers.forEach(function (b) { toggle(b, e.detail.canEdit); });
  });

  function openInvite(opener) {
    var team = T.profile();
    var base = TEAMS_URL + '/' + team.teamId;
    var modal = T.buildModal('Mời thành viên vào nhóm', 'max-w-lg');
    var found = null; // chuỗi đã tra ứng với kết quả đang hiển thị

    var input = h('input', C.input);
    input.id = 'invite-student';
    input.maxLength = 150;
    input.autocomplete = 'off';
    input.placeholder = 'MSSV 8 chữ số hoặc email @gm.uit.edu.vn';
    var search = h('button', C.plain + ' shrink-0 self-end', [icon('search'), 'Tìm']);
    search.type = 'submit';
    var form = h('form', 'flex gap-2', [h('div', 'flex-1 min-w-0', [T.labelled('MSSV hoặc email sinh viên', input)]), search]);
    form.noValidate = true;

    var result = h('div', 'flex flex-col gap-3');
    result.id = 'invite-result';
    result.setAttribute('aria-live', 'polite');
    var pendingTitle = h('h3', 'text-xs font-semibold text-slate-600', ['Lời mời đang chờ']);
    pendingTitle.id = 'invite-pending-title';
    var pendingList = h('ul', 'flex flex-col gap-2');
    pendingList.id = 'invite-pending';
    modal.body.append(
      h('p', 'text-xs text-slate-500', ['Sinh viên chỉ vào nhóm khi tự đồng ý. Lời mời có hiệu lực 7 ngày và không giữ chỗ.']),
      form, result, h('div', 'flex flex-col gap-2 pt-3 border-t border-slate-200', [pendingTitle, pendingList]));
    modal.footer.append(button(C.plain, ['Đóng'], T.closeModal));

    function message(text, tone) {
      var color = { error: 'bg-red-50 text-red-700', warn: 'bg-amber-50 text-amber-800', ok: 'bg-emerald-50 text-emerald-800', info: 'text-slate-500' }[tone];
      var el = h('p', 'p-2.5 rounded-lg text-sm font-medium ' + color, [text]);
      el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
      return el;
    }

    // Nút đang có con trỏ bị khóa hoặc bị vẽ lại thì đưa con trỏ về ô tìm kiếm, để bàn phím không rơi ra ngoài popup
    function keepFocus() {
      if (T.isOpen(modal.overlay) && !modal.overlay.contains(document.activeElement)) input.focus();
    }

    // Quyền hoặc trạng thái nhóm vừa đổi: tải lại trang để nút khớp quyền mới
    function maybeReload(err) {
      if (['NOT_TEAM_LEADER', 'TEAM_INACTIVE', 'TEAM_NOT_FOUND'].indexOf(err.code) !== -1) T.reload(team.teamId);
    }

    function loadPending() {
      return request('GET', base + '/invitations').then(function (data) {
        pendingTitle.textContent = 'Lời mời đang chờ (' + data.invitations.length + '/' + data.maxPending + ')';
        pendingList.replaceChildren.apply(pendingList, data.invitations.length ? data.invitations.map(pendingRow)
          : [h('li', 'text-xs text-slate-500 italic', ['Chưa có lời mời nào đang chờ.'])]);
        keepFocus();
      }, function (err) {
        pendingList.replaceChildren(h('li', 'text-xs text-red-600', ['Không tải được lời mời: ' + err.message]));
        keepFocus();
      });
    }

    function pendingRow(inv) {
      var armed = false;
      var cancel = button('shrink-0 h-8 px-3 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-60', ['Thu hồi'], function () {
        // Bấm hai lần: lần đầu đổi nhãn để xác nhận
        if (!armed) { armed = true; cancel.textContent = 'Xác nhận thu hồi'; return; }
        cancel.disabled = true;
        request('POST', base + '/invitations/' + inv.invitationId + '/cancel').then(function () {
          T.toast('Đã thu hồi lời mời.');
          loadPending();
        }, function (err) {
          T.toast(err.message);
          maybeReload(err);
          loadPending();
        });
      });
      cancel.addEventListener('blur', function () { armed = false; cancel.textContent = 'Thu hồi'; });
      return h('li', 'flex items-center gap-3 p-2.5 rounded-lg border border-slate-200', [
        h('div', 'min-w-0 flex-1', [
          h('p', 'text-sm font-semibold text-[#1A1A1A] break-words', [inv.student.fullName]),
          h('p', 'text-xs text-slate-500', [inv.student.studentCode + ' · gửi ' + viDate(inv.createdAt) + ' · hết hạn ' + viDate(inv.expiresAt)])
        ]),
        cancel
      ]);
    }

    function showFound(query, data) {
      var s = data.student;
      var person = h('div', 'p-3 rounded-lg border border-slate-200 bg-slate-50', [
        h('p', 'text-sm font-bold text-[#1A1A1A] break-words', [s.fullName]),
        h('p', 'text-xs text-slate-500', [[s.studentCode, s.major].filter(Boolean).join(' · ')])
      ]);
      if (!data.canInvite) { result.replaceChildren(person, message(data.blockedMessage, 'warn')); return; }
      var note = textArea('invite-message', 'Giới thiệu ngắn về nhóm hoặc vị trí cần người');
      var send = button(C.primary + ' self-end', [icon('send'), 'Gửi lời mời'], function () {
        send.disabled = true;
        // Gửi đúng người đang hiển thị (chuỗi đã tra), không lấy lại từ ô nhập
        request('POST', base + '/invitations', { student: query, message: note.value.trim() || null }).then(function () {
          found = null;
          input.value = '';
          result.replaceChildren(message('Đã gửi lời mời tới ' + s.fullName + '.', 'ok'));
          loadPending();
          input.focus();
        }, function (err) {
          send.disabled = false;
          result.appendChild(message(err.message, 'error'));
          keepFocus();
          maybeReload(err);
          loadPending();
        });
      });
      result.replaceChildren(person, T.labelled('Lời nhắn (không bắt buộc)', note), send);
    }

    // Sửa ô tìm kiếm thì bỏ kết quả cũ, để không gửi nhầm người
    input.addEventListener('input', function () {
      if (found !== null && T.tidy(input.value).toLowerCase() !== found) { found = null; result.replaceChildren(); }
    });

    var searchSeq = 0;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = T.tidy(input.value).toLowerCase();
      var seq = ++searchSeq;
      found = null;
      if (!query) { result.replaceChildren(message('Nhập MSSV hoặc email của sinh viên.', 'error')); return; }
      search.disabled = true;
      result.replaceChildren(message('Đang tìm…', 'info'));
      request('GET', base + '/invite-lookup?student=' + encodeURIComponent(query)).then(function (data) {
        search.disabled = false;
        if (seq !== searchSeq || T.tidy(input.value).toLowerCase() !== query) { result.replaceChildren(); return; }
        found = query;
        showFound(query, data);
        keepFocus();
      }, function (err) {
        search.disabled = false;
        if (seq !== searchSeq) return;
        result.replaceChildren(message(err.message, 'error'));
        keepFocus();
        maybeReload(err);
      });
    });

    T.showModal(modal, opener);
    input.focus();
    loadPending();
  }

  openers.forEach(function (b) {
    b.addEventListener('click', function () {
      if (!T.online() || !T.profile()) { T.toast('Đang xem dữ liệu mẫu nên chưa gửi được lời mời.'); return; }
      openInvite(b);
    });
  });

  // Vừa tham gia nhóm (sau khi tải lại trang): báo một lần rồi bỏ dấu trên địa chỉ
  var url = new URL(location.href);
  if (url.searchParams.get('joined') === '1') {
    url.searchParams.delete('joined');
    history.replaceState(null, '', url);
    T.toast('Bạn đã tham gia nhóm.');
  }

  if (location.protocol !== 'file:') mine.now();
})();
