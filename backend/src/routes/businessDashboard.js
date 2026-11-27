// API Bàn làm việc của Doanh nghiệp (DN-01). Danh tính DN lấy từ phiên đăng nhập ở máy chủ (authMiddleware).
//   GET /api/business-dashboard -> 200 { business, counts, invitationReplyIds, awaitingRoomIds, problems, latestProposals, rooms }
//                                 | 404 BUSINESS_NOT_FOUND (chưa chạy seed_dn.sql)
import { Router } from 'express';
import { getDashboard } from '../services/businessDashboardService.js';

export const businessDashboardRouter = Router();

businessDashboardRouter.get('/', async (req, res) => {
  res.json(await getDashboard(req.user.accountId));
});
