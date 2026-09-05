import dayjs from 'dayjs';
import type {
  User,
  Performance,
  ReportData,
  OperationLog,
  ProductType
} from '@/types';

// ============================================
// Mock 员工数据（用户指定名单+顺序）
// 厅堂主管: 乐承秉
// ============================================
export const MOCK_EMPLOYEES: User[] = [
  { _id: '1', employeeNo: '000001', name: '陆匙谨', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '2', employeeNo: '000002', name: '顾震宇', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '3', employeeNo: '000003', name: '迟玄烨', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '4', employeeNo: '000004', name: '许爱娜', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '5', employeeNo: '000005', name: '王婕',   role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '6', employeeNo: '000006', name: '王澜清', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '7', employeeNo: '000007', name: '丁静',   role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '8', employeeNo: '000008', name: '於鑫楠', role: 'staff', subRole: 'member', department: '零售业务部' },
  { _id: '9', employeeNo: '000009', name: '乐承秉', role: 'admin', subRole: 'yitang', department: '零售业务部' }
];

// 产品种类（严格对齐 Excel 表头顺序）
const EXCEL_PRODUCTS: ProductType[] = [
  '趸交', '期交', '基金', '定期', '养老金', '信用卡',
  '理财', '商养', '慧通卡', '财富卡', '个养账户'
];

// ============================================
// Mock 业绩数据
// 数据清零：初始为空，所有业绩由员工提交产生（submitPerformance 内存库）
// ============================================
export const MOCK_PERFORMANCES: Performance[] = [];

// ============================================
// Mock 操作日志
// 数据清零：初始为空，操作日志由业务动作写入
// ============================================
export const MOCK_LOGS: OperationLog[] = [];

// ============================================
// 报表聚合（从业绩提交库真实区间聚合；数据清零后仅有员工提交的记录）
// ============================================
export function generateMockReport(
  type: 'day' | 'week' | 'month' | 'year',
  targetDate?: string,
  performances: Performance[] = MOCK_PERFORMANCES
): ReportData {
  const now = targetDate ? dayjs(targetDate) : dayjs();
  let startDate: string;
  let endDate: string;
  let dateLabel: string;

  const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

  if (type === 'day') {
    startDate = endDate = fmt(now);
    dateLabel = now.format('YYYY年M月D日');
  } else if (type === 'week') {
    const weekStart = now.startOf('week').add(1, 'day');
    const weekEnd = weekStart.add(6, 'day');
    startDate = fmt(weekStart);
    endDate = fmt(weekEnd);
    dateLabel = `${weekStart.format('M月D日')} ~ ${weekEnd.format('M月D日')}`;
  } else if (type === 'year') {
    startDate = fmt(now.startOf('year'));
    endDate = fmt(now.endOf('year'));
    dateLabel = `${now.format('YYYY年')}`;
  } else {
    const monthStart = now.startOf('month');
    const monthEnd = now.endOf('month');
    startDate = fmt(monthStart);
    endDate = fmt(monthEnd);
    dateLabel = `${now.format('YYYY年M月')}`;
  }

  const range = performances.filter((p) => p.date >= startDate && p.date <= endDate);

  const employeeMatrix = MOCK_EMPLOYEES.map((emp) => {
    const empRecords = range.filter((p) => p.employeeId === emp.employeeNo);
    const products: number[] = EXCEL_PRODUCTS.map((prodName) => {
      return empRecords.reduce(
        (sum, p) => sum + (p.products?.[prodName]?.count || 0),
        0
      );
    });
    const totalCount = products.reduce((a, b) => a + b, 0);
    return {
      employeeId: emp.employeeNo,
      userName: emp.name,
      subRole: emp.subRole,
      products,
      totalCount
    };
  });

  const totals: { products: number[]; totalCount: number } = {
    products: EXCEL_PRODUCTS.map((_, idx) =>
      employeeMatrix.reduce((sum, row) => sum + row.products[idx], 0)
    ),
    totalCount: employeeMatrix.reduce((sum, row) => sum + row.totalCount, 0)
  };

  const yitang = MOCK_EMPLOYEES.find((e) => e.subRole === 'yitang')?.name ?? '';

  const productStats: Record<string, { count: number; amount: number }> = {};
  EXCEL_PRODUCTS.forEach((name, idx) => {
    productStats[name] = { count: totals.products[idx], amount: 0 };
  });

  const submittedDays = new Set(range.map((p) => p.date)).size;

  const rankings = employeeMatrix
    .map((row) => ({
      employeeId: row.employeeId,
      userName: row.userName,
      totalCount: row.totalCount,
      totalAmount: 0,
      rank: 0
    }))
    .sort((a, b) => b.totalCount - a.totalCount)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    type,
    date: dateLabel,
    employeeMatrix,
    totals,
    supervisors: { gaogui: '', yitang },
    summary: {
      totalCount: totals.totalCount,
      totalAmount: 0,
      productStats: productStats as Record<ProductType, { count: number; amount: number }>,
      submittedDays
    },
    rankings,
    details: range
  };
}
