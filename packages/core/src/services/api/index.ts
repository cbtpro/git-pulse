/**
 * API 工厂和导出
 * 用于创建和管理 API 客户端实例
 */

import { GitHubApiClient, ApiConfig } from './interfaces/GitHubApiClient';
import { DirectGitHubApi } from './implementations/DirectGitHubApi';
import { BackendProxyApi } from './implementations/BackendProxyApi';

export type ApiImplementationType = 'direct' | 'backend' | 'mock';

class ApiFactory {
  private static instance: GitHubApiClient | null = null;
  private static implementationType: ApiImplementationType = 'direct';

  static createClient(
    type: ApiImplementationType = 'direct',
    config?: ApiConfig
  ): GitHubApiClient {
    switch (type) {
      case 'backend':
        return new BackendProxyApi(config);
      case 'direct':
      default:
        return new DirectGitHubApi(config);
    }
  }

  static getInstance(
    type?: ApiImplementationType,
    config?: ApiConfig
  ): GitHubApiClient {
    if (!ApiFactory.instance || (type && type !== ApiFactory.implementationType)) {
      ApiFactory.implementationType = type || 'direct';
      ApiFactory.instance = ApiFactory.createClient(ApiFactory.implementationType, config);
    }
    return ApiFactory.instance;
  }

  static setImplementation(type: ApiImplementationType, config?: ApiConfig): void {
    ApiFactory.implementationType = type;
    ApiFactory.instance = ApiFactory.createClient(type, config);
  }

  static reset(): void {
    ApiFactory.instance = null;
    ApiFactory.implementationType = 'direct';
  }
}

export default ApiFactory;
export { DirectGitHubApi, BackendProxyApi };
