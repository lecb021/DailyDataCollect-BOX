import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import { callFunction } from '@/services/cloud';
import { silentLogin } from '@/services/auth';
import { useUserStore } from '@/store/userStore';
import { PRODUCT_COLORS } from '@/types';
import { timeAgo } from '@/utils/format';
import dayjs from 'dayjs';
import type { Performance, ProductType } from '@/types';

type FilterType = 'all' | 'week' | 'month';

const RecordPage: React.FC = () => {
  const { isLogin } = useUserStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [records, setRecords] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    if (!isLogin) {
      setLoading(false);
      setRecords([]);
      return;
    }

    setLoading(true);
    try {
      let startDate: string | undefined;
      const today = dayjs().format('YYYY-MM-DD');

      if (filter === 'week') {
        startDate = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
      } else if (filter === 'month') {
        startDate = dayjs().startOf('month').format('YYYY-MM-DD');
      }

      const { list } = await callFunction<{ list: Performance[] }>('getMyPerformances', {
        startDate,
        endDate: today
      });
      setRecords(list);
    } catch (err) {
      console.error('[RecordPage] load error:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [filter, isLogin]);

  useDidShow(() => {
    if (!useUserStore.getState().isLogin) {
      silentLogin().catch((err) => {
        console.error('[RecordPage] silent login error:', err);
      });
    }
    loadRecords();
  });

  useEffect(() => {
    loadRecords();
  }, [filter, isLogin, loadRecords]);

  // 汇总统计
  const totalCount = records.reduce((sum, r) => {
    return sum + Object.values(r.products || {}).reduce((s, p) => s + (p?.count || 0), 0);
  }, 0);

  // 跳转到详情
  const handleViewDetail = (id?: string) => {
    if (id) {
      Taro.navigateTo({ url: `/pages/record-detail/index?id=${id}` });
    }
  };

  // 未登录
  if (!isLogin) {
    return (
      <View className={styles.pageContainer}>
        <EmptyState
          title='请先绑定员工身份'
          description='绑定工号后查看您的历史业绩记录'
          actionText='去绑定'
          onAction={() => Taro.navigateTo({ url: '/pages/bind/index' })}
        />
      </View>
    );
  }

  return (
    <View className={styles.pageContainer}>
      {/* 筛选栏 */}
      <View className={styles.filterBar}>
        <View
          className={`${styles.filterChip} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </View>
        <View
          className={`${styles.filterChip} ${filter === 'week' ? styles.active : ''}`}
          onClick={() => setFilter('week')}
        >
          本周
        </View>
        <View
          className={`${styles.filterChip} ${filter === 'month' ? styles.active : ''}`}
          onClick={() => setFilter('month')}
        >
          本月
        </View>
      </View>

      {/* 汇总统计 */}
      <View className={styles.summaryBar}>
        <View className={styles.summaryItem}>
          <Text className={styles.summaryValue}>{records.length}</Text>
          <Text className={styles.summaryLabel}>提交天数</Text>
        </View>
        <View className={styles.summaryItem}>
          <Text className={styles.summaryValue}>{totalCount}</Text>
          <Text className={styles.summaryLabel}>总笔数</Text>
        </View>
      </View>

      {/* 记录列表 */}
      {loading ? (
        <View style={{ padding: '100rpx', textAlign: 'center', color: '#A0AEC0' }}>加载中...</View>
      ) : records.length === 0 ? (
        <EmptyState
          title='暂无业绩记录'
          description='快去录入今日业绩吧'
          actionText='去录入'
          onAction={() => Taro.switchTab({ url: '/pages/home/index' })}
        />
      ) : (
        <ScrollView className={styles.recordList} scrollY enhanced showScrollbar={false}>
          {records.map(record => {
            // 计算单条记录的统计
            const count = Object.values(record.products || {}).reduce(
              (s, p) => s + (p?.count || 0), 0
            );
            // 有数据的产品列表
            const productEntries = Object.entries(record.products || {}).filter(
              ([, v]) => v && v.count > 0
            );

            return (
              <View
                key={record._id}
                className={styles.recordCard}
                onClick={() => handleViewDetail(record._id)}
              >
                <View className={styles.recordHeader}>
                  <Text className={styles.recordDate}>{record.date}</Text>
                  <Text className={styles.recordStatus}>已提交</Text>
                </View>
                <View className={styles.recordStats}>
                  <View className={styles.recordStat}>
                    <Text className={styles.recordStatLabel}>笔数</Text>
                    <Text className={styles.recordStatValue}>{count}</Text>
                  </View>
                </View>
                {productEntries.length > 0 && (
                  <View className={styles.productTags}>
                    {productEntries.slice(0, 6).map(([name]) => {
                      const color = PRODUCT_COLORS[name as ProductType];
                      return (
                        <Text
                          key={name}
                          className={styles.productTag}
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {name}
                        </Text>
                      );
                    })}
                    {productEntries.length > 6 && (
                      <Text className={styles.productTag}>+{productEntries.length - 6}</Text>
                    )}
                  </View>
                )}
                <View className={styles.recordFooter}>
                  <Text className={styles.recordTime}>
                    {record.updateTime ? timeAgo(record.updateTime) : ''}
                  </Text>
                  <Text className={styles.editLink}>查看详情 →</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default RecordPage;
