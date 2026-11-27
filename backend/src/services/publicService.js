// Dữ liệu công khai cho người chưa đăng nhập (trang tổng quan index.html, pages/khach/).
// Chỉ bài toán đã được Admin duyệt công khai (Open / In_Progress) và thông tin đơn vị đặt bài.
// KHÔNG trả: tên / MSSV / điểm sinh viên, proposal, email liên hệ, tệp đính kèm (có thể thuộc NDA),
// dữ liệu riêng của người xem (đã lưu, proposal của tôi, mức phù hợp).
import { listPublicProblemRows, tomTatCongKhai, getPublicProblem } from './studentRdProblemService.js';

export { getPublicProblem };

export async function getOverview() {
  const rows = await listPublicProblemRows();
  const problems = rows.map(tomTatCongKhai);

  // Đơn vị đặt bài = doanh nghiệp / Lab có ít nhất một bài công khai, nhiều bài trước
  const theoId = new Map();
  for (const p of problems) {
    const b = p.business;
    if (!b) continue;
    const cu = theoId.get(b.id);
    if (cu) cu.problemCount++;
    else theoId.set(b.id, { id: b.id, name: b.name, industry: b.industry, address: b.address, logoUrl: b.logoUrl, problemCount: 1 });
  }
  const partners = [...theoId.values()].sort((a, b) => b.problemCount - a.problemCount || a.name.localeCompare(b.name, 'vi'));

  const open = problems.filter((p) => p.status === 'Open');
  return {
    stats: {
      openProblems: open.length,
      inProgressProblems: problems.filter((p) => p.status === 'In_Progress').length,
      partners: partners.length,
      // Tổng kinh phí (mức tối đa) của các bài đang mở, VNĐ
      totalFunding: open.reduce((t, p) => t + (p.funding ?? 0), 0),
    },
    problems,
    partners,
  };
}
