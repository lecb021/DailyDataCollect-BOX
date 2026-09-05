import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { callFunction } from '@/services/cloud';
import { silentLogin } from '@/services/auth';
import { useUserStore } from '@/store/userStore';
import { PRODUCT_TYPES } from '@/types';
import type { ReportData } from '@/types';

type ReportType = 'day' | 'week' | 'month' | 'year';

const ReportPage: React.FC = () => {
  const { user, isLogin } = useUserStore();
  const [activeTab, setActiveTab] = useState<ReportType>('day');
  const [targetDate, setTargetDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!isLogin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await callFunction<ReportData>('getReport', {
        type: activeTab,
        targetDate
      });
      setReport(data);
    } catch (err) {
      console.error('[ReportPage] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isLogin, targetDate]);

  // 关键修复：日期 / Tab / 登录状态变化时自动刷新数据
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useDidShow(() => {
    if (!useUserStore.getState().isLogin) {
      silentLogin().catch((err) => {
        console.error('[ReportPage] silent login error:', err);
      });
    }
    loadReport();
  });

  // Tab 切换：不再重置日期，保留用户选择
  const handleTabSwitch = (tab: ReportType) => {
    setActiveTab(tab);
  };

  // 日期选择
  const handleDateChange = (e: { detail: { value: string | number | (string | number)[] } }) => {
    const v = e.detail.value;
    const dateStr = typeof v === 'string' ? v : String(v);
    setTargetDate(dateStr);
  };

  // 导出
  const handleExport = () => {
    Taro.navigateTo({ url: '/pages/export/index' });
  };

  if (!isLogin || !user) {
    return (
      <View className={styles.pageContainer}>
        <View style={{ padding: '100rpx', textAlign: 'center', color: '#A0AEC0' }}>
          请先绑定员工身份查看报表
        </View>
        <View style={{ textAlign: 'center' }}>
          <View
            onClick={() => Taro.navigateTo({ url: '/pages/bind/index' })}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              padding: '24rpx 80rpx',
              borderRadius: '48rpx',
              fontSize: '32rpx'
            }}
          >
            去绑定
          </View>
        </View>
      </View>
    );
  }

  // 生成 Excel 风格的日期标签（如"8月17日"）
  const excelDateLabel = (): string => {
    const d = dayjs(targetDate);
    if (activeTab === 'day') return `${d.month() + 1}月${d.date()}日`;
    if (activeTab === 'week') {
      const weekStart = d.startOf('week').add(1, 'day');
      const weekEnd = weekStart.add(6, 'day');
      return `${weekStart.month() + 1}月${weekStart.date()}日 ~ ${weekEnd.month() + 1}月${weekEnd.date()}日`;
    }
    if (activeTab === 'year') return `${d.format('YYYY年')}`;
    return `${d.format('YYYY年')}${d.month() + 1}月`;
  };

  const dateColumns = PRODUCT_TYPES.length; // 11
  const nameColWidth = 140; // 姓名列宽
  const numColWidth = 80; // 数字列宽

  const totalTableWidth = nameColWidth + numColWidth * dateColumns;

  return (
    <View className={styles.pageContainer}>
      {/* Tab 切换 */}
      <View className={styles.tabBar}>
        <View
          className={`${styles.tabItem} ${activeTab === 'day' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('day')}
        >日报</View>
        <View
          className={`${styles.tabItem} ${activeTab === 'week' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('week')}
        >周报</View>
        <View
          className={`${styles.tabItem} ${activeTab === 'month' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('month')}
        >月报</View>
        <View
          className={`${styles.tabItem} ${activeTab === 'year' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('year')}
        >年表</View>
      </View>

      {/* 日期选择器 */}
      <View className={styles.dateBar}>
        <Text className={styles.dateLabel}>选择日期:</Text>
        <Picker
          mode='date'
          value={targetDate}
          onChange={handleDateChange}
        >
          <View className={styles.datePickerBtn}>
            <Text>{dayjs(targetDate).format('YYYY-MM-DD')}</Text>
            <Text className={styles.dateArrow}>›</Text>
          </View>
        </Picker>
        <View className={styles.exportActions}>
          <View className={styles.exportBtn} onClick={handleExport}>📊 导出</View>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: '100rpx', textAlign: 'center', color: '#A0AEC0' }}>加载中...</View>
      ) : report ? (
        <View className={styles.tableWrapper}>
          {/* 滑动提示 */}
          <View className={styles.scrollTipText}>
            <Text>← 左右滑动查看全部内容 →</Text>
          </View>

          {/* 左右渐变遮罩提示可滑动 */}
          <View className={styles.scrollHintLeft} />
          <View className={styles.scrollHintRight} />

          {/* 横向滚动表格 — 显示滚动条（滑动线） */}
          <ScrollView
            scrollX
            enhanced
            showScrollbar
            id='reportScrollArea'
            onScroll={() => {
              // H5 环境：通过 id 更新滑动轨道宽度
              if (typeof document !== 'undefined') {
                const el = document.getElementById('reportScrollArea') as HTMLElement | null;
                const bar = document.getElementById('reportTrackBar') as HTMLElement | null;
                if (el && bar) {
                  const maxScroll = el.scrollWidth - el.clientWidth;
                  const pct = maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0;
                  bar.style.width = `${Math.max(10, pct)}%`;
                }
              }
            }}
            className={styles.horizontalScroll}
          >
            <View style={{ width: totalTableWidth }}>
              {/* 第1行：Excel 风格日期标题（跨全表格） */}
              <View className={styles.dateTitleRow}>
                <Text className={styles.dateTitleText}>{excelDateLabel()}</Text>
              </View>

              {/* 第2行：产品列表头（第一列空白，产品名直接开始，对齐 Excel） */}
              <View className={styles.tableHeadRow}>
                <View
                  className={`${styles.tableCell} ${styles.headCell}`}
                  style={{ width: nameColWidth }}
                >
                </View>
                {PRODUCT_TYPES.map((prod, idx) => (
                  <View
                    key={idx}
                    className={`${styles.tableCell} ${styles.headCell}`}
                    style={{ width: numColWidth }}
                  >
                    <Text>{prod}</Text>
                  </View>
                ))}
              </View>

              {/* 员工数据行 */}
              {report.employeeMatrix.map((emp) => (
                <View
                  key={emp.employeeId}
                  className={`${styles.tableRow} ${emp.subRole === 'yitang' ? styles.rowYitang : ''}`}
                >
                  <View
                    className={`${styles.tableCell} ${styles.nameCol} ${styles.empName}`}
                    style={{ width: nameColWidth }}
                  >
                    <Text>{emp.userName}</Text>
                  </View>
                  {PRODUCT_TYPES.map((_, idx) => (
                    <View
                      key={idx}
                      className={`${styles.tableCell} ${styles.numCell}`}
                      style={{ width: numColWidth }}
                    >
                      <Text>{emp.products[idx] || ''}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {/* 累计行 */}
              <View className={`${styles.tableRow} ${styles.totalsRow}`}>
                <View
                  className={`${styles.tableCell} ${styles.nameCol} ${styles.totalsLabel}`}
                  style={{ width: nameColWidth }}
                >
                  <Text>累计数</Text>
                </View>
                {PRODUCT_TYPES.map((_, idx) => (
                  <View
                    key={idx}
                    className={`${styles.tableCell} ${styles.numCell} ${styles.totalsCell}`}
                    style={{ width: numColWidth }}
                  >
                    <Text>{report.totals.products[idx] || ''}</Text>
                  </View>
                ))}
              </View>

              {/* 负责人信息行 */}
              <View className={styles.supervisorsRow}>
                <Text className={styles.supervisorText}>
                  厅堂主管：<Text className={styles.supervisorName}>{report.supervisors.yitang}</Text>
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* 自定义滑动轨道线 — 显示当前滚动位置 */}
          <View className={styles.scrollTrack}>
            <View className={styles.scrollTrackFill}>
              <View
                className={styles.scrollTrackBar}
                id='reportTrackBar'
              />
            </View>
          </View>

          {/* 底部汇总卡片 */}
          <View className={styles.summaryFooter}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{report.summary.submittedDays}</Text>
              <Text className={styles.summaryLabel}>提交天数</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{report.totals.totalCount}</Text>
              <Text className={styles.summaryLabel}>累计总笔数</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ padding: '100rpx', textAlign: 'center', color: '#A0AEC0' }}>暂无数据</View>
      )}
    </View>
  );
};

export default ReportPage;
