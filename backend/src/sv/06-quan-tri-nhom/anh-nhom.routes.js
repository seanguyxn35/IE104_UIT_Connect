// API ảnh nhóm (SV-06). Danh tính lấy ở máy chủ, không lấy từ client:
//   PUT    /api/student-teams/:teamId/avatar   thân là nội dung ảnh, Content-Type: image/jpeg|png|webp (≤ 2 MB)
//          -> 200 { avatarUrl } | 403 NOT_TEAM_LEADER | 404 TEAM_NOT_FOUND | 409 TEAM_INACTIVE
//           | 413 FILE_TOO_LARGE | 415 UNSUPPORTED_TYPE (kiểm tra nội dung tệp, không tin Content-Type)
//   DELETE /api/student-teams/:teamId/avatar   -> 204 (chưa có ảnh vẫn 204) | 403 | 404 | 409
// Gắn trước studentTeamsRouter cùng đường dẫn /api/student-teams.
import express, { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { AVATAR_TYPES, MAX_AVATAR_BYTES } from '../04-ho-so-nang-luc-cv/anh-dai-dien.service.js';
import { removeTeamAvatar, saveTeamAvatar } from './anh-nhom.service.js';

export const teamAvatarRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT

function parseTeamId(value) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw new AppError(400, 'INVALID_INPUT', 'Mã nhóm không hợp lệ.');
  return id;
}

teamAvatarRouter.put(
  '/:teamId/avatar',
  express.raw({ type: AVATAR_TYPES, limit: MAX_AVATAR_BYTES }),
  async (req, res) => {
    const teamId = parseTeamId(req.params.teamId);
    if (!Buffer.isBuffer(req.body)) throw new AppError(415, 'UNSUPPORTED_TYPE', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
    const contentType = req.get('content-type').split(';')[0];
    res.json({ avatarUrl: await saveTeamAvatar(req.user.accountId, teamId, req.body, contentType) });
  },
);

teamAvatarRouter.delete('/:teamId/avatar', async (req, res) => {
  await removeTeamAvatar(req.user.accountId, parseTeamId(req.params.teamId));
  res.status(204).end();
});
