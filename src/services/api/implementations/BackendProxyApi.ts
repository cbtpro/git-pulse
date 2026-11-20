/**
 * 通过后端代理调用 GitHub API 的实现
 * 用于未来扩展，支持添加额外的业务逻辑或速率限制
 */

import axios, { AxiosInstance } from 'axios';
import { GitHubApiClient, ApiConfig } from '../interfaces/GitHubApiClient';
import { User, Repository, Event, PaginationParams } from '../../types/github';

export class BackendProxyApi implements GitHubApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config?: ApiConfig) {
    this.baseUrl = config?.baseUrl || 'http://localhost:3000/api';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config?.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.token && { 'Authorization': `Bearer ${config.token}` }),
      },
    });
  }

  async getUser(username: string): Promise<User> {
    const response = await this.client.get<User>(`/users/${username}`);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
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
    const response = await this.client.get<Repository[]>(`/users/${username}/pinned`);
    return response.data;
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
    const response = await this.client.get(`/users/${username}/stats/contributions`);
    return response.data;
  }

  async verifyAuth(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}
