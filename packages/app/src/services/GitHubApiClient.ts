import { requestGitHub } from "./github/GitHubService";
export interface FetchOptions extends RequestInit {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}
/** Compatibility facade. Authorization and rate-limit backoff are centralized. */
export class GitHubApiClient {
  static async request<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const target = new URL(url, "https://api.github.com");
    if (target.origin !== "https://api.github.com")
      throw new Error("Only the GitHub API is supported");
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.throwIfAborted();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = options.timeout
      ? setTimeout(
          () => controller.abort(new Error("连接 GitHub 超时，请稍后重试")),
          options.timeout,
        )
      : undefined;
    try {
      return (
        await requestGitHub<T>(
          target.pathname + target.search,
          null,
          controller.signal,
          { method: options.method, body: options.body },
        )
      ).data;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  static get<T>(url: string, options?: FetchOptions) {
    return this.request<T>(url, { ...options, method: "GET" });
  }
  static post<T>(url: string, data?: unknown, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  static put<T>(url: string, data?: unknown, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  static patch<T>(url: string, data?: unknown, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: "PATCH",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  static delete<T>(url: string, options?: FetchOptions) {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}
export default GitHubApiClient;
