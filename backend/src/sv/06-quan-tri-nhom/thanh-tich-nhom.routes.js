// API tab "Portfolio & Thành tích" (SV-06). Danh tính lấy ở máy chủ.
//   GET    /api/student-teams/:teamId/portfolio                      -> 200 { viewer, maxAchievements, achievements, works } | 404
//   POST   /api/student-teams/:teamId/achievements                   { category, title, issuedBy?, issuedDate?,
//                                                                       certificateCode?, doi?, externalUrl?, detail? }
//          -> 201 | 400 | 403 NOT_TEAM_LEADER | 404 | 409 TEAM_INACTIVE / ACHIEVEMENT_LIMIT
//   PATCH  /api/student-teams/:teamId/achievements/:achievementId     (chỉ gửi trường cần đổi; null = xóa giá trị)
//          -> 200 | 400 | 403 | 404 ACHIEVEMENT_NOT_FOUND | 409
//   DELETE /api/student-teams/:teamId/achievements/:achievementId     -> 204 | 403 | 404 | 409
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { todayInVietnam } from './don-gia-nhap.service.js';
import { createAchievement, deleteAchievement, getPortfolio, updateAchievement } from './thanh-tich-nhom.service.js';

export const teamPortfolioRouter = Router();

export const ACHIEVEMENT_CATEGORIES = ['Award', 'Publication', 'Patent', 'Certificate', 'Other']; // khớp CHECK của migration 013
const MAX_INT = 2147483647;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseId(value, label) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw invalid(`${label} không hợp lệ.`);
  return id;
}

function optionalLine(label, max) {
  return (value) => {
    if (value === null) return null;
    if (typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
    const text = value.replace(/\s+/g, ' ').trim();
    if (text.length > max) throw invalid(`${label} tối đa ${max} ký tự.`);
    return text || null;
  };
}

const PARSERS = {
  category(value) {
    if (!ACHIEVEMENT_CATEGORIES.includes(value)) throw invalid(`Loại thành tích phải là một trong: ${ACHIEVEMENT_CATEGORIES.join(', ')}.`);
    return value;
  },
  title(value) {
    if (typeof value !== 'string') throw invalid('Tên thành tích phải là chuỗi.');
    const title = value.replace(/\s+/g, ' ').trim();
    if (title.length < 3 || title.length > 255) throw invalid('Tên thành tích cần từ 3 đến 255 ký tự.');
    return title;
  },
  issuedBy: optionalLine('Đơn vị trao / xuất bản', 150),
  issuedDate(value) {
    if (value === null) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
      throw invalid('Ngày đạt phải có dạng YYYY-MM-DD.');
    }
    if (value > todayInVietnam()) throw invalid('Ngày đạt không được ở tương lai.');
    if (value < '1990-01-01') throw invalid('Ngày đạt không hợp lệ.');
    return value;
  },
  certificateCode: optionalLine('Mã chứng nhận', 50),
  doi(value) {
    const doi = optionalLine('DOI', 100)(value);
    if (doi !== null && !/^10\.\d{4,9}\/\S+$/.test(doi)) throw invalid('DOI có dạng 10.xxxx/...');
    return doi;
  },
  externalUrl(value) {
    const url = optionalLine('Liên kết', 255)(value);
    if (url === null) return null;
    let parsed = null;
    try { parsed = new URL(url); } catch { /* không phải URL */ }
    if (!parsed || parsed.protocol !== 'https:' || !url.startsWith('https://')) throw invalid('Liên kết phải là địa chỉ bắt đầu bằng https://');
    return url;
  },
  detail(value) {
    if (value === null) return null;
    if (typeof value !== 'string') throw invalid('Mô tả phải là chuỗi.');
    const text = value.replace(/\r\n/g, '\n').trim();
    if (text.length > 500) throw invalid('Mô tả tối đa 500 ký tự.');
    return text || null;
  },
};

function parseBody(body) {
  const keys = Object.keys(PARSERS).filter((k) => body?.[k] !== undefined);
  return Object.fromEntries(keys.map((k) => [k, PARSERS[k](body[k])]));
}

teamPortfolioRouter.get('/:teamId/portfolio', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getPortfolio(req.user.accountId, parseId(req.params.teamId, 'Mã nhóm')));
});

teamPortfolioRouter.post('/:teamId/achievements', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  if (req.body?.category === undefined || req.body?.title === undefined) throw invalid('Cần chọn loại và nhập tên thành tích.');
  res.status(201).json(await createAchievement(req.user.accountId, teamId, parseBody(req.body)));
});

teamPortfolioRouter.patch('/:teamId/achievements/:achievementId', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const id = parseId(req.params.achievementId, 'Mã thành tích');
  const changes = parseBody(req.body);
  if (!Object.keys(changes).length) throw invalid(`Cần gửi ít nhất một trong: ${Object.keys(PARSERS).join(', ')}.`);
  res.json(await updateAchievement(req.user.accountId, teamId, id, changes));
});

teamPortfolioRouter.delete('/:teamId/achievements/:achievementId', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  await deleteAchievement(req.user.accountId, teamId, parseId(req.params.achievementId, 'Mã thành tích'));
  res.status(204).end();
});
