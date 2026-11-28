// Dùng chung cho MỌI trang pages/sv:
//   1. Huy hiệu ở menu trái, mục "Nhóm nghiên cứu & Lab": số đơn xin vào nhóm đang chờ ở các nhóm mình làm Leader
//      cộng số lời mời vào nhóm đang chờ mình trả lời (GET /api/student-teams/pending-count); chú thích tách rõ.
//   2. window.UitLive: hỏi lại máy chủ định kỳ để số liệu tự cập nhật (SV-06 dùng cho thẻ thống kê và thanh tab).
// Cập nhật gần thời gian thực bằng cách hỏi lại ~10 giây một lần (không phải đẩy tức thời):
//   - tạm dừng khi tab bị ẩn, hỏi ngay khi quay lại; mất mạng thì giãn dần (tối đa 60 giây);
//   - dừng hẳn khi hết phiên / sai vai trò, hoặc không có máy chủ API (file://, GitHub Pages).
(function () {
  'use strict';

  var INTERVAL = 10000;
  var MAX_WAIT = 60000;

  // task() trả Promise. Lỗi có { stop: true } thì ngừng hẳn; lỗi khác thì giãn khoảng cách.
  function poll(task, interval) {
    var every = interval || INTERVAL;
    var wait = every, timer = null, running = false, again = false, stopped = false, lastRun = 0;

    function schedule() {
      clearTimeout(timer);
      if (!stopped && !document.hidden) timer = setTimeout(run, wait);
    }
    function run() {
      if (stopped || document.hidden) return;
      if (running) { again = true; return; } // đang hỏi dở: hỏi thêm một lần sau khi xong
      running = true;
      lastRun = Date.now();
      clearTimeout(timer);
      Promise.resolve().then(task).then(function () { wait = every; }, function (err) {
        if (err && err.stop) stopped = true;
        else wait = Math.min(wait * 2, MAX_WAIT);
      }).then(function () {
        running = false;
        if (again) { again = false; run(); } else schedule();
      });
    }
    // Quay lại tab / cửa sổ: hỏi ngay (bỏ qua nếu vừa hỏi xong, vì hai sự kiện thường đến cùng lúc)
    function wake() { if (Date.now() - lastRun > 1000) run(); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(timer);
      else wake();
    });
    window.addEventListener('focus', wake);

    return {
      start: schedule, // chờ một nhịp rồi mới hỏi (khi vừa tải xong dữ liệu)
      now: run,
      stop: function () { stopped = true; clearTimeout(timer); }
    };
  }

  // GET trả JSON; lỗi mang theo status, code và cờ stop
  function getJson(url) {
    return fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok) return data;
        var missingApi = res.status === 404 && (!data.code || data.code === 'NOT_FOUND');
        throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), {
          status: res.status, code: data.code, stop: res.status === 401 || res.status === 403 || missingApi
        });
      });
    });
  }

  window.UitLive = { INTERVAL: INTERVAL, poll: poll, getJson: getJson };

  // ---------- Huy hiệu trên menu trái ----------
  var link = document.querySelector('#sidebar a[href="06_quan-tri-nhom-portfolio.html"]');
  if (!link || location.protocol === 'file:') return;

  function describe(data) {
    return [
      data.applications && data.applications + ' đơn xin vào nhóm chờ bạn duyệt',
      data.invitations && data.invitations + ' lời mời vào nhóm chờ bạn trả lời'
    ].filter(Boolean).join(', ');
  }

  function render(data) {
    var count = data ? data.pending : 0;
    var badge = link.querySelector('[data-team-pending]');
    if (!count) {
      if (badge) badge.remove();
      link.classList.remove('has-badge'); // has-badge: chấm báo hiệu khi menu thu gọn
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sidebar-badge ml-auto shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-bold inline-flex items-center justify-center';
      badge.setAttribute('data-team-pending', '');
      var number = document.createElement('span');
      var hidden = document.createElement('span');
      hidden.className = 'sr-only';
      badge.append(number, hidden);
      link.appendChild(badge);
    }
    badge.firstChild.textContent = count > 99 ? '99+' : String(count);
    badge.title = describe(data);
    badge.lastChild.textContent = ': ' + describe(data); // trình đọc màn hình đọc cả số lẫn loại
    link.classList.add('has-badge');
  }

  var badgePoll = poll(function () {
    return getJson('/api/student-teams/pending-count').then(function (data) {
      render(data);
    }, function (err) {
      if (err.stop) render(null); // hết phiên: không để lại số cũ
      throw err;
    });
  });
  // Trang đang mở vừa thấy số liệu nhóm thay đổi: cập nhật huy hiệu ngay
  window.addEventListener('uit:team-data-changed', badgePoll.now);
  badgePoll.now();
})();
