import { TokenManager } from "../auth/TokenManager";
import { github, GitHubRequestError, requestGitHub } from "./GitHubService";
import type { Repository, User } from "../../types/github";
import type { PagesSite } from "./ProfileService";
import type {
  SearchCategory,
  SearchGroup,
  SearchHit,
  SearchSuggestion,
} from "../../types/search";

interface SearchResponse<T> {
  items: T[];
  total_count: number;
  incomplete_results?: boolean;
}
interface Topic {
  name: string;
  display_name?: string;
  short_description?: string;
}
interface Code {
  sha: string;
  name: string;
  path: string;
  html_url: string;
  repository: { full_name: string };
}
interface Commit {
  sha: string;
  html_url: string;
  commit: { message: string };
  repository: { full_name: string };
}
interface Issue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: unknown;
}
const cache = new Map<string, { expires: number; value: SearchGroup }>();
let cacheIdentity: string | null = null;
export function clearSearchCache() {
  cache.clear();
  cacheIdentity = null;
}
const githubUrl = (url: string) =>
  /^https:\/\/github\.com\//.test(url) ? url : "https://github.com";
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "加载失败，请重试";

export async function searchCategory(
  kind: Exclude<SearchCategory, "pages">,
  query: string,
  token: string | null,
  signal: AbortSignal,
  options: { page?: number; perPage?: number; sort?: string } = {},
): Promise<SearchGroup> {
  token = token?.trim() || TokenManager.getToken();
  signal.throwIfAborted();
  if (cacheIdentity !== token) {
    cache.clear();
    cacheIdentity = token;
  }
  const key = `${kind}:${query}:${options.page || 1}:${options.perPage || 4}:${options.sort || ""}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (kind === "code" && !token)
    return { kind, hits: [], total: 0, error: "登录后可搜索代码" };
  if (
    kind === "code" &&
    (/(?:^|\s)symbol:/i.test(query) ||
      /(?:^|\s)\/(?:\\.|[^/])+\/[imsu]*(?=\s|$)/.test(query))
  ) {
    return {
      kind,
      hits: [],
      total: 0,
      error: "此代码语法需在 GitHub 上搜索",
      externalSearch: `https://github.com/search?${new URLSearchParams({ q: query, type: "code" })}`,
    };
  }
  const endpoint = kind === "organizations" ? "users" : kind;
  const q =
    kind === "users"
      ? `${query} type:user`
      : kind === "organizations"
        ? `${query} type:org`
        : query;
  const params = new URLSearchParams({
    q,
    per_page: String(options.perPage || 4),
    page: String(options.page || 1),
  });
  if (options.sort) {
    params.set("sort", options.sort);
    params.set("order", "desc");
  }
  try {
    const { data } = await requestGitHub<
      SearchResponse<Repository | User | Topic | Code | Commit | Issue>
    >(`/search/${endpoint}?${params}`, token, signal);
    signal.throwIfAborted();
    const hits: SearchHit[] = data.items.map((item) => {
      const base = { kind, description: "" };
      switch (kind) {
        case "repositories": {
          const repo = item as Repository;
          return {
            ...base,
            id: String(repo.id),
            title: repo.full_name,
            description: repo.description || "",
            query: `repo:${repo.full_name}`,
            url: githubUrl(repo.html_url),
            detail: `${repo.stargazers_count} stars`,
          };
        }
        case "users":
        case "organizations": {
          const user = item as User;
          return {
            ...base,
            id: String(user.id),
            title: user.login,
            description: user.name || "",
            query: `${kind === "users" ? "user" : "org"}:${user.login}`,
            url: githubUrl(user.html_url),
          };
        }
        case "topics": {
          const topic = item as Topic;
          return {
            ...base,
            id: topic.name,
            title: topic.display_name || topic.name,
            description: topic.short_description || "",
            query: `topic:${topic.name}`,
            url: `https://github.com/topics/${encodeURIComponent(topic.name)}`,
          };
        }
        case "code": {
          const code = item as Code;
          return {
            ...base,
            id: `${code.repository.full_name}:${code.path}`,
            title: code.name,
            description: `${code.repository.full_name} / ${code.path}`,
            query: `repo:${code.repository.full_name}`,
            url: githubUrl(code.html_url),
          };
        }
        case "commits": {
          const commit = item as Commit;
          return {
            ...base,
            id: `${commit.repository.full_name}:${commit.sha}`,
            title: commit.commit.message.split("\n")[0],
            description: commit.repository.full_name,
            query: `repo:${commit.repository.full_name}`,
            url: githubUrl(commit.html_url),
            detail: commit.sha.slice(0, 7),
          };
        }
        case "issues": {
          const issue = item as Issue;
          const repository = new URL(issue.repository_url).pathname.replace(
            /^\/repos\//,
            "",
          );
          return {
            ...base,
            id: String(issue.id),
            title: issue.title,
            description: repository,
            query: `repo:${repository}`,
            url: githubUrl(issue.html_url),
            detail: `${issue.pull_request ? "PR" : "Issue"} #${issue.number}`,
          };
        }
      }
    });
    const value = {
      kind,
      hits,
      total: data.total_count,
      incomplete: data.incomplete_results,
    };
    if (cacheIdentity === token) {
      if (cache.size >= 50) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 60_000, value });
    }
    return value;
  } catch (error) {
    signal.throwIfAborted();
    return {
      kind,
      hits: [],
      total: 0,
      requestError: error instanceof Error ? error : undefined,
      error:
        error instanceof GitHubRequestError && error.status === 422
          ? "此分类不支持当前条件，请调整高级搜索语法"
          : errorText(error),
    };
  }
}

export function searchPages(
  sites: PagesSite[],
  query: string,
  page = 1,
  perPage = 4,
): SearchGroup {
  const terms = (query.match(/(?:[^\s"]+|"[^"]*")+/g) || []).map((term) =>
    term
      .replace(/^repo:/i, "")
      .replace(/^"|"$/g, "")
      .toLowerCase(),
  );
  const matched = sites.filter((site) =>
    terms.every((term) =>
      `${site.repository} ${site.url || ""}`.toLowerCase().includes(term),
    ),
  );
  return {
    kind: "pages",
    total: matched.length,
    hits: matched.slice((page - 1) * perPage, page * perPage).map((site) => ({
      id: site.repository,
      kind: "pages",
      title: site.repository,
      description: site.url || "",
      query: `repo:${site.repository}`,
      url: site.url || site.repositoryUrl,
    })),
  };
}

export async function popularSearches(
  token: string | null,
  signal: AbortSignal,
): Promise<SearchSuggestion[]> {
  const result = await github.searchRepositories(
    "stars:>1000 archived:false",
    "stars",
    1,
    token,
    signal,
    5,
  );
  return result.items.map((repo) => ({
    title: repo.full_name,
    query: `repo:${repo.full_name}`,
  }));
}
export async function recommendedSearches(
  token: string,
  signal: AbortSignal,
): Promise<SearchSuggestion[]> {
  const { data } = await requestGitHub<Repository[]>(
    "/user/starred?per_page=12&sort=created",
    token,
    signal,
  );
  const suggestions = new Map<string, SearchSuggestion>();
  for (const repo of data) {
    for (const topic of (repo.topics || []).slice(0, 2))
      suggestions.set(`topic:${topic}`, {
        title: topic,
        query: `topic:${topic} stars:>50`,
      });
    if (repo.language)
      suggestions.set(`language:${repo.language}`, {
        title: repo.language,
        query: `language:"${repo.language}" stars:>100`,
      });
  }
  return [...suggestions.values()].slice(0, 5);
}
