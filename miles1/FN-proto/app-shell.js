// App shell dùng chung cho các trang FN-proto (theo bản mẫu 01_trang-chu.html):
// sidebar thu gọn / ngăn kéo trên mobile, hộp thoại đăng xuất, nút có data-href.
// Hiệu ứng nút (gợn sóng, lún nhẹ, công tắc) nằm ở ux-effects.js.

// ---------- Hộp thoại đăng xuất (gọi từ onclick trong HTML) ----------
function openLogoutModal() {
  var modal = document.getElementById('logout-modal');
  var card = document.getElementById('logout-modal-card');
  if (!modal || !card) return;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.add('opacity-100');
  card.classList.remove('scale-95');
  card.classList.add('scale-100');
}

function closeLogoutModal() {
  var modal = document.getElementById('logout-modal');
  var card = document.getElementById('logout-modal-card');
  if (!modal || !card) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.classList.remove('opacity-100');
  card.classList.add('scale-95');
  card.classList.remove('scale-100');
}

(function () {
  var sidebar = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('hamburger-btn');
  var backdrop = document.getElementById('sidebar-backdrop');

  function isMobile() { return window.innerWidth < 768; }

  function setDrawer(open) {
    sidebar.classList.toggle('is-open', open);
    backdrop.classList.toggle('hidden', !open);
  }

  if (sidebar && toggleBtn && backdrop) {
    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (isMobile()) setDrawer(!sidebar.classList.contains('is-open'));
      else sidebar.classList.toggle('collapsed'); // desktop: 260px <-> 72px
    });

    backdrop.addEventListener('click', function () { setDrawer(false); });

    window.addEventListener('resize', function () {
      if (isMobile()) sidebar.classList.remove('collapsed');
      else setDrawer(false);
    });
  }

  // Nút (không phải thẻ <a>) cần chuyển trang: <button data-href="...">
  document.querySelectorAll('[data-href]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = el.getAttribute('data-href');
    });
  });

  // Menu "Tạo mới" (Doanh nghiệp): bấm ra ngoài hoặc Esc thì đóng
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.create-menu[open]').forEach(function (menu) {
      if (!menu.contains(e.target)) menu.removeAttribute('open');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.create-menu[open]').forEach(function (menu) { menu.removeAttribute('open'); });
    closeLogoutModal();
    if (sidebar && backdrop && isMobile()) setDrawer(false);
  });
})();
