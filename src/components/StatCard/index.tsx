import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  highlight?: boolean;
  trend?: { value: number; isUp: boolean };
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  highlight,
  trend
}) => {
  return (
    <View className={highlight ? `${styles.statCard} ${styles.highlight}` : styles.statCard}>
      <View className={styles.statHeader}>
        {icon && <Text className={styles.icon}>{icon}</Text>}
        <Text className={styles.label}>{label}</Text>
      </View>
      <View className={styles.valueRow}>
        <Text className={styles.value}>{value}</Text>
        {unit && <Text className={styles.unit}>{unit}</Text>}
      </View>
      {trend && (
        <View className={styles.trendRow}>
          <Text className={trend.isUp ? styles.trendUp : styles.trendDown}>
            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </Text>
        </View>
      )}
    </View>
  );
};

export default StatCard;
