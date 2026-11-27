// Nghiệp vụ "Bàn làm việc" của Doanh nghiệp (DN-01): tổng hợp số liệu từ bài toán, hộp thư và phòng đàm phán.
// Dùng lại getInbox / listRooms để số liệu luôn khớp với DN-08, DN-09.
import { supabase } from '../../db.js';
import { getInbox } from '../08-hop-thu-ket-noi/hop-thu.service.js';
import { listRooms } from '../09-16-dam-phan/dam-phan.service.js';

export async function getDashboard(businessId) {
  const [inbox, { rooms }] = await Promise.all([getInbox(businessId), listRooms(businessId)]);

  const { data: problems, error } = await supabase
    .from('business_problem')
    .select('problem_id, problem_code, title, status, deadline, created_at')
    .eq('business_id', businessId);
  if (error) throw error;

  const requests = inbox.requests;
  const moiNhat = requests
    .filter((r) => r.status === 'Submitted')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const phanHoiLoiMoi = requests.filter((r) => r.initiatedBy === 'Business' && !['Declined', 'Cancelled'].includes(r.status));
  const choXacNhan = rooms.filter((r) => r.roomStatus === 'Awaiting_Business');

  return {
    business: inbox.business,
    counts: {
      newProposals: moiNhat.length,
      newUnread: moiNhat.filter((r) => r.isNew).length,
      invitationReplies: phanHoiLoiMoi.length,
      awaitingConfirmation: choXacNhan.length,
      pendingProblems: problems.filter((p) => p.status === 'Pending_Approval').length,
      rooms: rooms.length,
    },
    invitationReplyIds: phanHoiLoiMoi.map((r) => r.id),
    awaitingRoomIds: choXacNhan.map((r) => r.id),
    problems: problems.map((p) => {
      const cuaBaiToan = requests.filter((r) => r.problemId === p.problem_id);
      const daKy = rooms.find((r) => r.problemId === p.problem_id && r.roomStatus === 'Contracted');
      return {
        code: p.problem_code ?? `RD-${p.problem_id}`,
        title: p.title,
        status: p.status,
        deadline: p.deadline,
        createdAt: p.created_at,
        proposalCount: cuaBaiToan.length,
        partnerName: daKy ? daKy.partner.name : null,
      };
    }),
    latestProposals: moiNhat.slice(0, 3),
    rooms,
  };
}
