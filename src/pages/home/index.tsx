import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Input, ScrollView, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import ProductInput from '@/components/ProductInput';
import { callFunction } from '@/services/cloud';
import { silentLogin } from '@/services/auth';
import { useUserStore } from '@/store/userStore';
import { PRODUCT_TYPES, PRODUCT_COLORS } from '@/types';
import { getToday } from '@/utils/format';
import type { PerformanceProducts, Performance } from '@/types';

interface ProductData {
  count: number;
  amount: number;
}

// 登记业绩可选日期范围：2026年9月1日 ~ 2026年12月31日，降序（最近的日期在前面）
const DATE_START = dayjs('2026-09-01');
const DATE_END = dayjs('2026-12-31');

function buildDateRange(): string[] {
  const range: string[] = [];
  let d = DATE_END;
  while (d.isAfter(DATE_START) || d.isSame(DATE_START, 'day')) {
    range.push(d.format('YYYY-MM-DD'));
    d = d.subtract(1, 'day');
  }
  return range;
}

// 日期范围是常量，只在模块加载时计算一次，避免每次 render 重新生成
const DATE_RANGE = buildDateRange();

function getTodayIndex(): number {
  const today = dayjs().format('YYYY-MM-DD');
  const idx = DATE_RANGE.indexOf(today);
  if (idx >= 0) return idx;
  // 今天不在范围内时，选最近的边界
  if (dayjs().isAfter(DATE_END)) return 0;
  return DATE_RANGE.length - 1;
}

const HomePage: React.FC = () => {
  const { user, isLogin } = useUserStore();
  const [date, setDate] = useState(getToday());
  const [dateIndex, setDateIndex] = useState(getTodayIndex());
  const [products, setProducts] = useState<Record<string, ProductData>>(() => {
    const init: Record<string, ProductData> = {};
    PRODUCT_TYPES.forEach(name => {
      init[name] = { count: 0, amount: 0 };
    });
    return init;
  });
  const [remark, setRemark] = useState('');
  const [existingRecord, setExistingRecord] = useState<Performance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 请求序号守卫：防止快速切换日期时旧响应覆盖新数据
  const latestRequestRef = useRef(0);

  // 检查当天是否已有提交
  // 身份由服务端按微信 openid 反查绑定关系得到，无需也不能传员工标识
  const checkTodayRecord = useCallback(async () => {
    if (!isLogin) return;
    const requestId = ++latestRequestRef.current;
    try {
      const { list } = await callFunction<{ list: Performance[] }>('getMyPerformances', {
        startDate: date,
        endDate: date
      });
      // 若在此期间又发起了新的日期查询，丢弃本次旧响应
      if (requestId !== latestRequestRef.current) return;
      const todayRecord = list.find(p => p.date === date);
      if (todayRecord) {
        setExistingRecord(todayRecord);
        const filled: Record<string, ProductData> = {};
        PRODUCT_TYPES.forEach(name => {
          const product = todayRecord.products?.[name as keyof typeof todayRecord.products];
          filled[name] = product ? { count: product.count, amount: 0 } : { count: 0, amount: 0 };
        });
        setProducts(filled);
        setRemark(todayRecord.remark || '');
      } else {
        setExistingRecord(null);
        const init: Record<string, ProductData> = {};
        PRODUCT_TYPES.forEach(name => {
          init[name] = { count: 0, amount: 0 };
        });
        setProducts(init);
        setRemark('');
      }
    } catch (err) {
      if (requestId !== latestRequestRef.current) return;
      console.error('[HomePage] checkTodayRecord error:', err);
    }
  }, [date, isLogin]);

  // 页面显示时先静默登录（openid 反查绑定），登录态变化后自动加载本人数据
  useDidShow(() => {
    if (!useUserStore.getState().isLogin) {
      silentLogin().catch((err) => {
        console.error('[HomePage] silent login error:', err);
      });
    }
  });

  useEffect(() => {
    checkTodayRecord();
  }, [date, isLogin, checkTodayRecord]);

  // 统计合计
  const totalCount = Object.values(products).reduce((sum, p) => sum + p.count, 0);

  // 修改产品数据（仅 count）
  const handleProductChange = useCallback((name: string, value: number) => {
    setProducts(prev => ({
      ...prev,
      [name]: {
        count: value,
        amount: 0
      }
    }));
  }, []);

  // 日期范围选项：2026-09-01 ~ 2026-12-31，降序（最近的日期在前面），模块级常量
  const dateRange = DATE_RANGE;

  // 日期选择
  const handleDateChange = useCallback((e: { detail: { value: string | number | (string | number)[] } }) => {
    const raw = e.detail.value;
    const idx = Number(Array.isArray(raw) ? raw[0] : raw) || 0;
    const selectedDate = dateRange[idx] || dateRange[0];
    setDate(selectedDate);
    setDateIndex(idx);
  }, []);

  // 未绑定 → 引导首次绑定
  const handleGoBind = useCallback(() => {
    Taro.navigateTo({ url: '/pages/bind/index' });
  }, []);

  // 提交：仅提交日期与业绩数据，员工身份由服务端按 openid 自动关联
  const handleSubmit = useCallback(async () => {
    if (!isLogin || !user) {
      Taro.showToast({ title: '请先绑定员工身份', icon: 'none' });
      handleGoBind();
      return;
    }

    if (totalCount === 0 && !remark) {
      Taro.showToast({ title: '请填写至少一项业绩', icon: 'none' });
      return;
    }

    // 确认弹窗：确保用户确认后再提交至后台
    const confirmed = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: '确认提交',
        content: `日期：${date}\n总笔数：${totalCount} 笔\n${existingRecord ? '将更新已有记录，' : ''}提交后数据将进入后台用于生成日报、周报、月报、年表。`,
        confirmText: '确认提交',
        cancelText: '再改改',
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) return;

    const productsData: PerformanceProducts = {};
    PRODUCT_TYPES.forEach(name => {
      const p = products[name];
      if (p.count > 0) {
        productsData[name as keyof PerformanceProducts] = { count: p.count, amount: 0 };
      }
    });

    setSubmitting(true);
    try {
      await callFunction('submitPerformance', {
        date,
        products: productsData,
        remark
      });
      Taro.showToast({
        title: existingRecord ? '修改成功' : '提交成功',
        icon: 'success'
      });
      checkTodayRecord();
    } catch (err) {
      console.error('[HomePage] submit error:', err);
      Taro.showToast({ title: err instanceof Error ? err.message : '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [isLogin, user, totalCount, products, date, remark, existingRecord, checkTodayRecord, handleGoBind]);

  // 未绑定状态：引导首次绑定
  if (!isLogin || !user) {
    return (
      <View className={styles.pageContainer}>
        <View className={styles.header}>
          <Text className={styles.greeting}>欢迎使用</Text>
          <Text className={styles.subtitle}>网点员工销售业绩登记系统</Text>
        </View>
        <View style={{ padding: '100rpx 32rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: '32rpx', color: '#A0AEC0', marginBottom: '48rpx', display: 'block' }}>
            首次使用请验证工号，绑定后自动识别您的员工身份
          </Text>
          <View
            onClick={handleGoBind}
            style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              padding: '24rpx 80rpx',
              borderRadius: '48rpx',
              fontSize: '32rpx',
              display: 'inline-block'
            }}
          >
            前往绑定员工身份
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.pageContainer}>
      {/* 顶部欢迎区 */}
      <View className={styles.header}>
        <Text className={styles.greeting}>你好，{user.name} 👋</Text>
        <Text className={styles.subtitle}>{date === getToday() ? '今天也要加油哦！' : `正在填写 ${date} 的业绩`}</Text>
      </View>

      {/* 当前登记人（身份自动识别，不可手动选择） */}
      <View className={styles.dateSelector}>
        <View>
          <Text className={styles.dateLabel}>当前登记人</Text>
          <View style={{ display: 'flex', alignItems: 'center', marginTop: '8rpx' }}>
            <Text className={styles.dateValue}>{user.name}</Text>
            {user.subRole === 'yitang' && <Text className={styles.dateToday}>厅堂主管</Text>}
          </View>
        </View>
        <Text style={{ color: '#16A34A', fontSize: '32rpx' }}>✓</Text>
      </View>

      {/* 日期选择器 */}
      <Picker
        mode='selector'
        range={dateRange}
        value={dateIndex}
        onChange={handleDateChange}
      >
        <View className={styles.dateSelector}>
          <View>
            <Text className={styles.dateLabel}>选择日期</Text>
            <View style={{ display: 'flex', alignItems: 'center', marginTop: '8rpx' }}>
              <Text className={styles.dateValue}>{date}</Text>
              {date === getToday() && <Text className={styles.dateToday}>今天</Text>}
            </View>
          </View>
          <Text style={{ color: '#94A3B8', fontSize: '28rpx' }}>▾</Text>
        </View>
      </Picker>

      {/* 产品列表 */}
      <Text className={styles.sectionTitle}>产品明细</Text>
      <ScrollView
        className={styles.productList}
        scrollY
        enhanced
        showScrollbar={false}
      >
        {PRODUCT_TYPES.map(name => (
          <ProductInput
            key={name}
            name={name}
            count={products[name]?.count || 0}
            color={PRODUCT_COLORS[name]}
            onChange={(value) => handleProductChange(name, value)}
          />
        ))}
      </ScrollView>

      {/* 备注 */}
      <View className={styles.remarkSection}>
        <Input
          className={styles.remarkInput}
          type='text'
          placeholder='添加备注（可选）'
          value={remark}
          onInput={(e) => setRemark(e.detail.value)}
        />
      </View>

      {/* 底部操作栏 */}
      <View className={styles.bottomBar}>
        <View className={styles.totalDisplay}>
          <Text className={styles.totalLabel}>合计</Text>
          <Text className={styles.totalNumber}>{totalCount}</Text>
          <Text className={styles.totalUnit}>笔</Text>
        </View>
        <View
          className={styles.submitBtn}
          onClick={handleSubmit}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? '提交中...' : existingRecord ? '确认更新' : '确认提交'}
        </View>
      </View>
    </View>
  );
};

export default HomePage;
