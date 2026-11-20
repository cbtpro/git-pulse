/**
 * 视图管理器
 * 根据平台类型动态加载对应的视图组件
 */

import { FC, ComponentType, createElement } from 'react';
import { Platform } from '../utils/PlatformDetector';

/**
 * 视图组件接口
 */
export interface ViewComponent<P = any> {
  Mobile: ComponentType<P>;
  Desktop: ComponentType<P>;
}

/**
 * 视图管理器类
 */
class ViewManager {
  private views = new Map<string, ViewComponent>();

  /**
   * 注册视图
   */
  registerView<P>(name: string, mobile: ComponentType<P>, desktop: ComponentType<P>): void {
    this.views.set(name, { Mobile: mobile, Desktop: desktop });
  }

  /**
   * 获取视图组件
   */
  getView<P>(name: string, platform: Platform): ComponentType<P> {
    const view = this.views.get(name);
    if (!view) {
      throw new Error(`View "${name}" not found`);
    }
    return platform === 'mobile' ? view.Mobile : view.Desktop;
  }

  /**
   * 创建平台适配组件
   */
  createAdaptiveComponent<P extends Record<string, any>>(
    name: string,
    mobile: ComponentType<P>,
    desktop: ComponentType<P>
  ): FC<{ platform: Platform }> {
    this.registerView(name, mobile, desktop);

    const AdaptiveComponent: FC<{ platform: Platform }> = ({ platform }) => {
      const Component = this.getView<P>(name, platform);
      return createElement(Component, {} as P);
    };

    return AdaptiveComponent;
  }
}

// 导出单例
export const viewManager = new ViewManager();
