/**
 * 通过后端代理调用 GitHub API 的实现
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import type { GitHubApiClient, ApiConfig } from "../interfaces/GitHubApiClient";
import type {
  User,
  Repository,
  Event,
  PaginationParams,
} from "../../../types/github";

export class BackendProxyApi implements GitHubApiClient {
  private client: AxiosInstance;

  constructor(config?: ApiConfig) {
    this.client = axios.create({
      baseURL: config?.backendUrl || "http://localhost:3000/api",
      headers: config?.token
        ? { Authorization: `Bearer ${config.token}` }
        : undefined,
    });
  }

  async getUserProfile(): Promise<User> {
    try {
      const response = await this.client.get("/github/user");
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to fetch user profile: ${axiosError.message}`);
    }
  }

  async getUserRepositories(
    username?: string,
    params?: PaginationParams,
  ): Promise<Repository[]> {
    try {
      const response = await this.client.get("/github/repositories", {
        params: { username, ...params },
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to fetch repositories: ${axiosError.message}`);
    }
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const response = await this.client.get(
        `/github/repositories/${owner}/${repo}`,
      );
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to fetch repository: ${axiosError.message}`);
    }
  }

  async getRepositoryEvents(
    owner: string,
    repo: string,
    params?: PaginationParams,
  ): Promise<Event[]> {
    try {
      const response = await this.client.get(
        `/github/repositories/${owner}/${repo}/events`,
        { params },
      );
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(
        `Failed to fetch repository events: ${axiosError.message}`,
      );
    }
  }

  async getUserEvents(
    username?: string,
    params?: PaginationParams,
  ): Promise<Event[]> {
    try {
      const response = await this.client.get("/github/events", {
        params: { username, ...params },
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to fetch user events: ${axiosError.message}`);
    }
  }

  async searchRepositories(
    query: string,
    params?: PaginationParams,
  ): Promise<{ items: Repository[] }> {
    try {
      const response = await this.client.get("/github/search/repositories", {
        params: { q: query, ...params },
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to search repositories: ${axiosError.message}`);
    }
  }

  async searchUsers(
    query: string,
    params?: PaginationParams,
  ): Promise<{ items: User[] }> {
    try {
      const response = await this.client.get("/github/search/users", {
        params: { q: query, ...params },
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to search users: ${axiosError.message}`);
    }
  }
}
