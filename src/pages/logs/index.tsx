import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import { callFunction } from '@/services/cloud';
import { timeAgo } from '@/utils/format';
import type { OperationLog } from '@/types';

const actionIcons: Record<string, string> = {
  submit: '📝',
  update: '✏️',
  login: '🔐',
  bind: '🔗',
  unbind: '🔓',
  export: '📊',
  delete: '🗑️'
};

const actionLabels: Record<string, string> = {
  submit: '提交业绩',
  update: '修改业绩',
  login: '登录系统',
  bind: '绑定身份',
  unbind: '解除绑定',
  export: '导出报表',
  delete: '删除记录'
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { list } = await callFunction<{ list: OperationLog[] }>('getOperationLogs', { limit: 50 });
      setLogs(list);
    } catch (err) {
      console.error('[LogsPage] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <View className={styles.pageContainer}>
      {loading ? (
        <View className={styles.loading}>加载中...</View>
      ) : logs.length === 0 ? (
        <View className={styles.emptyState}>
          <Text style={{ fontSize: '80rpx', display: 'block', marginBottom: '24rpx' }}>📋</Text>
          暂无操作日志
        </View>
      ) : (
        <ScrollView className={styles.logList} scrollY enhanced showScrollbar={false}>
          {logs.map(log => {
            const iconClass = log.action as keyof typeof actionIcons;
            return (
              <View key={log._id} className={styles.logItem}>
                <View className={`${styles.logIcon} ${iconClass}`}>
                  {actionIcons[log.action] || '📌'}
                </View>
                <View className={styles.logContent}>
                  <Text className={styles.logTitle}>
                    {actionLabels[log.action] || log.action}
                    {log.target && ` · ${log.target}`}
                  </Text>
                  {log.detail && (
                    <Text className={styles.logDetail}>{log.detail}</Text>
                  )}
                  <View className={styles.logMeta}>
                    <Text className={styles.logUser}>{log.userName}</Text>
                    <Text className={styles.logTime}>{timeAgo(log.createTime)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default LogsPage;
