// API Hộp thư kết nối của Doanh nghiệp (DN-08). Danh tính DN lấy từ phiên đăng nhập ở máy chủ (authMiddleware), không nhận từ client.
//   GET  /api/business-inbox                                  -> 200 { business, problems, requests }
//   POST /api/business-inbox/:id/decline     { reason? }     -> 200 | 400 INVALID_INPUT | 404 REQUEST_NOT_FOUND | 409 INVALID_STATE
//   POST /api/business-inbox/:id/reopen                       -> 200 | 404 | 409
//   POST /api/business-inbox/:id/meetings    { date, time, mode, agenda? } -> 201 | 400 | 404 | 409
//   POST /api/business-inbox/:id/accept                       -> 200 | 404 | 409  (mở phòng đàm phán)
//   GET  /api/business-inbox/:id/attachments/:attachmentId[?download=1] -> 200 { url, fileName, expiresIn }
//                                                                 | 404 ATTACHMENT_NOT_FOUND / FILE_NOT_FOUND
import { Router } from 'express';
import { soNguyenDuong, chuoiTuyChon, docLichHen } from '../validation.js';
import {
  getInbox, declineRequest, reopenRequest, scheduleMeeting, acceptRequest, getAttachmentUrl,
} from '../services/businessInboxService.js';

export const businessInboxRouter = Router();

businessInboxRouter.get('/', async (req, res) => {
  res.json(await getInbox(req.user.accountId));
});

businessInboxRouter.post('/:id/decline', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const reason = chuoiTuyChon(req.body?.reason, 'Lý do từ chối', 500);
  res.json(await declineRequest(req.user.accountId, id, reason));
});

businessInboxRouter.post('/:id/reopen', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  res.json(await reopenRequest(req.user.accountId, id));
});

businessInboxRouter.post('/:id/meetings', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const lich = docLichHen(req.body);
  res.status(201).json(await scheduleMeeting(req.user.accountId, id, req.user.accountId, lich));
});

businessInboxRouter.post('/:id/accept', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  res.json(await acceptRequest(req.user.accountId, id));
});

businessInboxRouter.get('/:id/attachments/:attachmentId', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const attachmentId = soNguyenDuong(req.params.attachmentId, 'Mã tệp');
  res.json(await getAttachmentUrl(req.user.accountId, id, attachmentId, req.query.download === '1'));
});
