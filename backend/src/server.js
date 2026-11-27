// Máy chủ UIT Connect: phục vụ API và thư mục frontend/ trên cùng một địa chỉ
// (giao diện gọi /api/... cùng nguồn nên không vướng CORS).
// Chạy: cd backend && npm start  ->  http://localhost:3000/pages/sv/07_cho-ghep-nhom.html
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { AppError } from './errors.js';
import { labApplicationsRouter } from './routes/labApplications.js';
import { studentSkillsRouter } from './routes/studentSkills.js';
import { studentAvatarRouter } from './routes/studentAvatar.js';
import { profileVisibilityRouter } from './routes/profileVisibility.js';
import { studentProfileRouter } from './routes/studentProfile.js';
import { studentCvRouter } from './routes/studentCv.js';
import { studentAchievementsRouter } from './routes/studentAchievements.js';
import { studentShowcaseRouter } from './routes/studentShowcase.js';
import { studentProjectsRouter } from './routes/studentProjects.js';
import { businessInboxRouter } from './routes/businessInbox.js';
import { businessNegotiationsRouter } from './routes/businessNegotiations.js';
import { businessDashboardRouter } from './routes/businessDashboard.js';
import { studentRdProblemsRouter } from './routes/studentRdProblems.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { napPhien, chiChoVaiTro } from './authMiddleware.js';

const app = express();
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');

app.use(express.json());

// Ghi log mỗi yêu cầu API (đối chiếu với tab Network khi kiểm thử). Không ghi mật khẩu, mã xác thực, token.
const TRUONG_AN = new Set(['password', 'newPassword', 'code', 'resetToken']);
function noiDungLog(body) {
  if (Buffer.isBuffer(body)) return `<tệp ${body.length} byte>`;
  return JSON.stringify(body ?? {}, (k, v) => (TRUONG_AN.has(k) ? '***' : v));
}
app.use('/api', (req, res, next) => {
  const started = Date.now();
  const log = (result) =>
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${noiDungLog(req.body)} -> ${result} (${Date.now() - started} ms)`);
  res.on('finish', () => log(res.statusCode));
  // Trình duyệt đóng kết nối trước khi máy chủ kịp trả lời
  res.on('close', () => { if (!res.writableFinished) log('đóng kết nối trước khi phản hồi'); });
  next();
});

// Không cần phiên: dữ liệu công khai cho khách, đăng nhập. Mọi API khác đọc phiên rồi kiểm tra vai trò.
app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api', napPhien);
const chiSv = chiChoVaiTro('Student');
const chiDn = chiChoVaiTro('Business');
app.use('/api/lab-applications', chiSv, labApplicationsRouter);
app.use('/api/student-skills', chiSv, studentSkillsRouter);
app.use('/api/student-avatar', chiSv, studentAvatarRouter);
app.use('/api/profile-visibility', chiSv, profileVisibilityRouter);
app.use('/api/student-profile', chiSv, studentProfileRouter);
app.use('/api/student-cv', chiSv, studentCvRouter);
app.use('/api/student-achievements', chiSv, studentAchievementsRouter);
app.use('/api/student-showcase', chiSv, studentShowcaseRouter);
app.use('/api/student-rd-problems', chiSv, studentRdProblemsRouter);
app.use('/api/student-projects', chiSv, studentProjectsRouter);
app.use('/api/business-inbox', chiDn, businessInboxRouter);
app.use('/api/business-negotiations', chiDn, businessNegotiationsRouter);
app.use('/api/business-dashboard', chiDn, businessDashboardRouter);

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
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ code: 'FILE_TOO_LARGE', message: 'Ảnh tối đa 2 MB.' });
  }
  console.error(err);
  res.status(500).json({ code: 'SERVER_ERROR', message: 'Có lỗi xảy ra, vui lòng thử lại.' });
});

app.listen(config.port, () => {
  console.log(`UIT Connect: http://localhost:${config.port}`);
  console.log(`SV-07:       http://localhost:${config.port}/pages/sv/07_cho-ghep-nhom.html`);
  console.log(`Xác thực:    AUTH_MODE=${config.authMode}` + (config.authMode === 'test' ? ` (gọi API không kèm phiên → SV ${config.testStudentId}, DN ${config.testBusinessId})` : ' (bắt buộc đăng nhập)'));
  console.log(`SV-09:       http://localhost:${config.port}/pages/sv/09_cong-doanh-nghiep-rd.html`);
  console.log(`DN-01:       http://localhost:${config.port}/pages/dn/01_ban-lam-viec.html`);
});
