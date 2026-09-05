// ============================================
// 业务类型定义
// ============================================

// 员工角色
export type UserRole = 'admin' | 'staff';

// 员工角色细分（对应 Excel 中的高柜/厅堂主管）
export type StaffSubRole = 'gaogui' | 'yitang' | 'member';

// 员工信息（users 绑定表记录 / employees 花名册通用结构）
export interface User {
  _id?: string;
  _openid?: string;
  employeeId?: string;   // 员工唯一标识 = 工号（系统内所有关联均使用此键）
  name: string;
  employeeNo: string;
  role: UserRole;
  subRole?: StaffSubRole; // 高柜/厅堂/普通
  department?: string;
  avatar?: string;
  bindTime?: number;      // 绑定时间
  createTime?: number;
}

// 员工花名册项（管理员员工管理页使用，含绑定状态）
export interface EmployeeWithBind extends User {
  bindStatus: 'bound' | 'unbound';  // 微信绑定状态
  bindOpenid?: string;
}

// 产品种类（严格对齐 Excel 表头）
export const PRODUCT_TYPES = [
  '趸交', '期交', '基金', '定期', '养老金', '信用卡',
  '理财', '商养', '慧通卡', '财富卡', '个养账户'
] as const;

export type ProductType = typeof PRODUCT_TYPES[number];

// 单个产品数据
export interface ProductItem {
  name: ProductType;
  count: number; // 数量（笔数/件数）
  amount: number; // 金额（元）
}

// 业绩数据（11种产品，用Map存储）
export type PerformanceProducts = Partial<Record<ProductType, { count: number; amount: number }>>;

// 提交的业绩记录（按 employeeId 关联员工，禁止用姓名做键）
export interface Performance {
  _id?: string;
  _openid?: string;
  employeeId: string;   // = 员工工号，关联 employees 花名册
  userName: string;     // 冗余姓名，仅用于展示
  date: string; // YYYY-MM-DD
  products: PerformanceProducts;
  remark?: string;
  status: 'submitted' | 'draft';
  createTime?: number;
  updateTime?: number;
}

// ============================================
// 报表横向矩阵（员工为行、产品为列，对齐 Excel）
// ============================================

// 单个员工的一行数据
export interface EmployeeRow {
  employeeId: string;   // = 工号
  userName: string;
  subRole?: StaffSubRole;
  // 每个产品的笔数，按 PRODUCT_TYPES 顺序一一对应
  products: number[];
  // 该员工合计笔数
  totalCount: number;
}

// 报表统计汇总
export interface ReportSummary {
  totalCount: number; // 总笔数
  totalAmount: number; // 总金额
  productStats: Record<ProductType, { count: number; amount: number }>;
  submittedDays: number; // 提交天数
}

// 员工排行
export interface EmployeeRanking {
  employeeId: string;
  userName: string;
  totalCount: number;
  totalAmount: number;
  rank: number;
}

// 报表数据（横向矩阵 + 辅助信息）
export interface ReportData {
  type: 'day' | 'week' | 'month' | 'year';
  date: string;
  // 横向矩阵：员工行 × 产品列（对齐 Excel）
  employeeMatrix: EmployeeRow[];
  // 累计行：每个产品的合计笔数
  totals: {
    products: number[];   // 与 PRODUCT_TYPES 顺序对应
    totalCount: number;   // 累计总笔数
  };
  // 负责人信息（从员工 subRole 推导）
  supervisors: {
    gaogui: string;  // 高柜主管姓名
    yitang: string;  // 厅堂主管姓名
  };
  summary: ReportSummary;
  rankings: EmployeeRanking[];
  details?: Performance[];
}

// 操作日志
export interface OperationLog {
  _id?: string;
  _openid?: string;
  employeeId: string;
  userName: string;
  action: string; // 'login' | 'bind' | 'submit' | 'update' | 'export' | 'unbind'
  target?: string;
  detail?: string;
  createTime: number;
}

// 日期范围
export interface DateRange {
  startDate: string;
  endDate: string;
}

// 产品标签配色
export const PRODUCT_COLORS: Record<ProductType, { bg: string; text: string }> = {
  '趸交': { bg: '#DBEAFE', text: '#1E40AF' },
  '期交': { bg: '#D1FAE5', text: '#065F46' },
  '基金': { bg: '#FEF3C7', text: '#92400E' },
  '定期': { bg: '#E0F2FE', text: '#075985' },
  '养老金': { bg: '#E0E7FF', text: '#3730A3' },
  '信用卡': { bg: '#FEE2E2', text: '#991B1B' },
  '理财': { bg: '#F3E8FF', text: '#6B21A8' },
  '商养': { bg: '#FCE7F3', text: '#9D174D' },
  '慧通卡': { bg: '#ECFDF5', text: '#064E3B' },
  '财富卡': { bg: '#E0F2FE', text: '#075985' },
  '个养账户': { bg: '#FFF7ED', text: '#9A3412' }
};
