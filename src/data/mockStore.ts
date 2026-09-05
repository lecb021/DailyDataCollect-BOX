import Taro from '@tarojs/taro';
import { MOCK_EMPLOYEES } from './mockData';
import type { User } from '@/types';

// ============================================
// 本地 Mock 身份存储
// 模拟微信 openid 机制：
// - 伪 openid 持久化在本地（一台设备 = 一个微信用户）
// - 绑定关系持久化在本地（openid ↔ 工号 一一对应）
// ============================================

const OPENID_KEY = 'mock_wx_openid';
const BINDING_KEY = 'mock_employee_bindings';

export interface MockBinding extends User {
  _openid: string;
  employeeId: string;
  status: 'active' | 'unbound';
  bindTime: number;
  unbindTime?: number;
}

// 获取（或首次生成）本设备的伪微信 openid
export function getMockOpenid(): string {
  try {
    let openid = Taro.getStorageSync(OPENID_KEY);
    if (!openid) {
      openid = `mock_openid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      Taro.setStorageSync(OPENID_KEY, openid);
    }
    return openid;
  } catch {
    return 'mock_openid_h5_default';
  }
}

// 读取全部绑定记录
function readBindings(): MockBinding[] {
  try {
    return Taro.getStorageSync(BINDING_KEY) || [];
  } catch {
    return [];
  }
}

function writeBindings(list: MockBinding[]) {
  try {
    Taro.setStorageSync(BINDING_KEY, list);
  } catch (e) {
    console.warn('[MockStore] 写入绑定关系失败:', e);
  }
}

// 查询当前 openid 的有效绑定
export function getActiveBinding(openid: string = getMockOpenid()): MockBinding | null {
  const list = readBindings();
  return list.find((b) => b._openid === openid && b.status === 'active') || null;
}

// 花名册查询（按工号）
export function findRosterEmployee(employeeNo: string) {
  return MOCK_EMPLOYEES.find((e) => e.employeeNo === employeeNo) || null;
}

// 工号是否已被其他 openid 绑定
export function isEmployeeBoundByOther(employeeNo: string, openid: string): boolean {
  const list = readBindings();
  return list.some(
    (b) => b.employeeNo === employeeNo && b.status === 'active' && b._openid !== openid
  );
}

// 建立/更新当前 openid 的绑定（工号+姓名验证通过后调用）
export function upsertBinding(employeeNo: string): MockBinding {
  const openid = getMockOpenid();
  const roster = findRosterEmployee(employeeNo);
  if (!roster) throw new Error('工号不存在');

  const list = readBindings();
  const now = Date.now();
  const idx = list.findIndex((b) => b._openid === openid);

  const binding: MockBinding = {
    _id: idx >= 0 ? list[idx]._id : `bind_${now}`,
    _openid: openid,
    employeeId: roster.employeeNo,
    employeeNo: roster.employeeNo,
    name: roster.name,
    role: roster.role,
    subRole: roster.subRole,
    department: roster.department,
    status: 'active',
    bindTime: now
  };

  if (idx >= 0) {
    list[idx] = binding;
  } else {
    list.push(binding);
  }
  writeBindings(list);
  return binding;
}

// 管理员解绑指定工号
export function unbindEmployee(employeeNo: string, operator: MockBinding): MockBinding | null {
  const list = readBindings();
  const idx = list.findIndex(
    (b) => b.employeeNo === employeeNo && b.status === 'active'
  );
  if (idx < 0) return null;

  const unbound = { ...list[idx], status: 'unbound' as const, unbindTime: Date.now() };
  list[idx] = unbound;
  writeBindings(list);

  // 记录操作日志（追加到 mock 日志存储）
  try {
    const logKey = 'mock_operation_logs';
    const logs = Taro.getStorageSync(logKey) || [];
    logs.unshift({
      _id: `log_${Date.now()}`,
      _openid: operator._openid,
      employeeId: operator.employeeId,
      userName: operator.name,
      action: 'unbind',
      target: employeeNo,
      detail: `解除员工绑定：${unbound.name}（${employeeNo}）`,
      createTime: Date.now()
    });
    Taro.setStorageSync(logKey, logs.slice(0, 50));
  } catch (e) {
    console.warn('[MockStore] 写入解绑日志失败:', e);
  }

  return unbound;
}

// 花名册 + 绑定状态（管理员员工管理页用）
export function getRosterWithBindStatus() {
  const list = readBindings();
  return MOCK_EMPLOYEES.map((emp) => {
    const binding = list.find((b) => b.employeeNo === emp.employeeNo && b.status === 'active');
    return {
      ...emp,
      employeeId: emp.employeeNo,
      bindStatus: binding ? ('bound' as const) : ('unbound' as const),
      bindOpenid: binding?._openid || '',
      bindTime: binding?.bindTime || null
    };
  });
}

// ============================================
// 数据清零
// 清空本地持久化的全部数据：绑定关系、伪 openid、操作日志
// 花名册（MOCK_EMPLOYEES）为基础配置，不清
// ============================================
export function clearAllMockStorage() {
  const keys = [OPENID_KEY, BINDING_KEY, 'mock_operation_logs'];
  keys.forEach((key) => {
    try {
      Taro.removeStorageSync(key);
    } catch (e) {
      console.warn('[MockStore] 清除缓存失败:', key, e);
    }
  });
}
