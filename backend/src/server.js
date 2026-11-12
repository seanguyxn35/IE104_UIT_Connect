// Máy chủ UIT Connect: phục vụ API và thư mục frontend/ trên cùng một địa chỉ
// (giao diện gọi /api/... cùng nguồn nên không vướng CORS).
// Chạy: cd backend && npm start  ->  http://localhost:3000/pages/sv/07_cho-ghep-nhom.html
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { AppError } from './errors.js';
import { labApplicationsRouter } from './routes/labApplications.js';

const app = express();
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');

app.use(express.json());

// Ghi log mỗi yêu cầu API (đối chiếu với tab Network khi kiểm thử)
app.use('/api', (req, res, next) => {
  const started = Date.now();
  const log = (result) =>
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${JSON.stringify(req.body ?? {})} -> ${result} (${Date.now() - started} ms)`);
  res.on('finish', () => log(res.statusCode));
  // Trình duyệt đóng kết nối trước khi máy chủ kịp trả lời
  res.on('close', () => { if (!res.writableFinished) log('đóng kết nối trước khi phản hồi'); });
  next();
});

app.use('/api/lab-applications', labApplicationsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'API không tồn tại.' });
});

app.use(express.static(frontendDir));

// Bộ xử lý lỗi chung: mọi lỗi đều trả về dạng { code, message }
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'Body không phải JSON hợp lệ.' });
  }
  console.error(err);
  res.status(500).json({ code: 'SERVER_ERROR', message: 'Có lỗi xảy ra, vui lòng thử lại.' });
});

app.listen(config.port, () => {
  console.log(`UIT Connect: http://localhost:${config.port}`);
  console.log(`SV-07:       http://localhost:${config.port}/pages/sv/07_cho-ghep-nhom.html`);
  console.log(`Tài khoản thử: student_id = ${config.testStudentId}`);
});
