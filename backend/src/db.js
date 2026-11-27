// Kết nối Supabase (PostgreSQL) bằng secret key.
// Secret key bỏ qua RLS nên CHỈ dùng ở máy chủ, không bao giờ đưa vào frontend.
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Mỗi lần gọi Supabase chờ tối đa 10 giây; quá hạn thì báo lỗi (trả 500) thay vì treo yêu cầu mãi.
const DB_TIMEOUT_MS = 10_000;
// Riêng việc đẩy tệp lên kho lưu trữ (PDF tới 10 MB) cần lâu hơn khi mạng chậm (đo thực tế có mạng ~7 giây/MB).
const UPLOAD_TIMEOUT_MS = 180_000;

function isUpload(url, method) {
  const target = String(url);
  return (method === 'POST' || method === 'PUT')
    && target.includes('/storage/v1/object/') && !target.includes('/storage/v1/object/sign/');
}

function fetchWithTimeout(url, options = {}) {
  const timeout = AbortSignal.timeout(isUpload(url, options.method) ? UPLOAD_TIMEOUT_MS : DB_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  return fetch(url, { ...options, signal });
}

export const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout },
});
