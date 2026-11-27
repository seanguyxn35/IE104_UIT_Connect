// Xuất CV thành tệp PDF khổ A4, giống bản xem trước trên trang SV-04.
// Máy chủ mở trình duyệt chạy ẩn (Edge / Chrome có sẵn trên máy), dựng tờ CV bằng CHÍNH mã và CSS của bản xem trước
// (frontend/assets/js/cv-preview.js, assets/css/cv-preview.css) rồi in ra PDF: chữ chọn và tìm kiếm được.
// Dữ liệu được đưa thẳng vào trang (không gọi lại API), nên các mục đang ẩn / riêng tư đã được lọc sẵn ở getCv.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../../shared/errors.js';

const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../frontend/assets');

// Trình duyệt dùng để in, thử lần lượt. PDF_BROWSER_CHANNEL trong .env để chỉ định loại khác (vd chrome).
const CHANNELS = process.env.PDF_BROWSER_CHANNEL ? [process.env.PDF_BROWSER_CHANNEL] : ['msedge', 'chrome'];
const STEP_TIMEOUT_MS = 15_000;
const ASSET_TIMEOUT_MS = 8_000; // chờ phông chữ và ảnh đại diện; quá hạn vẫn xuất PDF
const MAX_CONCURRENT = 2;       // mỗi lần xuất mở một trình duyệt, giới hạn để không cạn bộ nhớ
let running = 0;

// Cùng phông chữ với trang SV-04
const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
];

// Phần SV-04 vốn lấy từ Tailwind (reset, phông chữ biểu tượng) và chỉnh riêng cho bản PDF
const PDF_CSS = `
  @page { size: A4; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Inter, 'Segoe UI', Arial, sans-serif; }
  /* Dải nền cột trái: phần tử fixed được lặp lại ở mọi trang in, nên cột màu luôn đủ chiều cao
     (màu = --cvp-dark, rộng = cột trái của tờ CV) */
  body::before { content: ''; position: fixed; top: 0; bottom: 0; left: 0; width: 280px; background: #163A59; z-index: -1; }
  .cvp-sheet.cvp-sheet { background: transparent; }
  h1, h2, h3, h4, figure { margin: 0; }
  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; line-height: 1;
    letter-spacing: normal; text-transform: none; white-space: nowrap; direction: ltr; display: inline-block;
  }
  .no-icon-font .material-symbols-outlined { visibility: hidden; } /* không tải được phông: ẩn thay vì in ra chữ */
  /* Tờ CV: thấp hơn A4 một chút để không sinh trang trắng thừa */
  .cvp-sheet { box-shadow: none; margin: 0; min-height: 296.5mm; }
  .cvp-empty { display: none; }
  .cvp-item, .cvp-row, .cvp-edu, .cvp-skill, .cvp-metrics { break-inside: avoid; }
  .cvp-heading { break-after: avoid; }
  .cvp-main { box-decoration-break: clone; -webkit-box-decoration-break: clone; } /* trang sau vẫn có lề trên, dưới */
`;

const unavailable = () => new AppError(503, 'PDF_UNAVAILABLE',
  'Máy chủ chưa tạo được tệp PDF. Hãy dùng nút "In" rồi chọn "Lưu dưới dạng PDF".');

async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core')); // nạp khi cần: thiếu thư viện không làm máy chủ ngừng chạy
  } catch (err) {
    console.error('Thiếu thư viện playwright-core (chạy npm install trong backend/):', err.message);
    throw unavailable();
  }
  const errors = [];
  for (const channel of CHANNELS) {
    try {
      return await chromium.launch({ channel, headless: true, timeout: STEP_TIMEOUT_MS });
    } catch (err) {
      errors.push(`${channel}: ${err.message.split('\n')[0]}`);
    }
  }
  console.error('Không mở được trình duyệt để tạo PDF:', errors.join(' | '));
  throw unavailable();
}

export async function renderCvPdf(cv) {
  if (running >= MAX_CONCURRENT) {
    throw new AppError(429, 'PDF_BUSY', 'Máy chủ đang tạo nhiều tệp PDF, vui lòng thử lại sau ít giây.');
  }
  running += 1;
  let browser;
  try {
    const [css, script] = await Promise.all([
      readFile(path.join(assetsDir, 'css/cv-preview.css'), 'utf8'),
      readFile(path.join(assetsDir, 'js/cv-preview.js'), 'utf8'),
    ]);

    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    page.setDefaultTimeout(STEP_TIMEOUT_MS);

    const links = FONT_LINKS.map((href) => `<link rel="stylesheet" href="${href}">`).join('');
    await page.setContent(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8">${links}<style>${css}\n${PDF_CSS}</style></head><body></body></html>`,
      { waitUntil: 'load' },
    );
    await page.addScriptTag({ content: script });

    // Dữ liệu truyền dưới dạng tham số, tờ CV gán bằng textContent: nội dung SV nhập không chạy được như mã
    await page.evaluate(async ({ data, timeout }) => {
      const withTimeout = (promise) => Promise.race([promise, new Promise((done) => setTimeout(done, timeout))]);
      // Tải ảnh đại diện trước để khi dựng tờ CV ảnh hiện ngay
      if (data.avatarUrl) {
        await withTimeout(new Promise((done) => {
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.onload = img.onerror = done;
          img.src = data.avatarUrl;
        }));
      }
      document.body.replaceChildren(window.uitCvPreview.buildSheet(data));
      document.title = `CV – ${data.fullName}`;
      await withTimeout(Promise.all([
        document.fonts.load('16px "Material Symbols Outlined"'),
        document.fonts.load('400 13px Inter', 'Việt'),
        document.fonts.load('700 13px Inter', 'Việt'),
      ]).catch(() => {}));
      await withTimeout(document.fonts.ready);
      if (!document.fonts.check('16px "Material Symbols Outlined"')
        || ![...document.fonts].some((f) => f.family.includes('Material Symbols') && f.status === 'loaded')) {
        document.body.classList.add('no-icon-font');
      }
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }, { data: cv, timeout: ASSET_TIMEOUT_MS });

    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    running -= 1;
    await browser?.close().catch(() => {});
  }
}

// "Nguyễn Thanh Hải" + "TEST0111" -> "CV_TEST0111_Nguyen-Thanh-Hai.pdf" (bỏ dấu để tên tệp dùng được ở mọi nơi)
export function cvFileName(cv) {
  const plain = (text) => String(text ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `${['CV', plain(cv.studentCode), plain(cv.fullName)].filter(Boolean).join('_')}.pdf`;
}
