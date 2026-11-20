import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  openGitHubAuthorization,
  requestGitHubOAuth,
} from "../src/services/auth/GitHubOAuthTransport";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(isTauri).mockReturnValue(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("uses the same-origin OAuth proxy in the browser", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ user_code: "ABCD-EFGH" })),
    );
  vi.stubGlobal("fetch", fetchMock);
  await requestGitHubOAuth(
    "device/code",
    { client_id: "public-id" },
    new AbortController().signal,
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/github/login/device/code",
    expect.objectContaining({ method: "POST" }),
  );
  expect(String(fetchMock.mock.calls[0][1].body)).toBe("client_id=public-id");
});

it("uses the native Rust bridge in Tauri and never fetches OAuth across origins", async () => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockResolvedValue({ user_code: "ABCD-EFGH" });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await requestGitHubOAuth(
    "device/code",
    { client_id: "public-id" },
    new AbortController().signal,
  );
  expect(invoke).toHaveBeenCalledWith("github_oauth_request", {
    endpoint: "device/code",
    params: { client_id: "public-id" },
  });
  expect(fetchMock).not.toHaveBeenCalled();
  await openGitHubAuthorization();
  expect(invoke).toHaveBeenLastCalledWith("open_github_authorization");
});

it("explains missing web hosting proxy instead of treating an HTML fallback as OAuth", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>static app</html>")),
  );
  await expect(
    requestGitHubOAuth("device/code", {}, new AbortController().signal),
  ).rejects.toThrow("未提供 GitHub 授权服务");
});

it("opens only the official GitHub device authorization page", async () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  await openGitHubAuthorization();
  expect(open).toHaveBeenCalledWith(
    "https://github.com/login/device",
    "_blank",
    "noopener,noreferrer",
  );
});

it("times out a native task that never replies and allows another attempt", async () => {
  vi.useFakeTimers();
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementationOnce(() => new Promise(() => {}));
  const pending = requestGitHubOAuth(
    "device/code",
    {},
    new AbortController().signal,
  );
  const failed = expect(pending).rejects.toThrow("授权请求超时");
  await vi.advanceTimersByTimeAsync(25000);
  await failed;
  vi.mocked(invoke).mockResolvedValueOnce({ user_code: "NEW-CODE" });
  await expect(
    requestGitHubOAuth("device/code", {}, new AbortController().signal),
  ).resolves.toEqual({ user_code: "NEW-CODE" });
  expect(vi.getTimerCount()).toBe(0);
});

it("cancels an in-flight native request immediately and ignores a late reply", async () => {
  vi.useFakeTimers();
  vi.mocked(isTauri).mockReturnValue(true);
  let finish!: (data: unknown) => void;
  vi.mocked(invoke).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  const pending = requestGitHubOAuth("device/code", {}, controller.signal);
  controller.abort();
  await expect(pending).rejects.toBe(controller.signal.reason);
  finish({ user_code: "OLD-CODE" });
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

it("does not invoke native OAuth for an already cancelled login", async () => {
  vi.mocked(isTauri).mockReturnValue(true);
  const controller = new AbortController();
  controller.abort();
  await expect(
    requestGitHubOAuth("device/code", {}, controller.signal),
  ).rejects.toBe(controller.signal.reason);
  expect(invoke).not.toHaveBeenCalled();
});
