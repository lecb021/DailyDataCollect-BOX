import { getMockOpenid, getActiveBinding } from './mockStore';

// Mock 微信登录：根据伪 openid 查询本地绑定关系
export default async function mockLogin() {
  console.log('[Mock] login called');
  const openid = getMockOpenid();
  const binding = getActiveBinding(openid);

  if (binding) {
    return { bound: true, user: binding };
  }
  return { bound: false, user: null };
}
