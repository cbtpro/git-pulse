import type { GitHubApiClient, ApiConfig } from "../interfaces/GitHubApiClient";
import type {
  User,
  Repository,
  Event,
  PaginationParams,
} from "../../../types/github";
import { requestGitHub } from "../../github/GitHubService";

/** Compatibility adapter; requests share live account auth and rate-limit handling. */
export class DirectGitHubApi implements GitHubApiClient {
  constructor(private config?: ApiConfig) {}
  private async get<T>(path: string, params?: object): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {}))
      if (value !== undefined) query.set(key, String(value));
    return (
      await requestGitHub<T>(
        path + (query.size ? `?${query}` : ""),
        this.config?.token || null,
        new AbortController().signal,
      )
    ).data;
  }
  getUserProfile() {
    return this.get<User>("/user");
  }
  getUserRepositories(username?: string, params?: PaginationParams) {
    return this.get<Repository[]>(
      username ? `/users/${encodeURIComponent(username)}/repos` : "/user/repos",
      params,
    );
  }
  getRepository(owner: string, repo: string) {
    return this.get<Repository>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
  }
  getRepositoryEvents(owner: string, repo: string, params?: PaginationParams) {
    return this.get<Event[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/events`,
      params,
    );
  }
  getUserEvents(username?: string, params?: PaginationParams) {
    return this.get<Event[]>(
      username ? `/users/${encodeURIComponent(username)}/events` : "/events",
      params,
    );
  }
  searchRepositories(query: string, params?: PaginationParams) {
    return this.get<{ items: Repository[] }>("/search/repositories", {
      q: query,
      ...params,
    });
  }
  searchUsers(query: string, params?: PaginationParams) {
    return this.get<{ items: User[] }>("/search/users", {
      q: query,
      ...params,
    });
  }
}
