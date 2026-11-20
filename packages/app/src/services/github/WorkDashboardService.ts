import { requestGitHub } from "./GitHubService";
import { repoApiPath } from "./RepositoryService";
import type { WorkItem } from "./CollaborationService";
export type WorkFilter = "review" | "assigned" | "mentioned" | "failed";
export function dashboardQuery(
  filter: WorkFilter,
  username: string,
  repository: string,
) {
  if (!/^[\w-]+$/.test(username)) throw new Error("账号无效");
  let scope = "";
  if (repository) {
    const parts = repository.split("/");
    if (parts.length !== 2) throw new Error("请输入 owner/repo 格式的仓库名称");
    repoApiPath(parts[0], parts[1]);
    scope = ` repo:${repository}`;
  }
  const qualifiers = {
    review: `is:pr review-requested:${username}`,
    assigned: `assignee:${username}`,
    mentioned: `mentions:${username}`,
    failed: `is:pr author:${username} status:failure`,
  };
  return `is:open ${qualifiers[filter]}${scope}`;
}
export async function loadDashboard(
  filter: WorkFilter,
  username: string,
  repository: string,
  page: number,
  token: string | null,
  signal: AbortSignal,
) {
  if (!token) throw new Error("来源账号已移除，请重新添加账号。");
  const q = dashboardQuery(filter, username, repository);
  const { data } = await requestGitHub<{
    items: WorkItem[];
    total_count: number;
    incomplete_results?: boolean;
  }>(
    `/search/issues?${new URLSearchParams({ q, sort: "updated", order: "desc", per_page: "10", page: String(page) })}`,
    token,
    signal,
  );
  return {
    items: data.items,
    total: data.total_count,
    hasNext: page * 10 < Math.min(1000, data.total_count),
    incomplete: data.incomplete_results,
  };
}
