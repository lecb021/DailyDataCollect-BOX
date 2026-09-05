import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { callFunction } from '@/services/cloud';
import { useUserStore } from '@/store/userStore';
import type { User } from '@/types';

// ============================================
// 首次绑定页
// 微信 openid 与员工一一绑定：
// 仅输入姓名，服务端按姓名查花名册验证身份
// 验证通过后写入绑定表，此后自动识别身份，无需手动选择
// ============================================

// 姓名：2-4个中文字符
const NAME_REGEX = /^[\u4e00-\u9fa5]{2,4}$/;

// 姓名清洗：去除中间空格（用户可能误输入）
function cleanName(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

// 姓名实时校验
function validateName(value: string): string | null {
  if (!value) return null;
  const cleaned = cleanName(value);
  if (cleaned.length === 0) return null;
  if (cleaned.length < 2) {
    return '姓名至少2个字';
  }
  if (!NAME_REGEX.test(cleaned)) {
    return '姓名应为2-4个中文字符';
  }
  return null;
}

const BindPage: React.FC = () => {
  const { setUser } = useUserStore();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = useMemo(() => validateName(name), [name]);

  const canSubmit = useMemo(() => {
    return NAME_REGEX.test(cleanName(name));
  }, [name]);

  // 姓名输入：过滤非中文字符
  const handleNameInput = useCallback((e: { detail: { value: string } }) => {
    const raw = e.detail.value;
    const filtered = raw.replace(/[^\u4e00-\u9fa5\s]/g, '').slice(0, 5);
    setName(filtered);
  }, []);

  const handleNameBlur = useCallback(() => {
    setTouched(true);
    if (name) {
      setName(cleanName(name));
    }
  }, [name]);

  const handleBind = async () => {
    setTouched(true);

    const cleanedName = cleanName(name);
    if (!NAME_REGEX.test(cleanedName)) {
      Taro.showToast({ title: '姓名应为2-4个中文字符', icon: 'none' });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: '绑定中...', mask: true });
    try {
      const res = await callFunction<{ bound: boolean; user: User }>('bindEmployee', {
        name: cleanedName
      });
      Taro.hideLoading();

      if (res?.bound && res.user) {
        setUser(res.user);
        Taro.showToast({ title: '绑定成功', icon: 'success' });
        setTimeout(() => {
          const pages = Taro.getCurrentPages();
          if (pages.length > 1) {
            Taro.navigateBack();
          } else {
            Taro.switchTab({ url: '/pages/home/index' });
          }
        }, 800);
      } else {
        Taro.showToast({ title: '绑定失败，请重试', icon: 'none' });
      }
    } catch (err) {
      Taro.hideLoading();
      Taro.showToast({
        title: err instanceof Error ? err.message : '绑定失败，请重试',
        icon: 'none',
        duration: 2500
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className={styles.pageContainer} scrollY>
      {/* 顶部说明 */}
      <View className={styles.header}>
        <View className={styles.logoIcon}>🔐</View>
        <Text className={styles.headerTitle}>员工身份绑定</Text>
        <Text className={styles.headerDesc}>
          首次使用请输入您的姓名进行身份验证。系统将把您的微信账号与员工信息绑定，绑定后自动识别身份，无需手动选择。
        </Text>
      </View>

      {/* 绑定表单 */}
      <View className={styles.formCard}>
        <View className={styles.formItem}>
          <Text className={styles.formLabel}>员工姓名</Text>
          <Input
            className={`${styles.formInput} ${touched && nameError ? styles.inputError : ''}`}
            type='text'
            placeholder='请输入您的中文姓名'
            maxlength={5}
            value={name}
            onInput={handleNameInput}
            onBlur={handleNameBlur}
          />
          {touched && nameError && (
            <Text className={styles.errorText}>{nameError}</Text>
          )}
        </View>

        <View
          className={`${styles.bindBtn} ${(submitting || !canSubmit) ? styles.bindBtnDisabled : ''}`}
          onClick={(submitting || !canSubmit) ? undefined : handleBind}
        >
          {submitting ? '绑定中...' : '确认绑定'}
        </View>
      </View>

      {/* 注意事项 */}
      <View className={styles.tipsCard}>
        <Text className={styles.tipsTitle}>温馨提示</Text>
        <Text className={styles.tipsItem}>· 姓名须为2-4个中文字符，与花名册一致</Text>
        <Text className={styles.tipsItem}>· 每位员工仅可绑定一个微信账号</Text>
        <Text className={styles.tipsItem}>· 如提示"已被其他微信账号绑定"，请联系管理员解绑</Text>
        <Text className={styles.tipsItem}>· 绑定后业绩将自动登记到您的名下，无需选择人员</Text>
      </View>
    </ScrollView>
  );
};

export default BindPage;
