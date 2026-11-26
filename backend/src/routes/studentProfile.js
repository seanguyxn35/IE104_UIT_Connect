// API thông tin hồ sơ SV (danh tính lấy ở máy chủ, không lấy từ client):
//   GET /api/student-profile/links                           -> 200 { githubUrl, linkedinUrl }  (null = chưa có)
//   PUT /api/student-profile/links { githubUrl?, linkedinUrl? } -> 200 { githubUrl, linkedinUrl } | 400 INVALID_INPUT
//   Gửi liên kết nào thì đổi liên kết đó; null hoặc chuỗi rỗng = xóa.
import { Router } from 'express';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { LINK_FIELDS, getLinks, updateLinks } from '../services/studentProfileService.js';

export const studentProfileRouter = Router();

const MAX_URL_LENGTH = 255; // độ dài cột github_url / linkedin_url

const LINK_RULES = {
  githubUrl: { name: 'GitHub', host: /^(www\.)?github\.com$/, example: 'https://github.com/ten-cua-ban' },
  linkedinUrl: { name: 'LinkedIn', host: /^((www|[a-z]{2})\.)?linkedin\.com$/, example: 'https://linkedin.com/in/ten-cua-ban' },
};

// Chuẩn hóa và kiểm tra một liên kết. Chỉ nhận https đúng tên miền, để không lưu được liên kết kiểu javascript:
function parseLink(field, value) {
  if (value === null) return null;
  const rule = LINK_RULES[field];
  const invalid = () => new AppError(400, 'INVALID_INPUT', `Liên kết ${rule.name} không hợp lệ (ví dụ: ${rule.example}).`);
  if (typeof value !== 'string') throw invalid();

  const text = value.trim();
  if (text === '') return null;
  // Người dùng thường dán "github.com/..." không kèm giao thức
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw invalid();
  }
  if (
    url.protocol !== 'https:' ||
    url.username || url.password || url.port ||
    !rule.host.test(url.hostname) ||
    url.pathname === '/'
  ) {
    throw invalid();
  }
  if (url.href.length > MAX_URL_LENGTH) {
    throw new AppError(400, 'INVALID_INPUT', `Liên kết ${rule.name} tối đa ${MAX_URL_LENGTH} ký tự.`);
  }
  return url.href;
}

studentProfileRouter.get('/links', async (req, res) => {
  res.json(await getLinks(config.testStudentId));
});

studentProfileRouter.put('/links', async (req, res) => {
  const fields = LINK_FIELDS.filter((f) => req.body?.[f] !== undefined);
  if (fields.length === 0) {
    throw new AppError(400, 'INVALID_INPUT', `Cần gửi ít nhất một trong: ${LINK_FIELDS.join(', ')}.`);
  }
  const changes = Object.fromEntries(fields.map((f) => [f, parseLink(f, req.body[f])]));
  res.json(await updateLinks(config.testStudentId, changes));
});
