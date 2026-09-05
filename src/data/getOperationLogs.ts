import Taro from '@tarojs/taro';
import { MOCK_LOGS } from './mockData';

// Mock 操作日志：数据清零后初始为空，业务动作写入本地存储
const LOG_KEY = 'mock_operation_logs';

export default async function mockGetOperationLogs(params?: { limit?: number }) {
  console.log('[Mock] getOperationLogs called:', params);

  let storageLogs: any[] = [];
  try {
    storageLogs = Taro.getStorageSync(LOG_KEY) || [];
  } catch {
    storageLogs = [];
  }

  // 内存种子日志（已清零为空）+ 本地持久化日志合并
  let list = [...storageLogs, ...MOCK_LOGS];
  list.sort((a: any, b: any) => (b.createTime || 0) - (a.createTime || 0));

  if (params?.limit) {
    list = list.slice(0, params.limit);
  }

  return { list };
}
