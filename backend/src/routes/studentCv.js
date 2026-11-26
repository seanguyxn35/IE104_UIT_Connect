// API dữ liệu CV của SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET /api/student-cv -> 200 { fullName, headline, ..., skills, education, experience, projects, awards, certificates }
//                        | 404 PROFILE_NOT_FOUND
// Chỉ số SV đang ẩn (GPA, điểm rèn luyện, đề tài) không có trong phản hồi; tên của chúng nằm ở hiddenFields.
//   GET /api/student-cv/pdf -> 200 tệp application/pdf (tải về) | 404 | 429 PDF_BUSY | 503 PDF_UNAVAILABLE
//   Nội dung PDF giống bản xem trước, cùng quy tắc ẩn / riêng tư.
import { Router } from 'express';
import { config } from '../config.js';
import { getCv } from '../services/studentCvService.js';
import { cvFileName, renderCvPdf } from '../services/studentCvPdfService.js';

export const studentCvRouter = Router();

studentCvRouter.get('/', async (req, res) => {
  res.json(await getCv(config.testStudentId));
});

studentCvRouter.get('/pdf', async (req, res) => {
  const cv = await getCv(config.testStudentId);
  const pdf = await renderCvPdf(cv);
  res.attachment(cvFileName(cv)); // Content-Type: application/pdf + Content-Disposition: attachment
  res.set('Cache-Control', 'no-store');
  res.send(Buffer.from(pdf));
});
