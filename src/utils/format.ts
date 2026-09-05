import dayjs from 'dayjs';

/**
 * 格式化金额（分 → 元，千分位）
 */
export const formatAmount = (amount: number | string): string => {
  const num = Number(amount) || 0;
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * 格式化数量（整数，千分位）
 */
export const formatCount = (count: number | string): string => {
  const num = Number(count) || 0;
  return num.toLocaleString('zh-CN');
};

/**
 * 格式化日期为 YYYY-MM-DD
 */
export const formatDate = (date: dayjs.Dayjs | string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

/**
 * 格式化时间
 */
export const formatDateTime = (ts: number | string): string => {
  if (!ts) return '';
  return dayjs(Number(ts)).format('YYYY-MM-DD HH:mm');
};

/**
 * 获取今天日期 YYYY-MM-DD
 */
export const getToday = (): string => {
  return dayjs().format('YYYY-MM-DD');
};

/**
 * 获取本周开始日期（周一）
 */
export const getWeekStart = (): string => {
  return dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
};

/**
 * 获取本周结束日期（周日）
 */
export const getWeekEnd = (): string => {
  return dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD');
};

/**
 * 获取本月第一天
 */
export const getMonthStart = (): string => {
  return dayjs().startOf('month').format('YYYY-MM-DD');
};

/**
 * 获取本月最后一天
 */
export const getMonthEnd = (): string => {
  return dayjs().endOf('month').format('YYYY-MM-DD');
};

/**
 * 获取日期范围内的天数
 */
export const getDaysBetween = (start: string, end: string): number => {
  return dayjs(end).diff(dayjs(start), 'day') + 1;
};

/**
 * 计算时间差友好显示
 */
export const timeAgo = (ts: number): string => {
  const diff = dayjs().diff(dayjs(ts), 'second');
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return dayjs(ts).format('MM-DD HH:mm');
};
