import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useUserStore } from '@/store/userStore';
import { callFunction } from '@/services/cloud';
import type { EmployeeWithBind } from '@/types';

const EmployeePage: React.FC = () => {
  const { isAdmin, user } = useUserStore();
  const [employees, setEmployees] = useState<EmployeeWithBind[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { list } = await callFunction<{ list: EmployeeWithBind[] }>('getEmployees');
      setEmployees(list || []);
    } catch (err) {
      console.error('[EmployeePage] load error:', err);
      Taro.showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
    }
  }, [isAdmin, loadEmployees]);

  // 管理员解绑员工微信（解绑后该员工可在自己手机上重新绑定）
  const handleUnbind = useCallback((emp: EmployeeWithBind) => {
    Taro.showModal({
      title: '解除微信绑定',
      content: `确定解除 ${emp.name}（工号 ${emp.employeeNo}）的微信绑定吗？解绑后该员工需重新验证工号绑定。`,
      confirmText: '解除绑定',
      confirmColor: '#DC2626',
      success: async (res) => {
        if (!res.confirm) return;
        Taro.showLoading({ title: '处理中...', mask: true });
        try {
          await callFunction('adminUnbind', { employeeNo: emp.employeeNo });
          Taro.hideLoading();
          Taro.showToast({ title: '已解除绑定', icon: 'success' });
          loadEmployees();
        } catch (err) {
          Taro.hideLoading();
          Taro.showToast({
            title: err instanceof Error ? err.message : '操作失败',
            icon: 'none'
          });
        }
      }
    });
  }, [loadEmployees]);

  if (!isAdmin) {
    return (
      <View className={styles.pageContainer}>
        <View style={{
          padding: '100rpx 32rpx',
          textAlign: 'center',
          color: '#A0AEC0',
          background: '#FEF3C7',
          borderRadius: '12rpx',
          margin: '32rpx'
        }}>
          🔒 仅管理员可访问员工管理
        </View>
      </View>
    );
  }

  const admins = employees.filter(e => e.role === 'admin');
  const staffs = employees.filter(e => e.role === 'staff');
  const boundCount = employees.filter(e => e.bindStatus === 'bound').length;

  return (
    <View className={styles.pageContainer}>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>网点员工管理</Text>
        <Text className={styles.headerSubtitle}>共 {employees.length} 名员工 · 已绑定微信 {boundCount} 人</Text>
        <View className={styles.statsRow}>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{admins.length}</Text>
            <Text className={styles.statBoxLabel}>管理员</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{staffs.length}</Text>
            <Text className={styles.statBoxLabel}>普通员工</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{boundCount}</Text>
            <Text className={styles.statBoxLabel}>已绑定</Text>
          </View>
        </View>
      </View>

      {/* 员工列表 */}
      {loading ? (
        <View className={styles.emptyState}>加载中...</View>
      ) : employees.length === 0 ? (
        <View className={styles.emptyState}>暂无员工</View>
      ) : (
        <ScrollView className={styles.employeeList} scrollY enhanced showScrollbar={false}>
          {employees.map(emp => {
            const isBound = emp.bindStatus === 'bound';
            const isSelf = !!user && emp.employeeNo === user.employeeNo;
            return (
              <View key={emp.employeeNo} className={styles.employeeCard}>
                <View className={`${styles.employeeAvatar} ${emp.role}`}>
                  {emp.name[0]}
                </View>
                <View className={styles.employeeInfo}>
                  <View className={styles.employeeNameRow}>
                    <Text className={styles.employeeName}>{emp.name}</Text>
                    <Text className={`${styles.roleBadge} ${emp.role}`}>
                      {emp.role === 'admin' ? '管理员' : '员工'}
                    </Text>
                    {emp.subRole === 'yitang' && (
                      <Text className={styles.roleBadgeYitang}>厅堂主管</Text>
                    )}
                  </View>
                  <Text className={styles.employeeMeta}>
                    {emp.department || '零售业务部'}
                  </Text>
                  <View className={styles.bindRow}>
                    <Text className={`${styles.bindBadge} ${isBound ? 'bound' : 'unbound'}`}>
                      {isBound ? '✓ 微信已绑定' : '○ 未绑定'}
                    </Text>
                    {isBound && emp.bindTime ? (
                      <Text className={styles.bindTime}>
                        绑定于 {dayjs(emp.bindTime).format('YYYY-MM-DD')}
                      </Text>
                    ) : (
                      <Text className={styles.bindTime}>待员工首次登录绑定</Text>
                    )}
                  </View>
                </View>
                {/* 解绑按钮：已绑定且不是当前登录管理员本人时显示 */}
                {isBound && !isSelf && (
                  <View
                    className={styles.unbindBtn}
                    onClick={() => handleUnbind(emp)}
                  >
                    解除绑定
                  </View>
                )}
                {isSelf && (
                  <Text className={styles.selfTag}>当前账号</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default EmployeePage;
