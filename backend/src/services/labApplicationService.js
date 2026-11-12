// Nghiệp vụ "SV ứng tuyển đề tài Lab" – thực thi R1, R2, R3 (thuc-hanh/DESIGN.md, mục 3).
// Thứ tự: đọc đề tài -> kiểm tra trùng (R2) -> kiểm tra hết chỗ (R3) -> mới ghi (R1).
// Câu INSERT ở bước 8 là lệnh ghi DUY NHẤT; hai nhánh từ chối đều dừng trước nó.
import { supabase } from '../db.js';
import { AppError } from '../errors.js';

// Mã lỗi PostgreSQL khi vi phạm ràng buộc UNIQUE
const PG_UNIQUE_VIOLATION = '23505';

export async function applyToTopic(studentId, topicId) {
  // Bước 5: đề tài phải tồn tại; lấy số chỗ (slots)
  const { data: topic, error: topicError } = await supabase
    .from('lab_topic')
    .select('topic_id, slots')
    .eq('topic_id', topicId)
    .maybeSingle();
  if (topicError) throw topicError;
  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Không tìm thấy đề tài.');
  }

  // Bước 6 – R2: SV đã có đơn cho đề tài này (bất kể trạng thái) -> từ chối, KHÔNG ghi
  const { count: existingCount, error: duplicateError } = await supabase
    .from('lab_application')
    .select('application_id', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('student_id', studentId);
  if (duplicateError) throw duplicateError;
  if (existingCount > 0) {
    throw new AppError(409, 'ALREADY_APPLIED', 'Bạn đã ứng tuyển đề tài này trước đó.');
  }

  // Bước 7 – R3: số đơn Accepted đã bằng/vượt số chỗ -> từ chối, KHÔNG ghi
  const { count: acceptedCount, error: capacityError } = await supabase
    .from('lab_application')
    .select('application_id', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('status', 'Accepted');
  if (capacityError) throw capacityError;
  if (acceptedCount >= topic.slots) {
    throw new AppError(409, 'TOPIC_FULL', 'Đề tài đã đủ người.');
  }

  // Bước 8 – R1: qua cả hai kiểm tra mới tạo đúng một đơn 'Pending'
  const { data: application, error: insertError } = await supabase
    .from('lab_application')
    .insert({ topic_id: topicId, student_id: studentId, status: 'Pending' })
    .select('application_id, topic_id, student_id, status, applied_at')
    .single();
  if (insertError) {
    // Lớp bảo vệ thứ hai cho R2: hai yêu cầu trùng đến cùng lúc và cùng qua bước 6,
    // ràng buộc uq_lab_application (topic_id, student_id) của CSDL chặn yêu cầu đến sau.
    if (insertError.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'ALREADY_APPLIED', 'Bạn đã ứng tuyển đề tài này trước đó.');
    }
    throw insertError;
  }

  return {
    applicationId: application.application_id,
    topicId: application.topic_id,
    studentId: application.student_id,
    status: application.status,
    appliedAt: application.applied_at,
  };
}
