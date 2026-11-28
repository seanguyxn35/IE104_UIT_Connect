// API: GET /api/lab-topics?q=&faculty=&field=&page=&pageSize=  (SV-07 Chợ ghép nhóm)
//   q: ≤ 100 ký tự, tìm theo tên đề tài, mô tả, Lab, kỹ năng, giảng viên, đối tác (không phân biệt dấu)
//   faculty, field: mã khoa / lĩnh vực (bỏ trống = tất cả); page ≥ 1; pageSize 1–24 (mặc định 6)
//   -> 200 { total, page, pageSize, totalPages, items, filters, summary, faculties, fields } | 400 INVALID_INPUT
//   Trang vượt quá số trang thì trả trang cuối. Danh tính người xem lấy ở máy chủ (đánh dấu "đã ứng tuyển").
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { listLabTopics } from './de-tai-lab.service.js';

export const labTopicsRouter = Router();

const MAX_INT = 2147483647;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function optionalId(value, label) {
  if (value === undefined || value === '') return null;
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw invalid(`${label} không hợp lệ.`);
  return id;
}

function intInRange(value, label, min, max, fallback) {
  if (value === undefined || value === '') return fallback;
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) throw invalid(`${label} phải là số nguyên từ ${min} đến ${max}.`);
  return n;
}

labTopicsRouter.get('/', async (req, res) => {
  const q = req.query.q ?? '';
  if (typeof q !== 'string') throw invalid('Từ khóa tìm kiếm không hợp lệ.');
  const text = q.replace(/\s+/g, ' ').trim();
  if (text.length > 100) throw invalid('Từ khóa tìm kiếm tối đa 100 ký tự.');
  const filters = {
    q: text,
    facultyId: optionalId(req.query.faculty, 'Khoa'),
    fieldId: optionalId(req.query.field, 'Lĩnh vực'),
    page: intInRange(req.query.page, 'Trang', 1, 1000, 1),
    pageSize: intInRange(req.query.pageSize, 'Số đề tài mỗi trang', 1, 24, 6),
  };
  res.set('Cache-Control', 'no-store');
  res.json(await listLabTopics(req.user.accountId, filters));
});
