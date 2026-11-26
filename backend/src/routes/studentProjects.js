// API "Đề tài của tôi" (SV-05). Danh tính lấy ở máy chủ, không lấy từ client:
//   GET    /api/student-projects          -> 200 { projects: [...] }  (mới cập nhật trước)
//   GET    /api/student-projects/options  -> 200 { fields: [...], teams: [...] }  (cho biểu mẫu)
//   POST   /api/student-projects  { type, title, teamId (bắt buộc với Paper), abstract?, authors?, keywords?,
//                                   venue?, doi?, fieldId?, sourceCodeUrl?, demoUrl? }
//                                         -> 201 (Draft) | 400 INVALID_INPUT | 403 NOT_TEAM_MEMBER | 409 TEAM_INACTIVE
//   PATCH  /api/student-projects/:id      -> 200 | 400 | 404 PROJECT_NOT_FOUND | 409 PROJECT_LOCKED / TEAM_INACTIVE
//   PUT    /api/student-projects/:id/file (thân là tệp PDF ≤ 10 MB) -> 200 | 404 | 409 | 413 FILE_TOO_LARGE | 415 UNSUPPORTED_TYPE
//   GET    /api/student-projects/:id/file -> 302 đường dẫn ký 60 giây | 404 PROJECT_NOT_FOUND / FILE_NOT_FOUND
//   DELETE /api/student-projects/:id      -> 204 | 403 NOT_TEAM_LEADER | 404 | 409 NOT_DRAFT
// Không có API nào cho SV đổi trạng thái: gửi thẩm định và công bố đi theo luồng riêng.
import express, { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import {
  MAX_FILE_BYTES,
  PROJECT_TYPES,
  createProject,
  deleteProject,
  getFileUrl,
  getOptions,
  listProjects,
  saveFile,
  updateProject,
} from '../services/studentProjectService.js';

export const studentProjectsRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseText(value, label, { min = 0, max }) {
  if (value !== undefined && value !== null && typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
  const text = (value ?? '').trim();
  if (text.length < min) throw invalid(text ? `${label} cần ít nhất ${min} ký tự.` : `Cần nhập ${label.toLowerCase()}.`);
  if (text.length > max) throw invalid(`${label} tối đa ${max} ký tự.`);
  return text || null;
}

function parseOptionalId(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value) || value <= 0 || value > MAX_INT) throw invalid(`${label} không hợp lệ.`);
  return value;
}

function parseParamId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_INT) throw invalid('Mã đề tài không hợp lệ.');
  return id;
}

// Chỉ nhận liên kết https, tối đa 255 ký tự (độ dài cột)
function parseUrl(value, label) {
  const text = parseText(value, label, { max: 255 });
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { throw invalid(`${label} không phải liên kết hợp lệ.`); }
  if (url.protocol !== 'https:') throw invalid(`${label} phải bắt đầu bằng https://`);
  if (url.href.length > 255) throw invalid(`${label} tối đa 255 ký tự.`);
  return url.href;
}

// Nhận cả dạng "10.1109/xyz" lẫn "https://doi.org/10.1109/xyz", chỉ lưu phần mã DOI
function parseDoi(value) {
  const text = parseText(value, 'DOI', { max: 150 });
  if (!text) return null;
  const doi = text.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '');
  if (!/^10\.\d{4,9}\/\S+$/.test(doi) || doi.length > 100) throw invalid('DOI không hợp lệ (ví dụ: 10.1109/ACCESS.2026.1234567).');
  return doi;
}

// Các trường SV được nhập; dùng chung cho tạo mới và sửa
const PARSERS = {
  title: (v) => parseText(v, 'Tên đề tài', { min: 5, max: 255 }),
  abstract: (v) => parseText(v, 'Tóm tắt', { max: 5000 }),
  authors: (v) => parseText(v, 'Tác giả', { max: 500 }),
  keywords: (v) => parseText(v, 'Từ khóa', { max: 500 }),
  venue: (v) => parseText(v, 'Nơi công bố', { max: 255 }),
  doi: parseDoi,
  fieldId: (v) => parseOptionalId(v, 'Lĩnh vực'),
  sourceCodeUrl: (v) => parseUrl(v, 'Liên kết mã nguồn'),
  demoUrl: (v) => parseUrl(v, 'Liên kết demo'),
};

studentProjectsRouter.get('/', async (req, res) => {
  res.json({ projects: await listProjects(config.testStudentId) });
});

studentProjectsRouter.get('/options', async (req, res) => {
  res.json(await getOptions(config.testStudentId));
});

studentProjectsRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  if (!PROJECT_TYPES.includes(body.type)) throw invalid(`type phải là một trong: ${PROJECT_TYPES.join(', ')}.`);
  const input = Object.fromEntries(Object.entries(PARSERS).map(([field, parse]) => [field, parse(body[field])]));
  input.type = body.type;
  input.teamId = parseOptionalId(body.teamId, 'Nhóm');
  if (input.type === 'Paper' && input.teamId === null) throw invalid('Bài báo phải thuộc một nhóm của bạn.');
  res.status(201).json(await createProject(config.testStudentId, input));
});

studentProjectsRouter.patch('/:id', async (req, res) => {
  const id = parseParamId(req.params.id);
  // Chỉ lấy các trường được phép sửa; status, type, teamId... trong yêu cầu bị bỏ qua
  const fields = Object.keys(PARSERS).filter((f) => req.body?.[f] !== undefined);
  if (fields.length === 0) throw invalid(`Cần gửi ít nhất một trong: ${Object.keys(PARSERS).join(', ')}.`);
  const changes = Object.fromEntries(fields.map((f) => [f, PARSERS[f](req.body[f])]));
  res.json(await updateProject(config.testStudentId, id, changes));
});

studentProjectsRouter.put(
  '/:id/file',
  express.raw({ type: 'application/pdf', limit: MAX_FILE_BYTES }),
  async (req, res) => {
    const id = parseParamId(req.params.id);
    if (!Buffer.isBuffer(req.body)) throw new AppError(415, 'UNSUPPORTED_TYPE', 'Chỉ nhận tệp PDF.');
    res.json(await saveFile(config.testStudentId, id, req.body));
  },
);

studentProjectsRouter.get('/:id/file', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.redirect(302, await getFileUrl(config.testStudentId, parseParamId(req.params.id)));
});

studentProjectsRouter.delete('/:id', async (req, res) => {
  await deleteProject(config.testStudentId, parseParamId(req.params.id));
  res.status(204).end();
});

// Tệp quá lớn: báo đúng giới hạn của bài nộp (bộ xử lý chung trong server.js dành cho ảnh đại diện)
studentProjectsRouter.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' && req.method === 'PUT') {
    return next(new AppError(413, 'FILE_TOO_LARGE', 'Tệp PDF tối đa 10 MB.'));
  }
  next(err);
});
