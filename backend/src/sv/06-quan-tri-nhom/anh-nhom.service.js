// Ảnh nhóm (SV-06): cùng bucket công khai "avatars" với ảnh đại diện, mỗi nhóm một thư mục team-<id>/.
// Đường dẫn công khai lưu ở student_team.avatar_url (migration 011). CHỈ Leader của nhóm đang hoạt động được đổi.
import { randomUUID } from 'node:crypto';
import { supabase } from '../../db.js';
import { AppError } from '../../shared/errors.js';
import {
  AVATAR_BUCKET,
  assertImage,
  ensureBucket,
  removeStoredImage,
} from '../04-ho-so-nang-luc-cv/anh-dai-dien.service.js';

const folderOf = (teamId) => `team-${teamId}`;

// Kiểm tra quyền trước khi đụng tới tệp; trả đường dẫn ảnh hiện tại
async function requireEditableTeam(studentId, teamId) {
  const { data, error } = await supabase
    .from('team_member')
    .select('role_in_team, student_team(status, avatar_url)')
    .eq('student_id', studentId)
    .eq('team_id', teamId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'TEAM_NOT_FOUND', 'Không tìm thấy nhóm này trong các nhóm của bạn.');
  if (data.role_in_team !== 'Leader') {
    throw new AppError(403, 'NOT_TEAM_LEADER', 'Chỉ trưởng nhóm (Leader) được đổi ảnh nhóm.');
  }
  if (data.student_team.status !== 'Active') {
    throw new AppError(409, 'TEAM_INACTIVE', 'Nhóm không còn hoạt động nên không đổi được ảnh.');
  }
  return data.student_team.avatar_url;
}

async function setUrl(teamId, avatarUrl) {
  const { error } = await supabase.from('student_team').update({ avatar_url: avatarUrl }).eq('team_id', teamId);
  if (error) throw error;
}

export async function saveTeamAvatar(studentId, teamId, buffer, contentType) {
  const oldUrl = await requireEditableTeam(studentId, teamId);
  const ext = assertImage(buffer, contentType);
  await ensureBucket();

  const path = `${folderOf(teamId)}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  try {
    await setUrl(teamId, pub.publicUrl);
  } catch (err) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]); // không để lại ảnh mồ côi
    throw err;
  }
  await removeStoredImage(oldUrl, folderOf(teamId));
  return pub.publicUrl;
}

export async function removeTeamAvatar(studentId, teamId) {
  const oldUrl = await requireEditableTeam(studentId, teamId);
  await setUrl(teamId, null);
  await removeStoredImage(oldUrl, folderOf(teamId));
}
