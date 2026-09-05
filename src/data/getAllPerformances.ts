import { useUserStore } from '@/store/userStore';
import { getPerformanceStore } from './submitPerformance';

export default async function mockGetAllPerformances(params: { startDate: string; endDate: string }) {
  console.log('[Mock] getAllPerformances called:', params);
  
  const store = useUserStore.getState();
  if (!store.isAdmin) {
    throw new Error('无权限访问');
  }

  const records = Array.from(getPerformanceStore().values());
  let list = records.filter(p => p.date >= params.startDate && p.date <= params.endDate);
  
  list.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.userName.localeCompare(b.userName);
  });

  return { list };
}
