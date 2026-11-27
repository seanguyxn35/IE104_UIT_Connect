// API Quản trị nhóm (SV-06): đơn xin gia nhập. Danh tính lấy ở máy chủ, không lấy từ client:
//   GET  /api/student-teams                     -> 200 { teams: [...] }  (nhóm tôi đang tham gia)
//   GET  /api/student-teams/:teamId             -> 200 số liệu tổng quan | 404 TEAM_NOT_FOUND
//   GET  /api/student-teams/:teamId/applications[?status=Pending|Accepted|Rejected]
//                                               -> 200 { viewer, team, counts, applications } | 400 | 404
//   POST /api/student-teams/:teamId/applications/:applyId/accept
//        -> 200 { applyId, status, memberCount, maxMembers, recruitmentStatus }
//         | 403 NOT_TEAM_LEADER | 404 TEAM_NOT_FOUND / APPLICATION_NOT_FOUND
//         | 409 APPLICATION_NOT_PENDING / TEAM_INACTIVE / TEAM_FULL / ALREADY_MEMBER / APPLICANT_INACTIVE / POST_FILLED
//   POST /api/student-teams/:teamId/applications/:applyId/reject  { reason: 10–500 ký tự }
//        -> 200 { applyId, status, responseNote } | 400 INVALID_INPUT | 403 | 404 | 409 APPLICATION_NOT_PENDING
// Mọi API: 401 UNAUTHENTICATED (AUTH_MODE=session, chưa đăng nhập), 403 FORBIDDEN_ROLE (không phải SV).
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import {
  LIST_STATUSES,
  acceptApplication,
  getTeamOverview,
  listMyTeams,
  listTeamApplications,
  rejectApplication,
} from './don-gia-nhap.service.js';

export const studentTeamsRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT
const REASON_MIN = 10;
const REASON_MAX = 500;
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseId(value, label) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw invalid(`${label} không hợp lệ.`);
  return id;
}

function parseReason(value) {
  if (typeof value !== 'string') throw invalid('Cần nhập lý do từ chối.');
  const reason = value.trim();
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    throw invalid(`Lý do từ chối cần từ ${REASON_MIN} đến ${REASON_MAX} ký tự.`);
  }
  return reason;
}

studentTeamsRouter.get('/', async (req, res) => {
  res.json({ teams: await listMyTeams(req.user.accountId) });
});

studentTeamsRouter.get('/:teamId', async (req, res) => {
  res.json(await getTeamOverview(req.user.accountId, parseId(req.params.teamId, 'Mã nhóm')));
});

studentTeamsRouter.get('/:teamId/applications', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const status = req.query.status ?? 'Pending';
  if (!LIST_STATUSES.includes(status)) throw invalid(`status phải là một trong: ${LIST_STATUSES.join(', ')}.`);
  res.set('Cache-Control', 'no-store');
  res.json(await listTeamApplications(req.user.accountId, teamId, status));
});

studentTeamsRouter.post('/:teamId/applications/:applyId/accept', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const applyId = parseId(req.params.applyId, 'Mã đơn');
  res.json(await acceptApplication(req.user.accountId, teamId, applyId));
});

studentTeamsRouter.post('/:teamId/applications/:applyId/reject', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const applyId = parseId(req.params.applyId, 'Mã đơn');
  res.json(await rejectApplication(req.user.accountId, teamId, applyId, parseReason(req.body?.reason)));
});
