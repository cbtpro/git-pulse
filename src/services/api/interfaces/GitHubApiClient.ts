/**
 * GitHub API 客户端接口
 * 定义所有 GitHub API 操作的契约
 * 支持多种实现：直接 API 调用、后端代理、Mock 等
 */

import { User, Repository, PaginationParams, Event } from '../../types/github';

export interface GitHubApiClient {
  /**
   * 获取用户信息
   */
  getUser(username: string): Promise<User>;

  /**
   * 获取当前认证用户信息
   */
  getCurrentUser(): Promise<User>;

  /**
   * 获取用户的仓库列表
   */
  getUserRepos(
    username: string,
    params?: PaginationParams & { type?: 'owner' | 'member' | 'public' | 'private' | 'all' }
  ): Promise<Repository[]>;

  /**
   * 获取用户的置顶仓库
   */
  getPinnedRepositories(username: string): Promise<Repository[]>;

  /**
   * 获取用户的 Followers
   */
  getFollowers(username: string, params?: PaginationParams): Promise<User[]>;

  /**
   * 获取用户正在关注的用户
   */
  getFollowing(username: string, params?: PaginationParams): Promise<User[]>;

  /**
   * 获取用户的最近事件
   */
  getUserEvents(username: string, params?: PaginationParams): Promise<Event[]>;

  /**
   * 获取用户的公开事件
   */
  getUserPublicEvents(username: string, params?: PaginationParams): Promise<Event[]>;

  /**
   * 获取用户的贡献统计（需要登录）
   */
  getContributionStats(username: string): Promise<any>;

  /**
   * 验证认证信息是否有效
   */
  verifyAuth(): Promise<boolean>;
}

/**
 * API 配置选项
 */
export interface ApiConfig {
  baseUrl?: string;
  token?: string;
  username?: string;
  timeout?: number;
}

/**
 * API 工厂函数
 */
export type GitHubApiClientFactory = (config?: ApiConfig) => GitHubApiClient;
