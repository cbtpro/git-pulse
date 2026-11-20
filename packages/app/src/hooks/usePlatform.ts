/**
 * 响应式 Hook
 * 用于在组件中获取平台信息并监听变化
 */

import { useState, useEffect } from 'react';
import { platformDetector, type PlatformInfo, type Platform, type DeviceOS } from '../utils/PlatformDetector';

/**
 * 获取平台信息 Hook
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(
    platformDetector.getPlatformInfo()
  );

  useEffect(() => {
    // 监听窗口大小变化
    const unsubscribe = platformDetector.onWindowResize((info) => {
      setPlatformInfo(info);
    });

    return unsubscribe;
  }, []);

  return platformInfo;
}

/**
 * 检查是否为特定平台
 */
export function useIsPlatform(platform: Platform): boolean {
  const platformInfo = usePlatform();
  return platformInfo.platform === platform;
}

/**
 * 检查是否为特定操作系统
 */
export function useIsOS(os: DeviceOS): boolean {
  const platformInfo = usePlatform();
  return platformInfo.os === os;
}

/**
 * 获取屏幕大小分类
 */
export function useScreenSize(): 'small' | 'medium' | 'large' {
  const [screenSize, setScreenSize] = useState<'small' | 'medium' | 'large'>(
    platformDetector.getScreenSize()
  );

  useEffect(() => {
    const unsubscribe = platformDetector.onWindowResize(() => {
      setScreenSize(platformDetector.getScreenSize());
    });

    return unsubscribe;
  }, []);

  return screenSize;
}

/**
 * 获取是否为移动设备
 */
export function useIsMobile(): boolean {
  return useIsPlatform('mobile');
}

/**
 * 获取是否为桌面设备
 */
export function useIsDesktop(): boolean {
  return useIsPlatform('desktop');
}

/**
 * 获取是否为原生应用
 */
export function useIsNative(): boolean {
  const platformInfo = usePlatform();
  return platformInfo.isNative;
}

/**
 * 条件渲染 Hook - 根据平台条件渲染不同的内容
 */
export function useConditionalRender(platform: Platform): boolean {
  return useIsPlatform(platform);
}
