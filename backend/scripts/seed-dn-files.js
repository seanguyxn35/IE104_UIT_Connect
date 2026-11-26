// Tải tệp PDF minh họa cho các tệp đính kèm dữ liệu thử lên bucket riêng tư "rd-files":
//   rd_attachment 9961–9999 (seed_dn.sql: proposal + phòng đàm phán), 9931–9950 (seed_sv_rd.sql: tệp đề bài).
// Chạy SAU database/seed_dn.sql (và seed_sv_rd.sql nếu có):   cd backend && npm run seed:dn-files
// Chạy lại nhiều lần vẫn được (ghi đè tệp cũ). Chỉ đụng tới tệp của dữ liệu thử.
import { supabase } from '../src/db.js';

const BUCKET = 'rd-files';
const MAX_BYTES = 25 * 1024 * 1024; // đính kèm bài toán / proposal tối đa 25 MB

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
  if (error && !/already exists/i.test(error.message)) throw error;
}

// PDF 1 trang, font Helvetica chuẩn: chỉ chữ ASCII nên bỏ dấu tiếng Việt
function boDau(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7E]/g, '?');
}
function taoPdf(cacDong) {
  const noiDung = 'BT /F1 12 Tf 56 780 Td 18 TL ' +
    cacDong.map((d, i) => `${i ? 'T* ' : ''}(${boDau(d).replace(/[\\()]/g, '\\$&')}) Tj`).join(' ') + ' ET';
  const obj = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${noiDung.length} >>\nstream\n${noiDung}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const viTri = [];
  obj.forEach((o, i) => { viTri.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` +
    viTri.map((v) => `${String(v).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

await ensureBucket();
const { data: tep, error } = await supabase
  .from('rd_attachment')
  .select('attachment_id, owner_type, owner_id, file_name, storage_path, doc_type')
  .gte('attachment_id', 9931)
  .lte('attachment_id', 9999)
  .order('attachment_id');
if (error) throw error;
if (!tep.length) {
  console.error('Không có tệp dữ liệu thử nào. Hãy chạy database/seed_dn.sql trước.');
  process.exit(1);
}

let ok = 0;
for (const t of tep) {
  const pdf = taoPdf([
    'UIT Connect - Tai lieu minh hoa (du lieu thu)', '',
    `Ten tep: ${t.file_name}`,
    `Loai: ${t.doc_type ?? ''}`,
    `Thuoc: ${t.owner_type} #${t.owner_id}`, '',
    'Day la tep PDF tao tu dong cho du lieu thu, khong phai tai lieu that.',
  ]);
  const { error: upError } = await supabase.storage
    .from(BUCKET)
    .upload(t.storage_path, pdf, { contentType: 'application/pdf', upsert: true });
  if (upError) console.error(`  Lỗi ${t.storage_path}: ${upError.message}`);
  else ok++;
}
console.log(`Đã tải ${ok}/${tep.length} tệp minh họa lên bucket "${BUCKET}".`);
