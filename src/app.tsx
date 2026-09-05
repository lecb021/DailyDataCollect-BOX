import React, { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { silentLogin } from './services/auth';
import './app.scss';

function App(props: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化云开发
    if (process.env.TARO_ENV === 'weapp') {
      try {
        Taro.cloud.init({
          env: '', // 部署后填入真实环境ID
          traceUser: true
        });
        console.log('[App] Cloud initialized');
      } catch (e) {
        console.error('[App] Cloud init failed:', e);
      }
    }

    // 启动静默登录：通过微信 openid 反查员工绑定关系，自动识别身份
    // 未绑定者不强制跳转，由各业务页引导至绑定页
    silentLogin().catch((err) => {
      console.error('[App] Silent login failed:', err);
    });
  }, []);

  useDidShow(() => {
    console.log('[App] onShow');
  });

  useDidHide(() => {
    console.log('[App] onHide');
  });

  return props.children;
}

export default App;
