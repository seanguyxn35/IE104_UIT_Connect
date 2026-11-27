// Kiểm tra dữ liệu đầu vào dùng chung cho các route. Sai thì ném AppError 400 INVALID_INPUT.
import { AppError } from './errors.js';

export function soNguyenDuong(giaTri, ten) {
  const n = Number(giaTri);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'INVALID_INPUT', `${ten} không hợp lệ.`);
  return n;
}

// Chuỗi không bắt buộc: thiếu thì trả '', có thì cắt khoảng trắng và giới hạn độ dài
export function chuoiTuyChon(giaTri, ten, toiDa) {
  if (giaTri === undefined || giaTri === null || giaTri === '') return '';
  if (typeof giaTri !== 'string') throw new AppError(400, 'INVALID_INPUT', `${ten} phải là chuỗi.`);
  const s = giaTri.trim();
  if (s.length > toiDa) throw new AppError(400, 'INVALID_INPUT', `${ten} tối đa ${toiDa} ký tự.`);
  return s;
}

// Lịch hẹn { date: 'YYYY-MM-DD', time: 'HH:MM', mode, agenda? } theo giờ Việt Nam, phải ở tương lai
export function docLichHen(body) {
  const { date, time } = body ?? {};
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError(400, 'INVALID_INPUT', 'Ngày hẹn phải có dạng YYYY-MM-DD.');
  }
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new AppError(400, 'INVALID_INPUT', 'Giờ hẹn phải có dạng HH:MM.');
  }
  // Ngày phải tồn tại thật (chặn 30/02...): dựng lại từ năm-tháng-ngày rồi so sánh
  const [nam, thang, ngay] = date.split('-').map(Number);
  const kiemTra = new Date(Date.UTC(nam, thang - 1, ngay));
  if (kiemTra.getUTCFullYear() !== nam || kiemTra.getUTCMonth() !== thang - 1 || kiemTra.getUTCDate() !== ngay) {
    throw new AppError(400, 'INVALID_INPUT', 'Ngày hẹn không tồn tại.');
  }
  const startAt = new Date(`${date}T${time}:00+07:00`);
  if (startAt <= new Date()) throw new AppError(400, 'INVALID_INPUT', 'Thời điểm hẹn đã qua.');
  const mode = chuoiTuyChon(body.mode, 'Hình thức', 100);
  if (!mode) throw new AppError(400, 'INVALID_INPUT', 'Chọn hình thức trao đổi.');
  const agenda = chuoiTuyChon(body.agenda, 'Nội dung trao đổi', 255);
  return { startAt: startAt.toISOString(), mode, agenda };
}
