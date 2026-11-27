// Kiểm thử API hồ sơ nhóm (/api/student-teams/:teamId/profile, SV-06 tab "Thông tin nhóm"), ảnh nhóm và đếm đơn chờ.
// Điều kiện: đã chạy migrations/010_sv_ho_so_nhom.sql, 011_sv_anh_nhom.sql, seed.sql, seed_dn.sql, seed_auth.sql; máy chủ đang chạy.
// Chạy: cd backend && npm run test:team-profile      (BASE_URL mặc định http://localhost:3000)
// Ca 401 chỉ kiểm khi máy chủ và script cùng đặt AUTH_MODE=session.
// Script tạo nhóm tạm 9480 (kèm tin tuyển 9480, đơn 9480–9481, ảnh trong kho avatars/team-9480/), lịch tiếp SV tạm 9480
// của GV 9201 và kỹ năng tạm có tiền tố [TEST-AUTO]; cuối cùng xóa hết.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const TEAMS = `${BASE}/student-teams`;
const MARK = '[TEST-AUTO]';
const MK = 'MatKhau@123';
const TEAM = 9480;
const HO_SO = `${TEAMS}/${TEAM}/profile`;
let dat = 0;
let truot = 0;
const phien = [];

function kiem(ten, dieuKien, chiTiet) {
  if (dieuKien) { dat++; console.log(`  ĐẠT   ${ten}`); }
  else { truot++; console.log(`  TRƯỢT ${ten}${chiTiet !== undefined ? ` → ${JSON.stringify(chiTiet).slice(0, 300)}` : ''}`); }
}
const la = (r, status, code) => r.status === status && (!code || r.data?.code === code);

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

async function goi(method, url, { cookie, json } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') ?? '' };
}

async function dangNhap(accountId, portal = 'uit') {
  const { email } = ok(await supabase.from('account').select('email').eq('account_id', accountId).single());
  const r = await goi('POST', `${BASE}/auth/login`, { json: { email, password: MK, portal } });
  if (r.status !== 200) throw new Error(`Không đăng nhập được tài khoản ${accountId}: ${r.status} ${r.data.code} (đã chạy seed_auth.sql?)`);
  const cookie = r.setCookie.split(';')[0];
  phien.push(cookie);
  return cookie;
}

const idTheoTen = async (bang, cot, ten) => ok(await supabase.from(bang).select(cot).eq('name', ten).single())[cot];
const docNhom = async () => ok(await supabase.from('student_team')
  .select('team_name, description, faculty_id, field_id, advisor_lecturer_id, team_code, max_members, status').eq('team_id', TEAM).single());
const docLinhVuc = async () => ok(await supabase.from('team_field').select('field_id').eq('team_id', TEAM)).map((r) => r.field_id).sort((a, b) => a - b);
const kyNangThu = async () => ok(await supabase.from('skill').select('skill_id, name').like('name', `${MARK}%`));

// Ảnh PNG 1x1 hợp lệ
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const ANH = `${TEAMS}/${TEAM}/avatar`;
const tepAnh = async () => ok(await supabase.storage.from('avatars').list(`team-${TEAM}`)).map((f) => f.name);
const docAnh = async () => ok(await supabase.from('student_team').select('avatar_url').eq('team_id', TEAM).single()).avatar_url;

async function taiAnh(cookie, body = PNG, type = 'image/png', url = ANH, method = 'PUT') {
  const res = await fetch(url, { method, headers: { 'Content-Type': type, ...(cookie ? { Cookie: cookie } : {}) }, body });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function donDuLieu() {
  const team = ok(await supabase.from('student_team').select('team_name').eq('team_id', TEAM).maybeSingle());
  if (team && !team.team_name.startsWith(MARK)) throw new Error(`Nhóm ${TEAM} không phải dữ liệu của script này, dừng lại.`);
  // Xóa nhóm kéo theo thành viên, kỹ năng và lĩnh vực của nhóm
  ok(await supabase.from('student_team').delete().eq('team_id', TEAM).like('team_name', `${MARK}%`));
  ok(await supabase.from('office_hour').delete().eq('office_hour_id', 9480).like('location', `${MARK}%`));
  ok(await supabase.from('skill').delete().like('name', `${MARK}%`));
  const conLai = await tepAnh(); // chỉ thư mục ảnh của nhóm tạm
  if (conLai.length) ok(await supabase.storage.from('avatars').remove(conLai.map((n) => `team-${TEAM}/${n}`)));
}

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);
  await donDuLieu();
  const fTgmt = await idTheoTen('field', 'field_id', 'Thị giác máy tính');
  const fNhung = await idTheoTen('field', 'field_id', 'Hệ thống nhúng & IoT');
  const fRobot = await idTheoTen('field', 'field_id', 'Robot & Xe tự hành');
  const fAttt = await idTheoTen('field', 'field_id', 'An toàn thông tin');
  const khmt = ok(await supabase.from('faculty').select('faculty_id').eq('code', 'KHMT').single()).faculty_id;
  const pytorch = ok(await supabase.from('skill').select('skill_id').eq('name', 'PyTorch').single()).skill_id;

  // Nhóm "đời cũ": chỉ có field_id, chưa có dòng team_field, chưa có cố vấn
  ok(await supabase.from('student_team').insert({ team_id: TEAM, team_name: `${MARK} Nhóm kiểm thử hồ sơ`, field_id: fTgmt }));
  ok(await supabase.from('team_member').insert([
    { team_id: TEAM, student_id: 9101, role_in_team: 'Leader' },
    { team_id: TEAM, student_id: 9102, role_in_team: 'Member' },
  ]));

  const leader = await dangNhap(9101);
  const member = await dangNhap(9102);
  const ngoai = await dangNhap(9601);
  const dn = await dangNhap(9501, 'business');

  console.log('1. Xác thực và phân quyền');
  if (config.authMode === 'session') {
    kiem('chưa đăng nhập: xem → 401', la(await goi('GET', HO_SO), 401, 'UNAUTHENTICATED'));
    kiem('chưa đăng nhập: sửa → 401', la(await goi('PATCH', HO_SO, { json: { name: 'Tên khác' } }), 401, 'UNAUTHENTICATED'));
  } else {
    console.log('  (bỏ qua ca 401: cần AUTH_MODE=session)');
  }
  kiem('tài khoản DN → 403 FORBIDDEN_ROLE', la(await goi('GET', HO_SO, { cookie: dn }), 403, 'FORBIDDEN_ROLE'));
  kiem('người ngoài nhóm: xem → 404', la(await goi('GET', HO_SO, { cookie: ngoai }), 404, 'TEAM_NOT_FOUND'));
  kiem('người ngoài nhóm: sửa → 404', la(await goi('PATCH', HO_SO, { cookie: ngoai, json: { name: 'Chiếm nhóm' } }), 404, 'TEAM_NOT_FOUND'));
  let r = await goi('GET', HO_SO, { cookie: member });
  kiem('Member xem được, canEdit = false', r.status === 200 && r.data.canEdit === false && r.data.role === 'Member', r.data);
  kiem('Member sửa → 403 NOT_TEAM_LEADER', la(await goi('PATCH', HO_SO, { cookie: member, json: { name: 'Member đổi tên' } }), 403, 'NOT_TEAM_LEADER'));
  kiem('Member không làm đổi hồ sơ', (await docNhom()).team_name === `${MARK} Nhóm kiểm thử hồ sơ`);

  console.log('2. Đọc hồ sơ');
  r = await goi('GET', HO_SO, { cookie: leader });
  kiem('Leader: canEdit = true, 2 thành viên', r.status === 200 && r.data.canEdit === true && r.data.memberCount === 2, r.data);
  kiem('nhóm cũ chỉ có field_id → vẫn hiện đúng 1 lĩnh vực', r.data.fields?.length === 1 && r.data.fields[0].fieldId === fTgmt, r.data.fields);
  kiem('chưa có cố vấn → advisor null', r.data.advisor === null && r.data.code === null);
  kiem('ngành lấy từ hồ sơ thành viên', Array.isArray(r.data.memberMajors) && r.data.memberMajors.length >= 1, r.data.memberMajors);

  ok(await supabase.from('student_team').update({ advisor_lecturer_id: 9201 }).eq('team_id', TEAM));
  ok(await supabase.from('office_hour').insert({ office_hour_id: 9480, lecturer_id: 9201, day_of_week: 5, start_time: '14:00', end_time: '16:30', location: `${MARK} P. E4.12` }));
  r = await goi('GET', HO_SO, { cookie: member });
  const cv = r.data.advisor;
  kiem('cố vấn: tên, học vị, email, phòng Lab', cv?.lecturerId === 9201 && !!cv.fullName && cv.academicTitle === 'TS' && cv.email?.endsWith('@uit.edu.vn') && cv.lab?.room === 'E4.12', cv);
  kiem('cố vấn: lịch tiếp sinh viên', cv?.officeHours.some((h) => h.dayOfWeek === 5 && h.start === '14:00' && h.end === '16:30'), cv?.officeHours);
  r = await goi('GET', `${TEAMS}/profile-options`, { cookie: leader });
  kiem('lựa chọn cho biểu mẫu: khoa, lĩnh vực, kỹ năng', r.status === 200 && r.data.faculties.length > 0 && r.data.fields.length > 0 && r.data.skills.includes('PyTorch'), r.data);

  console.log('3. Đầu vào sai');
  const sai = [
    ['body rỗng', {}], ['chỉ có trường lạ', { status: 'Disbanded', maxMembers: 50 }],
    ['tên quá ngắn', { name: '  a  ' }], ['tên 151 ký tự', { name: 'a'.repeat(151) }], ['tên không phải chuỗi', { name: 12345 }],
    ['mô tả 2001 ký tự', { description: 'a'.repeat(2001) }], ['khoa dạng chuỗi', { facultyId: '1' }],
    ['4 lĩnh vực', { fieldIds: [fTgmt, fNhung, fRobot, fAttt] }], ['lĩnh vực trùng', { fieldIds: [fTgmt, fTgmt] }], ['lĩnh vực không phải mảng', { fieldIds: fTgmt }],
    ['16 kỹ năng', { skills: Array.from({ length: 16 }, (_, i) => `k${i}`) }], ['kỹ năng rỗng', { skills: ['   '] }],
    ['kỹ năng 101 ký tự', { skills: ['a'.repeat(101)] }], ['kỹ năng trùng khác hoa thường', { skills: ['PyTorch', 'pytorch'] }], ['kỹ năng không phải chuỗi', { skills: [1] }],
  ];
  for (const [ten, json] of sai) kiem(`${ten} → 400`, la(await goi('PATCH', HO_SO, { cookie: leader, json }), 400, 'INVALID_INPUT'));
  kiem('mã nhóm sai → 400', la(await goi('GET', `${TEAMS}/abc/profile`, { cookie: leader }), 400, 'INVALID_INPUT'));
  kiem('khoa không tồn tại → 400', la(await goi('PATCH', HO_SO, { cookie: leader, json: { facultyId: 99999 } }), 400, 'FACULTY_NOT_FOUND'));
  const truoc = await docNhom();
  r = await goi('PATCH', HO_SO, { cookie: leader, json: { name: `${MARK} Tên không được lưu`, skills: [`${MARK} kỹ năng không được tạo`], fieldIds: [fNhung, 99999] } });
  kiem('lĩnh vực không tồn tại → 400', la(r, 400, 'FIELD_NOT_FOUND'), r.data);
  kiem('lỗi thì không lưu dở phần nào', (await docNhom()).team_name === truoc.team_name && (await kyNangThu()).length === 0 && (await docLinhVuc()).length === 0);

  console.log('4. Cập nhật');
  const moi = `${MARK} kỹ năng mới`;
  r = await goi('PATCH', HO_SO, { cookie: leader, json: {
    name: `  ${MARK}   Nhóm đã đổi tên `, description: '  Tôn chỉ mới của nhóm.  ', facultyId: khmt,
    fieldIds: [fRobot, fTgmt, fNhung], skills: ['pytorch', moi],
    status: 'Disbanded', maxMembers: 50, advisorLecturerId: null, code: 'GIA-MAO',
  } });
  let nhom = await docNhom();
  kiem('cập nhật → 200, trả hồ sơ mới', r.status === 200 && r.data.name === `${MARK} Nhóm đã đổi tên` && r.data.description === 'Tôn chỉ mới của nhóm.' && r.data.faculty?.facultyId === khmt, r.data);
  kiem('lĩnh vực chọn đầu tiên là lĩnh vực chính, đứng đầu danh sách', nhom.field_id === fRobot && r.data.fields?.[0].fieldId === fRobot && r.data.fields.length === 3, r.data.fields);
  kiem('đủ 3 dòng team_field', (await docLinhVuc()).join() === [fTgmt, fNhung, fRobot].sort((a, b) => a - b).join());
  kiem('kỹ năng có sẵn dùng lại (khác hoa thường), kỹ năng mới được thêm', r.data.skills?.some((s) => s.skillId === pytorch && s.name === 'PyTorch') && r.data.skills.some((s) => s.name === moi) && r.data.skills.length === 2, r.data.skills);
  kiem('trường không được phép bị bỏ qua', nhom.status === 'Active' && nhom.max_members === 6 && nhom.advisor_lecturer_id === 9201 && nhom.team_code === null);
  r = await goi('GET', `${TEAMS}/${TEAM}`, { cookie: member });
  kiem('API tổng quan cũ vẫn chạy và thấy lĩnh vực chính', r.status === 200 && r.data.field === 'Robot & Xe tự hành', r.data);

  r = await goi('PATCH', HO_SO, { cookie: leader, json: { description: '   ' } });
  nhom = await docNhom();
  kiem('sửa một phần: mô tả rỗng → null, phần khác giữ nguyên', r.status === 200 && nhom.description === null && nhom.faculty_id === khmt && r.data.fields.length === 3 && r.data.skills.length === 2, r.data);
  r = await goi('PATCH', HO_SO, { cookie: leader, json: { facultyId: null, fieldIds: [], skills: [] } });
  nhom = await docNhom();
  kiem('xóa khoa, lĩnh vực, kỹ năng', r.status === 200 && nhom.faculty_id === null && nhom.field_id === null && r.data.fields.length === 0 && r.data.skills.length === 0, r.data);

  console.log('5. Ảnh nhóm');
  if (config.authMode === 'session') kiem('chưa đăng nhập: tải ảnh → 401', la(await taiAnh(null), 401, 'UNAUTHENTICATED'));
  kiem('tài khoản DN: tải ảnh → 403', la(await taiAnh(dn), 403, 'FORBIDDEN_ROLE'));
  kiem('người ngoài nhóm: tải ảnh → 404', la(await taiAnh(ngoai), 404, 'TEAM_NOT_FOUND'));
  kiem('Member: tải ảnh → 403 NOT_TEAM_LEADER', la(await taiAnh(member), 403, 'NOT_TEAM_LEADER'));
  kiem('Member: xóa ảnh → 403', la(await goi('DELETE', ANH, { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  kiem('GIF → 415', la(await taiAnh(leader, Buffer.from('GIF89a'), 'image/gif'), 415, 'UNSUPPORTED_TYPE'));
  kiem('tệp chữ khai là PNG → 415 (kiểm tra nội dung)', la(await taiAnh(leader, Buffer.from('<svg onload=alert(1)></svg>')), 415, 'UNSUPPORTED_TYPE'));
  kiem('PNG khai là JPEG → 415', la(await taiAnh(leader, PNG, 'image/jpeg'), 415, 'UNSUPPORTED_TYPE'));
  const lon = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
  kiem('ảnh trên 2 MB → 413', la(await taiAnh(leader, lon), 413, 'FILE_TOO_LARGE'));
  kiem('các ca lỗi không lưu gì', (await docAnh()) === null && (await tepAnh()).length === 0);

  r = await taiAnh(leader);
  const url1 = r.data.avatarUrl;
  kiem('Leader tải ảnh → 200, đường dẫn trong thư mục của nhóm', r.status === 200 && url1?.includes(`/avatars/team-${TEAM}/`) && url1.endsWith('.png') && (await docAnh()) === url1, r.data);
  const tai = await fetch(url1);
  kiem('đường dẫn công khai trả đúng nội dung ảnh', tai.ok && Buffer.from(await tai.arrayBuffer()).equals(PNG), tai.status);
  kiem('hồ sơ có avatarUrl, Member cũng thấy', (await goi('GET', HO_SO, { cookie: member })).data.avatarUrl === url1);
  r = await taiAnh(leader);
  kiem('đổi ảnh → đường dẫn mới, ảnh cũ bị xóa khỏi kho', r.status === 200 && r.data.avatarUrl !== url1 && (await tepAnh()).length === 1, await tepAnh());
  r = await goi('DELETE', ANH, { cookie: leader });
  kiem('xóa ảnh → 204, kho trống', r.status === 204 && (await docAnh()) === null && (await tepAnh()).length === 0);
  kiem('xóa khi không có ảnh → vẫn 204', (await goi('DELETE', ANH, { cookie: leader })).status === 204);
  // Phần kiểm tra ảnh được tách dùng chung với ảnh đại diện SV: ca lỗi bị chặn trước khi ghi
  const anhSv = `${BASE}/student-avatar`;
  kiem('ảnh đại diện SV vẫn chặn nội dung giả → 415', la(await taiAnh(leader, Buffer.from('khong phai anh'), 'image/png', anhSv, 'POST'), 415, 'UNSUPPORTED_TYPE'));
  kiem('ảnh đại diện SV vẫn chặn ảnh quá lớn → 413', la(await taiAnh(leader, lon, 'image/png', anhSv, 'POST'), 413, 'FILE_TOO_LARGE'));

  console.log('6. Đếm đơn chờ cho menu trái');
  const dem = async (cookie) => (await goi('GET', `${TEAMS}/pending-count`, { cookie }));
  const gocLeader = (await dem(leader)).data.pending;
  const gocMember = (await dem(member)).data.pending;
  if (config.authMode === 'session') kiem('chưa đăng nhập → 401', la(await dem(null), 401, 'UNAUTHENTICATED'));
  kiem('tài khoản DN → 403', la(await dem(dn), 403, 'FORBIDDEN_ROLE'));
  kiem('trả số nguyên', Number.isInteger(gocLeader) && Number.isInteger(gocMember), { gocLeader, gocMember });
  ok(await supabase.from('team_recruitment').insert({ recruit_id: 9480, team_id: TEAM, title: `${MARK} Tin`, slots: 5 }));
  ok(await supabase.from('recruitment_application').insert([
    { apply_id: 9480, recruit_id: 9480, student_id: 9601 },
    { apply_id: 9481, recruit_id: 9480, student_id: 9602 },
  ]));
  kiem('Leader thấy tăng 2', (await dem(leader)).data.pending === gocLeader + 2);
  kiem('Member của nhóm không được đếm', (await dem(member)).data.pending === gocMember);
  ok(await supabase.from('recruitment_application').update({ status: 'Withdrawn' }).eq('apply_id', 9481));
  kiem('đơn đã rút không đếm', (await dem(leader)).data.pending === gocLeader + 1);

  console.log('7. Đồng thời và nhóm ngừng hoạt động');
  const hai = await Promise.all([[fTgmt, fNhung], [fRobot, fAttt]].map((fieldIds) => goi('PATCH', HO_SO, { cookie: leader, json: { fieldIds } })));
  const cuoi = (await docLinhVuc()).join();
  kiem('hai lần lưu cùng lúc: không trộn lĩnh vực của nhau', hai.every((x) => x.status === 200) && [[fTgmt, fNhung], [fRobot, fAttt]].some((s) => s.sort((a, b) => a - b).join() === cuoi), { cuoi, hai: hai.map((x) => x.data) });
  ok(await supabase.from('student_team').update({ status: 'Inactive' }).eq('team_id', TEAM));
  r = await goi('GET', HO_SO, { cookie: leader });
  kiem('nhóm ngừng hoạt động: vẫn xem được, canEdit = false', r.status === 200 && r.data.canEdit === false, r.data);
  kiem('nhóm ngừng hoạt động: sửa → 409 TEAM_INACTIVE', la(await goi('PATCH', HO_SO, { cookie: leader, json: { name: `${MARK} đổi` } }), 409, 'TEAM_INACTIVE'));
  kiem('nhóm ngừng hoạt động: đổi ảnh → 409', la(await taiAnh(leader), 409, 'TEAM_INACTIVE') && (await tepAnh()).length === 0);
}

async function donCuoi() {
  for (const cookie of phien) await goi('POST', `${BASE}/auth/logout`, { cookie }).catch(() => {});
  await donDuLieu();
}

try {
  await chay();
} catch (err) {
  truot++;
  console.error('Lỗi khi chạy:', err.message ?? err);
} finally {
  await donCuoi();
  console.log(`\n${dat} đạt, ${truot} trượt. Đã dọn dữ liệu thử.`);
  process.exitCode = truot ? 1 : 0;
}
