import React, { useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '@/store/userStore';
import { silentLogin } from '@/services/auth';
import { callFunction } from '@/services/cloud';

const MinePage: React.FC = () => {
  const { user, isLogin, isAdmin, logout } = useUserStore();

  // 页面显示时静默登录（openid 反查绑定关系），已绑定则自动恢复登录态
  useDidShow(() => {
    if (!useUserStore.getState().isLogin) {
      silentLogin().catch((err) => {
        console.error('[MinePage] silent login error:', err);
      });
    }
  });

  // 微信登录：已绑定直接进入；未绑定引导首次绑定
  const handleLogin = useCallback(async () => {
    Taro.showLoading({ title: '登录中...', mask: true });
    try {
      const res = await silentLogin();
      Taro.hideLoading();
      if (res.bound) {
        Taro.showToast({ title: '登录成功', icon: 'success' });
      } else {
        Taro.navigateTo({ url: '/pages/bind/index' });
      }
    } catch (err) {
      console.error('[MinePage] login error:', err);
      Taro.hideLoading();
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  }, []);

  const handleLogout = useCallback(() => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }, [logout]);

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url });
  };

  // 数据清零：清空云数据库全部业绩、绑定关系、操作日志（管理员操作，本地自动降级）
  const handleClearData = useCallback(() => {
    Taro.showModal({
      title: '⚠️ 清空所有数据',
      content: '将清空所有员工业绩、微信绑定关系和操作日志，且不可恢复。确定继续吗？',
      confirmText: '确定清空',
      confirmColor: '#DC2626',
      success: (res) => {
        if (!res.confirm) return;
        // 二次确认
        Taro.showModal({
          title: '再次确认',
          content: '清空后所有报表数据将归零，需要重新绑定身份并重新登记业绩。',
          confirmText: '我已确认',
          confirmColor: '#DC2626',
          success: async (res2) => {
            if (!res2.confirm) return;
            Taro.showLoading({ title: '清空中...', mask: true });
            try {
              // 调用云函数清空云数据库（云函数未部署时自动降级清空本地数据）
              await callFunction('clearAllData', { confirm: true });
              // 清空后绑定关系已失效，清除本地登录态
              logout();
              Taro.hideLoading();
              Taro.showToast({ title: '数据已清空', icon: 'success' });
              setTimeout(() => {
                Taro.reLaunch({ url: '/pages/mine/index' });
              }, 1000);
            } catch (err) {
              Taro.hideLoading();
              console.error('[MinePage] clear data error:', err);
              Taro.showToast({
                title: err instanceof Error ? err.message : '清空失败，请重试',
                icon: 'none'
              });
            }
          }
        });
      }
    });
  }, [logout]);

  return (
    <View className={styles.pageContainer}>
      {/* 用户信息 */}
      <View className={styles.userHeader}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            {isLogin ? user?.name?.[0] || '👤' : '👤'}
          </View>
          <View className={styles.userDetail}>
            <Text className={styles.userName}>
              {isLogin ? user?.name : '未登录'}
            </Text>
            <View className={styles.userMeta}>
              {isLogin ? (
                <>
                  <Text className={styles.userRole}>
                    {isAdmin ? '🛡️ 管理员' : '👷 普通员工'}
                  </Text>
                  <Text className={styles.userDepartment}>
                    {user?.subRole === 'yitang' ? '厅堂主管' : (user?.department || '零售业务部')}
                  </Text>
                </>
              ) : (
                <Text className={styles.userDepartment}>点击下方按钮登录并绑定身份</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 菜单列表 */}
      {isLogin && (
        <>
          {/* 管理员专属 */}
          {isAdmin && (
            <View className={styles.menuList}>
              <View
                className={styles.menuItem}
                onClick={() => navigateTo('/pages/employee/index')}
              >
                <View className={`${styles.menuIcon} admin`}>👥</View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>员工管理</Text>
                  <Text className={styles.menuSubtitle}>查看和管理网点员工</Text>
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
              <View
                className={styles.menuItem}
                onClick={() => navigateTo('/pages/export/index')}
              >
                <View className={`${styles.menuIcon} export`}>📊</View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>导出报表</Text>
                  <Text className={styles.menuSubtitle}>导出日报/周报/月报Excel</Text>
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
              <View
                className={styles.menuItem}
                onClick={handleClearData}
              >
                <View className={`${styles.menuIcon} clear`}>🗑️</View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>清空所有数据</Text>
                  <Text className={styles.menuSubtitle}>清空业绩、绑定关系和日志</Text>
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            </View>
          )}

          {/* 通用菜单 */}
          <View className={styles.menuList}>
            <View
              className={styles.menuItem}
              onClick={() => navigateTo('/pages/logs/index')}
            >
              <View className={`${styles.menuIcon} logs`}>📝</View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>操作日志</Text>
                <Text className={styles.menuSubtitle}>查看系统操作记录</Text>
              </View>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          </View>

          {/* 退出登录 */}
          <View className={styles.logoutBtn} onClick={handleLogout}>
            退出登录
          </View>
        </>
      )}

      {/* 未登录/未绑定状态 */}
      {!isLogin && (
        <View className={styles.loginBtn} onClick={handleLogin}>
          微信登录 / 绑定身份
        </View>
      )}

      {/* 版本信息 */}
      <View className={styles.versionInfo}>
        网点业绩登记系统 V1.0.0
      </View>
    </View>
  );
};

export default MinePage;
