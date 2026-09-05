import { clearPerformanceStore } from './submitPerformance';
import { clearAllMockStorage } from './mockStore';

// Mock 清空数据：清空本地内存业绩库 + 本地持久化数据（保留花名册）
export default async function mockClearAllData(params?: { confirm?: boolean }) {
  console.log('[Mock] clearAllData called:', params);

  if (params?.confirm !== true) {
    throw new Error('缺少确认参数，已取消');
  }

  clearPerformanceStore();
  clearAllMockStorage();

  return {
    cleared: true,
    operator: 'mock-admin',
    results: [
      { collection: 'performances', total: 0, deleted: 0 },
      { collection: 'users', total: 0, deleted: 0 },
      { collection: 'operation_logs', total: 0, deleted: 0 }
    ]
  };
}
