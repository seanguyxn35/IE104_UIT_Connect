// API công trình trưng bày trên CV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET    /api/student-showcase             -> 200 { items: [...] }  (theo thứ tự hiển thị)
//   GET    /api/student-showcase/available   -> 200 { resources: [...] }  (đã công bố, chưa chọn)
//   POST   /api/student-showcase  { resourceId, role?, highlights?, isShownOnCv? }
//                                            -> 201 | 400 | 404 RESOURCE_NOT_FOUND | 409 NOT_PUBLISHED / NOT_REVIEWED / ALREADY_EXISTS
//   PATCH  /api/student-showcase/:resourceId { role?, highlights?, isShownOnCv? }
//                                            -> 200 | 400 | 403 NOT_TEAM_MEMBER (đã rời nhóm) | 404 SHOWCASE_NOT_FOUND
//   DELETE /api/student-showcase/:resourceId -> 204 | 404 SHOWCASE_NOT_FOUND
//   PUT    /api/student-showcase/order  { resourceIds: [...] } -> 200 { items } | 400 INVALID_INPUT
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import {
  addToShowcase,
  listAvailable,
  listShowcase,
  removeFromShowcase,
  reorderShowcase,
  updateShowcaseItem,
} from './cong-trinh-trung-bay.service.js';

export const studentShowcaseRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT
const MAX_ROLE = 150; // độ dài cột role_in_project
const MAX_HIGHLIGHTS = 1000;

const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseId(value) {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_INT) throw invalid('Mã công trình không hợp lệ.');
  return value;
}

function parseText(value, label, max) {
  if (value !== undefined && value !== null && typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
  const text = (value ?? '').trim();
  if (text.length > max) throw invalid(`${label} tối đa ${max} ký tự.`);
  return text || null;
}

function parseShown(value) {
  if (typeof value !== 'boolean') throw invalid('isShownOnCv phải là true hoặc false.');
  return value;
}

const PARSERS = {
  role: (v) => parseText(v, 'Vai trò', MAX_ROLE),
  highlights: (v) => parseText(v, 'Kết quả nổi bật', MAX_HIGHLIGHTS),
  isShownOnCv: parseShown,
};

studentShowcaseRouter.get('/', async (req, res) => {
  res.json({ items: await listShowcase(req.user.accountId) });
});

studentShowcaseRouter.get('/available', async (req, res) => {
  res.json({ resources: await listAvailable(req.user.accountId) });
});

studentShowcaseRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  const input = {
    resourceId: parseId(body.resourceId),
    role: PARSERS.role(body.role),
    highlights: PARSERS.highlights(body.highlights),
    isShownOnCv: body.isShownOnCv === undefined ? true : parseShown(body.isShownOnCv),
  };
  res.status(201).json(await addToShowcase(req.user.accountId, input));
});

studentShowcaseRouter.put('/order', async (req, res) => {
  const ids = req.body?.resourceIds;
  if (!Array.isArray(ids)) throw invalid('resourceIds phải là mảng.');
  ids.forEach(parseId);
  if (new Set(ids).size !== ids.length) throw invalid('resourceIds không được lặp.');
  res.json({ items: await reorderShowcase(req.user.accountId, ids) });
});

studentShowcaseRouter.patch('/:resourceId', async (req, res) => {
  const resourceId = parseId(Number(req.params.resourceId));
  const fields = Object.keys(PARSERS).filter((f) => req.body?.[f] !== undefined);
  if (fields.length === 0) throw invalid(`Cần gửi ít nhất một trong: ${Object.keys(PARSERS).join(', ')}.`);
  const changes = Object.fromEntries(fields.map((f) => [f, PARSERS[f](req.body[f])]));
  res.json(await updateShowcaseItem(req.user.accountId, resourceId, changes));
});

studentShowcaseRouter.delete('/:resourceId', async (req, res) => {
  await removeFromShowcase(req.user.accountId, parseId(Number(req.params.resourceId)));
  res.status(204).end();
});
