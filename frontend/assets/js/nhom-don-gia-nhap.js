// SV-06 tab "Đơn xin gia nhập". Nạp sau nhom-thong-tin.js (dùng chung popup, request qua window.UitTeamPage).
// - GET /api/student-teams/:teamId/applications?status=Pending|Accepted|Rejected
// - Mọi thành viên xem; CHỈ Leader chấp nhận / từ chối (máy chủ quyết định qua canAccept / canReject).
//   Từ chối bắt buộc lý do 10–500 ký tự.
// - GPA chỉ hiện khi người nộp đồng ý trên chính đơn đó; kỹ năng, công trình theo công tắc ẩn của hồ sơ.
//   Minh chứng "Đã thẩm định" và "SV tự cung cấp" để riêng.
// - Không có máy chủ: giữ thẻ mẫu trong trang.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
(function () {
  'use strict';

  var T = window.UitTeamPage;
  if (!T) return;
  var h = T.h, icon = T.icon, C = T.classes, button = T.button;

  var REASON_MIN = 10, REASON_MAX = 500; // khớp máy chủ
  var STATUSES = ['Pending', 'Accepted', 'Rejected'];
  var EMPTY = {
    Pending: 'Không có đơn nào đang chờ duyệt.',
    Accepted: 'Chưa có đơn nào được chấp nhận.',
    Rejected: 'Chưa có đơn nào bị từ chối.'
  };
  var BLOCKED = {
    TEAM_INACTIVE: 'Nhóm không còn hoạt động nên không nhận thêm thành viên.',
    TEAM_FULL: 'Nhóm đã đủ thành viên tối đa.',
    ALREADY_MEMBER: 'Sinh viên này đã là thành viên của nhóm.',
    APPLICANT_INACTIVE: 'Tài khoản của người nộp đơn đang bị khóa.',
    POST_FILLED: 'Tin tuyển này đã đủ chỉ tiêu.'
  };
  var POST_STATE = { Filled: 'đủ chỉ tiêu', Closed: 'đã đóng', Expired: 'hết hạn' };
  var TYPE_LABEL = { Project: 'Đề tài', Product: 'Sản phẩm', Paper: 'Bài báo', Thesis: 'Luận văn' };
  var FILTER_ON = ['bg-[#1F4E78]', 'text-white', 'font-bold', 'shadow-xs', 'border-[#1F4E78]'];
  var FILTER_OFF = ['bg-slate-100', 'text-slate-700', 'hover:bg-slate-200', 'font-medium', 'border-slate-200'];
  var CHIP = 'px-2 py-0.5 rounded-sm font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium';

  var list = document.getElementById('applicants-list');
  var hint = document.getElementById('applicants-hint');
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-app-filter]'));
  var status = 'Pending';
  var data = null;
  var teamId = null;
  var seq = 0;
  var lastKey = '';
  var busy = null; // applyId đang gửi: không vẽ lại thẻ giữa chừng

  function initials(name) {
    var words = (name || '?').trim().split(/\s+/);
    return ((words.length > 1 ? words[words.length - 2][0] : '') + words[words.length - 1][0]).toUpperCase();
  }

  function ago(value) {
    var minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60000));
    if (minutes < 60) return (minutes || 1) + ' phút trước';
    var hours = Math.round(minutes / 60);
    if (hours < 48) return hours + ' giờ trước';
    return Math.round(hours / 24) + ' ngày trước';
  }

  function dateTime(value) {
    return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  // Chỉ mở liên kết http(s); liên kết khác hiện dạng chữ
  function safeLink(url, label, iconName) {
    var ok = /^https?:\/\//i.test(url || '');
    var el = h(ok ? 'a' : 'span', 'inline-flex items-center gap-1 font-semibold ' + (ok ? 'text-[#1F4E78] hover:underline break-all' : 'text-slate-600'), [icon(iconName, 'text-[16px] shrink-0'), label]);
    if (ok) { el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    return el;
  }

  function identity(a, extra) {
    var person = a.applicant;
    var school = [person.cohort, person.major].filter(Boolean).join(' · ');
    var box = h('div', 'w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-[#E6F0F7] text-[#1F4E78] font-bold flex items-center justify-center text-xs', [initials(person.fullName)]);
    if (person.avatarUrl) {
      var img = h('img', 'w-full h-full object-cover');
      img.alt = '';
      img.addEventListener('error', function () { box.replaceChildren(initials(person.fullName)); });
      img.src = person.avatarUrl;
      box.replaceChildren(img);
    }
    var post = a.recruitment;
    return h('div', 'flex items-center gap-3 min-w-0', [box, h('div', 'flex flex-col min-w-0', [
      h('div', 'flex flex-wrap items-center gap-2', [
        h('h3', 'text-sm font-bold text-[#1A1A1A]', [person.fullName || 'Sinh viên']),
        person.studentCode && h('span', 'text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-sm text-slate-700 border border-slate-200', [person.studentCode]),
        (school || extra) && h('span', 'inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200', [
          icon('school', 'text-[14px]'), [school, extra].filter(Boolean).join(' ')
        ])
      ]),
      h('div', 'flex flex-wrap items-center gap-x-2 mt-0.5', [
        h('span', 'text-xs text-slate-500', ['Ứng tuyển tin:']),
        h('span', 'text-xs font-bold text-[#1F4E78]', [post.title + (POST_STATE[post.state] ? ' (' + POST_STATE[post.state] + ')' : '')])
      ])
    ])]);
  }

  function deadlineBadge(r) {
    if (r.level === 'overdue') return h('span', 'px-2.5 py-0.5 rounded-xl bg-red-600 text-white text-xs font-semibold', ['Quá hạn phản hồi']);
    if (r.level === 'urgent') return h('span', 'px-2.5 py-0.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200', ['Cần phản hồi gấp']);
    return h('span', 'px-2.5 py-0.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200', ['Hạn phản hồi ' + dateTime(r.dueAt)]);
  }

  function skillsBlock(a) {
    var content;
    if (a.skills === null) content = h('span', 'text-slate-500 italic', ['Sinh viên đang ẩn mục kỹ năng.']);
    else if (!a.skills.length) content = h('span', 'text-slate-500 italic', ['Chưa khai kỹ năng.']);
    else content = h('div', 'flex flex-wrap gap-1.5', a.skills.map(function (s) {
      return h('span', CHIP, [s.name + (s.level ? ' · ' + s.level + '/5' : '')]);
    }));
    return h('div', null, [h('span', 'font-semibold text-slate-500 uppercase tracking-wider block mb-1.5', ['Kỹ năng chuyên môn']), content]);
  }

  function evidenceBlock(a) {
    var ev = a.evidence || { reviewed: [], selfDeclared: [] };
    var items = [];
    ev.reviewed.forEach(function (r) {
      items.push(h('div', 'flex items-start gap-1 text-slate-700', [icon('verified', 'text-[16px] text-emerald-700 shrink-0'), h('span', null, [
        h('span', 'font-semibold', [r.title]), ' · ' + (TYPE_LABEL[r.type] || r.type) + (r.trlLevel ? ' · TRL ' + r.trlLevel : ''),
        r.reviewerName && h('span', 'block text-[11px] text-slate-500', ['Đã thẩm định bởi ' + r.reviewerName])
      ])]));
    });
    ev.selfDeclared.forEach(function (s) {
      items.push(h('div', 'flex flex-col', [safeLink(s.url, s.title, 'link'), h('span', 'text-[11px] text-slate-500 ml-5', ['SV tự cung cấp'])]));
    });
    return h('div', null, [
      h('span', 'font-semibold text-slate-500 uppercase tracking-wider block mb-1.5', ['Sản phẩm / Đề tài minh chứng']),
      items.length ? h('div', 'flex flex-col gap-1.5', items) : h('span', 'text-slate-500 italic', ['Không có minh chứng được chia sẻ.'])
    ]);
  }

  function pendingCard(a) {
    var gpa = a.gpaShared && a.gpa !== null ? '(GPA: ' + Number(a.gpa).toFixed(1) + '/10)' : '';
    var error = h('p', 'hidden w-full text-sm font-medium text-red-600');
    error.setAttribute('role', 'alert');
    var actions = h('div', 'flex flex-wrap items-center justify-end gap-2 ml-auto');
    if (a.canReject || a.canAccept || a.acceptBlockedReason) {
      if (a.canReject) {
        var reject = button('px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-xs transition-colors border border-red-200 disabled:opacity-60', ['Từ chối']);
        reject.addEventListener('click', function () { openReject(a, reject); });
        actions.appendChild(reject);
      }
      var accept = button('inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold text-xs shadow-xs hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed', [icon('done_all'), 'Chấp nhận vào nhóm']);
      accept.disabled = !a.canAccept;
      if (a.acceptBlockedReason) accept.title = BLOCKED[a.acceptBlockedReason] || '';
      accept.addEventListener('click', function () { doAccept(a, accept, error); });
      if (a.canReject) actions.appendChild(accept);
    }
    var footerNote = !a.canReject
      ? h('span', 'text-xs text-slate-500 italic', ['Chỉ trưởng nhóm được duyệt đơn.'])
      : a.acceptBlockedReason ? h('span', 'text-xs font-medium text-amber-700', [BLOCKED[a.acceptBlockedReason] || '']) : null;

    return h('article', 'p-5 sm:p-6 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow', [
      h('div', 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100', [
        identity(a, gpa),
        h('div', 'flex flex-wrap items-center gap-2 md:self-center', [
          h('span', 'text-xs text-slate-500 flex items-center gap-1', [icon('schedule', 'text-[16px]'), 'Nộp ' + ago(a.appliedAt)]),
          deadlineBadge(a.response)
        ])
      ]),
      h('div', 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs', [skillsBlock(a), evidenceBlock(a)]),
      h('div', 'bg-slate-50 border border-slate-200 p-4 rounded-lg text-slate-700 text-xs leading-relaxed', [
        h('span', 'font-semibold text-slate-500 block mb-1', ['Thư ngỏ từ sinh viên:']),
        a.message ? h('p', 'italic text-slate-700 whitespace-pre-line break-words', [a.message]) : h('p', 'italic text-slate-500', ['Không có thư ngỏ.'])
      ]),
      h('div', 'flex flex-wrap items-center gap-3 pt-1', [footerNote, actions]),
      error
    ]);
  }

  function doneCard(a) {
    var accepted = a.status === 'Accepted';
    var badge = accepted
      ? h('span', 'px-2.5 py-0.5 rounded-xl text-xs font-semibold border ' + (a.stillMember ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'),
        [a.stillMember ? 'Đang là thành viên' : 'Đã rời nhóm'])
      : h('span', 'px-2.5 py-0.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200', ['Đã từ chối']);
    return h('article', 'p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col gap-3', [
      h('div', 'flex flex-col md:flex-row items-start md:items-center justify-between gap-3', [
        identity(a, ''),
        h('div', 'flex flex-wrap items-center gap-2', [
          badge, a.respondedAt && h('span', 'text-xs text-slate-500', [(accepted ? 'Chấp nhận ' : 'Từ chối ') + T.viDate(a.respondedAt)])
        ])
      ]),
      !accepted && a.responseNote && h('p', 'text-xs text-slate-700 bg-red-50/40 border border-red-100 rounded-lg p-3 whitespace-pre-line break-words', [
        h('span', 'font-semibold text-slate-500', ['Lý do: ']), a.responseNote
      ])
    ]);
  }

  function renderFilters() {
    filters.forEach(function (b) {
      var on = b.getAttribute('data-app-filter') === status;
      b.setAttribute('aria-pressed', String(on));
      FILTER_ON.forEach(function (k) { b.classList.toggle(k, on); });
      FILTER_OFF.forEach(function (k) { b.classList.toggle(k, !on); });
      if (data) b.querySelector('[data-app-count]').textContent = String(data.counts[b.getAttribute('data-app-filter')] || 0);
    });
  }

  function render() {
    renderFilters();
    var rate = data.responseRate;
    hint.textContent = 'Ưu tiên phản hồi trong vòng 72 giờ kể từ lúc nộp' + (rate === null ? '.' : ' (tỉ lệ phản hồi đúng hạn: ' + rate + '%).');
    var cards = data.applications.map(status === 'Pending' ? pendingCard : doneCard);
    list.replaceChildren.apply(list, cards.length ? cards : [h('p', 'p-8 rounded-lg bg-white border border-dashed border-slate-300 text-center text-sm text-slate-500', [EMPTY[status]])]);
  }

  function load(id) {
    var mine = ++seq;
    var wanted = status;
    return T.request('GET', '/' + id + '/applications?status=' + wanted).then(function (result) {
      if (mine !== seq || id !== teamId || wanted !== status || busy) return;
      data = result;
      render();
    }, function (err) {
      if (mine !== seq || err.offline) return;
      if (data) T.toast('Không tải lại được danh sách đơn: ' + err.message);
    });
  }

  function afterDecision(message) {
    busy = null;
    T.toast(message);
    load(teamId);
    T.refresh(); // thẻ thống kê, số trên tab và huy hiệu menu trái
  }

  function doAccept(a, accept, error) {
    if (busy) return;
    busy = a.applyId;
    accept.disabled = true;
    error.classList.add('hidden');
    T.request('POST', '/' + teamId + '/applications/' + a.applyId + '/accept').then(function () {
      afterDecision('Đã nhận ' + a.applicant.fullName + ' vào nhóm.');
    }, function (err) {
      busy = null;
      accept.disabled = false;
      error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message;
      error.classList.remove('hidden');
      if (err.code && err.code !== 'INVALID_INPUT') load(teamId); // trạng thái đơn / nhóm vừa đổi
    });
  }

  function openReject(a, opener) {
    var modal = T.buildModal('Từ chối đơn xin gia nhập', 'max-w-md');
    var reason = h('textarea', C.input + ' h-28 py-2 leading-relaxed');
    reason.id = 'reject-reason';
    reason.maxLength = REASON_MAX;
    reason.placeholder = 'Ví dụ: Nhóm đang cần người có kinh nghiệm FPGA, hồ sơ chưa đáp ứng.';
    var counter = h('span', 'text-xs text-slate-500', ['0/' + REASON_MAX + ' ký tự (tối thiểu ' + REASON_MIN + ')']);
    reason.addEventListener('input', function () { counter.textContent = reason.value.trim().length + '/' + REASON_MAX + ' ký tự (tối thiểu ' + REASON_MIN + ')'; });
    modal.body.append(
      h('p', 'text-sm text-slate-700', ['Đơn của ', h('strong', null, [a.applicant.fullName]), ' cho tin "' + a.recruitment.title + '". Người nộp sẽ thấy lý do này.']),
      T.labelled('Lý do từ chối', reason), counter);
    var error = h('p', 'hidden w-full sm:w-auto sm:mr-auto text-sm font-medium text-red-600');
    error.setAttribute('role', 'alert');
    var save = button('h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60', ['Từ chối đơn']);
    save.addEventListener('click', function () {
      var text = reason.value.trim();
      if (text.length < REASON_MIN) { error.textContent = 'Lý do cần từ ' + REASON_MIN + ' đến ' + REASON_MAX + ' ký tự.'; error.classList.remove('hidden'); reason.focus(); return; }
      if (busy) return;
      busy = a.applyId;
      save.disabled = true;
      error.classList.add('hidden');
      T.request('POST', '/' + teamId + '/applications/' + a.applyId + '/reject', { reason: text }).then(function () {
        if (T.isOpen(modal.overlay)) T.closeModal();
        afterDecision('Đã từ chối đơn của ' + a.applicant.fullName + '.');
      }, function (err) {
        busy = null;
        save.disabled = false;
        error.textContent = err.offline ? 'Không kết nối được máy chủ nên chưa lưu.' : err.message;
        error.classList.remove('hidden');
      });
    });
    modal.footer.append(error, button(C.plain, ['Hủy'], T.closeModal), save);
    T.showModal(modal, opener);
    reason.focus();
  }

  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      if (!teamId) { T.toast('Đang xem dữ liệu mẫu.'); return; }
      var next = b.getAttribute('data-app-filter');
      if (STATUSES.indexOf(next) === -1 || next === status) return;
      status = next;
      renderFilters();
      load(teamId);
    });
  });

  window.addEventListener('uit:team-profile', function (e) {
    var p = e.detail;
    var key = p.teamId + '|' + p.role + '|' + p.status;
    if (key === lastKey) return;
    lastKey = key;
    if (p.teamId !== teamId) { data = null; status = 'Pending'; }
    teamId = p.teamId;
    load(teamId);
  });
  window.addEventListener('uit:team-data-changed', function () { if (teamId) load(teamId); });
})();
