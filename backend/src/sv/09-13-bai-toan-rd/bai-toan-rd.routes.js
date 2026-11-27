// API "Bài toán DN & R&D" phía Sinh viên (SV-09, SV-13). Danh tính SV lấy từ phiên đăng nhập ở máy chủ (authMiddleware), không nhận từ client.
//   GET    /api/student-rd-problems                         -> 200 { problems, saved }
//   POST   /api/student-rd-problems/proposal-files          (thân = tệp PDF ≤ 10 MB, header X-File-Name)
//                                                           -> 201 { uploadId, fileName, sizeBytes } | 400 | 413 FILE_TOO_LARGE | 415 UNSUPPORTED_TYPE
//   GET    /api/student-rd-problems/:code                   -> 200 chi tiết | 400 | 404 PROBLEM_NOT_FOUND
//   PUT    /api/student-rd-problems/:code/saved             -> 200 { saved: true } | 404
//   DELETE /api/student-rd-problems/:code/saved             -> 204 | 404
//   POST   /api/student-rd-problems/:code/proposals         { partnerType, teamId?, lecturerId?, title, content, trlLabel,
//                                                             durationWeeks?, coverLetter?, ndaAccepted, confirmed, uploadId }
//          -> 201 | 400 INVALID_INPUT / NDA_REQUIRED / UPLOAD_NOT_FOUND / LECTURER_NOT_FOUND | 403 NOT_TEAM_LEADER
//             | 404 PROBLEM_NOT_FOUND / TEAM_NOT_FOUND | 409 PROBLEM_CLOSED / PARTNER_TYPE_NOT_ACCEPTED / TEAM_SIZE_MISMATCH / ALREADY_APPLIED
//   POST   /api/student-rd-problems/:code/proposals/:id/withdraw  -> 200 | 404 REQUEST_NOT_FOUND | 409 INVALID_STATE
//   GET    /api/student-rd-problems/:code/attachments/:attachmentId[?download=1]                 -> 200 { url, fileName, expiresIn }
//   GET    /api/student-rd-problems/:code/proposals/:id/attachments/:attachmentId[?download=1]  -> 200 { url, fileName, expiresIn }
import express, { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { soNguyenDuong, chuoiTuyChon } from '../../shared/validation.js';
import {
  listProblems, getProblem, saveProblem, unsaveProblem, uploadProposalFile, submitProposal, withdrawProposal,
  getProblemAttachmentUrl, getProposalAttachmentUrl, MAX_PROPOSAL_FILE_BYTES, PARTNER_TYPES, TRL_LABELS,
} from './bai-toan-rd.service.js';

export const studentRdProblemsRouter = Router();

function maBaiToan(giaTri) {
  if (typeof giaTri !== 'string' || !/^[A-Za-z0-9-]{3,30}$/.test(giaTri)) {
    throw new AppError(400, 'INVALID_INPUT', 'Mã bài toán không hợp lệ.');
  }
  return giaTri.toUpperCase();
}

function chuoiBatBuoc(giaTri, ten, toiThieu, toiDa) {
  const s = chuoiTuyChon(giaTri, ten, toiDa);
  if (s.length < toiThieu) throw new AppError(400, 'INVALID_INPUT', `${ten} cần từ ${toiThieu} đến ${toiDa} ký tự.`);
  return s;
}

// Đọc và kiểm tra thân yêu cầu nộp proposal (chỉ kiểu và độ dài; nghiệp vụ kiểm tra ở service)
function docProposal(body) {
  const b = body ?? {};
  if (!PARTNER_TYPES.includes(b.partnerType)) {
    throw new AppError(400, 'INVALID_INPUT', 'Hình thức ứng tuyển phải là Student, Team hoặc Lab.');
  }
  const input = { partnerType: b.partnerType };
  if (b.partnerType !== 'Student') input.teamId = soNguyenDuong(b.teamId, 'Nhóm ứng tuyển');
  if (b.partnerType === 'Lab') input.lecturerId = soNguyenDuong(b.lecturerId, 'Giảng viên hướng dẫn');
  input.title = chuoiBatBuoc(b.title, 'Tiêu đề proposal', 10, 150);
  input.content = chuoiBatBuoc(b.content, 'Tóm tắt giải pháp', 50, 2000);
  if (!TRL_LABELS.includes(b.trlLabel)) throw new AppError(400, 'INVALID_INPUT', 'Mức sẵn sàng công nghệ (TRL) không hợp lệ.');
  input.trlLabel = b.trlLabel;
  if (b.durationWeeks !== undefined && b.durationWeeks !== null && b.durationWeeks !== '') {
    const n = Number(b.durationWeeks);
    if (!Number.isInteger(n) || n < 1 || n > 104) throw new AppError(400, 'INVALID_INPUT', 'Thời gian thực hiện phải là số tuần nguyên từ 1 đến 104.');
    input.durationWeeks = n;
  }
  input.coverLetter = chuoiTuyChon(b.coverLetter, 'Thư giới thiệu', 1000);
  if (b.ndaAccepted !== undefined && typeof b.ndaAccepted !== 'boolean') {
    throw new AppError(400, 'INVALID_INPUT', 'ndaAccepted phải là true hoặc false.');
  }
  input.ndaAccepted = b.ndaAccepted === true;
  if (b.confirmed !== true) throw new AppError(400, 'INVALID_INPUT', 'Cần xác nhận thông tin proposal là trung thực.');
  if (typeof b.uploadId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(b.uploadId)) {
    throw new AppError(400, 'INVALID_INPUT', 'Thiếu tệp proposal (uploadId).');
  }
  input.uploadId = b.uploadId;
  return input;
}

studentRdProblemsRouter.get('/', async (req, res) => {
  res.json(await listProblems(req.user.accountId));
});

studentRdProblemsRouter.post(
  '/proposal-files',
  express.raw({ type: () => true, limit: MAX_PROPOSAL_FILE_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      throw new AppError(400, 'INVALID_INPUT', 'Thiếu nội dung tệp PDF.');
    }
    let ten = req.get('x-file-name') || 'proposal.pdf';
    try { ten = decodeURIComponent(ten); } catch { /* giữ nguyên */ }
    res.status(201).json(await uploadProposalFile(req.user.accountId, req.body, ten));
  },
);

studentRdProblemsRouter.get('/:code', async (req, res) => {
  res.json(await getProblem(req.user.accountId, maBaiToan(req.params.code)));
});

studentRdProblemsRouter.put('/:code/saved', async (req, res) => {
  res.json(await saveProblem(req.user.accountId, maBaiToan(req.params.code)));
});

studentRdProblemsRouter.delete('/:code/saved', async (req, res) => {
  await unsaveProblem(req.user.accountId, maBaiToan(req.params.code));
  res.status(204).end();
});

studentRdProblemsRouter.post('/:code/proposals', async (req, res) => {
  const code = maBaiToan(req.params.code);
  const input = docProposal(req.body);
  res.status(201).json(await submitProposal(req.user.accountId, code, input));
});

studentRdProblemsRouter.post('/:code/proposals/:id/withdraw', async (req, res) => {
  const code = maBaiToan(req.params.code);
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  res.json(await withdrawProposal(req.user.accountId, code, id));
});

studentRdProblemsRouter.get('/:code/attachments/:attachmentId', async (req, res) => {
  const code = maBaiToan(req.params.code);
  const attachmentId = soNguyenDuong(req.params.attachmentId, 'Mã tệp');
  res.json(await getProblemAttachmentUrl(code, attachmentId, req.query.download === '1'));
});

studentRdProblemsRouter.get('/:code/proposals/:id/attachments/:attachmentId', async (req, res) => {
  const code = maBaiToan(req.params.code);
  const id = soNguyenDuong(req.params.id, 'Mã proposal');
  const attachmentId = soNguyenDuong(req.params.attachmentId, 'Mã tệp');
  res.json(await getProposalAttachmentUrl(req.user.accountId, code, id, attachmentId, req.query.download === '1'));
});

// Tệp quá lớn: báo đúng giới hạn của proposal (bộ xử lý chung trong server.js dành cho ảnh đại diện)
studentRdProblemsRouter.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return next(new AppError(413, 'FILE_TOO_LARGE', 'Tệp proposal tối đa 10 MB.'));
  }
  next(err);
});
