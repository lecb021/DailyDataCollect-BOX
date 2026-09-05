import Taro from '@tarojs/taro';
import { callFunction } from './cloud';
import { useUserStore } from '@/store/userStore';
import type { User } from '@/types';

// ============================================
// 身份认证服务
// 身份体系：微信 openid ↔ 员工工号（employeeId）一一绑定
// - 小程序端不保存、不上传任何身份字段
// - 身份一律由服务端（云函数/Mock 层）通过 openid 反查绑定关系得到
// ============================================

// 静默登录：wx.login 由云函数 getWXContext 获取 OPENID，反查 users 绑定表
export async function silentLogin(): Promise<{ bound: boolean; user: User | null }> {
  const res = await callFunction<{ bound: boolean; user: User | null }>('login', {});
  const { setUser } = useUserStore.getState();
  if (res?.bound && res.user) {
    // 已绑定：以服务端返回的花名册信息为准，自动识别员工身份
    setUser(res.user);
    return { bound: true, user: res.user };
  }
  // 未绑定或已被管理员解绑：清除本地登录态
  setUser(null);
  return { bound: false, user: null };
}

// 确保已绑定：未绑定则跳转首次绑定页
// 返回 true 表示已绑定可继续业务，false 表示已引导去绑定
export async function ensureBound(): Promise<boolean> {
  if (useUserStore.getState().isLogin) return true;
  try {
    const res = await silentLogin();
    if (res.bound) return true;
  } catch (err) {
    console.error('[Auth] 静默登录失败:', err);
  }
  Taro.navigateTo({ url: '/pages/bind/index' });
  return false;
}
