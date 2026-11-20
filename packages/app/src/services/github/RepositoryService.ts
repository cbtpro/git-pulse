import { GitHubRequestError, requestGitHub } from "./GitHubService";
import type { Repository } from "../../types/github";
import type { ProfileReadme } from "./ProfileService";

export interface RepositoryDetails extends Repository {
  permissions?: {
    pull: boolean;
    push: boolean;
    admin: boolean;
    triage?: boolean;
    maintain?: boolean;
  };
  allow_merge_commit?: boolean;
  allow_squash_merge?: boolean;
  allow_rebase_merge?: boolean;
}
export interface RepoContent {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding?: string;
  content?: string;
  html_url: string;
  download_url: string | null;
}
export function repoApiPath(owner: string, name: string) {
  if (
    ![owner, name].every(
      (part) => /^[\w.-]+$/.test(part) && ![".", ".."].includes(part),
    )
  )
    throw new Error("仓库地址无效");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
export function repoRoute(fullName: string, accountId?: string | null) {
  if (fullName.split("/").length !== 2) throw new Error("仓库地址无效");
  const [owner, name] = fullName.split("/");
  repoApiPath(owner || "", name || "");
  return `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${accountId ? `?account=${encodeURIComponent(accountId)}` : ""}`;
}
export function decodeRepoText(file: RepoContent): string | null {
  if (
    file.encoding !== "base64" ||
    file.content === undefined ||
    file.size > 1_000_000 ||
    file.content.length > 1_400_000
  )
    return null;
  try {
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (c) =>
      c.charCodeAt(0),
    );
    if (bytes.includes(0)) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
export const repositories = {
  async get(
    owner: string,
    name: string,
    token: string | null,
    signal: AbortSignal,
  ) {
    return (
      await requestGitHub<RepositoryDetails>(
        repoApiPath(owner, name),
        token,
        signal,
      )
    ).data;
  },
  branches(
    owner: string,
    name: string,
    page: number,
    token: string | null,
    signal: AbortSignal,
  ) {
    return requestGitHub<{ name: string; protected: boolean }[]>(
      `${repoApiPath(owner, name)}/branches?per_page=100&page=${page}`,
      token,
      signal,
    );
  },
  async contents(
    owner: string,
    name: string,
    ref: string,
    path: string,
    token: string | null,
    signal: AbortSignal,
  ) {
    if (path.split("/").some((part) => part === "." || part === ".."))
      throw new Error("文件路径无效");
    return (
      await requestGitHub<RepoContent | RepoContent[]>(
        `${repoApiPath(owner, name)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?${new URLSearchParams({ ref })}`,
        token,
        signal,
      )
    ).data;
  },
  async readme(
    owner: string,
    name: string,
    ref: string,
    token: string | null,
    signal: AbortSignal,
  ): Promise<ProfileReadme | null> {
    try {
      const file = (
        await requestGitHub<RepoContent>(
          `${repoApiPath(owner, name)}/readme?${new URLSearchParams({ ref })}`,
          token,
          signal,
        )
      ).data;
      const markdown = decodeRepoText(file);
      return markdown === null
        ? null
        : {
            markdown,
            htmlUrl: file.html_url,
            rawUrl: file.download_url || file.html_url,
          };
    } catch (error) {
      if (error instanceof GitHubRequestError && error.status === 404)
        return null;
      throw error;
    }
  },
  async starred(
    owner: string,
    name: string,
    token: string,
    signal: AbortSignal,
  ) {
    try {
      await requestGitHub<void>(
        `/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
        token,
        signal,
      );
      return true;
    } catch (error) {
      if (error instanceof GitHubRequestError && error.status === 404)
        return false;
      throw error;
    }
  },
  async star(owner: string, name: string, enabled: boolean, token: string) {
    if (!token) throw new Error("请先登录");
    await requestGitHub<void>(
      `/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      token,
      new AbortController().signal,
      { method: enabled ? "PUT" : "DELETE" },
    );
  },
};
