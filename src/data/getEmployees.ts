import { getActiveBinding, getRosterWithBindStatus } from './mockStore';

// Mock 管理员查询员工花名册 + 绑定状态
export default async function mockGetEmployees() {
  console.log('[Mock] getEmployees called');

  const binding = getActiveBinding();
  if (!binding || binding.role !== 'admin') {
    throw new Error('无权限：仅管理员可查看员工绑定信息');
  }

  return { list: getRosterWithBindStatus() };
}
