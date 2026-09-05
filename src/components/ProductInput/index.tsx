import React from 'react';
import { View, Text, Input } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface ProductInputProps {
  name: string;
  count: number;
  onChange: (value: number) => void;
  color: { bg: string; text: string };
  disabled?: boolean;
}

const ProductInput: React.FC<ProductInputProps> = ({
  name,
  count,
  onChange,
  color,
  disabled
}) => {
  return (
    <View className={classnames(styles.productCard, disabled && styles.disabled)}>
      <View className={styles.productHeader}>
        <View className={styles.productTag} style={{ backgroundColor: color.bg, color: color.text }}>
          <Text className={styles.productName}>{name}</Text>
        </View>
        <Input
          className={styles.input}
          type='number'
          value={String(count)}
          placeholder='0'
          disabled={disabled}
          onInput={(e) => onChange(Number(e.detail.value) || 0)}
        />
      </View>
    </View>
  );
};

export default ProductInput;
