// API lời mời vào nhóm (SV-06). Danh tính lấy ở máy chủ; người được mời chỉ định bằng MSSV / email, không nhận studentId.
// Phía Leader (/api/student-teams):
//   GET  /:teamId/invite-lookup?student=<MSSV|email>  -> 200 { student, canInvite, blockedReason, blockedMessage }
//        | 400 | 403 NOT_TEAM_LEADER | 404 TEAM_NOT_FOUND / STUDENT_NOT_FOUND | 409 TEAM_INACTIVE | 429
//   GET  /:teamId/invitations                          -> 200 { maxPending, invitations }  (chỉ Leader)
//   POST /:teamId/invitations  { student, message? }   -> 201 { invitationId, student }
//        | 409 TEAM_INACTIVE / ALREADY_MEMBER / TEAM_FULL / ALREADY_INVITED / HAS_PENDING_APPLICATION
//              / DECLINED_RECENTLY / INVITE_LIMIT | 429
//   POST /:teamId/invitations/:invitationId/cancel     -> 200 | 403 | 404 | 409 INVITATION_NOT_PENDING
// Phía người được mời (/api/student-invitations):
//   GET  /                                             -> 200 { invitations }  (còn hiệu lực)
//   POST /:invitationId/accept                         -> 200 { invitationId, status, teamId, memberCount, ... }
//        | 404 | 409 INVITATION_NOT_PENDING / INVITATION_EXPIRED / TEAM_INACTIVE / ALREADY_MEMBER / TEAM_FULL
//   POST /:invitationId/decline  { reason? ≤ 500 }     -> 200 | 400 | 404 | 409
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  listMyInvitations,
  listTeamInvitations,
  lookupStudent,
  sendInvitation,
} from './loi-moi.service.js';

export const teamInviteRouter = Router();
export const myInvitationRouter = Router();

const MAX_INT = 2147483647; // giới hạn cột INT
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);

function parseId(value, label) {
  const id = /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0 || id > MAX_INT) throw invalid(`${label} không hợp lệ.`);
  return id;
}

// MSSV 8 chữ số hoặc email sinh viên; không nhận tìm gần đúng
function parseStudent(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (text.length > 150 || !/^(\d{8}|[^\s@]+@gm\.uit\.edu\.vn)$/.test(text)) {
    throw invalid('Nhập đúng MSSV (8 chữ số) hoặc email @gm.uit.edu.vn của sinh viên.');
  }
  return text;
}

function parseOptionalText(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid(`${label} phải là chuỗi.`);
  const text = value.trim();
  if (text.length > 500) throw invalid(`${label} tối đa 500 ký tự.`);
  return text || null;
}

const noStore = (res) => res.set('Cache-Control', 'no-store');

teamInviteRouter.get('/:teamId/invite-lookup', async (req, res) => {
  noStore(res);
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  res.json(await lookupStudent(req.user.accountId, teamId, parseStudent(req.query.student)));
});

teamInviteRouter.get('/:teamId/invitations', async (req, res) => {
  noStore(res);
  res.json(await listTeamInvitations(req.user.accountId, parseId(req.params.teamId, 'Mã nhóm')));
});

teamInviteRouter.post('/:teamId/invitations', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  const student = parseStudent(req.body?.student);
  const message = parseOptionalText(req.body?.message, 'Lời nhắn');
  res.status(201).json(await sendInvitation(req.user.accountId, teamId, student, message));
});

teamInviteRouter.post('/:teamId/invitations/:invitationId/cancel', async (req, res) => {
  const teamId = parseId(req.params.teamId, 'Mã nhóm');
  res.json(await cancelInvitation(req.user.accountId, teamId, parseId(req.params.invitationId, 'Mã lời mời')));
});

myInvitationRouter.get('/', async (req, res) => {
  noStore(res);
  res.json({ invitations: await listMyInvitations(req.user.accountId) });
});

myInvitationRouter.post('/:invitationId/accept', async (req, res) => {
  res.json(await acceptInvitation(req.user.accountId, parseId(req.params.invitationId, 'Mã lời mời')));
});

myInvitationRouter.post('/:invitationId/decline', async (req, res) => {
  const id = parseId(req.params.invitationId, 'Mã lời mời');
  res.json(await declineInvitation(req.user.accountId, id, parseOptionalText(req.body?.reason, 'Lý do')));
});
