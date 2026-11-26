// API dữ liệu CV của SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET /api/student-cv -> 200 { fullName, headline, ..., skills, education, experience, projects, awards, certificates }
//                        | 404 PROFILE_NOT_FOUND
// Chỉ số SV đang ẩn (GPA, điểm rèn luyện, đề tài) không có trong phản hồi; tên của chúng nằm ở hiddenFields.
import { Router } from 'express';
import { config } from '../config.js';
import { getCv } from '../services/studentCvService.js';

export const studentCvRouter = Router();

studentCvRouter.get('/', async (req, res) => {
  res.json(await getCv(config.testStudentId));
});
