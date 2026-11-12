// Banner tự động chuyển (carousel) cho mọi khối [data-banner-slider]:
// tự chạy sau data-interval ms, nút trước/sau, chấm chỉ vị trí, dừng khi rê chuột, vuốt trên điện thoại.
// Ảnh chưa có (banners/banner-N.jpg lỗi) -> giữ khung mẫu [data-banner-placeholder].
(function () {
  var DOT = 'h-2 rounded-full transition-all duration-300 ';
  var DOT_ACTIVE = DOT + 'w-6 bg-white';
  var DOT_NORMAL = DOT + 'w-2 bg-white/60 hover:bg-white';

  function setupImages(slides) {
    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      var placeholder = slide.querySelector('[data-banner-placeholder]');
      if (!img) return;
      function loaded() { if (placeholder) placeholder.style.display = 'none'; }
      function failed() { img.style.display = 'none'; }
      if (img.complete) {
        if (img.naturalWidth) loaded(); else failed();
      } else {
        img.addEventListener('load', loaded);
        img.addEventListener('error', failed);
      }
    });
  }

  function setup(root) {
    var track = root.querySelector('[data-banner-track]');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var prevBtn = root.querySelector('[data-banner-prev]');
    var nextBtn = root.querySelector('[data-banner-next]');
    var dotsBox = root.querySelector('[data-banner-dots]');
    var interval = parseInt(root.getAttribute('data-interval'), 10) || 5000;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var index = 0, timer = null, hovering = false;

    setupImages(slides);

    if (slides.length < 2) {
      [prevBtn, nextBtn, dotsBox].forEach(function (el) { if (el) el.style.display = 'none'; });
      return;
    }

    var dots = slides.map(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Chuyển tới banner ' + (i + 1));
      dot.addEventListener('click', function () { go(i); restart(); });
      if (dotsBox) dotsBox.appendChild(dot);
      return dot;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      slides.forEach(function (slide, k) {
        slide.setAttribute('aria-hidden', k === index ? 'false' : 'true');
        slide.tabIndex = k === index ? 0 : -1;
      });
      dots.forEach(function (dot, k) {
        dot.className = k === index ? DOT_ACTIVE : DOT_NORMAL;
        dot.setAttribute('aria-current', k === index ? 'true' : 'false');
      });
    }

    function start() {
      if (reduceMotion || hovering || timer || document.hidden) return;
      timer = setInterval(function () { go(index + 1); }, interval);
    }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1); restart(); });

    // Dừng khi người xem đang rê chuột / thao tác bàn phím trong banner
    root.addEventListener('mouseenter', function () { hovering = true; stop(); });
    root.addEventListener('mouseleave', function () { hovering = false; start(); });
    root.addEventListener('focusin', function () { hovering = true; stop(); });
    root.addEventListener('focusout', function () { hovering = false; start(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    // Vuốt trái/phải trên màn hình cảm ứng; vuốt xong thì không tính là bấm vào banner
    var startX = null, swiped = false;
    track.addEventListener('pointerdown', function (e) { startX = e.clientX; swiped = false; });
    track.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) { swiped = true; go(index + (dx < 0 ? 1 : -1)); restart(); }
    });
    root.addEventListener('click', function (e) {
      if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; }
    }, true);

    go(0);
    start();
  }

  function init() {
    document.querySelectorAll('[data-banner-slider]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
