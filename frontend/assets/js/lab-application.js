// SV-07 Chợ ghép nhóm: nối nút "Ứng tuyển ngay" (có data-topic-id) với POST /api/lab-applications.
// Luồng và hợp đồng API: thuc-hanh/DESIGN.md, mục 3. Giao diện chỉ hiển thị kết quả máy chủ trả về,
// không tự quyết định thành công hay thất bại.
(function () {
  var API_URL = '/api/lab-applications';

  // Thông báo theo mã phản hồi (bảng 3.3 trong DESIGN.md)
  var MESSAGES = {
    CREATED: 'Ứng tuyển thành công! Giảng viên sẽ phản hồi sớm.',
    INVALID_INPUT: 'Dữ liệu gửi lên không hợp lệ.',
    NETWORK: 'Không kết nối được máy chủ. Hãy chạy backend (npm start) rồi thử lại.',
    FILE_PROTOCOL: 'Hãy mở trang qua máy chủ: http://localhost:3000/pages/sv/07_cho-ghep-nhom.html',
  };

  // ---------- Hộp thông báo (góc dưới bên phải) ----------
  var toast = document.createElement('div');
  toast.id = 'apply-result';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText =
    'position:fixed;right:24px;bottom:24px;z-index:100;max-width:360px;padding:12px 16px;border-radius:10px;' +
    'font:500 14px/1.45 Inter,sans-serif;box-shadow:0 10px 25px rgba(15,23,42,.15);display:none;';
  document.body.appendChild(toast);
  var hideTimer;

  function showResult(type, text) {
    var styles = {
      success: { bg: '#ECFDF5', border: '#10B981', color: '#065F46' },
      warning: { bg: '#FFFBEB', border: '#F59E0B', color: '#92400E' },
      error: { bg: '#FEF2F2', border: '#EF4444', color: '#991B1B' },
    }[type];
    toast.textContent = text;
    toast.style.background = styles.bg;
    toast.style.border = '1px solid ' + styles.border;
    toast.style.color = styles.color;
    toast.style.display = 'block';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { toast.style.display = 'none'; }, 6000);
  }

  // ---------- Trạng thái nút ----------
  function setButtonState(button, state) {
    var label = button.querySelector('span');
    if (!button.dataset.label) button.dataset.label = label.textContent;

    if (state === 'sending') {
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'wait';
      label.textContent = 'Đang gửi…';
    } else if (state === 'applied') {
      button.disabled = true;
      button.style.opacity = '1';
      button.style.cursor = 'not-allowed';
      button.style.background = '#E2E8F0';
      button.style.color = '#475569';
      label.textContent = 'Đã ứng tuyển';
    } else {
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
      label.textContent = button.dataset.label;
    }
  }

  // ---------- Gửi yêu cầu ----------
  async function apply(button) {
    if (location.protocol === 'file:') {
      showResult('error', MESSAGES.FILE_PROTOCOL);
      return;
    }

    var topicId = Number(button.dataset.topicId);
    setButtonState(button, 'sending');

    var response, body;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topicId }),
        signal: AbortSignal.timeout(15000), // không để nút kẹt ở "Đang gửi…" quá 15 giây
      });
      body = await response.json();
    } catch (err) {
      setButtonState(button, 'idle');
      showResult('error', MESSAGES.NETWORK);
      return;
    }

    if (response.status === 201) {
      // R1
      setButtonState(button, 'applied');
      showResult('success', MESSAGES.CREATED + ' (Mã đơn #' + body.applicationId + ')');
    } else if (body.code === 'ALREADY_APPLIED') {
      // R2: đơn đã tồn tại -> nút cũng chuyển sang "Đã ứng tuyển"
      setButtonState(button, 'applied');
      showResult('warning', body.message);
    } else if (body.code === 'TOPIC_FULL') {
      // R3
      setButtonState(button, 'idle');
      showResult('warning', body.message);
    } else {
      // 400 / 404 / 500
      setButtonState(button, 'idle');
      showResult('error', body.code === 'INVALID_INPUT' ? MESSAGES.INVALID_INPUT : body.message);
    }
  }

  document.querySelectorAll('button[data-topic-id]').forEach(function (button) {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      if (!button.disabled) apply(button);
    });
  });
})();
