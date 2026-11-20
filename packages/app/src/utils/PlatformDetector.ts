/**
 * 平台检测工具
 * 用于检测当前运行环境并提供平台相关信息
 */

export type Platform = 'mobile' | 'desktop';
export type DeviceOS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  os: DeviceOS;
  isMobile: boolean;
  isDesktop: boolean;
  isNative: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
}

class PlatformDetector {
  private platformInfo: PlatformInfo | null = null;

  /**
   * 获取当前平台信息
   */
  getPlatformInfo(): PlatformInfo {
    if (!this.platformInfo) {
      this.platformInfo = this.detectPlatform();
    }
    return this.platformInfo;
  }

  /**
   * 检测当前平台
   */
  private detectPlatform(): PlatformInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // 检测操作系统
    const os = this.detectOS(userAgent, platform);
    
    // 检测是否为移动设备
    const isMobile = os === 'ios' || os === 'android' || this.isMobileDevice(userAgent);
    
    // 检测是否为原生应用 (Tauri)
    const isNative = this.isNativeApp();

    return {
      platform: isMobile ? 'mobile' : 'desktop',
      os,
      isMobile,
      isDesktop: !isMobile,
      isNative,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }

  /**
   * 检测操作系统
   */
  private detectOS(userAgent: string, platform: string): DeviceOS {
    // iPadOS can send a desktop Mac user agent, even in a full-width window.
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod') ||
        (platform.includes('mac') && navigator.maxTouchPoints > 1)) {
      return 'ios';
    }
    if (userAgent.includes('android')) {
      return 'android';
    }
    if (userAgent.includes('win') || platform.includes('win')) {
      return 'windows';
    }
    if (userAgent.includes('mac') || platform.includes('mac')) {
      return 'macos';
    }
    if (userAgent.includes('linux') || platform.includes('linux')) {
      return 'linux';
    }
    return 'unknown';
  }

  /**
   * 检测是否为移动设备
   */
  private isMobileDevice(userAgent: string): boolean {
    // 检查常见的移动设备标识
    const mobilePatterns = [
      /android/,
      /webos/,
      /iphone/,
      /ipad/,
      /ipod/,
      /blackberry/,
      /windows phone/,
      /opera mini/,
      /mobile/,
      /touch/,
    ];

    // 也可以通过屏幕宽度判断（备选方案）
    const isNarrowScreen = window.innerWidth <= 768;

    return mobilePatterns.some(pattern => pattern.test(userAgent)) || isNarrowScreen;
  }

  /**
   * 检测是否为原生应用 (Tauri)
   */
  private isNativeApp(): boolean {
    // 检查是否存在 Tauri API
    return !!(window as any).__TAURI__;
  }

  /**
   * 获取屏幕分类
   */
  getScreenSize(): 'small' | 'medium' | 'large' {
    const width = window.innerWidth;
    if (width < 480) return 'small';
    if (width < 1024) return 'medium';
    return 'large';
  }

  /**
   * 是否为特定平台
   */
  isPlatform(type: Platform): boolean {
    return this.getPlatformInfo().platform === type;
  }

  /**
   * 是否为特定操作系统
   */
  isOS(os: DeviceOS): boolean {
    return this.getPlatformInfo().os === os;
  }

  /**
   * 监听窗口大小变化
   */
  onWindowResize(callback: (info: PlatformInfo) => void): () => void {
    const handleResize = () => {
      this.platformInfo = null; // 重置缓存
      callback(this.getPlatformInfo());
    };

    window.addEventListener('resize', handleResize);

    // 返回取消监听函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }
}

// 导出单例
export const platformDetector = new PlatformDetector();

// 便捷方法导出
export const getPlatformInfo = () => platformDetector.getPlatformInfo();
export const isMobile = () => platformDetector.getPlatformInfo().isMobile;
export const isDesktop = () => platformDetector.getPlatformInfo().isDesktop;
export const isNative = () => platformDetector.getPlatformInfo().isNative;
export const getScreenSize = () => platformDetector.getScreenSize();
export const isPlatform = (type: Platform) => platformDetector.isPlatform(type);
export const isOS = (os: DeviceOS) => platformDetector.isOS(os);
export const onWindowResize = (callback: (info: PlatformInfo) => void) => 
  platformDetector.onWindowResize(callback);
