// Kiểm thử giao diện tự động TC01–TC03: điều khiển Chrome headless qua DevTools Protocol, mở SV-07,
// bấm nút "Ứng tuyển ngay" của đề tài 9001 / 9002 / 9003, chụp màn hình và ghi request/response của API.
// Điều kiện: backend đang chạy (npm start) và đã chạy database/reset.sql. Chạy: node thuc-hanh/tests/run_ui_tests.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// Lưu vào thuc-hanh/evidence/ (hoặc thư mục truyền vào). Đường dẫn Chrome mặc định của Windows ở hàm spawn bên dưới.
const outDir = process.argv[2] || fileURLToPath(new URL('../evidence/', import.meta.url));
mkdirSync(outDir, { recursive: true });
const PAGE = 'http://localhost:3000/pages/sv/07_cho-ghep-nhom.html';
const CASES = [
  { id: 'TC01', topicId: 9001, rule: 'R1' },
  { id: 'TC02', topicId: 9002, rule: 'R2' },
  { id: 'TC03', topicId: 9003, rule: 'R3' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9333',
  `--user-data-dir=${path.join(os.tmpdir(), 'cdp-uitconnect')}`, '--window-size=1366,900', 'about:blank',
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch('http://127.0.0.1:9333/json/list')).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); const listeners = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

const results = [];
for (const tc of CASES) {
  // tải lại trang cho mỗi ca
  const loaded = new Promise((r) => { const fn = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(fn), 1); r(); } }; listeners.push(fn); });
  await send('Page.navigate', { url: PAGE });
  await loaded; await sleep(1500);

  // bắt request/response của API
  const net = {};
  const fn = (m) => {
    if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/lab-applications')) {
      net.requestId = m.params.requestId; net.request = { method: m.params.request.method, url: m.params.request.url, body: m.params.request.postData };
    }
    if (m.method === 'Network.responseReceived' && m.params.requestId === net.requestId) net.status = m.params.response.status;
    if (m.method === 'Network.loadingFinished' && m.params.requestId === net.requestId) net.done = true;
  };
  listeners.push(fn);

  await evaluate(`(() => { const b = document.querySelector('button[data-topic-id="${tc.topicId}"]');
    b.scrollIntoView({ block: 'center' }); b.style.outline = '3px solid #F59E0B'; b.style.outlineOffset = '3px'; return true; })()`);
  await sleep(300);
  await evaluate(`document.querySelector('button[data-topic-id="${tc.topicId}"]').click()`);
  for (let i = 0; i < 100 && !net.done; i++) await sleep(200);
  await sleep(800);
  listeners.splice(listeners.indexOf(fn), 1);

  const body = (await send('Network.getResponseBody', { requestId: net.requestId })).result?.body;
  const ui = await evaluate(`({ button: document.querySelector('button[data-topic-id="${tc.topicId}"]').innerText.trim(),
    toast: document.getElementById('apply-result').innerText.trim() })`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(outDir, `${tc.id}_ui.png`), Buffer.from(shot.result.data, 'base64'));

  const record = { case: tc.id, rule: tc.rule, request: net.request, response: { status: net.status, body: JSON.parse(body) }, ui };
  writeFileSync(path.join(outDir, `${tc.id}_response.json`), JSON.stringify(record, null, 2) + '\n');
  results.push(record);
}
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
