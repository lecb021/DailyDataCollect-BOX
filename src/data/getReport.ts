import { generateMockReport } from './mockData';
import { getPerformanceStore } from './submitPerformance';

export default async function mockGetReport(params: { type: 'day' | 'week' | 'month' | 'year'; targetDate?: string }) {
  console.log('[Mock] getReport called:', params);

  // 统一从业绩提交内存库聚合（数据清零后仅含员工真实提交记录）
  const records = Array.from(getPerformanceStore().values());
  const report = generateMockReport(params.type, params.targetDate, records);
  return report;
}
