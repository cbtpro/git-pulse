import {
  recordResourceRead,
  invalidateResourceWrite,
} from "./ResourceInvalidation";
import type { Repository, User } from "../../types/github";
import type { ContributionCalendar } from "../../types/contributions";
import { TokenManager } from "../auth/TokenManager";

export interface SearchResult<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

export interface Notification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: { title: string; type: string; url: string | null };
  repository: Pick<Repository, "full_name" | "html_url" | "owner">;
}

export class GitHubRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimited = false,
    public retryAt?: number,
    public authenticated = false,
  ) {
    super(message);
    this.name = "GitHubRequestError";
  }
}

type Bucket = "core" | "search" | "code_search" | "graphql" | "all";
const cooldowns = new Map<string, Map<Bucket, GitHubRequestError>>();
const queryCache = new Map<
  string,
  { expires: number; data: unknown; hasNext: boolean }
>();
let cacheToken: string | null = null;
let queryRevision = 0;
export function clearGitHubRequestState() {
  queryRevision++;
  cooldowns.clear();
  queryCache.clear();
  cacheToken = null;
}
function bucketFor(path: string): Bucket {
  return path === "/graphql"
    ? "graphql"
    : path.startsWith("/search/code?")
      ? "code_search"
      : path.startsWith("/search/")
        ? "search"
        : "core";
}
function rateLimitError(
  token: string | null,
  response: Response,
  secondary: boolean,
) {
  const retryAfter = response.headers.get("retry-after");
  const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
  const retryAt = retryAfter
    ? /^\d+$/.test(retryAfter)
      ? Date.now() + Number(retryAfter) * 1000
      : Date.parse(retryAfter)
    : reset;
  const message = token
    ? "当前账号的 GitHub 请求次数已达上限，请等待额度恢复后重试。"
    : "GitHub 请求次数已达上限，请稍后重试。登录后可获得更高额度。";
  return {
    error: new GitHubRequestError(
      message,
      response.status >= 400 ? response.status : 403,
      true,
      retryAt > Date.now() ? retryAt : Date.now() + 60_000,
      Boolean(token),
    ),
    all: secondary,
  };
}

export async function requestGitHub<T>(
  path: string,
  token: string | null,
  signal: AbortSignal,
  options: Pick<RequestInit, "method" | "body"> & {
    responseType?: "text" | "blob";
    accept?: string;
  } = {},
): Promise<{ data: T; hasNext: boolean }> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Invalid GitHub API path");
  // A caller that omits credentials still uses the active encrypted account.
  token = token?.trim() || TokenManager.getToken();
  signal.throwIfAborted();
  const read =
    !options.method || options.method === "GET" || path === "/graphql";
  const requestRevision = queryRevision;
  if (read) recordResourceRead(signal, path, token, options.body);
  if (
    !token &&
    (/^\/user(?:[/?]|$)/.test(path) ||
      path.startsWith("/notifications") ||
      path === "/graphql")
  ) {
    throw new GitHubRequestError("登录凭证已失效，请重新登录", 401);
  }
  if (cacheToken !== token) {
    queryCache.clear();
    cacheToken = token;
  }
  const cacheable =
    (!options.method || options.method === "GET") &&
    (path.startsWith("/search/") || path.startsWith("/user/starred?"));
  const cached = cacheable ? queryCache.get(path) : undefined;
  if (cached && cached.expires > Date.now())
    return { data: cached.data as T, hasNext: cached.hasNext };
  const bucket = bucketFor(path);
  const accountLimits = cooldowns.get(token || "guest");
  for (const key of ["all", bucket] as Bucket[]) {
    const error = accountLimits?.get(key);
    if (error?.retryAt && error.retryAt > Date.now()) throw error;
  }
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.throwIfAborted();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(
    () => controller.abort(new Error("连接 GitHub 超时，请稍后重试")),
    20000,
  );
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method: options.method,
      body: options.body,
      headers: {
        Accept: options.accept || "application/vnd.github+json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    const rememberLimit = (secondary = false) => {
      const { error, all } = rateLimitError(token, response, secondary);
      if (!cooldowns.has(token || "guest")) {
        if (cooldowns.size >= 10)
          cooldowns.delete(cooldowns.keys().next().value!);
        cooldowns.set(token || "guest", new Map());
      }
      cooldowns.get(token || "guest")!.set(all ? "all" : bucket, error);
      return error;
    };
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      const secondary =
        response.headers.has("retry-after") ||
        /secondary rate|abuse/i.test(body.message || "");
      const limited =
        response.status === 429 ||
        (response.status === 403 &&
          (response.headers.get("x-ratelimit-remaining") === "0" ||
            secondary ||
            /rate limit/i.test(body.message || "")));
      if (limited) throw rememberLimit(secondary);
      let message = "暂时无法获取 GitHub 数据，请稍后重试";
      if (response.status === 401) message = "登录凭证已失效，请重新登录";
      if (response.status === 403 || response.status === 429) {
        message = path.startsWith("/notifications")
          ? "GitHub 拒绝了请求，请检查账号权限或稍后重试。收件箱需要 notifications 权限。"
          : "GitHub 拒绝了请求，请检查当前账号的访问权限。";
      }
      if (response.status === 422)
        message =
          options.method && options.method !== "GET"
            ? "GitHub 未接受此操作，请检查内容和权限。"
            : "搜索条件无效，请调整关键词或筛选条件";
      throw new GitHubRequestError(
        message,
        response.status,
        response.status === 429 ||
          response.headers.get("x-ratelimit-remaining") === "0" ||
          response.headers.has("retry-after"),
      );
    }
    // Notification PATCH returns 205 with no JSON body.
    const data =
      response.status === 204 || response.status === 205
        ? undefined
        : options.responseType
          ? await readDownloadResponse(response, options.responseType)
          : await response.json();
    if (
      path === "/graphql" &&
      data.errors?.some(
        (error: { type?: string; message?: string }) =>
          error.type === "RATE_LIMITED" ||
          /rate limit/i.test(error.message || ""),
      )
    )
      throw rememberLimit();
    if (response.headers.get("x-ratelimit-remaining") === "0") rememberLimit();
    const result = {
      data: data as T,
      hasNext: /rel="next"/.test(response.headers.get("link") || ""),
    };
    if (
      cacheable &&
      cacheToken === token &&
      requestRevision === queryRevision &&
      !controller.signal.aborted
    ) {
      if (queryCache.size >= 80)
        queryCache.delete(queryCache.keys().next().value!);
      queryCache.set(path, { ...result, expires: Date.now() + 60_000 });
    }
    if (
      !read &&
      !(
        data &&
        typeof data === "object" &&
        "merged" in data &&
        data.merged === false
      )
    ) {
      queryRevision++;
      if (cacheToken === token) queryCache.clear();
      invalidateResourceWrite(path, token);
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof GitHubRequestError) throw error;
    throw new Error("无法连接 GitHub，请检查网络后重试");
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

export function recentRepositoryQuery(days: number, now = new Date()): string {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - days);
  return `created:>=${since.toISOString().slice(0, 10)} fork:false archived:false`;
}

export function repositoryQuery(keyword: string, language = ""): string {
  const query = keyword.trim() || "stars:>1000";
  return `${query}${language ? ` language:${language}` : ""}`;
}

export const github = {
  async contributions(
    token: string,
    signal: AbortSignal,
  ): Promise<ContributionCalendar> {
    const result = await requestGitHub<{
      data?: {
        viewer?: {
          contributionsCollection?: {
            contributionCalendar?: ContributionCalendar;
          };
        };
      };
      errors?: unknown[];
    }>("/graphql", token, signal, {
      method: "POST",
      body: JSON.stringify({
        query: `query GitPulseContributions {
        viewer {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks { contributionDays { date weekday contributionCount contributionLevel } }
            }
          }
        }
      }`,
      }),
    });
    const calendar =
      result.data.data?.viewer?.contributionsCollection?.contributionCalendar;
    if (result.data.errors?.length || !calendar) {
      throw new GitHubRequestError(
        "无法读取贡献数据，请检查账号权限后重试。",
        403,
      );
    }
    if (
      !Number.isInteger(calendar.totalContributions) ||
      calendar.totalContributions < 0 ||
      !Array.isArray(calendar.weeks) ||
      calendar.weeks.length === 0 ||
      calendar.weeks.length > 54 ||
      calendar.weeks.some(
        (week) =>
          !Array.isArray(week.contributionDays) ||
          week.contributionDays.length > 7 ||
          week.contributionDays.some(
            (day) =>
              !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
              !Number.isFinite(Date.parse(day.date)) ||
              !Number.isInteger(day.contributionCount) ||
              day.contributionCount < 0 ||
              !Number.isInteger(day.weekday) ||
              day.weekday < 0 ||
              day.weekday > 6,
          ),
      )
    ) {
      throw new Error("GitHub 返回的贡献数据不完整，请重试。");
    }
    return calendar;
  },
  async searchRepositories(
    query: string,
    sort: string,
    page: number,
    token: string | null,
    signal: AbortSignal,
    perPage = 10,
  ) {
    const params = new URLSearchParams({
      q: query,
      order: "desc",
      page: String(page),
      per_page: String(perPage),
    });
    if (sort) params.set("sort", sort);
    return (
      await requestGitHub<SearchResult<Repository>>(
        `/search/repositories?${params}`,
        token,
        signal,
      )
    ).data;
  },
  async developers(token: string | null, signal: AbortSignal) {
    // 搜索结果直接用于列表，避免为每个开发者额外发起请求。
    return (
      await requestGitHub<SearchResult<User>>(
        "/search/users?q=followers:>1000+type:user&sort=followers&order=desc&per_page=8",
        token,
        signal,
      )
    ).data;
  },
  notifications(
    all: boolean,
    participating: boolean,
    page: number,
    token: string,
    signal: AbortSignal,
  ) {
    const params = new URLSearchParams({
      all: String(all),
      participating: String(participating),
      page: String(page),
      per_page: "20",
    });
    return requestGitHub<Notification[]>(
      `/notifications?${params}`,
      token,
      signal,
    );
  },
  async markNotificationRead(id: string, token: string, signal: AbortSignal) {
    await requestGitHub<void>(
      `/notifications/threads/${encodeURIComponent(id)}`,
      token,
      signal,
      { method: "PATCH" },
    );
  },
  repositories(page: number, token: string, signal: AbortSignal) {
    return requestGitHub<Repository[]>(
      `/user/repos?affiliation=owner&sort=updated&direction=desc&per_page=12&page=${page}`,
      token,
      signal,
    );
  },
};

export function notificationUrl(notification: Notification): string {
  const subject = notification.subject.url;
  if (subject) {
    const match =
      /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/(issues|pulls|commits)\/([^/?#]+)$/.exec(
        subject,
      );
    if (match)
      return `https://github.com/${match[1]}/${match[2] === "pulls" ? "pull" : match[2] === "commits" ? "commit" : "issues"}/${match[3]}`;
  }
  return notification.repository.html_url;
}

/** Explicit refresh invalidates query results without removing rate-limit cooldowns. */
export function invalidateGitHubQueryCache() {
  queryCache.clear();
}

async function readDownloadResponse(response: Response, type: "text" | "blob") {
  const limit = type === "text" ? 2_000_000 : 100_000_000;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("下载内容不可用");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0,
    truncated = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const remaining = limit - size;
      if (value.length > remaining) {
        if (type === "blob") throw new Error("下载文件过大，请在 GitHub 下载");
        chunks.push(new Uint8Array(value.slice(0, remaining)));
        truncated = true;
        break;
      }
      size += value.length;
      chunks.push(new Uint8Array(value));
    }
  } finally {
    await reader.cancel();
  }
  if (type === "text") {
    const bytes = new Uint8Array(
      chunks.reduce((sum, chunk) => sum + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { text: new TextDecoder().decode(bytes), truncated };
  }
  return new Blob(chunks, {
    type: response.headers.get("content-type") || "application/octet-stream",
  });
}
