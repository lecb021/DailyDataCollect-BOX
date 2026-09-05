import { getActiveBinding } from './mockStore';
import { getPerformanceStore } from './submitPerformance';

// Mock 查询我的业绩：按当前绑定员工的 employeeId 过滤
export default async function mockGetMyPerformances(params?: { startDate?: string; endDate?: string }) {
  console.log('[Mock] getMyPerformances called:', params);

  const binding = getActiveBinding();
  if (!binding) return { list: [] };

  const allRecords = Array.from(getPerformanceStore().values());
  let list = allRecords.filter(p => p.employeeId === binding.employeeId);

  if (params?.startDate) {
    list = list.filter(p => p.date >= params.startDate!);
  }
  if (params?.endDate) {
    list = list.filter(p => p.date <= params.endDate!);
  }

  // 按日期倒序
  list.sort((a, b) => b.date.localeCompare(a.date));

  return { list };
}
