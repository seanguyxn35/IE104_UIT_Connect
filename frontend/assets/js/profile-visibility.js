// SV-04: nút con mắt trên 3 thẻ chỉ số (GPA, Điểm rèn luyện, Đề tài & Công bố) – ẩn / công khai từng thẻ.
// Trạng thái lưu ở CSDL qua /api/profile-visibility. Khi ẩn, người xem hồ sơ không thấy chỉ số này;
// riêng chủ hồ sơ vẫn thấy thẻ ở dạng che kèm nhãn "Đang ẩn".
(function () {
  var API_URL = '/api/profile-visibility';
  var LABELS = { gpa: 'GPA', drl: 'Điểm rèn luyện', projects: 'Đề tài & Công bố' };
  var state = { gpa: true, drl: true, projects: true };
  var online = true;

  var cards = {};
  document.querySelectorAll('[data-vis-card]').forEach(function (card) {
    var key = card.dataset.visCard;
    var row = card.querySelector('[data-vis-row]');
    var btn = card.querySelector('[data-vis-toggle]');
    if (!row || !btn) return;

    var mask = document.createElement('div');
    mask.className = 'hidden mt-1.5 h-8 flex items-center gap-1.5 text-xs font-medium text-slate-500';
    mask.innerHTML = '<span class="material-symbols-outlined text-[16px]">visibility_off</span>' +
      '<span class="tracking-widest text-base text-slate-400">••••</span>' +
      '<span class="ml-auto px-2 py-0.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 whitespace-nowrap">Đang ẩn</span>';
    row.parentNode.insertBefore(mask, row.nextSibling);

    cards[key] = { card: card, row: row, btn: btn, mask: mask, icon: btn.querySelector('.material-symbols-outlined') };
  });

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  function render(key) {
    var c = cards[key];
    if (!c) return;
    var isPublic = state[key];
    c.row.classList.toggle('hidden', !isPublic);
    c.mask.classList.toggle('hidden', isPublic);
    c.card.classList.toggle('border-dashed', !isPublic);
    c.icon.textContent = isPublic ? 'visibility' : 'visibility_off';
    c.btn.classList.toggle('text-slate-400', isPublic);
    c.btn.classList.toggle('text-[#1F4E78]', !isPublic);
    var title = isPublic ? 'Chế độ hiển thị: Công khai (bấm để ẩn)' : 'Chế độ hiển thị: Đang ẩn (bấm để công khai)';
    c.btn.title = title;
    c.btn.setAttribute('aria-label', LABELS[key] + ' – ' + title);
    c.btn.setAttribute('aria-pressed', String(!isPublic));
  }

  function renderAll() { Object.keys(cards).forEach(render); }

  function request(method, body) {
    if (location.protocol === 'file:') {
      return Promise.reject(Object.assign(new Error('file'), { offline: true }));
    }
    return fetch(API_URL, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || 'Lỗi máy chủ (' + res.status + ')');
        return data;
      });
    }, function () {
      throw Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
    });
  }

  function toggle(key) {
    var next = !state[key];
    var apply = function () {
      state[key] = next;
      render(key);
      toast(next ? 'Đã công khai ' + LABELS[key] : 'Đã ẩn ' + LABELS[key] + ' khỏi hồ sơ công khai');
    };

    if (!online) { apply(); return; }
    var btn = cards[key].btn;
    btn.disabled = true;
    request('PUT', { field: key, isPublic: next }).then(function (data) {
      state = data;
      renderAll();
      toast(next ? 'Đã công khai ' + LABELS[key] : 'Đã ẩn ' + LABELS[key] + ' khỏi hồ sơ công khai');
    }, function (err) {
      toast(err.offline ? 'Không kết nối được máy chủ, chưa lưu được' : 'Không lưu được: ' + err.message);
    }).then(function () { btn.disabled = false; });
  }

  Object.keys(cards).forEach(function (key) {
    cards[key].btn.addEventListener('click', function () { toggle(key); });
  });

  renderAll();
  request('GET').then(function (data) {
    state = data;
    renderAll();
  }, function (err) {
    online = false;
    toast(err.offline
      ? 'Chưa kết nối máy chủ: thay đổi ẩn/công khai sẽ không được lưu'
      : 'Không tải được trạng thái hiển thị: ' + err.message);
  });
})();
