// API Không gian đàm phán của Doanh nghiệp (DN-09, DN-16). Danh tính DN lấy ở máy chủ (TEST_BUSINESS_ID).
//   GET    /api/business-negotiations                          -> 200 { rooms }
//   GET    /api/business-negotiations/:id                      -> 200 phòng + messages + documents (đánh dấu đã đọc) | 404 ROOM_NOT_FOUND
//   POST   /api/business-negotiations/:id/steps/:step/confirm  -> 200 | 400 | 404 | 409 STEP_LOCKED / ALREADY_CONFIRMED
//   DELETE /api/business-negotiations/:id/steps/:step/confirm  -> 200 | 400 | 404 | 409 NOT_CONFIRMED / STEP_COMPLETED
//          :step = Technical | NDA_IP | Contract
//   POST   /api/business-negotiations/:id/messages  { content }                     -> 201 | 400 | 404
//   POST   /api/business-negotiations/:id/meetings  { date, time, mode, agenda? }   -> 201 | 400 | 404
//   GET    /api/business-negotiations/:id/documents/:attachmentId[?download=1]      -> 200 { url } | 404
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { soNguyenDuong, chuoiTuyChon, docLichHen } from '../validation.js';
import {
  BUOC, tenDoanhNghiep, listRooms, getRoom, confirmStep, unconfirmStep, postMessage, scheduleRoomMeeting, getRoomDocumentUrl,
} from '../services/businessNegotiationService.js';

export const businessNegotiationsRouter = Router();

function docBuoc(giaTri) {
  if (!BUOC.includes(giaTri)) throw new AppError(400, 'INVALID_INPUT', `Bước không hợp lệ (${BUOC.join(' | ')}).`);
  return giaTri;
}

businessNegotiationsRouter.get('/', async (req, res) => {
  res.json(await listRooms(config.testBusinessId));
});

businessNegotiationsRouter.get('/:id', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  res.json(await getRoom(config.testBusinessId, id));
});

businessNegotiationsRouter.post('/:id/steps/:step/confirm', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  const step = docBuoc(req.params.step);
  res.json(await confirmStep(config.testBusinessId, id, step, await tenDoanhNghiep(config.testBusinessId)));
});

businessNegotiationsRouter.delete('/:id/steps/:step/confirm', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  const step = docBuoc(req.params.step);
  res.json(await unconfirmStep(config.testBusinessId, id, step, await tenDoanhNghiep(config.testBusinessId)));
});

businessNegotiationsRouter.post('/:id/messages', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  const content = chuoiTuyChon(req.body?.content, 'Nội dung', 1000);
  if (!content) throw new AppError(400, 'INVALID_INPUT', 'Nhập nội dung trước khi gửi.');
  res.status(201).json(await postMessage(config.testBusinessId, id, content));
});

businessNegotiationsRouter.post('/:id/meetings', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  const lich = docLichHen(req.body);
  res.status(201).json(await scheduleRoomMeeting(config.testBusinessId, id, lich, await tenDoanhNghiep(config.testBusinessId)));
});

businessNegotiationsRouter.get('/:id/documents/:attachmentId', async (req, res) => {
  const id = soNguyenDuong(req.params.id, 'Mã phòng');
  const attachmentId = soNguyenDuong(req.params.attachmentId, 'Mã văn bản');
  res.json(await getRoomDocumentUrl(config.testBusinessId, id, attachmentId, req.query.download === '1'));
});
