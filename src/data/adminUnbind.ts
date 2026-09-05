import { getActiveBinding, unbindEmployee } from './mockStore';

// Mock 管理员解绑员工
export default async function mockAdminUnbind(params: { employeeNo: string }) {
  console.log('[Mock] adminUnbind called:', params);

  const operator = getActiveBinding();
  if (!operator || operator.role !== 'admin') {
    throw new Error('无权限：仅管理员可解绑员工');
  }

  const { employeeNo } = params;
  if (!employeeNo) {
    throw new Error('缺少工号参数');
  }
  if (operator.employeeNo === employeeNo) {
    throw new Error('不能解除当前登录账号的绑定');
  }

  const unbound = unbindEmployee(employeeNo, operator);
  if (!unbound) {
    throw new Error('该工号当前未绑定');
  }

  return { employeeNo, unbound: true };
}
