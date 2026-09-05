import {
  getMockOpenid,
  isEmployeeBoundByOther,
  upsertBinding
} from './mockStore';
import { MOCK_EMPLOYEES } from './mockData';

// 校验规则（与前端保持一致）
const NAME_REGEX = /^[\u4e00-\u9fa5]{2,4}$/; // 姓名：2-4个中文字符

// 花名册按姓名查找（取消工号后改为仅按姓名验证）
function findRosterByName(name: string) {
  return MOCK_EMPLOYEES.find((e) => e.name === name) || null;
}

// Mock 首次绑定：仅按姓名验证身份
export default async function mockBindEmployee(params: { name: string }) {
  console.log('[Mock] bindEmployee called:', params);

  const name = (params.name || '').replace(/\s+/g, '').trim();

  // 0. 格式校验
  if (!name) {
    throw new Error('请输入姓名');
  }
  if (!NAME_REGEX.test(name)) {
    throw new Error('姓名格式不正确，应为2-4个中文字符');
  }

  // 1. 花名册按姓名查找
  const roster = findRosterByName(name);
  if (!roster) {
    throw new Error('姓名不在员工花名册中，请核对后重试');
  }

  // 2. 工号唯一绑定校验（内部仍用 employeeNo 防重复绑定）
  const employeeNo = roster.employeeNo;
  const openid = getMockOpenid();
  if (isEmployeeBoundByOther(employeeNo, openid)) {
    throw new Error('该员工已被其他微信账号绑定，请联系管理员解绑');
  }

  // 3. 写入绑定关系
  const binding = upsertBinding(employeeNo);
  return { bound: true, user: binding };
}
