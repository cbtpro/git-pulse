/**
 * GitHub API 客户端接口定义
 */

import type { User, Repository, Event, PaginationParams } from '../../../types/github'

export interface ApiConfig {
  token?: string
  backendUrl?: string
}

export interface GitHubApiClient {
  getUserProfile(): Promise<User>
  getUserRepositories(username?: string, params?: PaginationParams): Promise<Repository[]>
  getRepository(owner: string, repo: string): Promise<Repository>
  getRepositoryEvents(owner: string, repo: string, params?: PaginationParams): Promise<Event[]>
  getUserEvents(username?: string, params?: PaginationParams): Promise<Event[]>
  searchRepositories(query: string, params?: PaginationParams): Promise<{ items: Repository[] }>
  searchUsers(query: string, params?: PaginationParams): Promise<{ items: User[] }>
}
