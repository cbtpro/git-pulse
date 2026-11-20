/**
 * 直接调用 GitHub REST API 的实现
 */

import axios, { AxiosInstance } from 'axios';
import { GitHubApiClient, ApiConfig } from '../interfaces/GitHubApiClient';
import { User, Repository, Event, PaginationParams } from '../../types/github';

export class DirectGitHubApi implements GitHubApiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.github.com';
  private token?: string;
  private username?: string;

  constructor(config?: ApiConfig) {
    this.token = config?.token;
    this.username = config?.username;
    this.baseUrl = config?.baseUrl || this.baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config?.timeout || 10000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(this.token && { 'Authorization': `token ${this.token}` }),
      },
    });

    // 添加响应拦截器处理错误
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error('未授权：Token 无效或已过期');
        }
        if (error.response?.status === 403) {
          throw new Error('禁止访问：可能超过 API 速率限制');
        }
        if (error.response?.status === 404) {
          throw new Error('未找到：用户或资源不存在');
        }
        throw error;
      }
    );
  }

  async getUser(username: string): Promise<User> {
    const response = await this.client.get<User>(`/users/${username}`);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    if (!this.token) {
      throw new Error('需要有效的 GitHub Token 才能获取当前用户信息');
    }
    const response = await this.client.get<User>('/user');
    return response.data;
  }

  async getUserRepos(
    username: string,
    params?: PaginationParams & { type?: 'owner' | 'member' | 'public' | 'private' | 'all' }
  ): Promise<Repository[]> {
    const response = await this.client.get<Repository[]>(`/users/${username}/repos`, {
      params: {
        per_page: params?.per_page || 30,
        page: params?.page || 1,
        sort: params?.sort || 'updated',
        direction: params?.direction || 'desc',
        type: params?.type || 'owner',
      },
    });
    return response.data;
  }

  async getPinnedRepositories(username: string): Promise<Repository[]> {
    // GitHub REST API 中置顶仓库需要通过 GraphQL 获取
    // 这里返回空数组，实际应该使用 GraphQL 或其他方式
    return [];
  }

  async getFollowers(username: string, params?: PaginationParams): Promise<User[]> {
    const response = await this.client.get<User[]>(`/users/${username}/followers`, {
      params: {
        per_page: params?.per_page || 30,
        page: params?.page || 1,
      },
    });
    return response.data;
  }

  async getFollowing(username: string, params?: PaginationParams): Promise<User[]> {
    const response = await this.client.get<User[]>(`/users/${username}/following`, {
      params: {
        per_page: params?.per_page || 30,
        page: params?.page || 1,
      },
    });
    return response.data;
  }

  async getUserEvents(username: string, params?: PaginationParams): Promise<Event[]> {
    const response = await this.client.get<Event[]>(`/users/${username}/events`, {
      params: {
        per_page: params?.per_page || 30,
        page: params?.page || 1,
      },
    });
    return response.data;
  }

  async getUserPublicEvents(username: string, params?: PaginationParams): Promise<Event[]> {
    const response = await this.client.get<Event[]>(`/users/${username}/events/public`, {
      params: {
        per_page: params?.per_page || 30,
        page: params?.page || 1,
      },
    });
    return response.data;
  }

  async getContributionStats(username: string): Promise<any> {
    // 贡献统计需要 GraphQL API 或爬取 GitHub 页面
    // 这里先返回空
    return {};
  }

  async verifyAuth(): Promise<boolean> {
    if (!this.token) {
      return false;
    }
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新 Token
   */
  updateToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `token ${token}`;
  }

  /**
   * 清除 Token
   */
  clearToken(): void {
    this.token = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }
}
