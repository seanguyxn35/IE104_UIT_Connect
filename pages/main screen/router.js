// Nối thanh nav giữa các màn chính: đọc data-path và chuyển sang file tương ứng.
(function () {
  var ROUTES = {
    'trang-chu': '01_trang-chu.html',
    'kham-pha-tai-nguyen': '02_kho-tai-nguyen-hoc-thuat.html',
    'ghep-nhom': '04_cho-ghep-nhom-lien-nganh.html',
    'giang-vien': '05_danh-ba-giang-vien-co-van.html',
    'bai-toan-doanh-nghiep': '06_cong-doanh-nghiep-rd-tai-tro.html#tab-problems',
    'tai-tro': '06_cong-doanh-nghiep-rd-tai-tro.html#tab-campaigns',
    'dang-nhap': '../Login/01_dang-nhap-email.html',
    'dang-ky': '../Login/03_dang-ky-b1-chon-vai-tro.html'
  };

  // Trang 06 có tab: mở đúng tab theo #hash (Bài toán doanh nghiệp / Tài trợ)
  var navClasses = null;
  function openTabFromHash() {
    var id = window.location.hash.slice(1);
    if (!id || typeof window.switchTab !== 'function' || !document.getElementById(id)) return;
    window.switchTab(id);
    window.scrollTo(0, 0); // không nhảy xuống vị trí anchor

    // Gạch chân đúng mục trên nav: Stitch chỉ thiết kế sẵn "Bài toán doanh nghiệp" ở trạng thái active
    var problems = document.querySelector('header [data-path="bai-toan-doanh-nghiep"]');
    var funding = document.querySelector('header [data-path="tai-tro"]');
    if (!problems || !funding) return;
    if (!navClasses) navClasses = { active: problems.className, normal: funding.className };
    var onFunding = id === 'tab-campaigns';
    problems.className = onFunding ? navClasses.normal : navClasses.active;
    funding.className = onFunding ? navClasses.active : navClasses.normal;
  }

  function connect() {
    document.querySelectorAll('[data-path]').forEach(function (el) {
      var target = ROUTES[el.getAttribute('data-path')];
      if (!target) return;

      if (el.tagName === 'A') {
        el.setAttribute('href', target);
        return;
      }
      el.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = target;
      });
    });
    openTabFromHash();
  }

  window.addEventListener('hashchange', openTabFromHash);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
