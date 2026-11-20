import { invoke, isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { requestGitHub } from "./GitHubService";
import { repoApiPath } from "./RepositoryService";
interface DownloadResult {
  url?: string | null;
  text?: string | null;
  truncated: boolean;
}
export async function githubDownload(
  owner: string,
  repo: string,
  kind: "job" | "artifact" | "release",
  id: number,
  token: string | null,
  name: string,
) {
  repoApiPath(owner, repo);
  if (!token) throw new Error("请先登录");
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("下载地址无效");
  if (isTauri()) {
    const result = await invoke<DownloadResult>("github_download", {
      owner,
      repo,
      kind,
      id,
      token,
    });
    if (kind === "job")
      return { text: result.text || "", truncated: result.truncated };
    if (!result.url || !result.url.startsWith("https://"))
      throw new Error("下载链接不可用");
    await openUrl(result.url);
    return null;
  }
  const path = `${repoApiPath(owner, repo)}/${kind === "job" ? `actions/jobs/${id}/logs` : kind === "artifact" ? `actions/artifacts/${id}/zip` : `releases/assets/${id}`}`;
  if (kind === "job")
    return (
      await requestGitHub<{ text: string; truncated: boolean }>(
        path,
        token,
        new AbortController().signal,
        { responseType: "text" },
      )
    ).data;
  const { data } = await requestGitHub<Blob>(
    path,
    token,
    new AbortController().signal,
    {
      responseType: "blob",
      accept: kind === "release" ? "application/octet-stream" : undefined,
    },
  );
  const url = URL.createObjectURL(data),
    link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[\\/\x00-\x1f]/g, "_");
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return null;
}
