import { beforeEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ invoke: vi.fn(), openUrl: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: native.invoke,
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: native.openUrl }));
vi.mock("../src/services/github/GitHubService", () => ({
  requestGitHub: vi.fn(),
  clearGitHubRequestState: vi.fn(),
}));
import { githubDownload } from "../src/services/github/GitHubDownloads";
beforeEach(() => vi.clearAllMocks());
it("accepts a file delivered by the native 200 stream handler without opening a URL", async () => {
  native.invoke.mockResolvedValue({ delivered: true, truncated: false });
  await githubDownload("owner", "repo", "release", 7, "fixture", "asset.zip");
  expect(native.invoke).toHaveBeenCalledWith("github_download", {
    owner: "owner",
    repo: "repo",
    kind: "release",
    id: 7,
    token: "fixture",
    name: "asset.zip",
  });
  expect(native.openUrl).not.toHaveBeenCalled();
});
it("opens signed HTTPS redirects and rejects unsafe returned URLs", async () => {
  native.invoke.mockResolvedValue({
    url: "https://example.com/signed",
    delivered: false,
  });
  await githubDownload("owner", "repo", "artifact", 7, "fixture", "asset.zip");
  expect(native.openUrl).toHaveBeenCalledWith("https://example.com/signed");
  native.openUrl.mockClear();
  native.invoke.mockResolvedValue({ url: "file:///private/path" });
  await expect(
    githubDownload("owner", "repo", "release", 7, "fixture", "asset.zip"),
  ).rejects.toThrow("下载链接不可用");
  expect(native.openUrl).not.toHaveBeenCalled();
});
it("preserves bounded job log results", async () => {
  native.invoke.mockResolvedValue({
    text: "log",
    truncated: true,
    delivered: false,
  });
  expect(
    await githubDownload("owner", "repo", "job", 7, "fixture", "job.txt"),
  ).toEqual({ text: "log", truncated: true });
});
