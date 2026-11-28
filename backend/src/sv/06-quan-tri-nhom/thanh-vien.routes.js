// API tab "Thành viên" (SV-06). Danh tính lấy ở máy chủ; thành viên được chỉ định bằng MSSV, không nhận studentId.
//   GET   /api/student-teams/:teamId/members                       -> 200 { viewer, team, members } | 404
//   PATCH /api/student-teams/:teamId/members/:studentCode          { positionTitle?, contribution? } (≤ 100 / ≤ 255, null = xóa)
//         -> 200 | 400 | 403 NOT_TEAM_LEADER | 404 TEAM_NOT_FOUND / MEMBER_NOT_FOUND | 409 TEAM_INACTIVE
//   POST  /api/student-teams/:teamId/members/:studentCode/remove   { reason } (10–500 ký tự)
//         -> 200 { memberCount } | 400 | 403 | 404 | 409 TEAM_INACTIVE / CANNOT_REMOVE_SELF
//   POST  /api/student-teams/:teamId/transfer-leader               { student: MSSV }
//         -> 200 | 400 | 403 | 404 | 409 TEAM_INACTIVE / ALREADY_LEADER
//   POST  /api/student-teams/:teamId/leave                         -> 200 { memberCount } | 404 | 409 LEADER_MUST_TRANSFER
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { leaveTeam, listMembers, removeMember, transferLeader, updateMember } from './thanh-vien.service.js';

export const teamMemberRouter = Router();

const MAX_INT = 2147483647;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseTeamId(value) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw invalid('Mã nhóm không hợp lệ.');
  return id;
}

function parseCode(value) {
  const code = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{8}$/.test(code)) throw invalid('MSSV phải gồm 8 chữ số.');
  return code;
}

// Chuỗi một dòng, gộp khoảng trắng; rỗng hoặc null = xóa
function parseLine(value, label, max) {
  if (value === null) return null;
  if (typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length > max) throw invalid(`${label} tối đa ${max} ký tự.`);
  return text || null;
}

teamMemberRouter.get('/:teamId/members', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listMembers(req.user.accountId, parseTeamId(req.params.teamId)));
});

teamMemberRouter.patch('/:teamId/members/:studentCode', async (req, res) => {
  const teamId = parseTeamId(req.params.teamId);
  const code = parseCode(req.params.studentCode);
  const changes = {};
  if (req.body?.positionTitle !== undefined) changes.positionTitle = parseLine(req.body.positionTitle, 'Chức danh', 100);
  if (req.body?.contribution !== undefined) changes.contribution = parseLine(req.body.contribution, 'Đóng góp chính', 255);
  if (!Object.keys(changes).length) throw invalid('Cần gửi positionTitle hoặc contribution.');
  res.json(await updateMember(req.user.accountId, teamId, code, changes));
});

teamMemberRouter.post('/:teamId/members/:studentCode/remove', async (req, res) => {
  const teamId = parseTeamId(req.params.teamId);
  const code = parseCode(req.params.studentCode);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 500) throw invalid('Lý do cần từ 10 đến 500 ký tự.');
  res.json(await removeMember(req.user.accountId, teamId, code, reason));
});

teamMemberRouter.post('/:teamId/transfer-leader', async (req, res) => {
  const teamId = parseTeamId(req.params.teamId);
  res.json(await transferLeader(req.user.accountId, teamId, parseCode(req.body?.student)));
});

teamMemberRouter.post('/:teamId/leave', async (req, res) => {
  res.json(await leaveTeam(req.user.accountId, parseTeamId(req.params.teamId)));
});
