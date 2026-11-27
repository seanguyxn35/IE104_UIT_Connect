// Kiểm thử API đơn xin gia nhập nhóm (/api/student-teams, SV-06).
// Điều kiện: đã chạy migrations/009_sv_don_gia_nhap_nhom.sql, seed.sql, seed_dn.sql, seed_auth.sql; máy chủ đang chạy.
// Chạy: cd backend && npm run test:team-join      (BASE_URL mặc định http://localhost:3000)
// Ca 401 chỉ kiểm khi máy chủ và script cùng đặt AUTH_MODE=session.
// Script tự tạo dữ liệu riêng (nhóm 9490, tin 9491–9495, đơn 9490–9501, tài nguyên 9490, thành tích 9490–9491),
// sửa tạm hồ sơ SV 9601, và xóa / khôi phục tất cả ở cuối, kể cả khi có ca lỗi.
import { supabase } from '../src/db.js';
import { config } from '../src/config.js';

const BASE = (process.env.BASE_URL || `http://localhost:${config.port}`) + '/api';
const TEAMS = `${BASE}/student-teams`;
const MARK = '[TEST-AUTO]';
const MK = 'MatKhau@123';
const TEAM = 9490;
const APPLICANTS = [9102, 9601, 9602, 9603, 9604, 9605, 9606, 9607, 9608];
const HOUR = 60 * 60 * 1000;
const LY_DO = 'Nhóm đang cần người đã dùng C++.';
let dat = 0;
let truot = 0;
const phien = [];
let hoSoGoc = null;
let taoCaiDat = false;

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

async function donDuLieu() {
  const team = ok(await supabase.from('student_team').select('team_name').eq('team_id', TEAM).maybeSingle());
  if (team && !team.team_name.startsWith(MARK)) throw new Error(`Nhóm ${TEAM} không phải dữ liệu của script này, dừng lại.`);
  // Xóa nhóm kéo theo thành viên, tin tuyển và đơn
  ok(await supabase.from('student_team').delete().eq('team_id', TEAM).like('team_name', `${MARK}%`));
  ok(await supabase.from('notification').delete().eq('category', 'Team').in('account_id', APPLICANTS).like('content', `%${MARK}%`));
  ok(await supabase.from('cv_showcase_item').delete().eq('resource_id', 9490).eq('student_id', 9601));
  ok(await supabase.from('academic_review_log').delete().eq('log_id', 9490).eq('resource_id', 9490));
  ok(await supabase.from('academic_resource').delete().eq('resource_id', 9490).like('title', `${MARK}%`));
  ok(await supabase.from('student_achievement').delete().in('achievement_id', [9490, 9491]).like('title', `${MARK}%`));
}

async function taoDuLieu() {
  ok(await supabase.from('student_team').insert({ team_id: TEAM, team_name: `${MARK} Nhóm kiểm thử đơn gia nhập`, max_members: 10 }));
  ok(await supabase.from('team_member').insert([
    { team_id: TEAM, student_id: 9101, role_in_team: 'Leader' },
    { team_id: TEAM, student_id: 9102, role_in_team: 'Member' },
  ]));
  const homQua = new Date(Date.now() - 48 * HOUR).toISOString().slice(0, 10);
  const tin = (id, them) => ({ recruit_id: id, team_id: TEAM, title: `${MARK} Tin ${id}`, slots: 5, status: 'Open', deadline: null, ...them });
  ok(await supabase.from('team_recruitment').insert([
    tin(9491, { slots: 10 }),
    tin(9492, { slots: 1, status: 'Filled' }),
    tin(9493, { status: 'Closed' }),
    tin(9494, { deadline: homQua }),
    tin(9495, { slots: 1 }),
  ]));
  const don = (id, recruit, sv, gio, them) => ({
    apply_id: id, recruit_id: recruit, student_id: sv, message: `${MARK} thư ${id}`, status: 'Pending',
    applied_at: new Date(Date.now() - gio * HOUR).toISOString(), share_gpa: false, ...them,
  });
  ok(await supabase.from('recruitment_application').insert([
    don(9490, 9491, 9601, 4, { share_gpa: true }),
    don(9491, 9491, 9602, 60),
    don(9492, 9491, 9603, 80),
    don(9493, 9492, 9604, 10),
    don(9494, 9491, 9102, 9),
    don(9495, 9491, 9605, 8, { status: 'Withdrawn' }),
    don(9496, 9493, 9606, 7),
    don(9497, 9494, 9607, 6),
    don(9498, 9495, 9608, 5),
    don(9499, 9495, 9601, 3),
    don(9500, 9493, 9603, 2),
    don(9501, 9494, 9604, 1),
  ]));

  // Hồ sơ người nộp 9601: một kỹ năng, GitHub, công trình đã thẩm định đang ghim, 2 công bố (Công khai / Riêng tư)
  hoSoGoc = ok(await supabase.from('student_profile')
    .select('github_url, is_skills_public, is_achievements_public').eq('student_id', 9601).single());
  ok(await supabase.from('student_profile')
    .update({ github_url: 'https://github.com/test-auto', is_skills_public: true, is_achievements_public: true })
    .eq('student_id', 9601));
  ok(await supabase.from('academic_resource').insert({
    resource_id: 9490, created_by_account_id: 9601, owner_team_id: null, type: 'Project',
    title: `${MARK} Công trình đã thẩm định`, status: 'Published', lecturer_id: 9201, published_at: '2026-01-01', trl_level: 4,
  }));
  ok(await supabase.from('academic_review_log').insert({
    log_id: 9490, resource_id: 9490, lecturer_id: 9201, decision: 'Approved', comment: MARK, total_score: 95, allow_publish: true, review_date: '2026-01-01',
  }));
  ok(await supabase.from('cv_showcase_item').insert({ student_id: 9601, resource_id: 9490, is_shown_on_cv: true, display_order: 99 }));
  const congBo = (id, ten, visibility) => ({
    achievement_id: id, student_id: 9601, category: 'Publication', title: `${MARK} ${ten}`, visibility,
    verification_status: 'Self_Declared', external_url: `https://doi.org/10.1000/test-auto-${id}`,
  });
  ok(await supabase.from('student_achievement').insert([congBo(9490, 'Công bố công khai', 'Public'), congBo(9491, 'Công bố riêng tư', 'Private')]));
}

const url = (don, hanhDong) => `${TEAMS}/${TEAM}/applications/${don}/${hanhDong}`;
const soThanhVien = async () => ok(await supabase.from('team_member').select('student_id').eq('team_id', TEAM)).length;
const docDon = async (id) => ok(await supabase.from('recruitment_application')
  .select('status, response_note, responded_by_account_id, responded_at').eq('apply_id', id).single());
const thongBao = async (sv) => ok(await supabase.from('notification').select('title, content, category')
  .eq('account_id', sv).like('content', `%${MARK}%`));
const datToiDa = async (n) => ok(await supabase.from('student_team').update({ max_members: n }).eq('team_id', TEAM));

async function chay() {
  console.log(`Máy chủ: ${BASE}   AUTH_MODE (máy chạy test): ${config.authMode}\n`);
  await donDuLieu();
  await taoDuLieu();
  const leader = await dangNhap(9101);
  const member = await dangNhap(9102);
  const ngoai = await dangNhap(9601); // người nộp đơn, chưa ở trong nhóm
  const dn = await dangNhap(9501, 'business');

  console.log('1. Xác thực và phân quyền');
  if (config.authMode === 'session') {
    kiem('chưa đăng nhập: xem → 401', la(await goi('GET', TEAMS), 401, 'UNAUTHENTICATED'));
    kiem('chưa đăng nhập: chấp nhận → 401', la(await goi('POST', url(9490, 'accept')), 401, 'UNAUTHENTICATED'));
  } else {
    console.log('  (bỏ qua ca 401: cần AUTH_MODE=session)');
  }
  kiem('tài khoản DN → 403 FORBIDDEN_ROLE', la(await goi('GET', TEAMS, { cookie: dn }), 403, 'FORBIDDEN_ROLE'));
  kiem('người ngoài nhóm: xem đơn → 404', la(await goi('GET', `${TEAMS}/${TEAM}/applications`, { cookie: ngoai }), 404, 'TEAM_NOT_FOUND'));
  kiem('người ngoài nhóm: tự chấp nhận đơn của mình → 404', la(await goi('POST', url(9490, 'accept'), { cookie: ngoai }), 404, 'TEAM_NOT_FOUND'));
  kiem('Member bấm Chấp nhận → 403 NOT_TEAM_LEADER', la(await goi('POST', url(9490, 'accept'), { cookie: member }), 403, 'NOT_TEAM_LEADER'));
  kiem('Member bấm Từ chối → 403 NOT_TEAM_LEADER', la(await goi('POST', url(9490, 'reject'), { cookie: member, json: { reason: LY_DO } }), 403, 'NOT_TEAM_LEADER'));
  kiem('Member không làm đổi đơn', (await docDon(9490)).status === 'Pending' && (await soThanhVien()) === 2);

  console.log('2. Đọc nhóm và đơn');
  let r = await goi('GET', TEAMS, { cookie: leader });
  const nhom = r.data.teams?.find((t) => t.teamId === TEAM);
  kiem('danh sách nhóm: vai trò, số thành viên, số đơn chờ', nhom?.role === 'Leader' && nhom.memberCount === 2 && nhom.pendingCount === 11, nhom);
  r = await goi('GET', `${TEAMS}/${TEAM}`, { cookie: leader });
  kiem('tổng quan: đơn chờ, đơn mới 24 giờ', r.status === 200 && r.data.applications?.pending === 11 && r.data.applications.newLast24h === 9, r.data);
  kiem('tổng quan: trạng thái tin (2 mở, 1 đủ, 1 đóng, 1 hết hạn)', r.data.recruitments?.open === 2 && r.data.recruitments.filled === 1 && r.data.recruitments.closed === 1 && r.data.recruitments.expired === 1, r.data.recruitments);

  r = await goi('GET', `${TEAMS}/${TEAM}/applications`, { cookie: leader });
  const theo = (id) => r.data.applications?.find((a) => a.applyId === id);
  kiem('mặc định trả đơn Pending, không có đơn đã rút', r.status === 200 && r.data.applications.length === 11 && !theo(9495), r.data);
  kiem('số trên tab khớp danh sách', r.data.counts?.Pending === 11 && r.data.counts.Accepted === 0 && r.data.counts.Rejected === 0, r.data.counts);
  kiem('xếp đơn gần hết hạn trước', r.data.applications?.[0]?.applyId === 9492, r.data.applications?.[0]);
  kiem('mức gấp tính từ lúc nộp: 4h thường, 60h gấp, 80h quá hạn', theo(9490)?.response.level === 'normal' && theo(9491)?.response.level === 'urgent' && theo(9492)?.response.level === 'overdue');
  kiem('đồng ý chia sẻ → có GPA', theo(9490)?.gpaShared === true && Number(theo(9490).gpa) > 0, theo(9490));
  kiem('không chia sẻ → không có GPA', theo(9491)?.gpaShared === false && theo(9491).gpa === null, theo(9491));
  const nguoi = theo(9490);
  kiem('minh chứng đã thẩm định tách riêng, không kèm điểm', nguoi?.evidence.reviewed.length === 1 && !('reviewScore' in nguoi.evidence.reviewed[0]), nguoi?.evidence);
  const urls = nguoi?.evidence.selfDeclared.map((e) => e.url) ?? [];
  kiem('SV tự cung cấp: GitHub + công bố công khai, không có mục riêng tư', urls.length === 2 && urls.includes('https://github.com/test-auto') && urls.some((u) => u.endsWith('9490')), urls);
  kiem('không gửi email, điểm rèn luyện', !/email|trainingScore|training_score/i.test(JSON.stringify(r.data)));
  kiem('tin đủ chỉ tiêu: khóa chấp nhận, vẫn từ chối được', theo(9493)?.canAccept === false && theo(9493).acceptBlockedReason === 'POST_FILLED' && theo(9493).canReject === true, theo(9493));
  kiem('tin đóng / hết hạn: vẫn chấp nhận được, có trạng thái để cảnh báo', theo(9496)?.canAccept && theo(9496).recruitment.state === 'Closed' && theo(9497)?.canAccept && theo(9497).recruitment.state === 'Expired');

  ok(await supabase.from('student_profile').update({ is_skills_public: false, is_achievements_public: false }).eq('student_id', 9601));
  r = await goi('GET', `${TEAMS}/${TEAM}/applications`, { cookie: leader });
  kiem('SV ẩn kỹ năng và đề tài → không gửi ra', theo(9490)?.skills === null && theo(9490).evidence.reviewed.length === 0, theo(9490));

  r = await goi('GET', `${TEAMS}/${TEAM}/applications`, { cookie: member });
  kiem('Member xem được nhưng không có quyền quyết định', r.status === 200 && r.data.viewer.canDecide === false && r.data.applications.every((a) => !a.canAccept && !a.canReject));

  console.log('3. Đầu vào sai');
  kiem('status lạ → 400', la(await goi('GET', `${TEAMS}/${TEAM}/applications?status=Withdrawn`, { cookie: leader }), 400, 'INVALID_INPUT'));
  kiem('mã nhóm sai → 400', la(await goi('GET', `${TEAMS}/abc`, { cookie: leader }), 400, 'INVALID_INPUT'));
  kiem('mã đơn quá lớn → 400', la(await goi('POST', url('99999999999', 'accept'), { cookie: leader }), 400, 'INVALID_INPUT'));
  for (const [ten, json] of [['không có lý do', {}], ['lý do toàn khoảng trắng', { reason: '            ' }], ['lý do quá ngắn', { reason: 'ngắn' }], ['lý do 501 ký tự', { reason: 'a'.repeat(501) }], ['lý do không phải chuỗi', { reason: 12345678901 }]]) {
    kiem(`từ chối, ${ten} → 400`, la(await goi('POST', url(9492, 'reject'), { cookie: leader, json }), 400, 'INVALID_INPUT'));
  }
  kiem('đơn không thuộc nhóm → 404', la(await goi('POST', url(9411, 'accept'), { cookie: leader }), 404, 'APPLICATION_NOT_FOUND'));

  console.log('4. Từ chối');
  r = await goi('POST', url(9492, 'reject'), { cookie: leader, json: { reason: `  ${LY_DO}  ` } });
  let don = await docDon(9492);
  kiem('từ chối → 200, lưu lý do, người xử lý, thời điểm', r.status === 200 && don.status === 'Rejected' && don.response_note === LY_DO && don.responded_by_account_id === 9101 && !!don.responded_at, don);
  let tb = await thongBao(9603);
  kiem('người nộp nhận thông báo kèm lý do', tb.length === 1 && tb[0].category === 'Team' && tb[0].content.includes(LY_DO), tb);
  kiem('từ chối lần hai → 409', la(await goi('POST', url(9492, 'reject'), { cookie: leader, json: { reason: LY_DO } }), 409, 'APPLICATION_NOT_PENDING'));
  kiem('chấp nhận đơn đã từ chối → 409', la(await goi('POST', url(9492, 'accept'), { cookie: leader }), 409, 'APPLICATION_NOT_PENDING'));
  r = await goi('POST', url(9495, 'accept'), { cookie: leader });
  kiem('đơn SV đã rút → 409, báo đã rút', la(r, 409, 'APPLICATION_NOT_PENDING') && r.data.message.includes('rút'), r.data);
  kiem('tin đã đủ chỉ tiêu: chấp nhận → 409 POST_FILLED', la(await goi('POST', url(9493, 'accept'), { cookie: leader }), 409, 'POST_FILLED'));
  kiem('tin đã đủ chỉ tiêu: từ chối được', la(await goi('POST', url(9493, 'reject'), { cookie: leader, json: { reason: LY_DO } }), 200));
  kiem('đã là thành viên → 409 ALREADY_MEMBER', la(await goi('POST', url(9494, 'accept'), { cookie: leader }), 409, 'ALREADY_MEMBER'));

  console.log('5. Chấp nhận');
  r = await goi('POST', url(9496, 'accept'), { cookie: leader });
  kiem('tin đã đóng: chấp nhận → 200, 3/10, tin vẫn đóng', r.status === 200 && r.data.memberCount === 3 && r.data.recruitmentStatus === 'Closed', r.data);
  const tv = ok(await supabase.from('team_member').select('role_in_team').eq('team_id', TEAM).eq('student_id', 9606).maybeSingle());
  kiem('người được nhận có vai trò Member, đơn Accepted', tv?.role_in_team === 'Member' && (await docDon(9496)).status === 'Accepted');
  kiem('người được nhận có thông báo', (await thongBao(9606)).length === 1);
  kiem('tin hết hạn: chấp nhận → 200', la(await goi('POST', url(9497, 'accept'), { cookie: leader }), 200));
  r = await goi('POST', url(9498, 'accept'), { cookie: leader });
  kiem('nhận đủ chỉ tiêu → tin tự chuyển Filled', r.status === 200 && r.data.recruitmentStatus === 'Filled' && r.data.memberCount === 5, r.data);
  kiem('đơn còn lại của tin đó → 409 POST_FILLED', la(await goi('POST', url(9499, 'accept'), { cookie: leader }), 409, 'POST_FILLED'));
  r = await goi('GET', `${TEAMS}/${TEAM}/applications?status=Accepted`, { cookie: leader });
  kiem('tab đã chấp nhận: đủ 3, không kèm hồ sơ người nộp', r.data.counts?.Accepted === 3 && r.data.applications.every((a) => a.stillMember === true && !('gpa' in a) && !('evidence' in a)), r.data);

  console.log('6. Đồng thời');
  await datToiDa(6); // đang 5 người: còn đúng 1 chỗ
  let [a, b] = await Promise.all([url(9490, 'accept'), url(9491, 'accept')].map((u) => goi('POST', u, { cookie: leader })));
  kiem('còn 1 chỗ, nhận 2 đơn cùng lúc → đúng một lần thành công', [a.status, b.status].sort().join() === '200,409' && [a, b].some((x) => x.data.code === 'TEAM_FULL'), [a.data, b.data]);
  kiem('số thành viên không vượt tối đa', (await soThanhVien()) === 6);
  const conLai = a.status === 200 ? 9491 : 9490;
  kiem('nhóm đã đủ → 409 TEAM_FULL, đơn vẫn Pending', la(await goi('POST', url(conLai, 'accept'), { cookie: leader }), 409, 'TEAM_FULL') && (await docDon(conLai)).status === 'Pending');
  await datToiDa(10);
  [a, b] = await Promise.all([0, 1].map(() => goi('POST', url(9500, 'accept'), { cookie: leader })));
  kiem('bấm hai lần một đơn → một 200, một 409', [a.status, b.status].sort().join() === '200,409' && [a, b].some((x) => x.data.code === 'APPLICATION_NOT_PENDING'), [a.data, b.data]);
  kiem('chỉ thêm một thành viên', (await soThanhVien()) === 7);

  console.log('7. Nhóm ngừng hoạt động và cài đặt thông báo');
  ok(await supabase.from('student_team').update({ status: 'Inactive' }).eq('team_id', TEAM));
  kiem('nhóm ngừng hoạt động: chấp nhận → 409 TEAM_INACTIVE', la(await goi('POST', url(9501, 'accept'), { cookie: leader }), 409, 'TEAM_INACTIVE'));
  const coSan = ok(await supabase.from('notification_setting').select('is_enabled').eq('account_id', 9604).eq('category', 'Team').maybeSingle());
  if (!coSan) {
    ok(await supabase.from('notification_setting').insert({ account_id: 9604, category: 'Team', is_enabled: false }));
    taoCaiDat = true;
    const truoc = (await thongBao(9604)).length;
    kiem('nhóm ngừng hoạt động: vẫn từ chối được', la(await goi('POST', url(9501, 'reject'), { cookie: leader, json: { reason: LY_DO } }), 200));
    kiem('người đã tắt thông báo Nhóm không nhận thêm', (await thongBao(9604)).length === truoc);
  }

  console.log('8. CSDL tự chặn');
  const thieu = await supabase.from('recruitment_application').update({ status: 'Rejected', response_note: null }).eq('apply_id', 9499);
  kiem('ràng buộc: Rejected thiếu lý do bị từ chối ghi', thieu.error?.code === '23514', thieu.error);
}

async function donCuoi() {
  for (const cookie of phien) await goi('POST', `${BASE}/auth/logout`, { cookie }).catch(() => {});
  if (taoCaiDat) ok(await supabase.from('notification_setting').delete().eq('account_id', 9604).eq('category', 'Team'));
  if (hoSoGoc) ok(await supabase.from('student_profile').update(hoSoGoc).eq('student_id', 9601));
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
