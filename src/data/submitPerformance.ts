import { MOCK_PERFORMANCES } from './mockData';
import { getActiveBinding } from './mockStore';

// 内存存储，支持提交后更新
const performanceStore = new Map<string, typeof MOCK_PERFORMANCES[0]>();
MOCK_PERFORMANCES.forEach(p => {
  performanceStore.set(`${p.employeeId}_${p.date}`, { ...p });
});

// Mock 提交业绩：身份由绑定关系决定，忽略客户端传入的 userId/userName
export default async function mockSubmitPerformance(params: { date: string; products: any; remark?: string }) {
  console.log('[Mock] submitPerformance called:', params);

  const binding = getActiveBinding();
  if (!binding) {
    throw new Error('未绑定员工身份，请先完成工号绑定');
  }

  const employeeId = binding.employeeId;
  const userName = binding.name;
  const key = `${employeeId}_${params.date}`;
  const existing = performanceStore.get(key);

  const record = {
    _id: existing?._id || `perf_${key}`,
    _openid: binding._openid,
    employeeId,
    userName,
    date: params.date,
    products: params.products,
    remark: params.remark || '',
    status: 'submitted' as const,
    createTime: existing?.createTime || Date.now(),
    updateTime: Date.now()
  };

  performanceStore.set(key, record);
  return { performance: record };
}

// 暴露给其他 mock 文件使用
export function getPerformanceStore() {
  return performanceStore;
}

// 数据清零：清空所有已提交业绩（数据重置后报表归零，仅保留花名册）
export function clearPerformanceStore() {
  performanceStore.clear();
}
