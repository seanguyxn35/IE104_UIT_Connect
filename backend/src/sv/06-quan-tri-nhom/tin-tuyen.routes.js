// API tab "Tin tuyển quân" (SV-06). Danh tính lấy ở máy chủ.
//   GET    /api/student-teams/:teamId/recruitments                  -> 200 { viewer, maxOpen, posts, options } | 404
//   POST   /api/student-teams/:teamId/recruitments                  { title, requirement?, slots, deadline?, fieldId?,
//                                                                      isInterdisciplinary?, relatedResourceId?, skills? }
//          -> 201 tin mới | 400 INVALID_INPUT / FIELD_NOT_FOUND / RESOURCE_NOT_FOUND | 403 | 404 | 409 TEAM_INACTIVE / POST_LIMIT
//   PATCH  /api/student-teams/:teamId/recruitments/:recruitId       (chỉ gửi trường cần đổi)
//          -> 200 | 400 | 403 | 404 POST_NOT_FOUND | 409 TEAM_INACTIVE / POST_CLOSED / SLOTS_BELOW_ACCEPTED
//   POST   /api/student-teams/:teamId/recruitments/:recruitId/close -> 200 | 403 | 404 | 409 POST_CLOSED
//   DELETE /api/student-teams/:teamId/recruitments/:recruitId       -> 204 | 403 | 404 | 409 POST_HAS_APPLICATIONS
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { todayInVietnam } from './don-gia-nhap.service.js';
import {
  closeRecruitment,
  createRecruitment,
  deleteRecruitment,
  listRecruitments,
  updateRecruitment,
} from './tin-tuyen.service.js';

export const teamRecruitmentRouter = Router();

const MAX_INT = 2147483647;
const MAX_SLOTS = 20;
const MAX_SKILLS = 10;
const MAX_DEADLINE_DAYS = 365;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);
const isId = (value) => Number.isInteger(value) && value > 0 && value <= MAX_INT;
const tidy = (value) => value.replace(/\s+/g, ' ').trim();

function parseId(value, label) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (!isId(id)) throw invalid(`${label} không hợp lệ.`);
  return id;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PARSERS = {
  title(value) {
    if (typeof value !== 'string') throw invalid('Tiêu đề phải là chuỗi.');
    const title = tidy(value);
    if (title.length < 5 || title.length > 255) throw invalid('Tiêu đề cần từ 5 đến 255 ký tự.');
    return title;
  },
  requirement(value) {
    if (value !== null && typeof value !== 'string') throw invalid('Yêu cầu phải là chuỗi.');
    const text = (value ?? '').replace(/\r\n/g, '\n').trim();
    if (text.length > 4000) throw invalid('Yêu cầu tối đa 4000 ký tự.');
    return text || null;
  },
  slots(value) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_SLOTS) throw invalid(`Chỉ tiêu là số nguyên từ 1 đến ${MAX_SLOTS}.`);
    return value;
  },
  deadline(value) {
    if (value === null) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
      throw invalid('Hạn nộp phải có dạng YYYY-MM-DD.');
    }
    const today = todayInVietnam();
    if (value < today) throw invalid('Hạn nộp không được ở trong quá khứ.');
    if (value > addDays(today, MAX_DEADLINE_DAYS)) throw invalid(`Hạn nộp tối đa ${MAX_DEADLINE_DAYS} ngày kể từ hôm nay.`);
    return value;
  },
  fieldId(value) {
    if (value !== null && !isId(value)) throw invalid('Lĩnh vực không hợp lệ.');
    return value;
  },
  isInterdisciplinary(value) {
    if (typeof value !== 'boolean') throw invalid('isInterdisciplinary phải là true hoặc false.');
    return value;
  },
  relatedResourceId(value) {
    if (value !== null && !isId(value)) throw invalid('Đề tài gắn kèm không hợp lệ.');
    return value;
  },
  skills(value) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) throw invalid('Danh sách kỹ năng không hợp lệ.');
    if (value.length > MAX_SKILLS) throw invalid(`Tối đa ${MAX_SKILLS} kỹ năng yêu cầu.`);
    const skills = value.map(tidy);
    if (!skills.every((s) => s.length >= 1 && s.length <= 100)) throw invalid('Mỗi kỹ năng cần từ 1 đến 100 ký tự.');
    if (new Set(skills.map((s) => s.toLowerCase())).size !== skills.length) throw invalid('Kỹ năng bị nhập trùng.');
    return skills;
  },
};

function parseBody(body) {
  const keys = Object.keys(PARSERS).filter((k) => body?.[k] !== undefined);
  return Object.fromEntries(keys.map((k) => [k, PARSERS[k](body[k])]));
}

teamRecruitmentRouter.get('/:teamId/recruitments', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listRecruitments(req.user.accountId, parseId(req.params.teamId, 'Mã nhóm')));
});

teamRecruitmentRouter.post('/:teamId/recruitments', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  if (req.body?.title === undefined) throw invalid('Cần nhập tiêu đề tin tuyển.');
  if (req.body?.slots === undefined) throw invalid('Cần nhập chỉ tiêu.');
  res.status(201).json(await createRecruitment(req.user.accountId, teamId, parseBody(req.body)));
});

teamRecruitmentRouter.patch('/:teamId/recruitments/:recruitId', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const recruitId = parseId(req.params.recruitId, 'Mã tin tuyển');
  const changes = parseBody(req.body);
  if (!Object.keys(changes).length) throw invalid(`Cần gửi ít nhất một trong: ${Object.keys(PARSERS).join(', ')}.`);
  res.json(await updateRecruitment(req.user.accountId, teamId, recruitId, changes));
});

teamRecruitmentRouter.post('/:teamId/recruitments/:recruitId/close', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  res.json(await closeRecruitment(req.user.accountId, teamId, parseId(req.params.recruitId, 'Mã tin tuyển')));
});

teamRecruitmentRouter.delete('/:teamId/recruitments/:recruitId', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  await deleteRecruitment(req.user.accountId, teamId, parseId(req.params.recruitId, 'Mã tin tuyển'));
  res.status(204).end();
});
