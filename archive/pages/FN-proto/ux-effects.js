// Hiệu ứng nút dùng chung cho mọi trang (SV, GV, Login) – đi kèm ux-effects.css.
// Thêm data-no-ripple vào phần tử (hoặc phần tử cha) để tắt hiệu ứng.

// ---------- Gợn sóng + lún nhẹ khi nhấn ----------
// Áp cho: nút, tab, công tắc, mục sidebar, link dạng nút (có nền / viền),
// và các thẻ bấm được (có onclick hoặc class cursor-pointer).
(function () {
  var TARGET = [
    'button', '[role="button"]', '[role="tab"]', '[role="switch"]', 'summary',
    'a.nav-item', 'a[class*="bg-"]', 'a[class*="border"]',
    '[onclick]', '.cursor-pointer'
  ].join(', ');
  var TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phần tử nhận hiệu ứng: bỏ qua khi bấm vào ô nhập chữ; checkbox/radio thì lấy hàng (label) chứa nó
  function findTarget(node) {
    if (!node || !node.closest) return null;
    if (node.closest(TEXT_INPUT)) return null;
    if (node.matches('input')) node = node.parentElement;
    var el = node && node.closest(TARGET);
    if (!el || el === document.body || el.disabled || el.closest('[data-no-ripple]')) return null;
    // Lớp phủ toàn màn hình (nền mờ của hộp thoại...) không phải nút
    if (getComputedStyle(el).position === 'fixed') return null;
    return el;
  }

  // Màu gợn sóng theo nền nút: nền tối -> sóng trắng, nền sáng -> sóng xanh thương hiệu
  function rippleColor(el) {
    var node = el;
    while (node && node !== document.body) {
      var c = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
      if (c && (c[3] === undefined || +c[3] > 0.3)) {
        var lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
        return lum < 0.55 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(31, 78, 120, 0.16)';
      }
      node = node.parentElement;
    }
    return 'rgba(31, 78, 120, 0.16)';
  }

  function ripple(el, x, y) {
    if (getComputedStyle(el).position === 'static') {
      // Có phần tử con "absolute" đang canh theo khung bên ngoài -> không đổi position, chỉ lún nhẹ
      if (el.querySelector('[class*="absolute"]')) return;
      el.style.position = 'relative';
    }
    var host = el.querySelector(':scope > .ux-ripple-host');
    if (!host) {
      host = document.createElement('span');
      host.className = 'ux-ripple-host';
      host.setAttribute('aria-hidden', 'true');
      // Chèn vào đầu nút để không làm sai các selector kiểu "span:last-child" trong script của trang
      el.insertBefore(host, el.firstChild);
    }
    var r = el.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var dot = document.createElement('span');
    dot.className = 'ux-ripple';
    dot.style.width = dot.style.height = size + 'px';
    dot.style.left = (x - r.left - size / 2) + 'px';
    dot.style.top = (y - r.top - size / 2) + 'px';
    dot.style.background = rippleColor(el);
    host.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 600);
  }

  function press(el) {
    var r = el.getBoundingClientRect();
    var cls = r.width > 240 || r.height > 120 ? 'ux-press-soft' : 'ux-press';
    el.classList.remove('ux-press', 'ux-press-soft');
    void el.offsetWidth; // chạy lại animation khi nhấn liên tục
    el.classList.add(cls);
  }

  function effect(el, x, y) {
    if (reduceMotion) return;
    ripple(el, x, y);
    press(el);
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var el = findTarget(e.target);
    if (el) effect(el, e.clientX, e.clientY);
  });

  // Bàn phím: Enter / Space cũng có hiệu ứng, sóng lan từ giữa nút
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = findTarget(document.activeElement);
    if (!el || el !== document.activeElement) return;
    var r = el.getBoundingClientRect();
    effect(el, r.left + r.width / 2, r.top + r.height / 2);
  });

  document.addEventListener('animationend', function (e) {
    if (e.animationName === 'ux-press' || e.animationName === 'ux-press-soft') {
      e.target.classList.remove('ux-press', 'ux-press-soft');
    }
  });
})();

// ---------- Công tắc bật / tắt (button role="switch") ----------
// Trang nào tự xử lý công tắc thì gọi e.preventDefault() hoặc thêm data-no-toggle.
(function () {
  var OFF_BG = 'bg-slate-300';

  document.addEventListener('click', function (e) {
    var sw = e.target.closest && e.target.closest('[role="switch"]');
    if (!sw || e.defaultPrevented || sw.disabled || sw.hasAttribute('data-no-toggle')) return;
    var wasOn = sw.getAttribute('aria-checked') === 'true';
    var bg = [].filter.call(sw.classList, function (c) { return /^bg-/.test(c); })[0];
    // Nhớ màu nền lúc bật của chính công tắc này (mặc định xanh thương hiệu)
    if (!sw.dataset.onBg) sw.dataset.onBg = wasOn && bg ? bg : 'bg-[#1F4E78]';
    if (bg) sw.classList.remove(bg);
    sw.classList.add(wasOn ? OFF_BG : sw.dataset.onBg);
    var knob = sw.querySelector(':scope > span:not(.ux-ripple-host)');
    if (knob) {
      knob.classList.toggle('translate-x-5', !wasOn);
      knob.classList.toggle('translate-x-0', wasOn);
    }
    sw.setAttribute('aria-checked', String(!wasOn));
  });
})();
