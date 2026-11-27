// API công khai cho trang tổng quan và trang chi tiết bài toán của khách (KHÔNG cần đăng nhập).
// Hợp đồng chi tiết: frontend/assets/js/cong-khai.js.
//   GET /api/public/overview         -> 200 { stats, problems, partners }
//   GET /api/public/problems/:code   -> 200 chi tiết đề bài (không có tệp đính kèm) | 400 INVALID_INPUT | 404 PROBLEM_NOT_FOUND
// Câu trả lời giống nhau với mọi người xem nên cho trình duyệt lưu đệm 60 giây.
import { Router } from 'express';
import { AppError } from '../errors.js';
import { getOverview, getPublicProblem } from '../services/publicService.js';

export const publicRouter = Router();

publicRouter.use((req, res, next) => { res.set('Cache-Control', 'public, max-age=60'); next(); });

publicRouter.get('/overview', async (req, res) => {
  res.json(await getOverview());
});

publicRouter.get('/problems/:code', async (req, res) => {
  const code = req.params.code;
  if (typeof code !== 'string' || !/^[A-Za-z0-9-]{3,30}$/.test(code)) {
    throw new AppError(400, 'INVALID_INPUT', 'Mã bài toán không hợp lệ.');
  }
  res.json(await getPublicProblem(code.toUpperCase()));
});
