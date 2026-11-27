// API thành tích / chứng chỉ SV tự khai (danh tính lấy ở máy chủ, không lấy từ client):
//   GET    /api/student-achievements                          -> 200 { achievements: [...] }
//   POST   /api/student-achievements                          -> 201 mục | 400 INVALID_INPUT | 409 ALREADY_EXISTS
//          { category, title, issuedBy, issuedDate: "YYYY-MM-DD", detail?, visibility?, externalUrl?, hasEvidenceFile? }
//          category 'Publication' (công bố bên ngoài hệ thống): cần externalUrl (https hoặc DOI), hoặc
//          hasEvidenceFile = true nếu tải tệp ngay sau đó; thiếu cả hai -> 400 PROOF_REQUIRED
//   PATCH  /api/student-achievements/:id { visibility }       -> 200 mục | 400 | 404 ACHIEVEMENT_NOT_FOUND
//   DELETE /api/student-achievements/:id                      -> 204 | 404
//   PUT    /api/student-achievements/:id/evidence  (thân = tệp PDF/JPG/PNG ≤ 5 MB)
//                                                             -> 200 mục | 404 | 409 ACHIEVEMENT_LOCKED | 413 | 415
//   GET    /api/student-achievements/:id/evidence             -> 302 liên kết tạm | 404 EVIDENCE_NOT_FOUND
//   POST   /api/student-achievements/:id/verification-request -> 200 mục | 404 | 409 EVIDENCE_REQUIRED / INVALID_STATUS
import express, { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { PROFILE_MODES } from './che-do-hien-thi.service.js';
import {
  ACHIEVEMENT_CATEGORIES,
  EVIDENCE_TYPES,
  MAX_EVIDENCE_BYTES,
  createAchievement,
  deleteAchievement,
  getEvidenceUrl,
  listAchievements,
  requestVerification,
  saveEvidence,
  setAchievementVisibility,
} from './thanh-tich.service.js';

export const studentAchievementsRouter = Router();

const MIN_DATE = '1950-01-01';
const MAX_INT = 2147483647; // giới hạn cột INT

const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_INT) throw invalid('Mã thành tích không hợp lệ.');
  return id;
}

function parseText(value, label, max, required) {
  if (value !== undefined && value !== null && typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
  const text = (value ?? '').trim();
  if (required && !text) throw invalid(`${label} là bắt buộc.`);
  if (text.length > max) throw invalid(`${label} tối đa ${max} ký tự.`);
  return text || null;
}

function parseDate(value) {
  const bad = () => invalid('Ngày cấp phải là ngày hợp lệ dạng YYYY-MM-DD.');
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw bad();
  const date = new Date(`${value}T00:00:00Z`);
  // Loại ngày không tồn tại như 2025-02-30
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw bad();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (value > today) throw invalid('Ngày cấp không được sau hôm nay.');
  if (value < MIN_DATE) throw invalid('Ngày cấp không được trước năm 1950.');
  return value;
}

// Liên kết của công bố: nhận URL https hoặc mã DOI ("10.xxxx/..." được đổi thành https://doi.org/...)
function parsePublicationLink(value) {
  const text = parseText(value, 'Liên kết DOI/URL', 255, false);
  if (!text) return null;
  const doi = text.replace(/^doi:\s*/i, '');
  let url;
  try {
    url = new URL(/^10\.\d{4,9}\/\S+$/.test(doi) ? `https://doi.org/${doi}` : text);
  } catch {
    throw invalid('Liên kết DOI/URL không hợp lệ.');
  }
  // Phải là https, có tên miền thật và không kèm tài khoản đăng nhập trong liên kết
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) {
    throw invalid('Liên kết DOI/URL phải bắt đầu bằng https:// (hoặc là mã DOI dạng 10.xxxx/...).');
  }
  if (url.href.length > 255) throw invalid('Liên kết DOI/URL tối đa 255 ký tự.');
  return url.href;
}

function parseVisibility(value) {
  if (!PROFILE_MODES.includes(value)) throw invalid(`Chế độ hiển thị phải là một trong: ${PROFILE_MODES.join(', ')}.`);
  return value;
}

studentAchievementsRouter.get('/', async (req, res) => {
  res.json({ achievements: await listAchievements(req.user.accountId) });
});

studentAchievementsRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  if (!ACHIEVEMENT_CATEGORIES.includes(body.category)) {
    throw invalid(`Phân loại phải là một trong: ${ACHIEVEMENT_CATEGORIES.join(', ')}.`);
  }
  // Chỉ lấy đúng các trường cho phép; status, studentId... client gửi lên bị bỏ qua
  const input = {
    category: body.category,
    title: parseText(body.title, 'Tên thành tích', 255, true),
    issuedBy: parseText(body.issuedBy, 'Tổ chức cấp', 150, true),
    issuedDate: parseDate(body.issuedDate),
    detail: parseText(body.detail, 'Mô tả thêm', 500, false),
    visibility: body.visibility === undefined ? 'Public' : parseVisibility(body.visibility),
    // Chỉ công bố bên ngoài hệ thống mới có liên kết; loại khác bỏ qua trường này
    externalUrl: body.category === 'Publication' ? parsePublicationLink(body.externalUrl) : null,
  };
  // hasEvidenceFile chỉ cho phép lưu trước rồi tải tệp; nếu tệp không tới, mục vẫn bị giữ ngoài CV (missingProof)
  if (input.category === 'Publication' && !input.externalUrl && body.hasEvidenceFile !== true) {
    throw new AppError(400, 'PROOF_REQUIRED', 'Công bố bên ngoài hệ thống cần liên kết DOI/URL https:// hoặc tệp minh chứng.');
  }
  res.status(201).json(await createAchievement(req.user.accountId, input));
});

studentAchievementsRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const visibility = parseVisibility(req.body?.visibility);
  res.json(await setAchievementVisibility(req.user.accountId, id, visibility));
});

studentAchievementsRouter.delete('/:id', async (req, res) => {
  await deleteAchievement(req.user.accountId, parseId(req.params.id));
  res.status(204).end();
});

studentAchievementsRouter.put(
  '/:id/evidence',
  express.raw({ type: EVIDENCE_TYPES, limit: MAX_EVIDENCE_BYTES }),
  async (req, res) => {
    const id = parseId(req.params.id);
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(415, 'UNSUPPORTED_TYPE', 'Minh chứng chỉ nhận tệp PDF, JPG hoặc PNG.');
    }
    res.json(await saveEvidence(req.user.accountId, id, req.body, req.get('content-type').split(';')[0]));
  },
);

studentAchievementsRouter.get('/:id/evidence', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.redirect(302, await getEvidenceUrl(req.user.accountId, parseId(req.params.id)));
});

studentAchievementsRouter.post('/:id/verification-request', async (req, res) => {
  res.json(await requestVerification(req.user.accountId, parseId(req.params.id)));
});

// Tệp quá lớn: báo đúng giới hạn của minh chứng (bộ xử lý chung trong server.js dành cho ảnh đại diện)
studentAchievementsRouter.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return next(new AppError(413, 'FILE_TOO_LARGE', 'Tệp minh chứng tối đa 5 MB.'));
  }
  next(err);
});
