import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type { User } from '@/types';

interface UserState {
  user: User | null;
  isLogin: boolean;
  isAdmin: boolean;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const STORAGE_KEY = 'performance_user_info';

// 从本地缓存恢复用户信息
const getCachedUser = (): User | null => {
  try {
    const cached = typeof Taro !== 'undefined' 
      ? Taro.getStorageSync(STORAGE_KEY)
      : null;
    return cached || null;
  } catch {
    return null;
  }
};

export const useUserStore = create<UserState>((set) => {
  const cached = getCachedUser();
  return {
    user: cached,
    isLogin: !!cached,
    isAdmin: cached?.role === 'admin',
    setUser: (user) => {
      try {
        if (typeof Taro !== 'undefined' && user) {
          Taro.setStorageSync(STORAGE_KEY, user);
        }
      } catch (e) {
        console.warn('[UserStore] 缓存用户信息失败:', e);
      }
      set({ user, isLogin: !!user, isAdmin: user?.role === 'admin' });
    },
    updateUser: (patch) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...patch };
        try {
          if (typeof Taro !== 'undefined') {
            Taro.setStorageSync(STORAGE_KEY, updated);
          }
        } catch (e) {
          console.warn('[UserStore] 更新缓存失败:', e);
        }
        return { user: updated, isAdmin: updated.role === 'admin' };
      });
    },
    logout: () => {
      try {
        if (typeof Taro !== 'undefined') {
          Taro.removeStorageSync(STORAGE_KEY);
        }
      } catch (e) {
        console.warn('[UserStore] 清除缓存失败:', e);
      }
      set({ user: null, isLogin: false, isAdmin: false });
    }
  };
});
