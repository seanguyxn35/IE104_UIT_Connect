// API Hộp thư kết nối của Doanh nghiệp (DN-08). Danh tính DN lấy ở máy chủ (TEST_BUSINESS_ID), không nhận từ client.
//   GET  /api/business-inbox                                  -> 200 { business, problems, requests }
//   POST /api/business-inbox/:id/decline     { reason? }     -> 200 | 400 INVALID_INPUT | 404 REQUEST_NOT_FOUND | 409 INVALID_STATE
//   POST /api/business-inbox/:id/reopen                       -> 200 | 404 | 409
//   POST /api/business-inbox/:id/meetings    { date, time, mode, agenda? } -> 201 | 400 | 404 | 409
//   POST /api/business-inbox/:id/accept                       -> 200 | 404 | 409  (mở phòng đàm phán)
//   GET  /api/business-inbox/:id/attachments/:attachmentId[?download=1] -> 200 { url, fileName, expiresIn }
//                                                                 | 404 ATTACHMENT_NOT_FOUND / FILE_NOT_FOUND
import { Router } from 'express';
import { config } from '../config.js';
import { soNguyenDuong, chuoiTuyChon, docLichHen } from '../validation.js';
import {
  getInbox, declineRequest, reopenRequest, scheduleMeeting, acceptRequest, getAttachmentUrl,
} from '../services/businessInboxService.js';

export const businessInboxRouter = Router();

businessInboxRouter.get('/', async (req, res) => {
  res.json(await getInbox(config.testBusinessId));
});

businessInboxRouter.post('/:id/decline', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const reason = chuoiTuyChon(req.body?.reason, 'Lý do từ chối', 500);
  res.json(await declineRequest(config.testBusinessId, id, reason));
});

businessInboxRouter.post('/:id/reopen', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  res.json(await reopenRequest(config.testBusinessId, id));
});

businessInboxRouter.post('/:id/meetings', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const lich = docLichHen(req.body);
  res.status(201).json(await scheduleMeeting(config.testBusinessId, id, config.testBusinessId, lich));
});

businessInboxRouter.post('/:id/accept', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  res.json(await acceptRequest(config.testBusinessId, id));
});

businessInboxRouter.get('/:id/attachments/:attachmentId', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const attachmentId = soNguyenDuong(req.params.attachmentId, 'Mã tệp');
  res.json(await getAttachmentUrl(config.testBusinessId, id, attachmentId, req.query.download === '1'));
});
