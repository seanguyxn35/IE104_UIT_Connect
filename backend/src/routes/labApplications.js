// API: POST /api/lab-applications  –  body { "topicId": 9001 }
// Hợp đồng: POST /api/lab-applications -> 201 | 400 INVALID_INPUT | 404 TOPIC_NOT_FOUND | 409 ALREADY_APPLIED / TOPIC_FULL.
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { applyToTopic } from '../services/labApplicationService.js';

export const labApplicationsRouter = Router();

labApplicationsRouter.post('/', async (req, res) => {
  // Bước 4: kiểm tra dữ liệu đầu vào
  const topicId = Number(req.body?.topicId);
  if (!Number.isInteger(topicId) || topicId <= 0) {
    throw new AppError(400, 'INVALID_INPUT', 'topicId không hợp lệ.');
  }

  // Danh tính lấy ở máy chủ; studentId client gửi lên (nếu có) bị bỏ qua
  const studentId = config.testStudentId;

  const application = await applyToTopic(studentId, topicId);
  res.status(201).json(application);
});
