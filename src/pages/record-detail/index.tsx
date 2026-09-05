import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { callFunction } from '@/services/cloud';
import { PRODUCT_COLORS, PRODUCT_TYPES } from '@/types';
import { timeAgo } from '@/utils/format';
import type { Performance } from '@/types';

const RecordDetailPage: React.FC = () => {
  const [record, setRecord] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const { performance } = await callFunction<{ performance: Performance }>(
        'getPerformanceDetail',
        { id }
      );
      setRecord(performance);
    } catch (err) {
      console.error('[RecordDetailPage] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1] as any;
    const id = currentPage?.options?.id;
    if (id) {
      loadDetail(id);
    } else {
      // mock 数据：用本地存储的最近一条
      setLoading(false);
    }
  }, [loadDetail]);

  if (loading) {
    return (
      <View style={{ padding: '200rpx', textAlign: 'center', color: '#A0AEC0' }}>加载中...</View>
    );
  }

  if (!record) {
    return (
      <View style={{ padding: '200rpx', textAlign: 'center', color: '#A0AEC0' }}>
        记录不存在
      </View>
    );
  }

  // 统计
  const totalCount = Object.values(record.products || {}).reduce(
    (s, p) => s + (p?.count || 0), 0
  );

  // 所有产品（从类型定义获取，避免硬编码）

  return (
    <View className={styles.pageContainer}>
      {/* 头部卡片 */}
      <View className={styles.headerCard}>
        <View className={styles.dateRow}>
          <Text className={styles.dateText}>{record.date}</Text>
          <Text className={styles.statusText}>已提交</Text>
        </View>
        <View className={styles.statsRow}>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{totalCount}</Text>
            <Text className={styles.statLabel}>总笔数</Text>
          </View>
        </View>
      </View>

      {/* 产品明细 */}
      <Text className={styles.sectionTitle}>产品明细</Text>
      <View className={styles.productTable}>
        {PRODUCT_TYPES.map(name => {
          const product = record.products?.[name as keyof typeof record.products];
          const color = PRODUCT_COLORS[name];
          return (
            <View className={styles.productRow} key={name}>
              <View className={styles.productInfo}>
                <View className={styles.productDot} style={{ backgroundColor: color.text }} />
                <Text className={styles.productName}>{name}</Text>
              </View>
              <View className={styles.productData}>
                <Text className={styles.productStatValue}>{product?.count || 0}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 备注 */}
      {(record.remark || record.createTime || record.updateTime) && (
        <View className={styles.remarkSection}>
          {record.remark && (
            <>
              <Text className={styles.remarkTitle}>备注</Text>
              <Text className={styles.remarkContent}>{record.remark}</Text>
            </>
          )}
          {record.updateTime && (
            <Text className={styles.remarkTitle}>最近更新：{timeAgo(record.updateTime)}</Text>
          )}
        </View>
      )}

      {/* 底部编辑按钮 */}
      <View className={styles.bottomBar}>
        <View
          className={styles.editBtn}
          onClick={() => {
            Taro.switchTab({ url: '/pages/home/index' });
          }}
        >
          去修改业绩
        </View>
      </View>
    </View>
  );
};

export default RecordDetailPage;
