// API kỹ năng hồ sơ SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET    /api/student-skills            -> 200 { skills: [...] }
//   POST   /api/student-skills            -> 201 kỹ năng | 400 INVALID_INPUT | 409 ALREADY_EXISTS
//   DELETE /api/student-skills/:skillId   -> 204 | 400 INVALID_INPUT | 404 SKILL_NOT_FOUND
import { Router } from 'express';
import { AppError } from '../errors.js';
import { CATEGORY_KEYS, addSkill, listSkills, removeSkill } from '../services/studentSkillService.js';

export const studentSkillsRouter = Router();

studentSkillsRouter.get('/', async (req, res) => {
  res.json({ skills: await listSkills(req.user.accountId) });
});

studentSkillsRouter.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const level = Number(req.body?.level);
  const category = req.body?.category;

  if (name.length < 1 || name.length > 100) {
    throw new AppError(400, 'INVALID_INPUT', 'Tên kỹ năng phải từ 1 đến 100 ký tự.');
  }
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new AppError(400, 'INVALID_INPUT', 'Mức độ phải là số nguyên từ 1 đến 5.');
  }
  if (!CATEGORY_KEYS.includes(category)) {
    throw new AppError(400, 'INVALID_INPUT', 'Lĩnh vực không hợp lệ.');
  }

  res.status(201).json(await addSkill(req.user.accountId, { name, level, category }));
});

studentSkillsRouter.delete('/:skillId', async (req, res) => {
  const skillId = Number(req.params.skillId);
  if (!Number.isInteger(skillId) || skillId <= 0) {
    throw new AppError(400, 'INVALID_INPUT', 'skillId không hợp lệ.');
  }
  await removeSkill(req.user.accountId, skillId);
  res.status(204).end();
});
