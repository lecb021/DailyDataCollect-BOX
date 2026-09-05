import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '还没有任何记录哦',
  actionText,
  onAction
}) => {
  return (
    <View className={styles.container}>
      <View className={styles.iconWrapper}>
        <Text className={styles.iconText}>📋</Text>
      </View>
      <Text className={styles.title}>{title}</Text>
      <Text className={styles.description}>{description}</Text>
      {actionText && onAction && (
        <View className={styles.actionBtn} onClick={onAction}>
          <Text className={styles.actionText}>{actionText}</Text>
        </View>
      )}
    </View>
  );
};

export default EmptyState;
