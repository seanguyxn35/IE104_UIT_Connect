// SV-04: công tắc ẩn / công khai trên 3 thẻ chỉ số (GPA, Điểm rèn luyện, Đề tài & Công bố)
// và trên tiêu đề 2 mục (Học vấn, Kỹ năng).
// Trạng thái lưu ở CSDL qua /api/profile-visibility. Khi ẩn, người xem hồ sơ không thấy phần này;
// riêng chủ hồ sơ vẫn thấy: thẻ chỉ số ở dạng che kèm nhãn "Đang ẩn", mục được viền nét đứt.
(function () {
  var API_URL = '/api/profile-visibility';
  var LABELS = { gpa: 'GPA', drl: 'Điểm rèn luyện', projects: 'Đề tài & Công bố', education: 'mục Học vấn', skills: 'mục Kỹ năng' };
  var state = { gpa: true, drl: true, projects: true, education: true, skills: true };
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

    cards[key] = {
      btn: btn,
      show: function (isPublic) {
        row.classList.toggle('hidden', !isPublic);
        mask.classList.toggle('hidden', isPublic);
        card.classList.toggle('border-dashed', !isPublic);
      }
    };
  });

  // Công tắc ở tiêu đề mục: cùng cách lưu với thẻ chỉ số, chỉ khác phần hiển thị
  document.querySelectorAll('[data-vis-section]').forEach(function (input) {
    var text = input.parentElement.querySelector('[data-vis-text]');
    var section = input.closest('section');
    cards[input.dataset.visSection] = {
      btn: input,
      show: function (isPublic) {
        text.textContent = isPublic ? 'Công khai' : 'Đang ẩn';
        text.classList.toggle('text-[#1F4E78]', isPublic);
        text.classList.toggle('text-[#5F6368]', !isPublic);
        section.classList.toggle('border-dashed', !isPublic);
      }
    };
  });

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  function render(key) {
    var c = cards[key];
    if (!c) return;
    var isPublic = state[key] !== false; // máy chủ không trả trường này thì giữ mặc định công khai
    c.show(isPublic);
    c.btn.checked = isPublic;
    c.btn.parentElement.title = isPublic ? 'Chế độ hiển thị: Công khai (bấm để ẩn)' : 'Chế độ hiển thị: Đang ẩn (bấm để công khai)';
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
    var next = cards[key].btn.checked;
    if (!online) {
      state[key] = next;
      render(key);
      toast((next ? 'Công khai ' : 'Ẩn ') + LABELS[key] + ': chưa lưu, không kết nối được máy chủ');
      return;
    }
    var btn = cards[key].btn;
    btn.disabled = true;
    request('PUT', { field: key, isPublic: next }).then(function (data) {
      // Chỉ cập nhật công tắc vừa lưu, để hai lần bấm liên tiếp không ghi đè hiển thị của nhau
      state[key] = data[key];
      render(key);
      toast(next ? 'Đã công khai ' + LABELS[key] : 'Đã ẩn ' + LABELS[key] + ' khỏi hồ sơ công khai');
    }, function (err) {
      render(key); // trả công tắc về trạng thái đã lưu
      toast(err.offline ? 'Không kết nối được máy chủ, chưa lưu được' : 'Không lưu được: ' + err.message);
    }).then(function () { btn.disabled = false; });
  }

  Object.keys(cards).forEach(function (key) {
    cards[key].btn.addEventListener('change', function () { toggle(key); });
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
