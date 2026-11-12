// App shell dùng chung cho các màn "main screen 2" (theo bản mẫu 01_trang-chu.html):
// sidebar thu gọn / trượt trên mobile, hộp thoại đăng xuất, điều hướng data-path.

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
  var ROUTES = {
    'ban-lam-viec': '01_trang-chu.html',
    'kho-tai-lieu': '02_kho-tai-nguyen-hoc-thuat.html',
    'chi-tiet-tai-nguyen': '03_chi-tiet-tai-nguyen.html',
    'ho-so-nang-luc': '04_ho-so-nang-luc-cv.html',
    'nhom-nghien-cuu': '05_quan-tri-nhom-portfolio.html',
    'cho-ghep-nhom': '06_cho-ghep-nhom.html',
    'de-xuat-co-van': '07_danh-ba-giang-vien-co-van.html',
    'bai-toan-dn': '08_cong-doanh-nghiep-rd-tai-tro.html#tab-problems',
    'hoc-bong-tai-tro': '08_cong-doanh-nghiep-rd-tai-tro.html#tab-campaigns',
    'nop-proposal': '08_cong-doanh-nghiep-rd-tai-tro.html#tab-proposal-detail',
    'dang-nhap-sso': '../Login/02_dang-nhap-sso-microsoft365.html',
    'dang-ky': '../Login/03_dang-ky-b1-chon-vai-tro.html'
  };

  // Class của mục menu sidebar (giữ đúng style bản mẫu)
  var NAV = {
    active: ['bg-[#E6F0F7]', 'text-[#1F4E78]', 'font-semibold'],
    normal: ['text-[#1A1A1A]', 'hover:bg-[#F5F7FA]', 'font-medium'],
    iconActive: ['text-[#1F4E78]'],
    iconNormal: ['text-[#5F6368]', 'group-hover:text-[#1F4E78]', 'transition-colors'],
    badgeActive: ['bg-[#1F4E78]', 'text-white'],
    badgeNormal: ['bg-[#E6F0F7]', 'text-[#1F4E78]']
  };

  function swap(el, off, on) {
    if (!el) return;
    el.classList.remove.apply(el.classList, off);
    el.classList.add.apply(el.classList, on);
  }

  // Đánh dấu mục đang mở trên sidebar
  function markActive(path) {
    document.querySelectorAll('#sidebar nav [data-path]').forEach(function (item) {
      var on = item.getAttribute('data-path') === path;
      swap(item, on ? NAV.normal : NAV.active, on ? NAV.active : NAV.normal);
      swap(item.querySelector('.material-symbols-outlined'), on ? NAV.iconNormal : NAV.iconActive, on ? NAV.iconActive : NAV.iconNormal);
      swap(item.querySelector('.sidebar-badge'), on ? NAV.badgeNormal : NAV.badgeActive, on ? NAV.badgeActive : NAV.badgeNormal);
    });
  }

  // ---------- Điều hướng ----------
  function connectLinks() {
    document.querySelectorAll('[data-path]').forEach(function (el) {
      var target = ROUTES[el.getAttribute('data-path')];
      if (!target) return; // chức năng chưa có màn -> giữ nguyên
      if (el.tagName === 'A') {
        el.setAttribute('href', target);
        return;
      }
      el.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = target;
      });
    });
  }

  // Màn 08 có tab: mở đúng tab theo #hash (Bài toán DN / Học bổng & Tài trợ)
  function openTabFromHash() {
    var id = window.location.hash.slice(1);
    var panel = id && document.getElementById(id);
    if (!panel || !panel.classList.contains('tab-content') || typeof window.switchTab !== 'function') return;
    window.switchTab(id);
    window.scrollTo(0, 0);
    markActive(id === 'tab-campaigns' ? 'hoc-bong-tai-tro' : 'bai-toan-dn');
  }

  // ---------- Sidebar ----------
  function setupSidebar() {
    var sidebar = document.getElementById('sidebar');
    var toggleBtn = document.getElementById('toggle-sidebar-btn');
    var backdrop = document.getElementById('sidebar-backdrop');
    var mainWrapper = document.getElementById('main-wrapper');
    if (!sidebar || !toggleBtn || !backdrop || !mainWrapper) return;

    function isMobile() { return window.innerWidth < 768; }
    if (isMobile()) sidebar.classList.add('-translate-x-full');

    toggleBtn.addEventListener('click', function () {
      if (isMobile()) {
        var isOpen = !sidebar.classList.contains('-translate-x-full');
        sidebar.classList.toggle('-translate-x-full', isOpen);
        backdrop.classList.toggle('hidden', isOpen);
      } else {
        // Desktop: thu gọn còn thanh icon
        var collapsed = sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('md:ml-[72px]', collapsed);
        mainWrapper.classList.toggle('md:ml-[260px]', !collapsed);
      }
    });

    backdrop.addEventListener('click', function () {
      sidebar.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
    });

    window.addEventListener('resize', function () {
      if (!isMobile()) {
        backdrop.classList.add('hidden');
        sidebar.classList.remove('-translate-x-full');
      } else {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('-translate-x-full');
        mainWrapper.classList.remove('md:ml-[72px]');
        mainWrapper.classList.add('md:ml-[260px]');
      }
    });
  }

  // Ô tìm kiếm trên header: nhấn Enter -> mở Kho tài nguyên
  function setupHeaderSearch() {
    var input = document.querySelector('header input[type="text"]');
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') window.location.href = ROUTES['kho-tai-lieu'];
    });
  }

  function init() {
    setupSidebar();
    setupHeaderSearch();
    connectLinks();
    openTabFromHash();
    window.addEventListener('hashchange', openTabFromHash);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLogoutModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
