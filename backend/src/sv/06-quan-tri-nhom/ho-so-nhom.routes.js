// API hồ sơ nhóm (SV-06, tab "Thông tin nhóm"). Danh tính lấy ở máy chủ, không lấy từ client:
//   GET   /api/student-teams/profile-options  -> 200 { faculties, fields, skills }
//   GET   /api/student-teams/:teamId/profile  -> 200 hồ sơ | 404 TEAM_NOT_FOUND
//   PATCH /api/student-teams/:teamId/profile  { name?, description?, facultyId?, fieldIds?, skills? }
//         -> 200 hồ sơ mới | 400 INVALID_INPUT / FACULTY_NOT_FOUND / FIELD_NOT_FOUND
//          | 403 NOT_TEAM_LEADER | 404 TEAM_NOT_FOUND | 409 TEAM_INACTIVE
// Mã định danh, cố vấn, trạng thái, số thành viên tối đa không sửa được ở đây (trường lạ bị bỏ qua).
// Phải gắn TRƯỚC studentTeamsRouter, nếu không "profile-options" bị hiểu là :teamId.
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { getProfileOptions, getTeamProfile, updateTeamProfile } from './ho-so-nhom.service.js';

export const teamProfileRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT
const MAX_FIELDS = 3;
const MAX_SKILLS = 15;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);
const isId = (value) => Number.isInteger(value) && value > 0 && value <= MAX_INT;
// Gộp khoảng trắng thừa trong tên (tên nhóm, tên kỹ năng)
const tidy = (value) => value.replace(/\s+/g, ' ').trim();

function parseTeamId(value) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (!isId(id)) throw invalid('Mã nhóm không hợp lệ.');
  return id;
}

const PARSERS = {
  name(value) {
    if (typeof value !== 'string') throw invalid('Tên nhóm phải là chuỗi.');
    const name = tidy(value);
    if (name.length < 3 || name.length > 150) throw invalid('Tên nhóm cần từ 3 đến 150 ký tự.');
    return name;
  },
  description(value) {
    if (value !== null && typeof value !== 'string') throw invalid('Tôn chỉ & hướng nghiên cứu phải là chuỗi.');
    const text = (value ?? '').trim();
    if (text.length > 2000) throw invalid('Tôn chỉ & hướng nghiên cứu tối đa 2000 ký tự.');
    return text || null;
  },
  facultyId(value) {
    if (value !== null && !isId(value)) throw invalid('Khoa không hợp lệ.');
    return value;
  },
  fieldIds(value) {
    if (!Array.isArray(value) || !value.every(isId)) throw invalid('Danh sách lĩnh vực không hợp lệ.');
    if (value.length > MAX_FIELDS) throw invalid(`Chọn tối đa ${MAX_FIELDS} lĩnh vực trọng tâm.`);
    if (new Set(value).size !== value.length) throw invalid('Lĩnh vực bị chọn trùng.');
    return value;
  },
  skills(value) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) throw invalid('Danh sách kỹ năng không hợp lệ.');
    if (value.length > MAX_SKILLS) throw invalid(`Tối đa ${MAX_SKILLS} kỹ năng chủ lực.`);
    const skills = value.map(tidy);
    if (!skills.every((s) => s.length >= 1 && s.length <= 100)) throw invalid('Mỗi kỹ năng cần từ 1 đến 100 ký tự.');
    if (new Set(skills.map((s) => s.toLowerCase())).size !== skills.length) throw invalid('Kỹ năng bị nhập trùng.');
    return skills;
  },
};

teamProfileRouter.get('/profile-options', async (req, res) => {
  res.json(await getProfileOptions());
});

teamProfileRouter.get('/:teamId/profile', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getTeamProfile(req.user.accountId, parseTeamId(req.params.teamId)));
});

teamProfileRouter.patch('/:teamId/profile', async (req, res) => {
  const teamId = parseTeamId(req.params.teamId);
  const fields = Object.keys(PARSERS).filter((f) => req.body?.[f] !== undefined);
  if (fields.length === 0) throw invalid(`Cần gửi ít nhất một trong: ${Object.keys(PARSERS).join(', ')}.`);
  const changes = Object.fromEntries(fields.map((f) => [f, PARSERS[f](req.body[f])]));
  res.json(await updateTeamProfile(req.user.accountId, teamId, changes));
});
