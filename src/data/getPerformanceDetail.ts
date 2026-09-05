import { getActiveBinding } from './mockStore';
import { getPerformanceStore } from './submitPerformance';

// Mock 查询业绩详情：仅可查看本人绑定 employeeId 下的记录
export default async function mockGetPerformanceDetail(params: { id: string }) {
  console.log('[Mock] getPerformanceDetail called:', params);

  const binding = getActiveBinding();
  if (!binding) {
    throw new Error('未绑定员工身份，请先完成工号绑定');
  }

  const store = getPerformanceStore();
  const record = Array.from(store.values()).find(p => p._id === params.id);

  if (!record || record.employeeId !== binding.employeeId) {
    return { performance: null };
  }
  return { performance: record };
}
