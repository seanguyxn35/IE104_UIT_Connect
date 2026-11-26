// API Hộp thư kết nối của Doanh nghiệp (DN-08). Danh tính DN lấy ở máy chủ (TEST_BUSINESS_ID), không nhận từ client.
//   GET  /api/business-inbox                                  -> 200 { business, problems, requests }
//   POST /api/business-inbox/:id/decline     { reason? }     -> 200 | 400 INVALID_INPUT | 404 REQUEST_NOT_FOUND | 409 INVALID_STATE
//   POST /api/business-inbox/:id/reopen                       -> 200 | 404 | 409
//   POST /api/business-inbox/:id/meetings    { date, time, mode, agenda? } -> 201 | 400 | 404 | 409
//   POST /api/business-inbox/:id/accept                       -> 200 | 404 | 409
//   GET  /api/business-inbox/:id/attachments/:attachmentId[?download=1] -> 200 { url, fileName, expiresIn }
//                                                                 | 404 ATTACHMENT_NOT_FOUND / FILE_NOT_FOUND
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import {
  getInbox, declineRequest, reopenRequest, scheduleMeeting, acceptRequest, getAttachmentUrl,
} from '../services/businessInboxService.js';

export const businessInboxRouter = Router();

function soNguyenDuong(giaTri, ten) {
  const n = Number(giaTri);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'INVALID_INPUT', `${ten} không hợp lệ.`);
  return n;
}

function chuoiTuyChon(giaTri, ten, toiDa) {
  if (giaTri === undefined || giaTri === null || giaTri === '') return '';
  if (typeof giaTri !== 'string') throw new AppError(400, 'INVALID_INPUT', `${ten} phải là chuỗi.`);
  const s = giaTri.trim();
  if (s.length > toiDa) throw new AppError(400, 'INVALID_INPUT', `${ten} tối đa ${toiDa} ký tự.`);
  return s;
}

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
  const { date, time } = req.body ?? {};
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError(400, 'INVALID_INPUT', 'Ngày hẹn phải có dạng YYYY-MM-DD.');
  }
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new AppError(400, 'INVALID_INPUT', 'Giờ hẹn phải có dạng HH:MM.');
  }
  // Ngày phải tồn tại thật (chặn 30/02...): dựng lại từ năm-tháng-ngày rồi so sánh
  const [nam, thang, ngay] = date.split('-').map(Number);
  const kiemTra = new Date(Date.UTC(nam, thang - 1, ngay));
  if (kiemTra.getUTCFullYear() !== nam || kiemTra.getUTCMonth() !== thang - 1 || kiemTra.getUTCDate() !== ngay) {
    throw new AppError(400, 'INVALID_INPUT', 'Ngày hẹn không tồn tại.');
  }
  // Giờ hẹn theo giờ Việt Nam
  const startAt = new Date(`${date}T${time}:00+07:00`);
  if (startAt <= new Date()) throw new AppError(400, 'INVALID_INPUT', 'Thời điểm hẹn đã qua.');
  const mode = chuoiTuyChon(req.body.mode, 'Hình thức', 100);
  if (!mode) throw new AppError(400, 'INVALID_INPUT', 'Chọn hình thức trao đổi.');
  const agenda = chuoiTuyChon(req.body.agenda, 'Nội dung trao đổi', 255);

  const ketQua = await scheduleMeeting(config.testBusinessId, id, config.testBusinessId, {
    startAt: startAt.toISOString(), mode, agenda,
  });
  res.status(201).json(ketQua);
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
