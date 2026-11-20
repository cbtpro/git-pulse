import { GitHubRequestError, requestGitHub } from "./GitHubService";
import type { RepositoryCardData } from "../../types/github";

export interface ProfileReadme {
  markdown: string;
  htmlUrl: string;
  rawUrl: string;
}
export interface PagesSite {
  repository: string;
  repositoryUrl: string;
  url: string | null;
  status: string | null;
  error: string | null;
}

export async function profileReadme(
  login: string,
  token: string,
  signal: AbortSignal,
): Promise<ProfileReadme | null> {
  const owner = encodeURIComponent(login);
  try {
    const { data } = await requestGitHub<{
      encoding: string;
      content: string;
      html_url: string;
      download_url: string;
    }>(`/repos/${owner}/${owner}/readme`, token, signal);
    if (
      data.encoding !== "base64" ||
      typeof data.content !== "string" ||
      data.content.length > 2_000_000 ||
      typeof data.html_url !== "string" ||
      !/^https:\/\//.test(data.html_url) ||
      typeof data.download_url !== "string" ||
      !/^https:\/\//.test(data.download_url)
    )
      throw new Error("无法读取个人主页 README，请在 GitHub 查看。");
    return {
      markdown: new TextDecoder().decode(
        Uint8Array.from(atob(data.content.replace(/\s/g, "")), (char) =>
          char.charCodeAt(0),
        ),
      ),
      htmlUrl: data.html_url,
      rawUrl: data.download_url,
    };
  } catch (error) {
    if (error instanceof GitHubRequestError && error.status === 404)
      return null;
    throw error;
  }
}

interface PinnedNode {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  updatedAt: string;
  stargazerCount: number;
  forkCount: number;
  owner: { login: string };
  primaryLanguage: { name: string } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
}
export async function pinnedRepositories(
  token: string,
  signal: AbortSignal,
): Promise<RepositoryCardData[]> {
  const { data } = await requestGitHub<{
    data?: { viewer?: { pinnedItems: { nodes: PinnedNode[] } } };
    errors?: unknown[];
  }>("/graphql", token, signal, {
    method: "POST",
    body: JSON.stringify({
      query: `query GitPulsePinnedRepositories {
      viewer { pinnedItems(first: 6, types: [REPOSITORY]) { nodes { ... on Repository {
        id name nameWithOwner url description isPrivate isArchived updatedAt stargazerCount forkCount
        owner { login } primaryLanguage { name } repositoryTopics(first: 3) { nodes { topic { name } } }
      } } } }
    }`,
    }),
  });
  const nodes = data.data?.viewer?.pinnedItems.nodes;
  if (data.errors?.length || !Array.isArray(nodes))
    throw new GitHubRequestError(
      "无法读取置顶仓库，请检查账号权限后重试。",
      403,
    );
  return nodes.filter(Boolean).map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.nameWithOwner,
    html_url: repo.url,
    description: repo.description,
    private: repo.isPrivate,
    archived: repo.isArchived,
    updated_at: repo.updatedAt,
    stargazers_count: repo.stargazerCount,
    forks_count: repo.forkCount,
    owner: repo.owner,
    language: repo.primaryLanguage?.name || null,
    topics: repo.repositoryTopics.nodes.map((node) => node.topic.name),
  }));
}

export async function githubPages(
  token: string,
  signal: AbortSignal,
): Promise<PagesSite[]> {
  const repos: { full_name: string; html_url: string; has_pages: boolean }[] =
    [];
  let page = 1;
  for (;;) {
    const result = await requestGitHub<typeof repos>(
      `/user/repos?affiliation=owner&sort=full_name&per_page=100&page=${page}`,
      token,
      signal,
    );
    repos.push(...result.data.filter((repo) => repo.has_pages));
    if (!result.hasNext) break;
    page += 1;
    if (page > 1000)
      throw new Error("仓库列表过大，未能完整加载，请在 GitHub 查看。");
  }
  const result: PagesSite[] = [];
  // Bound concurrency, and stop the entire operation on auth/rate-limit failures.
  let next = 0;
  let stopped = false;
  await Promise.all(
    Array.from({ length: Math.min(4, repos.length) }, async () => {
      for (;;) {
        if (stopped) return;
        signal.throwIfAborted();
        const index = next++;
        const repo = repos[index];
        if (!repo) return;
        const site: PagesSite = {
          repository: repo.full_name,
          repositoryUrl: repo.html_url,
          url: null,
          status: null,
          error: null,
        };
        try {
          const path = repo.full_name
            .split("/")
            .map(encodeURIComponent)
            .join("/");
          const { data } = await requestGitHub<{
            html_url?: string;
            status?: string;
          }>(`/repos/${path}/pages`, token, signal);
          const url = data.html_url ? new URL(data.html_url) : null;
          site.url =
            url && ["http:", "https:"].includes(url.protocol) ? url.href : null;
          site.status = data.status || null;
          if (!site.url) site.error = "站点地址暂不可用";
        } catch (error) {
          if (
            error instanceof GitHubRequestError &&
            (error.status === 404 ||
              (error.status === 403 && !error.rateLimited))
          )
            site.error = "无法读取此站点，请检查 Pages 访问权限。";
          else {
            stopped = true;
            throw error;
          }
        }
        result[index] = site;
      }
    }),
  );
  return result;
}


let pagesCache: { token: string; expires: number; sites: PagesSite[] } | null = null;
export function clearPagesCache() { pagesCache = null; }
/** A short-lived, account-bound catalog avoids scanning every repository for each search. */
export async function cachedGitHubPages(token: string, signal: AbortSignal): Promise<PagesSite[]> {
  signal.throwIfAborted();
  if (pagesCache?.token === token && pagesCache.expires > Date.now()) return pagesCache.sites;
  pagesCache = null;
  const sites = await githubPages(token, signal);
  signal.throwIfAborted();
  pagesCache = { token, sites, expires: Date.now() + 120_000 };
  return sites;
}
