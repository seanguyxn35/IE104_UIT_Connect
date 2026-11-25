// API ảnh đại diện SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET  /api/student-avatar  -> 200 { avatarUrl: string | null }
//   POST /api/student-avatar  -> 200 { avatarUrl }   body = nội dung ảnh, Content-Type: image/jpeg|png|webp (≤ 2 MB)
//                                 | 413 FILE_TOO_LARGE | 415 UNSUPPORTED_TYPE
import express, { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { AVATAR_TYPES, MAX_AVATAR_BYTES, getAvatarUrl, saveAvatar } from '../services/avatarService.js';

export const studentAvatarRouter = Router();

studentAvatarRouter.get('/', async (req, res) => {
  res.json({ avatarUrl: await getAvatarUrl(config.testStudentId) });
});

studentAvatarRouter.post(
  '/',
  express.raw({ type: AVATAR_TYPES, limit: MAX_AVATAR_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(415, 'UNSUPPORTED_TYPE', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
    }
    const avatarUrl = await saveAvatar(config.testStudentId, req.body, req.get('content-type').split(';')[0]);
    res.json({ avatarUrl });
  },
);
