import { requestGitHub } from "./GitHubService";
import { repoApiPath, repoRoute } from "./RepositoryService";
export type WorkKind = "issues" | "pulls";
export interface WorkItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: { login: string; avatar_url: string };
  updated_at: string;
  created_at: string;
  comments: number;
  labels: { name: string; color: string }[];
  assignees: { login: string }[];
  locked?: boolean;
  pull_request?: { url: string };
  draft?: boolean;
  merged?: boolean;
  mergeable?: boolean | null;
  mergeable_state?: string;
  head?: { sha: string; ref: string };
  base?: { ref: string };
  repository_url?: string;
}
export interface Discussion {
  id: number;
  body: string;
  html_url: string;
  user: { login: string };
  created_at?: string;
  submitted_at?: string;
  state?: string;
  path?: string;
  line?: number | null;
}
export interface ChangedFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
  blob_url: string;
}
export function workRoute(
  fullName: string,
  kind: WorkKind,
  number: number,
  accountId?: string | null,
) {
  const route = repoRoute(fullName, accountId);
  return `${route}${route.includes("?") ? "&" : "?"}tab=${kind}&number=${number}`;
}
function itemPath(owner: string, name: string, kind: WorkKind, number: number) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("编号无效");
  return `${repoApiPath(owner, name)}/${kind}/${number}`;
}
async function write<T>(
  path: string,
  token: string | null,
  method: string,
  body?: unknown,
) {
  if (!token) throw new Error("请先登录");
  return (
    await requestGitHub<T>(path, token, new AbortController().signal, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  ).data;
}
export const collaboration = {
  async list(
    owner: string,
    name: string,
    kind: WorkKind,
    state: string,
    query: string,
    page: number,
    token: string | null,
    signal: AbortSignal,
  ) {
    repoApiPath(owner, name);
    const q =
      `repo:${owner}/${name} is:${kind === "pulls" ? "pr" : "issue"} ${state === "all" ? "" : `is:${state}`} ${query}`.trim();
    const result = await requestGitHub<{
      items: WorkItem[];
      total_count: number;
      incomplete_results?: boolean;
    }>(
      `/search/issues?${new URLSearchParams({ q, sort: "updated", order: "desc", per_page: "20", page: String(page) })}`,
      token,
      signal,
    );
    return {
      data: result.data.items,
      total: result.data.total_count,
      hasNext: page * 20 < Math.min(1000, result.data.total_count),
      incomplete: result.data.incomplete_results,
    };
  },
  async get(
    owner: string,
    name: string,
    kind: WorkKind,
    number: number,
    token: string | null,
    signal: AbortSignal,
  ) {
    return (
      await requestGitHub<WorkItem>(
        itemPath(owner, name, kind, number),
        token,
        signal,
      )
    ).data;
  },
  discussion(
    owner: string,
    name: string,
    number: number,
    section: "comments" | "reviews" | "review-comments",
    page: number,
    token: string | null,
    signal: AbortSignal,
  ) {
    const kind = section === "comments" ? "issues" : "pulls";
    return requestGitHub<Discussion[]>(
      `${itemPath(owner, name, kind, number)}/${section === "review-comments" ? "comments" : section}?per_page=20&page=${page}`,
      token,
      signal,
    );
  },
  files(
    owner: string,
    name: string,
    number: number,
    page: number,
    token: string | null,
    signal: AbortSignal,
  ) {
    return requestGitHub<ChangedFile[]>(
      `${itemPath(owner, name, "pulls", number)}/files?per_page=20&page=${page}`,
      token,
      signal,
    );
  },
  create(
    owner: string,
    name: string,
    title: string,
    body: string,
    token: string | null,
  ) {
    return write<WorkItem>(
      `${repoApiPath(owner, name)}/issues`,
      token,
      "POST",
      { title: title.trim(), body },
    );
  },
  comment(
    owner: string,
    name: string,
    number: number,
    body: string,
    token: string | null,
  ) {
    return write<Discussion>(
      `${itemPath(owner, name, "issues", number)}/comments`,
      token,
      "POST",
      { body },
    );
  },
  update(
    owner: string,
    name: string,
    kind: WorkKind,
    number: number,
    body: {
      state?: string;
      title?: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    },
    token: string | null,
  ) {
    // Shared metadata always belongs to the Issues endpoint, including PRs.
    const endpoint = body.labels || body.assignees ? "issues" : kind;
    return write<WorkItem>(
      itemPath(owner, name, endpoint, number),
      token,
      "PATCH",
      body,
    );
  },
  review(
    owner: string,
    name: string,
    number: number,
    commitId: string,
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
    body: string,
    token: string | null,
  ) {
    return write<Discussion>(
      `${itemPath(owner, name, "pulls", number)}/reviews`,
      token,
      "POST",
      { commit_id: commitId, event, body },
    );
  },
  async merge(
    owner: string,
    name: string,
    number: number,
    sha: string,
    method: "merge" | "squash" | "rebase",
    token: string | null,
  ) {
    const result = await write<{ merged: boolean; message: string }>(
      `${itemPath(owner, name, "pulls", number)}/merge`,
      token,
      "PUT",
      { sha, merge_method: method },
    );
    if (!result.merged)
      throw new Error(result.message || "合并未完成，请刷新后重试");
    return result;
  },
};

export function internalWorkUrl(url: string, accountId?: string | null) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com")
      return null;
    const match = parsed.pathname.match(
      /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)\/?$/,
    );
    return match
      ? `#${workRoute(`${match[1]}/${match[2]}`, match[3] === "pull" ? "pulls" : "issues", Number(match[4]), accountId)}`
      : null;
  } catch {
    return null;
  }
}
