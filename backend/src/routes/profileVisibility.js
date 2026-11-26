// API ẩn/công khai chỉ số hồ sơ SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET /api/profile-visibility                      -> 200 { gpa, drl, projects }  (true = công khai)
//   PUT /api/profile-visibility { field, isPublic }  -> 200 { gpa, drl, projects } | 400 INVALID_INPUT
// Chế độ hiển thị của cả hồ sơ (Public | Partners_Only | Private):
//   GET /api/profile-visibility/mode                 -> 200 { visibility }
//   PUT /api/profile-visibility/mode { visibility }  -> 200 { visibility } | 400 INVALID_INPUT
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import {
  PROFILE_MODES,
  VISIBILITY_FIELDS,
  getProfileMode,
  getVisibility,
  setProfileMode,
  setVisibility,
} from '../services/profileVisibilityService.js';

export const profileVisibilityRouter = Router();

profileVisibilityRouter.get('/mode', async (req, res) => {
  res.json(await getProfileMode(config.testStudentId));
});

profileVisibilityRouter.put('/mode', async (req, res) => {
  const visibility = req.body?.visibility;
  if (!PROFILE_MODES.includes(visibility)) {
    throw new AppError(400, 'INVALID_INPUT', `visibility phải là một trong: ${PROFILE_MODES.join(', ')}.`);
  }
  res.json(await setProfileMode(config.testStudentId, visibility));
});

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
