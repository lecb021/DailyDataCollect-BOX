import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import dayjs from 'dayjs';
import { callFunction } from '@/services/cloud';
import { generateReportCSV, generateDetailCSV, saveCSVFile, buildFileName } from '@/utils/excel';
import { getToday, getMonthStart, getMonthEnd, getWeekStart, getWeekEnd } from '@/utils/format';
import type { Performance, ReportData } from '@/types';

type ReportType = 'day' | 'week' | 'month' | 'year' | 'custom';
type ExportType = 'summary' | 'detail';

const ExportPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('month');
  const [exportType, setExportType] = useState<ExportType>('summary');
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getMonthEnd());
  const [exporting, setExporting] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportData | null>(null);
  const [previewList, setPreviewList] = useState<Performance[]>([]);

  const loadPreview = async () => {
    try {
      if (exportType === 'summary' && reportType !== 'custom') {
        const data = await callFunction<ReportData>('getReport', { type: reportType });
        setPreviewReport(data);
      } else {
        const { list } = await callFunction<{ list: Performance[] }>('getAllPerformances', {
          startDate,
          endDate
        });
        setPreviewList(list);
      }
    } catch (err) {
      console.error('[ExportPage] preview error:', err);
    }
  };

  useDidShow(() => {
    loadPreview();
  });

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    if (type === 'day') {
      setStartDate(getToday());
      setEndDate(getToday());
    } else if (type === 'week') {
      setStartDate(getWeekStart());
      setEndDate(getWeekEnd());
    } else if (type === 'month') {
      setStartDate(getMonthStart());
      setEndDate(getMonthEnd());
    } else if (type === 'year') {
      setStartDate(dayjs().startOf('year').format('YYYY-MM-DD'));
      setEndDate(dayjs().endOf('year').format('YYYY-MM-DD'));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let content = '';
      let filename = '';

      if (exportType === 'summary' && reportType !== 'custom') {
        const data = await callFunction<ReportData>('getReport', { type: reportType });
        content = generateReportCSV(data);
        const typeLabel = { day: '日报', week: '周报', month: '月报', year: '年表' }[reportType];
        filename = buildFileName('report', typeLabel);
      } else {
        const { list } = await callFunction<{ list: Performance[] }>('getAllPerformances', {
          startDate,
          endDate
        });
        content = generateDetailCSV(list, { start: startDate, end: endDate });
        filename = buildFileName('detail', `${startDate}_${endDate}`);
      }

      await saveCSVFile(filename, content);

      Taro.showToast({ title: '导出成功', icon: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      console.error('[ExportPage] export error:', err);
      Taro.showToast({ title: `导出失败: ${msg}`, icon: 'none', duration: 3000 });
    } finally {
      setExporting(false);
    }
  };

  // 计算预览数据
  const getPreviewInfo = () => {
    if (exportType === 'summary' && previewReport) {
      return `总笔数 ${previewReport.summary.totalCount}，提交 ${previewReport.summary.submittedDays} 天`;
    }
    if (previewList.length > 0) {
      const totalCount = previewList.reduce((sum, p) => {
        return sum + Object.values(p.products || {}).reduce((s, v) => s + (v?.count || 0), 0);
      }, 0);
      return `${previewList.length} 条记录，共 ${totalCount} 笔`;
    }
    return null;
  };

  return (
    <View className={styles.pageContainer}>
      {/* 报表类型 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>选择报表类型</Text>
        <View className={styles.typeList}>
          <View
            className={`${styles.typeItem} ${reportType === 'day' ? styles.active : ''}`}
            onClick={() => handleReportTypeChange('day')}
          >
            <Text className={styles.typeIcon}>📅</Text>
            <Text className={styles.typeName}>日报</Text>
          </View>
          <View
            className={`${styles.typeItem} ${reportType === 'week' ? styles.active : ''}`}
            onClick={() => handleReportTypeChange('week')}
          >
            <Text className={styles.typeIcon}>📆</Text>
            <Text className={styles.typeName}>周报</Text>
          </View>
          <View
            className={`${styles.typeItem} ${reportType === 'month' ? styles.active : ''}`}
            onClick={() => handleReportTypeChange('month')}
          >
            <Text className={styles.typeIcon}>📊</Text>
            <Text className={styles.typeName}>月报</Text>
          </View>
          <View
            className={`${styles.typeItem} ${reportType === 'year' ? styles.active : ''}`}
            onClick={() => handleReportTypeChange('year')}
          >
            <Text className={styles.typeIcon}>📈</Text>
            <Text className={styles.typeName}>年表</Text>
          </View>
        </View>
      </View>

      {/* 导出内容 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>导出内容</Text>
        <View className={styles.formatList}>
          <View
            className={`${styles.formatItem} ${exportType === 'summary' ? styles.active : ''}`}
            onClick={() => setExportType('summary')}
          >
            📈 汇总报表
          </View>
          <View
            className={`${styles.formatItem} ${exportType === 'detail' ? styles.active : ''}`}
            onClick={() => setExportType('detail')}
          >
            📋 明细报表
          </View>
        </View>
      </View>

      {/* 预览信息 */}
      {getPreviewInfo() && (
        <View className={styles.previewCard}>
          <Text className={styles.previewTitle}>📤 导出预览</Text>
          <Text className={styles.previewInfo}>
            范围：{reportType === 'custom' ? `${startDate} ~ ${endDate}` : `选定${{ day: '今日', week: '本周', month: '本月', year: '本年' }[reportType]}`}
          </Text>
          <Text className={styles.previewInfo}>内容：{getPreviewInfo()}</Text>
        </View>
      )}

      {/* 导出按钮 */}
      <View className={styles.exportActions}>
        <View
          className={styles.exportBtn}
          onClick={handleExport}
          style={{ opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? '导出中...' : '📥 生成并下载 CSV 文件'}
        </View>
        <Text className={styles.hint}>
          * Excel 可直接打开 CSV 文件，建议使用 UTF-8 编码
        </Text>
      </View>
    </View>
  );
};

export default ExportPage;
