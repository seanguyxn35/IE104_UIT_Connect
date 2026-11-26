// API ẩn/công khai chỉ số hồ sơ SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET /api/profile-visibility                      -> 200 { gpa, drl, projects }  (true = công khai)
//   PUT /api/profile-visibility { field, isPublic }  -> 200 { gpa, drl, projects } | 400 INVALID_INPUT
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { VISIBILITY_FIELDS, getVisibility, setVisibility } from '../services/profileVisibilityService.js';

export const profileVisibilityRouter = Router();

profileVisibilityRouter.get('/', async (req, res) => {
  res.json(await getVisibility(config.testStudentId));
});

profileVisibilityRouter.put('/', async (req, res) => {
  const { field, isPublic } = req.body ?? {};
  if (!VISIBILITY_FIELDS.includes(field)) {
    throw new AppError(400, 'INVALID_INPUT', `field phải là một trong: ${VISIBILITY_FIELDS.join(', ')}.`);
  }
  if (typeof isPublic !== 'boolean') {
    throw new AppError(400, 'INVALID_INPUT', 'isPublic phải là true hoặc false.');
  }
  res.json(await setVisibility(config.testStudentId, field, isPublic));
});
