import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "../src/services/auth/TokenManager";
import type { PendingAuthorization } from "../src/types/auth";
import { authorizeWithGitHub } from "../src/services/auth/GitHubDeviceAuth";
import { requestGitHubOAuth } from "../src/services/auth/GitHubOAuthTransport";

vi.mock("../src/services/auth/GitHubOAuthTransport", () => ({
  requestGitHubOAuth: vi.fn(),
  GITHUB_VERIFICATION_URL: "https://github.com/login/device",
}));
const persisted = vi.hoisted(() => ({
  value: null as PendingAuthorization | null,
}));
vi.mock("../src/services/auth/TokenManager", () => ({
  TokenManager: {
    getGeneration: () => "fixture-generation",
    getPendingAuthorization: () =>
      persisted.value ? { ...persisted.value } : null,
    savePendingAuthorization: vi.fn(async (value, signal) => {
      signal.throwIfAborted();
      persisted.value = { ...value };
    }),
    clearPendingAuthorization: vi.fn(async () => {
      persisted.value = null;
    }),
  },
}));
const request = vi.mocked(requestGitHubOAuth);
const code = {
  device_code: "private-device-code",
  user_code: "ABCD-EFGH",
  verification_uri: "https://github.com/login/device",
  expires_in: 900,
  interval: 5,
};

beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset();
  persisted.value = null;
});
afterEach(() => vi.useRealTimers());

describe("GitHub device authorization", () => {
  it("waits for approval, respects the polling interval and returns the access token", async () => {
    request
      .mockResolvedValueOnce(code)
      .mockResolvedValueOnce({ error: "authorization_pending" })
      .mockResolvedValueOnce({ access_token: "gho_test_token" });
    const onCode = vi.fn();
    const promise = authorizeWithGitHub(
      onCode,
      new AbortController().signal,
      "public-client-id",
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenNthCalledWith(
      1,
      "device/code",
      expect.objectContaining({ scope: expect.stringContaining("read:org") }),
      expect.any(AbortSignal),
    );
    expect(onCode).toHaveBeenCalledWith(
      expect.objectContaining({ userCode: "ABCD-EFGH" }),
    );
    expect(JSON.stringify(onCode.mock.calls)).not.toContain(
      "private-device-code",
    );
    await vi.advanceTimersByTimeAsync(4999);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5001);
    await expect(promise).resolves.toBe("gho_test_token");
    expect(request).toHaveBeenLastCalledWith(
      "oauth/access_token",
      {
        client_id: "public-client-id",
        device_code: "private-device-code",
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
      expect.any(AbortSignal),
    );
  });

  it("backs off by at least five seconds after slow_down", async () => {
    request
      .mockResolvedValueOnce(code)
      .mockResolvedValueOnce({ error: "slow_down", interval: 12 })
      .mockResolvedValueOnce({ access_token: "gho_test_token" });
    const promise = authorizeWithGitHub(
      vi.fn(),
      new AbortController().signal,
      "id",
    );
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(11999);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe("gho_test_token");
  });

  it.each([
    ["access_denied", "取消"],
    ["expired_token", "过期"],
    ["incorrect_client_credentials", "配置无效"],
    ["device_flow_disabled", "未开启"],
  ])("explains GitHub error %s", async (error, message) => {
    request.mockResolvedValueOnce({ error });
    await expect(
      authorizeWithGitHub(vi.fn(), new AbortController().signal, "id"),
    ).rejects.toThrow(message);
  });

  it("expires locally even when GitHub continues returning pending", async () => {
    request
      .mockResolvedValueOnce({ ...code, expires_in: 8 })
      .mockResolvedValue({ error: "authorization_pending" });
    const promise = authorizeWithGitHub(
      vi.fn(),
      new AbortController().signal,
      "id",
    );
    const assertion = expect(promise).rejects.toThrow("过期");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stops polling immediately on cancel", async () => {
    request.mockResolvedValueOnce(code);
    const controller = new AbortController();
    const promise = authorizeWithGitHub(vi.fn(), controller.signal, "id");
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await assertion;
    await vi.advanceTimersByTimeAsync(60000);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects a late token response after cancellation", async () => {
    let finish!: (value: Record<string, unknown>) => void;
    request.mockResolvedValueOnce(code).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const promise = authorizeWithGitHub(vi.fn(), controller.signal, "id");
    const assertion = expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(5000);
    controller.abort();
    finish({ access_token: "late-token" });
    await assertion;
  });

  it.each([
    { ...code, verification_uri: "https://example.com/phishing" },
    { ...code, interval: -1 },
    { ...code, expires_in: 0 },
    { ...code, device_code: "" },
  ])(
    "rejects malformed or unexpected authorization instructions",
    async (response) => {
      request.mockResolvedValueOnce(response);
      const onCode = vi.fn();
      await expect(
        authorizeWithGitHub(onCode, new AbortController().signal, "id"),
      ).rejects.toThrow("授权信息不完整");
      expect(onCode).not.toHaveBeenCalled();
    },
  );

  it("does not request authorization without a configured application", async () => {
    await expect(
      authorizeWithGitHub(vi.fn(), new AbortController().signal, ""),
    ).rejects.toThrow("尚未配置");
    expect(request).not.toHaveBeenCalled();
  });
});

it("resumes the saved code after a WebView restart without requesting another code", async () => {
  persisted.value = {
    id: "attempt",
    clientId: "id",
    deviceCode: "saved-code",
    userCode: "ABCD-EFGH",
    expiresAt: Date.now() + 900000,
    interval: 12,
    nextPollAt: Date.now() + 12000,
  };
  request.mockResolvedValue({ access_token: "restored-token" });
  const promise = authorizeWithGitHub(
    vi.fn(),
    new AbortController().signal,
    "id",
  );
  await vi.advanceTimersByTimeAsync(11999);
  expect(request).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await expect(promise).resolves.toBe("restored-token");
  expect(request).toHaveBeenCalledOnce();
  expect(request.mock.calls[0][1].device_code).toBe("saved-code");
  expect(TokenManager.getPendingAuthorization()?.accessToken).toBe(
    "restored-token",
  );
});

it("keeps authorization after a transport timeout and backs off before retrying", async () => {
  request
    .mockResolvedValueOnce(code)
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce({ access_token: "recovered-token" });
  const promise = authorizeWithGitHub(
    vi.fn(),
    new AbortController().signal,
    "id",
  );
  await vi.advanceTimersByTimeAsync(14999);
  expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  await expect(promise).resolves.toBe("recovered-token");
});

it("pauses token exchange in the background and resumes once when visible", async () => {
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  request
    .mockResolvedValueOnce(code)
    .mockResolvedValueOnce({ access_token: "foreground-token" });
  const promise = authorizeWithGitHub(
    vi.fn(),
    new AbortController().signal,
    "id",
  );
  await vi.advanceTimersByTimeAsync(20000);
  expect(request).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("pageshow"));
  await expect(promise).resolves.toBe("foreground-token");
  expect(request).toHaveBeenCalledTimes(2);
});

it("restores an exchanged token without exchanging the device code twice", async () => {
  persisted.value = {
    id: "attempt",
    clientId: "id",
    deviceCode: "saved-code",
    userCode: "ABCD-EFGH",
    expiresAt: Date.now() + 900000,
    interval: 5,
    nextPollAt: Date.now(),
    accessToken: "checkpoint-token",
  };
  await expect(
    authorizeWithGitHub(vi.fn(), new AbortController().signal, "id"),
  ).resolves.toBe("checkpoint-token");
  expect(request).not.toHaveBeenCalled();
});

it("retains an exchanged token after the user code expires while the app is suspended", async () => {
  persisted.value = {
    id: "attempt",
    clientId: "id",
    deviceCode: "saved-code",
    userCode: "ABCD-EFGH",
    expiresAt: Date.now() - 1000,
    interval: 5,
    nextPollAt: Date.now(),
    accessToken: "already-approved-token",
  };
  request.mockRejectedValue(new Error("must not request another code"));
  await expect(
    authorizeWithGitHub(vi.fn(), new AbortController().signal, "id"),
  ).resolves.toBe("already-approved-token");
  expect(request).not.toHaveBeenCalled();
});

it("uses native suspend/resume even if the WebView reports itself visible", async () => {
  const appWindow = window as Window & { __GITPULSE_APP_ACTIVE__?: boolean };
  appWindow.__GITPULSE_APP_ACTIVE__ = false;
  request
    .mockResolvedValueOnce(code)
    .mockResolvedValueOnce({ access_token: "native-resumed" });
  const promise = authorizeWithGitHub(
    vi.fn(),
    new AbortController().signal,
    "id",
  );
  await vi.advanceTimersByTimeAsync(20000);
  expect(request).toHaveBeenCalledTimes(1);
  appWindow.__GITPULSE_APP_ACTIVE__ = true;
  // Some WebViews publish visibility after the native foreground callback.
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  window.dispatchEvent(new Event("gitpulse:app-state"));
  await expect(promise).resolves.toBe("native-resumed");
  expect(request).toHaveBeenCalledTimes(2);
  delete appWindow.__GITPULSE_APP_ACTIVE__;
});
