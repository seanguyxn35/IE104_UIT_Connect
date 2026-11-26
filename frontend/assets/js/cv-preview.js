// SV-04: popup xem trước CV khổ A4 (bố cục 2 cột), dữ liệu lấy từ GET /api/student-cv.
// Mở bằng phần tử có thuộc tính data-cv-preview-open. Có phóng to / thu nhỏ và In / Lưu PDF (hộp thoại in của trình duyệt).
// Mọi nội dung được gán bằng textContent, không ghép chuỗi HTML từ dữ liệu.
// Cần: assets/css/cv-preview.css. Nạp SAU đoạn script khai báo triggerToast trong trang.
(function () {
  var API_URL = '/api/student-cv';
  var SHEET_WIDTH = 794;
  var ZOOM_STEPS = [0.5, 0.6, 0.75, 0.9, 1, 1.25];

  var TYPE_LABELS = { Project: 'Dự án', Product: 'Sản phẩm', Paper: 'Bài báo', Thesis: 'Khóa luận', Textbook: 'Giáo trình', Slide: 'Bài giảng' };
  var CATEGORY_LABELS = { Award: 'Giải thưởng', Publication: 'Công bố', Language_Cert: 'Ngoại ngữ', Tech_Cert: 'Công nghệ' };
  var STATUS_TAGS = {
    Self_Declared: { text: 'Tự khai', className: 'cvp-tag cvp-tag-self' },
    Pending: { text: 'Chờ xác minh', className: 'cvp-tag' },
    Verified: { text: 'Đã xác minh', className: 'cvp-tag cvp-tag-ok' }
  };
  var HIDDEN_LABELS = { gpa: 'GPA', drl: 'Điểm rèn luyện', projects: 'Đề tài & Công bố' };

  // Dữ liệu mẫu khi không có máy chủ (file://, GitHub Pages) – toàn bộ là dữ liệu giả
  var SAMPLE = {
    fullName: 'Nguyễn Văn An',
    headline: 'Sinh viên Khoa học Máy tính & Nghiên cứu AI',
    studentCode: '21520001', className: 'KHMT2021', cohort: 'K16',
    email: 'sinhvien.mau@gm.uit.edu.vn', avatarUrl: null,
    githubUrl: 'https://github.com/nguyenvanan', linkedinUrl: 'https://linkedin.com/in/nguyenvanan',
    university: {
      name: 'Trường Đại học Công nghệ Thông tin – ĐHQG-HCM', faculty: 'Khoa Khoa học Máy tính',
      major: 'Trí tuệ Nhân tạo & Thị giác máy tính', enrollmentYear: 2021, graduationYear: 2025, gpa: 8.6, trainingScore: 92
    },
    hiddenFields: [],
    skills: [
      { name: 'PyTorch', level: 5, category: 'Lĩnh vực & Mô hình AI' },
      { name: 'Computer Vision (YOLOv8)', level: 5, category: 'Lĩnh vực & Mô hình AI' },
      { name: 'Python (NumPy, OpenCV)', level: 4, category: 'Ngôn ngữ & Frameworks' },
      { name: 'Docker & CI/CD', level: 4, category: 'Hạ tầng & Công cụ' }
    ],
    education: [{ type: 'Exchange', title: 'Chương trình trao đổi', organization: 'National University of Singapore', startDate: '2023-01-01', endDate: '2023-06-30', description: null }],
    experience: [],
    projects: [{ title: 'Hệ thống giám sát giao thông bằng Edge AI', type: 'Product', venue: 'Lab CV&PR', trlLevel: 6, date: '2024-11-01', role: 'Trưởng nhóm (Lead AI Engineer)', reviewerName: 'TS. Giảng viên Mẫu', highlights: 'Đạt độ chính xác 94% mAP\nTriển khai trên NVIDIA Jetson' }],
    awards: [{ category: 'Award', title: 'Giải Nhất Hackathon AI UIT', issuedBy: 'Trường ĐH CNTT', issuedDate: '2024-11-01', detail: null, status: 'Verified' }],
    certificates: [{ category: 'Language_Cert', title: 'IELTS 7.0', issuedBy: 'IDP', issuedDate: '2023-08-01', detail: null, status: 'Self_Declared' }],
    updatedAt: null
  };

  var overlay, stage, noteEl, zoomLabel, printBtn, closeBtn, sheet;
  var zoom = null; // null = vừa khung
  var lastFocus = null;
  var loadId = 0;

  function toast(msg) { if (typeof triggerToast === 'function') triggerToast(msg); }

  // h('div', 'cls', [con...]) – con là chuỗi (gán textContent) hoặc phần tử
  function h(tag, className, children) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function icon(name, className) { return h('span', 'material-symbols-outlined' + (className ? ' ' + className : ''), [name]); }

  // '2024-11-05' -> '11/2024'
  function monthYear(date) {
    var m = /^(\d{4})-(\d{2})/.exec(date || '');
    return m ? m[2] + '/' + m[1] : '';
  }
  function year(date) { var m = /^(\d{4})/.exec(date || ''); return m ? m[1] : ''; }
  function range(start, end) {
    var a = monthYear(start), b = end ? monthYear(end) : 'Nay';
    return a ? a + ' – ' + b : (end ? b : '');
  }
  function lines(text) {
    return (text || '').split(/\r?\n/).map(function (s) { return s.replace(/^[\s•\-–]+/, '').trim(); }).filter(Boolean);
  }
  function shortUrl(url) { return url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''); }

  function heading(text) { return h('div', 'cvp-heading', [h('span', null, [text])]); }
  function section(title, body) { return h('section', null, [heading(title)].concat(body)); }
  function bullets(text) {
    var items = lines(text);
    return items.length ? h('ul', null, items.map(function (s) { return h('li', null, [s]); })) : null;
  }

  // ---------- Dựng tờ CV ----------
  function buildSheet(cv) {
    var uni = cv.university || {};

    // Cột trái
    var avatar = h('div', 'cvp-avatar', [icon('person')]);
    if (cv.avatarUrl) {
      var img = h('img');
      img.alt = 'Ảnh đại diện';
      img.referrerPolicy = 'no-referrer';
      img.onload = function () { avatar.replaceChildren(img); };
      img.src = cv.avatarUrl;
    }
    var contact = h('div', 'cvp-contact', [
      cv.email && h('div', null, [icon('mail'), h('span', null, [cv.email])]),
      cv.studentCode && h('div', null, [icon('badge'), h('span', null, ['MSSV: ' + cv.studentCode + (cv.className ? ' · Lớp ' + cv.className : '')])]),
      cv.githubUrl && h('div', null, [icon('code'), link(cv.githubUrl)]),
      cv.linkedinUrl && h('div', null, [icon('work'), link(cv.linkedinUrl)])
    ]);

    var eduItems = [h('div', 'cvp-edu', [
      h('strong', null, [uni.major || 'Chuyên ngành chưa cập nhật']),
      h('p', 'cvp-muted', [[uni.enrollmentYear, uni.graduationYear || (uni.enrollmentYear ? 'Nay' : '')].filter(Boolean).join(' – ')]),
      h('p', null, [uni.name]),
      uni.faculty && h('p', 'cvp-muted', [uni.faculty])
    ])].concat((cv.education || []).map(function (e) {
      return h('div', 'cvp-edu', [
        h('strong', null, [e.title]),
        h('p', 'cvp-muted', [range(e.startDate, e.endDate)]),
        h('p', null, [e.organization]),
        e.description && h('p', 'cvp-muted', [e.description])
      ]);
    }));

    var groups = {};
    (cv.skills || []).forEach(function (s) { (groups[s.category || 'Khác'] = groups[s.category || 'Khác'] || []).push(s); });
    var skillBody = Object.keys(groups).map(function (g) {
      return h('div', 'cvp-skill-group', [h('p', null, [g])].concat(groups[g].map(function (s) {
        var dots = h('span', 'cvp-dots');
        dots.title = 'Mức ' + s.level + '/5';
        for (var i = 1; i <= 5; i++) dots.appendChild(h('i', i <= s.level ? 'on' : ''));
        return h('div', 'cvp-skill', [h('span', null, [s.name]), dots]);
      })));
    });

    var side = h('aside', 'cvp-side', [
      h('div', 'cvp-hero', [avatar, h('div', 'cvp-name', [cv.fullName]), cv.headline && h('div', 'cvp-headline', [cv.headline])]),
      h('div', 'cvp-side-body', [
        contact,
        section('Học vấn', eduItems),
        skillBody.length && section('Kỹ năng', skillBody)
      ])
    ]);

    // Cột phải
    var main = h('main', 'cvp-main');
    var metrics = [];
    if (uni.gpa !== null && uni.gpa !== undefined) metrics.push(h('div', 'cvp-metric', [h('b', null, [Number(uni.gpa).toFixed(2) + ' / 10']), h('small', null, ['GPA tích lũy'])]));
    if (uni.trainingScore !== null && uni.trainingScore !== undefined) metrics.push(h('div', 'cvp-metric', [h('b', null, [uni.trainingScore + ' / 100']), h('small', null, ['Điểm rèn luyện'])]));
    if (metrics.length) main.appendChild(section('Kết quả học tập', [h('div', 'cvp-metrics', metrics)]));

    var parts = 0;
    if ((cv.projects || []).length) {
      parts++;
      main.appendChild(section('Dự án tiêu biểu', cv.projects.map(function (p) {
        var meta = [TYPE_LABELS[p.type] || p.type, p.venue, p.trlLevel ? 'TRL ' + p.trlLevel : null].filter(Boolean).join(' · ');
        return h('div', 'cvp-item', [
          h('div', 'cvp-item-head', [h('span', null, [p.title]), h('time', null, [monthYear(p.date)])]),
          (p.role || meta) && h('p', 'cvp-item-sub', [[p.role, meta].filter(Boolean).join(' — ')]),
          p.reviewerName && h('p', 'cvp-muted-dark', ['Đã được thẩm định bởi ' + p.reviewerName]),
          bullets(p.highlights)
        ]);
      })));
    }
    if ((cv.experience || []).length) {
      parts++;
      main.appendChild(section('Kinh nghiệm', cv.experience.map(function (e) {
        return h('div', 'cvp-item', [
          h('div', 'cvp-item-head', [h('span', null, [e.title]), h('time', null, [range(e.startDate, e.endDate)])]),
          h('p', 'cvp-item-sub', [e.organization]),
          bullets(e.description)
        ]);
      })));
    }
    [['Danh hiệu & giải thưởng', cv.awards], ['Chứng chỉ', cv.certificates]].forEach(function (pair) {
      if (!(pair[1] || []).length) return;
      parts++;
      main.appendChild(section(pair[0], pair[1].map(function (a) {
        var tag = STATUS_TAGS[a.status];
        var text = [a.title, a.issuedBy].filter(Boolean).join(' – ');
        return h('div', 'cvp-row', [
          h('time', null, [year(a.issuedDate)]),
          h('div', null, [
            h('span', null, [text]),
            tag && h('span', tag.className, [tag.text]),
            a.detail && h('p', 'cvp-muted-dark', [a.detail]),
            h('p', null, [h('small', null, [CATEGORY_LABELS[a.category] || ''])])
          ])
        ]);
      })));
    });
    if (!parts) {
      // Chỉ hiện trên màn hình, không in ra
      main.appendChild(h('p', 'cvp-empty', ['Chưa có dự án, kinh nghiệm, giải thưởng hay chứng chỉ. Thêm ở các mục bên trái trang hồ sơ để CV đầy đủ hơn.']));
    }
    main.appendChild(h('p', 'cvp-footer', ['Tạo từ UIT Connect · ' + new Date().toLocaleDateString('vi-VN')]));

    return h('article', 'cvp-sheet', [side, main]);
  }

  function link(url) {
    var a = h('a', null, [shortUrl(url)]);
    a.href = url; // máy chủ chỉ trả liên kết https đã kiểm tra
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  // ---------- Popup ----------
  function buildOverlay() {
    overlay = h('div', 'cvp-overlay');
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cvp-title');
    overlay.setAttribute('data-no-ripple', '');

    var title = h('h2', null, ['Xem trước CV A4']);
    title.id = 'cvp-title';
    noteEl = h('span', 'cvp-note');
    zoomLabel = h('span', 'cvp-zoom-label', ['Vừa']);

    function button(iconName, text, label, onClick, className) {
      var b = h('button', 'cvp-btn' + (className ? ' ' + className : ''), [icon(iconName), text && h('span', 'cvp-btn-text', [text])]);
      b.type = 'button';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', onClick);
      return b;
    }
    printBtn = button('print', 'In / Lưu PDF', 'In hoặc lưu CV thành PDF', printCv, 'cvp-primary');
    closeBtn = button('close', null, 'Đóng xem trước', close);

    overlay.append(
      h('div', 'cvp-toolbar', [
        h('div', 'cvp-title', [icon('description'), title, noteEl]),
        h('div', 'cvp-actions', [
          button('zoom_out', null, 'Thu nhỏ', function () { stepZoom(-1); }),
          zoomLabel,
          button('zoom_in', null, 'Phóng to', function () { stepZoom(1); }),
          button('fit_screen', null, 'Vừa khung', function () { zoom = null; applyZoom(); })
        ]),
        h('div', 'cvp-actions', [printBtn, closeBtn])
      ]),
      stage = h('div', 'cvp-stage')
    );
    overlay.addEventListener('click', function (e) { if (e.target === stage) close(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e);
    });
    document.body.appendChild(overlay);
    window.addEventListener('resize', function () { if (!overlay.hidden && zoom === null) applyZoom(); });
  }

  function trapFocus(e) {
    var items = overlay.querySelectorAll('button:not(:disabled), a[href]');
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function fitZoom() {
    return Math.min(1, (stage.clientWidth - 16) / SHEET_WIDTH);
  }
  function applyZoom() {
    var value = zoom === null ? fitZoom() : zoom;
    if (sheet) sheet.style.zoom = value;
    zoomLabel.textContent = zoom === null ? 'Vừa' : Math.round(value * 100) + '%';
  }
  function stepZoom(dir) {
    var currentValue = zoom === null ? fitZoom() : zoom;
    var next = dir > 0
      ? ZOOM_STEPS.filter(function (z) { return z > currentValue + 0.001; })[0]
      : ZOOM_STEPS.filter(function (z) { return z < currentValue - 0.001; }).pop();
    if (next) { zoom = next; applyZoom(); }
  }

  function setNote(text, warn) {
    noteEl.textContent = text || '';
    noteEl.title = text || '';
    noteEl.classList.toggle('cvp-warn', Boolean(warn));
  }

  function showState(iconName, text, retry) {
    sheet = null;
    printBtn.disabled = true;
    var box = h('div', 'cvp-state', [icon(iconName, iconName === 'progress_activity' ? 'cvp-spin' : ''), h('p', null, [text])]);
    if (retry) {
      var again = h('button', 'cvp-btn cvp-primary', ['Thử lại']);
      again.type = 'button';
      again.style.marginTop = '12px';
      again.addEventListener('click', load);
      box.appendChild(again);
    }
    stage.replaceChildren(box);
  }

  function showCv(cv, note, warn) {
    sheet = buildSheet(cv);
    stage.replaceChildren(sheet);
    printBtn.disabled = false;
    setNote(note, warn);
    applyZoom();
  }

  function request() {
    if (location.protocol === 'file:') return Promise.reject({ offline: true });
    return fetch(API_URL, { signal: AbortSignal.timeout(15000) }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.ok && data) return data;
        if (!data || !data.code) throw { offline: true };
        throw { message: data.message };
      });
    }, function () { throw { offline: true }; });
  }

  // Luôn đọc lại khi mở để CV khớp với chỉnh sửa mới nhất trên trang
  function load() {
    var id = ++loadId;
    setNote('');
    showState('progress_activity', 'Đang tải dữ liệu CV…');
    request().then(function (cv) {
      if (id !== loadId) return;
      var hidden = (cv.hiddenFields || []).map(function (f) { return HIDDEN_LABELS[f]; }).filter(Boolean);
      showCv(cv, hidden.length ? 'Đang ẩn trên CV: ' + hidden.join(', ') : 'Dữ liệu lấy từ hồ sơ của bạn');
    }, function (err) {
      if (id !== loadId) return;
      if (err.offline) showCv(SAMPLE, 'Chưa kết nối máy chủ: đang hiển thị dữ liệu mẫu', true);
      else showState('error', 'Không tải được dữ liệu CV: ' + err.message, true);
    });
  }

  function open(trigger) {
    if (!overlay) buildOverlay();
    lastFocus = trigger || document.activeElement;
    zoom = null;
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    closeBtn.focus();
    load();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    loadId++;
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function printCv() {
    if (!sheet) return;
    document.body.classList.add('cvp-printing');
    var done = function () {
      document.body.classList.remove('cvp-printing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
    toast('Chọn "Lưu dưới dạng PDF" trong hộp thoại in để tải CV');
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-cv-preview-open]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });

  // Ô CV thu nhỏ bên phải trang: hiện tên và tiêu đề thật
  request().then(function (cv) {
    document.querySelectorAll('[data-cv-mini-name]').forEach(function (el) { el.textContent = cv.fullName; });
    document.querySelectorAll('[data-cv-mini-headline]').forEach(function (el) { el.textContent = cv.headline || ''; });
  }, function () { /* giữ chữ mẫu */ });
})();
