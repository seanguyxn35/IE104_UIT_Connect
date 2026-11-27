// SV-05 Đề tài của tôi.
// - Danh sách: GET /api/student-projects; không có máy chủ (file://, GitHub Pages) thì hiện dữ liệu mẫu và báo "chưa lưu".
// - Lọc theo trạng thái (thanh tab), tên (ô tìm kiếm), loại, vai trò; sắp xếp (các ô chọn cạnh ô tìm kiếm).
// - Bấm vào một đề tài: popup chi tiết, tải / xem tệp PDF. Biểu mẫu dùng chung để tạo bản nháp (POST) và sửa (PATCH).
// - Quyền (sửa, xóa) do máy chủ quyết định theo vai trò trong nhóm: canEdit, canDelete.
// Mọi nội dung lấy từ dữ liệu đều gán bằng textContent, không ghép chuỗi HTML.
var API_URL = '/api/student-projects';
var MAX_FILE_BYTES = 10 * 1024 * 1024; // khớp giới hạn của máy chủ

var TAB_BASE = 'status-tab-btn shrink-0 flex items-center gap-2 pt-2 pb-3 px-space-lg rounded-t-lg border-b-2 font-body-md text-body-md font-medium whitespace-nowrap transition-colors';
var TAB_OFF = TAB_BASE + ' text-on-surface-variant border-transparent hover:bg-surface-container-low hover:text-on-surface';
var TAB_ON = TAB_BASE + ' text-primary border-primary bg-primary-fixed/30 font-semibold';
var COUNT_BASE = 'tab-count min-w-[22px] text-center px-1.5 py-0.5 rounded-xl font-label-sm text-label-sm ';
var activeStatus = 'all';

// Trạng thái trong CSDL -> tab, nhãn, màu, biểu tượng
var STATUSES = {
  Draft: { tab: 'draft', label: 'Bản nháp', chip: 'bg-surface-container-high text-on-surface-variant', icon: 'edit' },
  Pending_Review: { tab: 'pending', label: 'Chờ thẩm định', chip: 'bg-secondary-fixed text-on-secondary-fixed', icon: 'hourglass_top' },
  Revision_Needed: { tab: 'changes_requested', label: 'Cần bổ sung', chip: 'bg-status-warning/15 text-status-warning', icon: 'warning' },
  Approved: { tab: 'approved', label: 'Đã thẩm định', chip: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'check_circle' },
  Published: { tab: 'approved', label: 'Đã công bố', chip: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'public' },
  Rejected: { tab: 'rejected', label: 'Bị từ chối', chip: 'bg-error-container text-error', icon: 'cancel' },
  Hidden: { tab: 'hidden', label: 'Đang ẩn', chip: 'bg-surface-container-high text-on-surface-variant', icon: 'visibility_off' }
};
// Loại trong CSDL -> giá trị ô lọc "Loại tài nguyên", nhãn, màu, biểu tượng
var TYPES = {
  Project: { filter: 'research', label: 'Đề tài NCKH', full: 'Đề tài NCKH sinh viên', chip: 'bg-tertiary-fixed-dim text-on-tertiary-fixed', icon: 'science' },
  Product: { filter: 'product', label: 'Sản phẩm', full: 'Sản phẩm công nghệ / Ứng dụng', chip: 'bg-secondary-fixed text-on-secondary-fixed', icon: 'devices' },
  Paper: { filter: 'paper', label: 'Bài báo', full: 'Bài báo khoa học', chip: 'bg-primary-fixed text-on-primary-fixed', icon: 'article' },
  Thesis: { filter: 'paper', label: 'Luận văn', full: 'Luận văn tốt nghiệp', chip: 'bg-primary-fixed text-on-primary-fixed', icon: 'menu_book' }
};
var DECISIONS = { Approved: 'Đạt', Revision_Needed: 'Cần bổ sung', Rejected: 'Không đạt' };
// Thứ tự khi sắp xếp theo tiến độ thẩm định: càng gần hoàn tất càng đứng trước
var PROGRESS_ORDER = { Published: 0, Approved: 1, Pending_Review: 2, Revision_Needed: 3, Draft: 4, Rejected: 5, Hidden: 6 };

// Dữ liệu mẫu khi không có máy chủ – toàn bộ là dữ liệu giả
var SAMPLE = [
  { resourceId: 's1', type: 'Product', status: 'Approved', title: 'Hệ thống AI Edge giám sát an toàn giao thông (EdgeVision-Traffic)', image: '../../assets/img/img-10.jpg',
    abstract: 'Hệ thống camera AI chạy trên thiết bị biên, phát hiện vi phạm và tình huống nguy hiểm theo thời gian thực.', keywords: 'Edge AI, YOLOv8, Jetson',
    field: 'Thị giác máy tính', team: { name: 'VisionLab UIT' }, lecturer: 'TS. Nguyễn Văn A', role: 'Leader', trlLevel: 6, venue: 'Lab CV&PR',
    createdAt: '2026-08-20', updatedAt: '2026-10-12', latestReview: { decision: 'Approved', comment: 'Kết quả thực nghiệm đầy đủ, đạt yêu cầu công bố.', score: 88, date: '2026-10-12', reviewer: 'TS. Nguyễn Văn A' } },
  { resourceId: 's2', type: 'Paper', status: 'Revision_Needed', title: 'Federated Learning bảo mật dữ liệu y tế đa trung tâm', image: '../../assets/img/img-15.jpg',
    abstract: 'Huấn luyện mô hình chẩn đoán trên dữ liệu của nhiều bệnh viện mà không chia sẻ dữ liệu gốc.', keywords: 'Federated Learning, Y tế số, Bảo mật',
    field: 'Y tế số & Tin sinh học', team: null, lecturer: 'TS. Nguyễn Văn A', role: 'Member',
    createdAt: '2026-07-01', updatedAt: '2026-10-10', latestReview: { decision: 'Revision_Needed', comment: 'Bổ sung kết quả thực nghiệm benchmark độ trễ và cập nhật danh mục tài liệu tham khảo IEEE.', score: null, date: '2026-10-10', reviewer: 'TS. Nguyễn Văn A' } },
  { resourceId: 's3', type: 'Project', status: 'Pending_Review', title: 'Tối ưu mô hình Vision Transformers trên SoC biên nhúng', image: '../../assets/img/img-01.jpg',
    abstract: 'Lượng tử hóa và cắt tỉa mô hình ViT để chạy trên SoC công suất thấp.', keywords: 'Vision Transformer, SoC, Quantization',
    field: 'Hệ thống nhúng & IoT', team: null, lecturer: null, role: 'Leader', createdAt: '2026-09-15', updatedAt: '2026-10-05', latestReview: null },
  { resourceId: 's4', type: 'Product', status: 'Draft', title: 'Hệ thống truy xuất nguồn gốc chuỗi cung ứng nông sản thông minh', image: '../../assets/img/img-14.jpg',
    abstract: null, keywords: 'Blockchain, Truy xuất nguồn gốc', field: 'Blockchain & Fintech', team: null, lecturer: null, role: 'Leader',
    createdAt: '2026-10-01', updatedAt: '2026-10-01', latestReview: null }
];

var projects = [];
var online = false;
var options = null; // { fields, teams } cho biểu mẫu tạo đề tài

var listEl = document.getElementById('project-list');
var emptyEl = document.getElementById('empty-state-notice');
var searchInput = document.getElementById('project-search');
var typeSelect = document.getElementById('filter-type');
var roleSelect = document.getElementById('filter-role');
var sortSelect = document.getElementById('sort-projects');
var clearButton = document.getElementById('clear-filters');

// ---------- Tiện ích ----------
// h('div', 'cls', [con...]) – con là chuỗi (gán làm chữ) hoặc phần tử
function h(tag, className, children) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  (children || []).forEach(function (c) {
    if (c === null || c === undefined || c === false || c === '') return;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  });
  return el;
}
function icon(name, className) { return h('span', 'material-symbols-outlined ' + (className || 'text-[16px]'), [name]); }
function viDate(value) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
function roleKey(p) { return p.role === 'Leader' ? 'owner' : 'member'; }
function statusOf(p) { return STATUSES[p.status] || { tab: 'other', label: p.status, chip: 'bg-surface-container-high text-on-surface-variant', icon: 'help' }; }
function typeOf(p) { return TYPES[p.type] || { filter: 'other', label: p.type, full: p.type, chip: 'bg-surface-container-high text-on-surface', icon: 'description' }; }

var toastEl = null, toastTimer = null;
function toast(message) {
  if (!toastEl) {
    toastEl = h('div', 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface font-body-md text-body-md shadow-lg hidden');
    toastEl.id = 'project-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.add('hidden'); }, 4000);
}

function request(method, path, body) {
  if (location.protocol === 'file:') return Promise.reject(Object.assign(new Error('file'), { offline: true }));
  return fetch(API_URL + (path || ''), {
    method: method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  }).then(function (res) {
    if (res.status === 204) return null;
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok) throw Object.assign(new Error(data.message || 'Lỗi máy chủ (' + res.status + ')'), { code: data.code });
      return data;
    });
  }, function () {
    throw Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
  });
}

// ---------- Dạng xem: danh sách / ô (lưới) ----------
var VIEW_KEY = 'uitc_sv05_view'; // chỉ là tùy chọn hiển thị, lưu trên trình duyệt này
var CARD_BASE = 'project-item bg-surface-container-lowest rounded-lg shadow-xs hover:shadow-md transition-all p-space-md gap-space-md cursor-pointer ';
// Dạng danh sách co theo bề rộng thật của danh sách (container query), không theo cửa sổ vì còn sidebar:
// hẹp: xếp dọc; vừa: ảnh + nội dung, nút ở hàng dưới; rộng: ảnh, nội dung, nút trên một hàng
var TITLE_CLASS = 'font-headline-sm text-headline-sm text-on-surface hover:text-primary transition-colors mt-1.5 line-clamp-2 break-words text-left max-w-full';
var META_CLASS = 'flex items-center gap-x-space-md gap-y-1 flex-wrap font-body-sm text-body-sm text-on-surface-variant mt-2';
var THUMB_CLASS = 'w-full rounded overflow-hidden flex-shrink-0 bg-surface-container flex items-center justify-center text-outline ';
var VIEWS = {
  list: {
    container: '@container flex flex-col gap-space-md',
    card: CARD_BASE + 'grid w-full grid-cols-1 items-center @md:grid-cols-[120px_minmax(0,1fr)] @3xl:grid-cols-[130px_minmax(0,1fr)_auto]',
    thumb: THUMB_CLASS + 'h-24',
    title: TITLE_CLASS,
    meta: META_CLASS,
    actions: 'flex items-center gap-space-sm justify-self-end @md:col-span-2 @3xl:col-span-1'
  },
  grid: {
    container: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md',
    card: CARD_BASE + 'flex min-w-0 flex-col items-stretch',
    thumb: THUMB_CLASS + 'h-36',
    title: TITLE_CLASS,
    meta: META_CLASS,
    actions: 'flex items-center justify-end gap-space-sm mt-auto'
  }
};
var viewMode = readView();

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; }
}

// Chỉ đổi lớp trình bày, giữ nguyên phần tử nên bộ lọc, thứ tự sắp xếp và sự kiện không bị ảnh hưởng
function styleCard(card) {
  var view = VIEWS[viewMode];
  var hidden = card.classList.contains('hidden');
  card.className = view.card + (hidden ? ' hidden' : '');
  card.querySelector('[data-part="thumb"]').className = view.thumb;
  card.querySelector('[data-title]').className = view.title;
  card.querySelector('[data-part="meta"]').className = view.meta;
  card.querySelector('[data-part="actions"]').className = view.actions;
}

function applyView() {
  listEl.className = VIEWS[viewMode].container;
  listEl.querySelectorAll('.project-item').forEach(styleCard);
  document.querySelectorAll('#view-switcher [data-view]').forEach(function (b) {
    var on = b.dataset.view === viewMode;
    b.className = 'w-8 h-8 rounded flex items-center justify-center transition-all ' +
      (on ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-outline hover:text-on-surface');
    b.setAttribute('aria-pressed', String(on));
  });
}

function setView(mode) {
  viewMode = mode === 'grid' ? 'grid' : 'list';
  try { localStorage.setItem(VIEW_KEY, viewMode); } catch (e) { /* trình duyệt chặn lưu: chỉ áp dụng cho lần xem này */ }
  applyView();
}

// ---------- Thẻ đề tài ----------
function chip(text, className, iconName) {
  return h('span', 'px-2.5 py-0.5 rounded-xl font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ' + className,
    [iconName && icon(iconName, 'text-[14px]'), h('span', null, [text])]);
}
function typeChip(p) { var t = typeOf(p); return h('span', 'px-2 py-0.5 rounded-sm font-label-sm text-label-sm font-semibold ' + t.chip, [t.label]); }
function statusChip(p) { var s = statusOf(p); return chip(s.label, s.chip, s.icon); }
function roleChip(p) {
  return h('span', 'px-2 py-0.5 rounded-xl bg-surface-container-low font-label-sm text-label-sm ' + (p.role === 'Leader' ? 'text-primary font-semibold' : 'text-on-surface-variant'), [p.role]);
}

function buildCard(p) {
  var t = typeOf(p);
  var thumb = h('div');
  thumb.dataset.part = 'thumb';
  if (p.image) {
    var img = h('img', 'w-full h-full object-cover');
    img.alt = '';
    img.src = p.image;
    thumb.appendChild(img);
  } else {
    thumb.appendChild(icon(t.icon, 'text-[40px]'));
  }

  var title = h('button', null, [p.title]);
  title.type = 'button';
  title.dataset.title = '';
  title.setAttribute('aria-haspopup', 'dialog');

  var meta = [];
  if (p.team) meta.push(h('span', 'flex items-center gap-1', [icon('group', 'text-[16px] text-outline'), h('span', null, ['Nhóm: ' + p.team.name])]));
  if (p.lecturer) meta.push(h('span', 'flex items-center gap-1', [icon('school', 'text-[16px] text-outline'), h('span', null, ['GVHD: ' + p.lecturer])]));
  meta.push(roleChip(p));
  meta.push(h('span', 'text-outline', ['Cập nhật: ' + viDate(p.updatedAt)]));
  var metaRow = h('div');
  metaRow.dataset.part = 'meta';
  // Các mục cách nhau bằng khoảng trống, không dùng dấu "•" vì khi xuống dòng dấu bị lẻ ở cuối hàng
  meta.forEach(function (m) { metaRow.appendChild(m); });

  var body = h('div', 'flex-1 min-w-0 flex flex-col w-full', [
    h('div', 'flex items-center gap-space-xs flex-wrap', [typeChip(p), statusChip(p)]),
    title,
    metaRow
  ]);
  if (p.status === 'Revision_Needed' && p.latestReview && p.latestReview.comment) {
    body.appendChild(h('div', 'mt-2.5 p-2 bg-status-warning/10 rounded font-body-sm text-body-sm text-on-surface flex items-start gap-2', [
      icon('announcement', 'text-[18px] text-status-warning flex-shrink-0 mt-0.5'),
      h('span', 'min-w-0', [h('strong', null, ['Giảng viên yêu cầu: ']), p.latestReview.comment])
    ]));
  }

  var detail = h('button', 'h-9 px-space-md bg-surface-container-lowest text-primary border border-primary/30 hover:bg-brand-light-blue hover:border-primary rounded-lg font-label-md text-label-md shadow-xs transition-colors flex items-center gap-1.5', [icon('visibility'), h('span', null, ['Xem chi tiết'])]);
  detail.type = 'button';
  detail.setAttribute('aria-haspopup', 'dialog');

  var actions = h('div', null, [detail]);
  actions.dataset.part = 'actions';
  var card = h('article', 'project-item', [thumb, body, actions]);
  styleCard(card);
  card.dataset.cardStatus = statusOf(p).tab;
  card.dataset.type = t.filter;
  card.dataset.role = roleKey(p);
  card.dataset.updated = p.updatedAt || '';
  card.dataset.progress = String(PROGRESS_ORDER[p.status] !== undefined ? PROGRESS_ORDER[p.status] : 9);
  card.dataset.id = String(p.resourceId);
  // Bấm bất kỳ đâu trên thẻ (trừ liên kết) để mở chi tiết; bàn phím dùng tên đề tài hoặc nút "Xem chi tiết"
  card.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    openDetail(p, e.target.closest('button') || title);
  });
  return card;
}

function renderList() {
  var loading = document.getElementById('project-loading');
  if (loading) loading.remove();
  listEl.querySelectorAll('.project-item').forEach(function (c) { c.remove(); });
  projects.forEach(function (p) { listEl.insertBefore(buildCard(p), emptyEl); });

  // Số trên từng tab
  document.querySelectorAll('.status-tab-btn').forEach(function (b) {
    var tab = b.dataset.statusFilter;
    var count = b.querySelector('.tab-count');
    if (count) count.textContent = String(projects.filter(function (p) { return tab === 'all' || statusOf(p).tab === tab; }).length);
  });
  sortProjects();
  applyProjectFilters();
}

// ---------- Lọc & sắp xếp ----------
function switchProjectTab(btn, status) {
  document.querySelectorAll('.status-tab-btn').forEach(function (b) {
    var on = b === btn;
    b.className = on ? TAB_ON : TAB_OFF;
    b.setAttribute('aria-selected', String(on));
    var count = b.querySelector('.tab-count');
    if (count) count.className = COUNT_BASE + (on ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface');
  });

  activeStatus = status;
  applyProjectFilters();
}

// Bỏ dấu tiếng Việt, chữ hoa và khoảng trắng thừa để gõ "toi uu" vẫn ra "Tối ưu"
function normalizeText(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}

function cardTitle(card) {
  var title = card.querySelector('[data-title]');
  return title ? title.textContent.trim() : '';
}

function selectedValue(select) { return select ? select.value : 'all'; }

// Một thẻ hiển thị khi khớp tab trạng thái, loại, vai trò và mọi từ khóa trong tên đề tài
function applyProjectFilters() {
  var query = searchInput ? searchInput.value.trim() : '';
  var words = normalizeText(query).split(' ').filter(Boolean);
  var type = selectedValue(typeSelect);
  var role = selectedValue(roleSelect);
  var cards = document.querySelectorAll('.project-item');

  var shown = 0;
  cards.forEach(function (card) {
    var name = normalizeText(cardTitle(card));
    var match = (activeStatus === 'all' || card.dataset.cardStatus === activeStatus)
      && (type === 'all' || card.dataset.type === type)
      && (role === 'all' || card.dataset.role === role)
      && words.every(function (word) { return name.indexOf(word) !== -1; });
    card.classList.toggle('hidden', !match);
    if (match) shown++;
  });

  // Viền ô chọn đang lọc để người dùng biết vì sao danh sách bị thu hẹp
  [typeSelect, roleSelect].forEach(function (select) {
    if (!select) return;
    var on = select.value !== 'all';
    select.classList.toggle('ring-2', on);
    select.classList.toggle('ring-primary/40', on);
    select.classList.toggle('font-semibold', on);
  });
  var filtering = type !== 'all' || role !== 'all' || words.length > 0;
  if (clearButton) clearButton.classList.toggle('hidden', !filtering);

  if (emptyEl) emptyEl.classList.toggle('hidden', shown > 0 || !!document.getElementById('project-loading'));
  var message = document.getElementById('empty-state-message');
  if (message) {
    // textContent: nội dung người dùng gõ không bị hiểu là HTML
    if (!cards.length && activeStatus === 'all' && !filtering) {
      message.textContent = 'Bạn chưa có đề tài nào. Bấm "Tạo đề tài mới" để bắt đầu.';
    } else if (type !== 'all' || role !== 'all') {
      message.textContent = 'Không tìm thấy đề tài nào khớp với bộ lọc đang chọn' + (words.length ? ' và từ khóa "' + query + '"' : '') + '.';
    } else {
      message.textContent = words.length
        ? 'Không tìm thấy đề tài nào có tên khớp với "' + query + '" trong mục đang chọn.'
        : 'Không tìm thấy đề tài nào phù hợp với bộ lọc trạng thái được chọn.';
    }
  }
  var count = document.getElementById('project-count');
  if (count) {
    count.replaceChildren('Hiển thị ', h('strong', null, [shown ? '1 - ' + shown : '0']),
      ' trên tổng số ', h('strong', null, [String(cards.length)]), ' đề tài');
  }
}

// data-updated dạng ISO (YYYY-MM-DD...) nên so sánh chuỗi là đúng thứ tự thời gian
function byUpdated(a, b) { return (b.dataset.updated || '').localeCompare(a.dataset.updated || ''); }

var SORTERS = {
  updated: byUpdated,
  name: function (a, b) { return cardTitle(a).localeCompare(cardTitle(b), 'vi'); },
  progress: function (a, b) { return (Number(a.dataset.progress) - Number(b.dataset.progress)) || byUpdated(a, b); }
};

function sortProjects() {
  if (!emptyEl || !sortSelect) return;
  var compare = SORTERS[sortSelect.value] || byUpdated;
  Array.prototype.slice.call(document.querySelectorAll('.project-item'))
    .sort(compare)
    .forEach(function (card) { emptyEl.parentNode.insertBefore(card, emptyEl); });
}

// Xóa từ khóa, loại và vai trò; giữ nguyên tab và cách sắp xếp
function clearProjectFilters() {
  if (searchInput) searchInput.value = '';
  if (typeSelect) typeSelect.value = 'all';
  if (roleSelect) roleSelect.value = 'all';
  applyProjectFilters();
}

// Nút "Xem tất cả đề tài": xóa mọi bộ lọc và quay về tab Tất cả
function resetProjectFilters() {
  clearProjectFilters();
  var all = document.querySelector('[data-status-filter="all"]');
  if (all) all.click();
}

// ---------- Khung popup dùng chung ----------
var openModalEl = null, lastFocus = null;

function buildModal(labelId, panelClass) {
  var panel = h('div', 'relative w-full bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 flex flex-col max-h-[calc(100dvh-2rem)] ' + panelClass);
  var overlay = h('div', 'fixed inset-0 z-[60] hidden items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs', [panel]);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', labelId);
  overlay.setAttribute('data-no-ripple', '');
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
    if (e.key === 'Tab') {
      var items = Array.prototype.filter.call(panel.querySelectorAll('button, a[href], input, select, textarea'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.body.appendChild(overlay);
  return { overlay: overlay, panel: panel };
}

function showModal(overlay, focusEl, opener) {
  if (openModalEl && openModalEl !== overlay) closeModal(true);
  lastFocus = opener || document.activeElement;
  openModalEl = overlay;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
  (focusEl || overlay).focus();
}

function closeModal(keepFocus) {
  if (!openModalEl) return;
  openModalEl.classList.add('hidden');
  openModalEl.classList.remove('flex');
  openModalEl = null;
  document.body.style.overflow = '';
  if (!keepFocus && lastFocus && document.contains(lastFocus)) {
    suppressCreateMenu(lastFocus);
    lastFocus.focus();
  }
}

// Menu chọn loại đề tài mở khi nút "Tạo đề tài mới" có focus (group-focus-within). Khi popup đóng và trả focus
// về nút này, giữ menu đóng cho đến khi người dùng rời chuột hoặc chuyển focus ra ngoài rồi quay lại.
function suppressCreateMenu(el) {
  var group = el.closest('.group');
  var menu = group && group.querySelector('[data-create-menu]');
  if (!menu) return;
  menu.classList.add('!hidden');
  function release(e) {
    if (e.type === 'focusout' && e.relatedTarget && group.contains(e.relatedTarget)) return;
    menu.classList.remove('!hidden');
    group.removeEventListener('mouseleave', release);
    group.removeEventListener('focusout', release);
  }
  group.addEventListener('mouseleave', release);
  group.addEventListener('focusout', release);
}

function closeButton() {
  var b = h('button', 'w-9 h-9 shrink-0 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors', [icon('close', 'text-[20px]')]);
  b.type = 'button';
  b.setAttribute('aria-label', 'Đóng');
  b.title = 'Đóng';
  b.addEventListener('click', function () { closeModal(); });
  return b;
}

// ---------- Popup chi tiết đề tài ----------
var detail = null;

function detailRow(label, value) {
  if (value === null || value === undefined || value === '') return null;
  return h('div', 'min-w-0', [
    h('dt', 'font-label-sm text-label-sm text-outline uppercase tracking-wider', [label]),
    h('dd', 'font-body-md text-body-md text-on-surface mt-0.5 break-words', [typeof value === 'string' || typeof value === 'number' ? String(value) : value])
  ]);
}

function heading(text) { return h('h3', 'font-title-md text-title-md text-on-surface mb-2', [text]); }

// Hướng dẫn ngắn theo trạng thái
var STATUS_HINTS = {
  Draft: 'Bản nháp chỉ bạn và nhóm thấy. Hoàn thiện nội dung và tải tệp PDF trước khi gửi giảng viên thẩm định.',
  Pending_Review: 'Đề tài đang chờ giảng viên thẩm định nên tạm khóa chỉnh sửa. Kết quả sẽ hiện tại đây.',
  Revision_Needed: 'Giảng viên yêu cầu bổ sung. Xem nhận xét bên dưới và cập nhật đề tài.',
  Approved: 'Đề tài đã được giảng viên thẩm định đạt nhưng chưa được cho công bố, nên chưa đưa lên CV được.',
  Published: 'Đề tài đã được công bố trên Kho tài liệu. Bạn có thể đưa vào mục Công trình trưng bày trên CV.',
  Rejected: 'Đề tài không được thông qua. Xem nhận xét của giảng viên bên dưới.',
  Hidden: 'Đề tài đang bị ẩn khỏi Kho tài liệu.'
};

function linkEl(url, text) {
  var a = h('a', 'text-primary hover:underline break-all', [text || url]);
  a.href = url; // máy chủ chỉ nhận liên kết https
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function openDetail(p, opener) {
  if (!detail) detail = buildModal('project-detail-title', 'max-w-2xl');
  var t = typeOf(p);

  var title = h('h2', 'font-headline-sm text-headline-sm text-on-surface mt-2 break-words', [p.title]);
  title.id = 'project-detail-title';
  var close = closeButton();
  var header = h('div', 'flex items-start gap-3 p-5 border-b border-outline-variant/40', [
    h('div', 'w-11 h-11 shrink-0 rounded-lg bg-primary-fixed text-primary flex items-center justify-center', [icon(t.icon, 'text-[24px]')]),
    h('div', 'flex-1 min-w-0', [h('div', 'flex items-center gap-space-xs flex-wrap', [typeChip(p), statusChip(p), roleChip(p)]), title]),
    close
  ]);

  var body = h('div', 'p-5 overflow-y-auto flex flex-col gap-5');
  if (STATUS_HINTS[p.status]) {
    body.appendChild(h('p', 'p-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2', [
      icon('info', 'text-[18px] text-primary flex-shrink-0'), h('span', null, [STATUS_HINTS[p.status]])
    ]));
  }

  body.appendChild(h('section', null, [
    heading('Thông tin chung'),
    h('dl', 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3', [
      detailRow('Mã đề tài', p.resourceCode || (online ? 'Chưa cấp mã' : null)),
      detailRow('Loại', t.full),
      detailRow('Vai trò của bạn', !p.team ? 'Leader (đề tài cá nhân)' : p.role === 'Leader' ? 'Leader (trưởng nhóm)' : 'Member (thành viên nhóm)'),
      detailRow('Nhóm', p.team ? p.team.name : 'Cá nhân'),
      detailRow('Giảng viên hướng dẫn', p.lecturer || 'Chưa có'),
      detailRow('Lĩnh vực', p.field),
      detailRow('Tác giả', p.authors),
      detailRow('DOI', p.doi ? linkEl('https://doi.org/' + encodeURI(p.doi), p.doi) : null),
      detailRow('Nơi công bố / Cấp đề tài', p.venue),
      detailRow('Mức sẵn sàng công nghệ', p.trlLevel ? 'TRL ' + p.trlLevel + ' / 9' : null),
      detailRow('Ngày tạo', viDate(p.createdAt)),
      detailRow('Cập nhật', viDate(p.updatedAt))
    ])
  ]));

  body.appendChild(h('section', null, [
    heading('Tóm tắt'),
    h('p', 'font-body-md text-body-md text-on-surface-variant whitespace-pre-line break-words', [p.abstract || 'Chưa có tóm tắt.'])
  ]));

  body.appendChild(fileSection(p));

  var keywords = (p.keywords || '').split(/[,;]/).map(function (k) { return k.trim(); }).filter(Boolean);
  if (keywords.length) {
    body.appendChild(h('section', null, [
      heading('Từ khóa'),
      h('div', 'flex flex-wrap gap-1.5', keywords.map(function (k) {
        return h('span', 'px-2.5 py-1 rounded-xl bg-surface-container text-on-surface font-label-sm text-label-sm', [k]);
      }))
    ]));
  }

  if (p.sourceCodeUrl || p.demoUrl) {
    body.appendChild(h('section', null, [
      heading('Liên kết'),
      h('ul', 'flex flex-col gap-1.5 font-body-md text-body-md', [
        p.sourceCodeUrl && h('li', 'flex items-center gap-2 min-w-0', [icon('code', 'text-[18px] text-outline'), linkEl(p.sourceCodeUrl)]),
        p.demoUrl && h('li', 'flex items-center gap-2 min-w-0', [icon('play_circle', 'text-[18px] text-outline'), linkEl(p.demoUrl)])
      ])
    ]));
  }

  var r = p.latestReview;
  body.appendChild(h('section', null, [
    heading('Kết quả thẩm định gần nhất'),
    r
      ? h('div', 'p-3 rounded-lg border border-outline-variant/60 flex flex-col gap-1.5', [
          h('div', 'flex items-center justify-between gap-2 flex-wrap', [
            chip(DECISIONS[r.decision] || r.decision,
              r.decision === 'Approved' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : r.decision === 'Rejected' ? 'bg-error-container text-error' : 'bg-status-warning/15 text-status-warning'),
            h('span', 'font-body-sm text-body-sm text-outline', [[r.reviewer, viDate(r.date)].filter(Boolean).join(' · ')])
          ]),
          r.score !== null && r.score !== undefined && h('p', 'font-body-sm text-body-sm text-on-surface', ['Điểm: ', h('strong', null, [r.score + ' / 100'])]),
          r.comment && h('p', 'font-body-md text-body-md text-on-surface-variant whitespace-pre-line break-words', [r.comment])
        ])
      : h('p', 'font-body-md text-body-md text-on-surface-variant', ['Chưa có phiếu thẩm định.'])
  ]));

  var actions = [];
  if (p.status === 'Published') {
    var view = h('a', 'h-9 px-space-md bg-primary hover:bg-[#1F4E78] text-on-primary rounded-lg font-label-md text-label-md shadow-xs transition-colors inline-flex items-center gap-1.5', [icon('visibility'), h('span', null, ['Xem trên Kho tài liệu'])]);
    view.href = '03_chi-tiet-tai-nguyen.html';
    actions.push(view);
  }
  if (p.canDelete) actions.push(deleteButton(p));
  if (p.canEdit) {
    var edit = h('button', 'h-9 px-space-md rounded-lg text-primary border border-primary/30 hover:border-primary hover:bg-brand-light-blue font-label-md text-label-md transition-colors inline-flex items-center gap-1.5', [icon('edit'), h('span', null, ['Chỉnh sửa'])]);
    edit.type = 'button';
    edit.dataset.editProject = '';
    // Đóng biểu mẫu thì trả focus về thẻ đã mở popup
    edit.addEventListener('click', function () { openEdit(p, lastFocus); });
    actions.push(edit);
  }
  var done = h('button', 'h-9 px-space-md rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors', ['Đóng']);
  done.type = 'button';
  done.addEventListener('click', function () { closeModal(); });
  actions.push(done);

  // Thành viên (không phải Leader) soạn được nhưng không xóa / gửi thẩm định
  if (p.canEdit && p.role !== 'Leader') {
    body.appendChild(h('p', 'font-body-sm text-body-sm text-outline', ['Bạn soạn và sửa được đề tài này. Chỉ Leader của nhóm được gửi thẩm định và xóa bản nháp.']));
  }

  detail.panel.replaceChildren(header, body,
    h('div', 'flex flex-wrap items-center justify-end gap-2 p-4 border-t border-outline-variant/40', actions));
  showModal(detail.overlay, close, opener);
}

// Thay một đề tài trong danh sách bằng bản mới từ máy chủ rồi vẽ lại
function replaceProject(updated) {
  projects = projects.map(function (x) { return x.resourceId === updated.resourceId ? updated : x; });
  renderList();
}

// Tên đề tài trên thẻ (dùng để trả focus sau khi vẽ lại danh sách)
function titleButtonOf(id) { return listEl.querySelector('[data-id="' + id + '"] [data-title]'); }

// ---------- Tệp PDF ----------
function fileSizeText(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : kb + ' KB'; }

function checkPdf(file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'Chỉ nhận tệp PDF.';
  if (!file.size) return 'Tệp PDF rỗng.';
  if (file.size > MAX_FILE_BYTES) return 'Tệp PDF tối đa 10 MB.';
  return null;
}

function uploadFile(resourceId, file) {
  return fetch(API_URL + '/' + encodeURIComponent(resourceId) + '/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
    signal: AbortSignal.timeout(200000) // dài hơn thời gian máy chủ chờ kho (180 giây) để nhận được thông báo lỗi
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok) throw new Error(data.message || 'Lỗi máy chủ (' + res.status + ')');
      return data;
    });
  }, function () {
    throw Object.assign(new Error('Không kết nối được máy chủ'), { offline: true });
  });
}

function fileSection(p) {
  var status = h('p', 'font-body-md text-body-md text-on-surface-variant', [
    p.hasFile ? 'Đã tải lên tệp PDF (' + fileSizeText(p.fileSizeKb || 0) + ').' : 'Chưa có tệp PDF.'
  ]);
  var message = h('p', 'hidden font-body-sm text-body-sm text-error mt-2');
  message.setAttribute('role', 'alert');
  var controls = h('div', 'flex flex-wrap items-center gap-2 mt-2');

  if (p.hasFile) {
    var view = h('a', 'h-9 px-space-md rounded-lg bg-surface-container text-primary hover:bg-surface-container-high font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors', [icon('picture_as_pdf'), h('span', null, ['Xem PDF'])]);
    view.href = API_URL + '/' + encodeURIComponent(p.resourceId) + '/file';
    view.target = '_blank';
    view.rel = 'noopener';
    controls.appendChild(view);
  }
  if (p.canEdit) {
    var picker = h('input', 'hidden');
    picker.type = 'file';
    picker.accept = 'application/pdf,.pdf';
    picker.dataset.pdfInput = '';
    var label = h('span', null, [p.hasFile ? 'Thay tệp PDF' : 'Tải PDF lên']);
    var button = h('button', 'h-9 px-space-md rounded-lg bg-primary text-on-primary hover:bg-[#1F4E78] font-label-md text-label-md inline-flex items-center gap-1.5 transition-colors disabled:opacity-60', [icon('upload_file'), label]);
    button.type = 'button';
    button.addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      picker.value = ''; // chọn lại đúng tệp cũ vẫn kích hoạt change
      if (!file) return;
      message.classList.add('hidden');
      function fail(text) { message.textContent = text; message.classList.remove('hidden'); }
      var problem = checkPdf(file);
      if (problem) return fail(problem);
      if (!online) return fail('Chưa kết nối máy chủ: tệp không được lưu.');
      var text = label.textContent;
      button.disabled = true;
      label.textContent = 'Đang tải lên…';
      uploadFile(p.resourceId, file).then(function (updated) {
        // Người dùng có thể đã đóng popup trong lúc tải: khi đó không tự mở lại
        var stillOpen = openModalEl === detail.overlay && button.isConnected;
        replaceProject(updated);
        if (stillOpen) openDetail(updated, titleButtonOf(updated.resourceId));
        toast('Đã tải tệp PDF lên');
      }, function (err) {
        button.disabled = false;
        label.textContent = text;
        fail(err.offline ? 'Không kết nối được máy chủ: tệp chưa được lưu.' : err.message);
      });
    });
    controls.append(button, picker);
  }

  return h('section', null, [
    heading('Tệp PDF'),
    status,
    p.canEdit && h('p', 'font-body-sm text-body-sm text-outline mt-0.5', ['Chỉ nhận PDF, tối đa 10 MB. Tệp được lưu riêng tư.']),
    controls.childNodes.length ? controls : null,
    message
  ]);
}

// Xóa bản nháp: bấm hai lần để xác nhận, tránh xóa nhầm
function deleteButton(p) {
  var label = h('span', null, ['Xóa bản nháp']);
  var b = h('button', 'h-9 px-space-md rounded-lg text-error hover:bg-error-container font-label-md text-label-md transition-colors inline-flex items-center gap-1.5 disabled:opacity-50', [icon('delete'), label]);
  b.type = 'button';
  var armed = false, timer = null;
  b.addEventListener('click', function () {
    if (!armed) {
      armed = true;
      label.textContent = 'Bấm lần nữa để xóa';
      b.classList.add('bg-error-container');
      timer = setTimeout(function () { armed = false; label.textContent = 'Xóa bản nháp'; b.classList.remove('bg-error-container'); }, 4000);
      return;
    }
    clearTimeout(timer);
    b.disabled = true;
    label.textContent = 'Đang xóa…';
    request('DELETE', '/' + encodeURIComponent(p.resourceId)).then(function () {
      projects = projects.filter(function (x) { return x.resourceId !== p.resourceId; });
      closeModal(true);
      renderList();
      var createBtn = document.querySelector('[data-create-type]');
      if (createBtn) { suppressCreateMenu(createBtn); createBtn.focus(); }
      toast('Đã xóa bản nháp "' + p.title + '"');
    }, function (err) {
      b.disabled = false;
      armed = false;
      label.textContent = 'Xóa bản nháp';
      b.classList.remove('bg-error-container');
      toast(err.offline ? 'Không kết nối được máy chủ, chưa xóa được' : 'Không xóa được: ' + err.message);
    });
  });
  return b;
}

// ---------- Biểu mẫu tạo đề tài ----------
var create = null;
var LIMITS = { title: 255, abstract: 5000, authors: 500, keywords: 500, venue: 255, doi: 150, url: 255 };
var INPUT_CLASS = 'w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

function field(label, control, hint, required) {
  var id = control.id;
  var lab = h('label', 'block font-label-md text-label-md text-on-surface mb-1', [label, required && h('span', 'text-error', [' *'])]);
  lab.htmlFor = id;
  var wrap = h('div', 'min-w-0', [lab, control]);
  if (hint) {
    var hintEl = h('p', 'font-body-sm text-body-sm text-outline mt-1', [hint]);
    hintEl.id = id + '-hint';
    control.setAttribute('aria-describedby', hintEl.id);
    wrap.appendChild(hintEl);
  }
  return wrap;
}

function input(id, type, max, placeholder) {
  var el = h('input', INPUT_CLASS + ' h-10');
  el.id = id;
  el.name = id.replace('project-', '');
  el.type = type;
  el.maxLength = max;
  el.autocomplete = 'off';
  if (placeholder) el.placeholder = placeholder;
  return el;
}

function select(id, items) {
  var el = h('select', INPUT_CLASS + ' h-10 pr-9');
  el.id = id;
  el.name = id.replace('project-', '');
  items.forEach(function (it) { var o = h('option', null, [it[1]]); o.value = it[0]; el.appendChild(o); });
  return el;
}

function buildCreate() {
  create = buildModal('project-create-title', 'max-w-xl');
  var title = h('h2', 'font-headline-sm text-headline-sm text-on-surface', ['Tạo đề tài mới']);
  create.heading = title;
  title.id = 'project-create-title';

  var f = {
    type: select('project-type', Object.keys(TYPES).map(function (k) { return [k, TYPES[k].full]; })),
    title: input('project-title', 'text', LIMITS.title, 'VD: Hệ thống nhận diện biển số xe trên thiết bị biên'),
    field: select('project-field', [['', 'Chưa chọn']]),
    team: select('project-team', [['', 'Cá nhân (không thuộc nhóm)']]),
    abstract: h('textarea', INPUT_CLASS + ' py-2 min-h-[110px] resize-y'),
    authors: input('project-authors', 'text', LIMITS.authors, 'VD: Nguyễn Văn An, Trần Thị Bình'),
    keywords: input('project-keywords', 'text', LIMITS.keywords, 'VD: Computer Vision, YOLOv8, Jetson'),
    venue: input('project-venue', 'text', LIMITS.venue, 'VD: Tạp chí / hội nghị dự kiến gửi bài'),
    doi: input('project-doi', 'text', LIMITS.doi, 'VD: 10.1109/ACCESS.2026.1234567'),
    sourceCodeUrl: input('project-source', 'url', LIMITS.url, 'https://github.com/...'),
    demoUrl: input('project-demo', 'url', LIMITS.url, 'https://...')
  };
  f.title.required = true;
  f.abstract.id = 'project-abstract';
  f.abstract.name = 'abstract';
  f.abstract.maxLength = LIMITS.abstract;
  f.abstract.placeholder = 'Mục tiêu, phương pháp và kết quả dự kiến của đề tài';

  var error = h('p', 'hidden p-3 rounded-lg bg-error-container text-error font-body-sm text-body-sm');
  error.setAttribute('role', 'alert');
  var submitLabel = h('span', null, ['Lưu bản nháp']);
  var submit = h('button', 'h-10 px-space-lg bg-primary hover:bg-[#1F4E78] text-on-primary rounded-lg font-label-md text-label-md shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-60', [icon('save', 'text-[18px]'), submitLabel]);
  submit.type = 'submit';
  var cancel = h('button', 'h-10 px-space-md rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors', ['Hủy']);
  cancel.type = 'button';
  cancel.addEventListener('click', function () { closeModal(); });

  var intro = h('p', 'p-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2', [
    icon('info', 'text-[18px] text-primary flex-shrink-0'),
    h('span', null, ['Đề tài được lưu ở trạng thái ', h('strong', null, ['Bản nháp']), '. Quyền của bạn theo vai trò trong nhóm. Sau khi lưu, mở đề tài để tải tệp PDF.'])
  ]);
  var teamWrap = field('Nhóm sở hữu', f.team, 'Thành viên nhóm cùng xem và sửa được; chỉ Leader gửi thẩm định. Bài báo bắt buộc thuộc một nhóm.');
  var teamMark = h('span', 'text-error hidden', [' *']);
  teamWrap.querySelector('label').appendChild(teamMark);
  create.intro = intro;
  // Bài báo bắt buộc thuộc nhóm: đổi dòng đầu của ô chọn nhóm theo loại
  create.syncTeam = function () {
    var paper = f.type.value === 'Paper';
    teamMark.classList.toggle('hidden', !paper);
    f.team.options[0].textContent = paper ? 'Chọn nhóm' : 'Cá nhân (không thuộc nhóm)';
  };
  f.type.addEventListener('change', create.syncTeam);

  var form = h('form', 'flex flex-col min-h-0', [
    h('div', 'p-5 overflow-y-auto flex flex-col gap-4', [
      intro,
      error,
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [
        field('Loại tài nguyên', f.type, null, true),
        field('Lĩnh vực', f.field)
      ]),
      field('Tên đề tài', f.title, 'Từ 5 đến 255 ký tự.', true),
      teamWrap,
      field('Tóm tắt', f.abstract, 'Tối đa 5.000 ký tự.'),
      field('Tác giả', f.authors, 'Ghi theo thứ tự trên bài, phân cách bằng dấu phẩy.'),
      field('Từ khóa', f.keywords, 'Phân cách bằng dấu phẩy.'),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [
        field('Nơi công bố', f.venue),
        field('DOI', f.doi)
      ]),
      h('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4', [
        field('Liên kết mã nguồn', f.sourceCodeUrl),
        field('Liên kết demo', f.demoUrl)
      ])
    ]),
    h('div', 'flex flex-wrap items-center justify-end gap-2 p-4 border-t border-outline-variant/40', [cancel, submit])
  ]);
  form.noValidate = true; // tự kiểm tra để báo lỗi bằng tiếng Việt

  create.panel.append(h('div', 'flex items-center gap-3 p-5 border-b border-outline-variant/40', [
    h('div', 'w-11 h-11 shrink-0 rounded-lg bg-primary-fixed text-primary flex items-center justify-center', [icon('add_circle', 'text-[24px]')]),
    h('div', 'flex-1 min-w-0', [title]),
    closeButton()
  ]), form);

  function showError(message, focusEl) {
    error.textContent = message;
    error.classList.remove('hidden');
    if (focusEl) { focusEl.setAttribute('aria-invalid', 'true'); focusEl.focus(); }
  }

  function checkUrl(el, label) {
    var v = el.value.trim();
    if (!v) return null;
    try { if (new URL(v).protocol === 'https:') return null; } catch (e) { /* báo lỗi bên dưới */ }
    return label + ' phải là liên kết bắt đầu bằng https://';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    error.classList.add('hidden');
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });

    var editing = create.editing;
    if (!editing && f.type.value === 'Paper' && !f.team.value) {
      return showError(f.team.options.length > 1
        ? 'Bài báo phải thuộc một nhóm: hãy chọn nhóm.'
        : 'Bài báo phải thuộc một nhóm, nhưng chưa tải được nhóm nào của bạn.', f.team);
    }
    var titleText = f.title.value.trim();
    if (titleText.length < 5) return showError(titleText ? 'Tên đề tài cần ít nhất 5 ký tự.' : 'Cần nhập tên đề tài.', f.title);
    var urlError = checkUrl(f.sourceCodeUrl, 'Liên kết mã nguồn');
    if (urlError) return showError(urlError, f.sourceCodeUrl);
    urlError = checkUrl(f.demoUrl, 'Liên kết demo');
    if (urlError) return showError(urlError, f.demoUrl);

    var body = {
      title: titleText,
      abstract: f.abstract.value.trim() || null,
      authors: f.authors.value.trim() || null,
      keywords: f.keywords.value.trim() || null,
      venue: f.venue.value.trim() || null,
      doi: f.doi.value.trim() || null,
      fieldId: f.field.value ? Number(f.field.value) : null,
      sourceCodeUrl: f.sourceCodeUrl.value.trim() || null,
      demoUrl: f.demoUrl.value.trim() || null
    };
    // Không tải được danh sách lĩnh vực thì không gửi fieldId, tránh xóa mất lĩnh vực đang có
    if (editing && !options) delete body.fieldId;
    if (!editing) {
      body.type = f.type.value;
      body.teamId = f.team.value ? Number(f.team.value) : null;
    }
    submit.disabled = true;
    submitLabel.textContent = 'Đang lưu…';
    var send = editing ? request('PATCH', '/' + encodeURIComponent(editing.resourceId), body) : request('POST', '', body);
    send.then(function (created) {
      if (editing) {
        closeModal(true);
        replaceProject(created);
        openDetail(created, titleButtonOf(created.resourceId));
        toast('Đã lưu thay đổi');
        return;
      }
      online = true;
      projects.unshift(created);
      closeModal(true);
      resetProjectFilters(); // đảm bảo đề tài mới không bị bộ lọc đang chọn che mất
      renderList();
      var card = listEl.querySelector('[data-id="' + created.resourceId + '"]');
      if (card) {
        card.scrollIntoView({ block: 'center' });
        card.classList.add('ring-2', 'ring-primary/40');
        setTimeout(function () { card.classList.remove('ring-2', 'ring-primary/40'); }, 2500);
        var t = card.querySelector('[data-title]');
        if (t) t.focus({ preventScroll: true });
      }
      toast('Đã tạo bản nháp "' + created.title + '"');
    }, function (err) {
      showError(err.offline ? 'Không kết nối được máy chủ: đề tài chưa được lưu.' : err.message);
    }).then(function () {
      submit.disabled = false;
      submitLabel.textContent = create.editing ? 'Lưu thay đổi' : 'Lưu bản nháp';
    });
  });

  create.form = form;
  create.fields = f;
  create.error = error;
  create.submitLabel = submitLabel;
}

function fillOptions() {
  if (options) return Promise.resolve();
  return request('GET', '/options').then(function (data) {
    options = data;
    var f = create.fields;
    data.fields.forEach(function (x) { var o = h('option', null, [x.name]); o.value = String(x.fieldId); f.field.appendChild(o); });
    data.teams.forEach(function (x) { var o = h('option', null, [x.name + ' (bạn là ' + x.role + ')']); o.value = String(x.teamId); f.team.appendChild(o); });
  }, function () { /* không có máy chủ: vẫn mở biểu mẫu, chỉ thiếu danh sách lĩnh vực / nhóm */ });
}

// project = null: tạo mới; có project: sửa đề tài đó (không đổi được loại và nhóm)
function openForm(type, project, opener) {
  if (!create) buildCreate();
  var f = create.fields;
  create.editing = project;
  create.form.reset();
  create.error.classList.add('hidden');
  create.form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  create.heading.textContent = project ? 'Chỉnh sửa đề tài' : 'Tạo đề tài mới';
  create.submitLabel.textContent = project ? 'Lưu thay đổi' : 'Lưu bản nháp';
  create.intro.classList.toggle('hidden', !!project);
  f.type.value = TYPES[type] ? type : 'Project';
  f.type.disabled = !!project;
  f.team.disabled = !!project;
  create.syncTeam();
  if (!online) {
    create.error.textContent = 'Chưa kết nối máy chủ: đề tài sẽ không được lưu.';
    create.error.classList.remove('hidden');
  }
  showModal(create.overlay, f.title, opener);
  if (project) {
    ['title', 'abstract', 'authors', 'keywords', 'venue', 'doi', 'sourceCodeUrl', 'demoUrl'].forEach(function (key) {
      f[key].value = project[key] || '';
    });
  }
  fillOptions().then(function () {
    if (!project || create.editing !== project) return;
    f.field.value = project.fieldId ? String(project.fieldId) : '';
    var teamId = project.team ? String(project.team.teamId) : '';
    // Nhóm đã ngừng hoạt động không nằm trong danh sách: thêm tạm để hiện đúng tên
    if (teamId && !f.team.querySelector('option[value="' + teamId + '"]')) {
      var o = h('option', null, [project.team.name]);
      o.value = teamId;
      f.team.appendChild(o);
    }
    f.team.value = teamId;
  });
}
function openCreate(type, opener) { openForm(type, null, opener); }
function openEdit(project, opener) { openForm(project.type, project, opener); }

document.querySelectorAll('[data-create-type]').forEach(function (b) {
  var menu = b.closest('.group') && b.closest('.group').querySelector('.absolute');
  if (menu) menu.setAttribute('data-create-menu', '');
  b.addEventListener('click', function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // đóng menu chọn loại (mở bằng focus)
    openCreate(b.dataset.createType, b.closest('.group') ? b.closest('.group').querySelector('button') : b);
  });
});

// ---------- Sự kiện bộ lọc ----------
if (searchInput) {
  searchInput.addEventListener('input', applyProjectFilters);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applyProjectFilters();
    }
  });
}
[typeSelect, roleSelect].forEach(function (s) {
  if (s) s.addEventListener('change', applyProjectFilters);
});
if (sortSelect) sortSelect.addEventListener('change', sortProjects);
if (clearButton) {
  clearButton.addEventListener('click', function () {
    clearProjectFilters();
    if (searchInput) searchInput.focus(); // nút vừa bị ẩn, đưa con trỏ về ô tìm kiếm
  });
}

document.querySelectorAll('#view-switcher [data-view]').forEach(function (b) {
  b.addEventListener('click', function () { setView(b.dataset.view); });
});
applyView();

// ---------- Tải dữ liệu ----------
request('GET').then(function (data) {
  online = true;
  projects = data.projects;
  renderList();
}, function (err) {
  online = false;
  projects = SAMPLE.slice();
  renderList();
  var note = h('p', 'col-span-full font-body-sm text-body-sm text-amber-700', [err.offline
    ? 'Chưa kết nối máy chủ: đang hiển thị dữ liệu mẫu, thay đổi sẽ không được lưu.'
    : 'Không tải được đề tài (' + err.message + '): đang hiển thị dữ liệu mẫu.']);
  listEl.insertBefore(note, listEl.firstChild);
});
