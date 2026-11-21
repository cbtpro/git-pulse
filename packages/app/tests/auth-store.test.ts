import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../src/stores/authStore";
import { GitHubAuthService } from "../src/services/auth/GitHubAuthService";
import { TokenManager } from "../src/services/auth/TokenManager";
import * as deviceAuth from "../src/services/auth/GitHubDeviceAuth";

const profile = {
  id: 1,
  login: "octocat",
  name: "Octocat",
  avatar_url: "https://example.com/avatar.png",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  localStorage.clear();
  useAuthStore.getState().cancelLogin();
  await TokenManager.clearAll();
  useAuthStore.setState({
    isLoggedIn: false,
    token: null,
    username: null,
    userProfile: null,
    loginMode: null,
    accounts: [],
    activeAccountId: null,
    error: null,
    isLoading: false,
  });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  useAuthStore.getState().cancelLogin();
  vi.unstubAllGlobals();
});

describe("login sessions", () => {
  it("stores the real OAuth token, canonical username and profile after validating /user", async () => {
    localStorage.setItem("github_password", "legacy-password");
    vi.spyOn(deviceAuth, "authorizeWithGitHub").mockResolvedValue(
      "gho_test_token",
    );
    fetchMock.mockResolvedValue(response(profile));
    expect(await useAuthStore.getState().loginWithGitHub(vi.fn())).toBe(true);
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: true,
      isLoading: false,
      token: "gho_test_token",
      username: "octocat",
      userProfile: profile,
      loginMode: "oauth",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer gho_test_token",
        }),
      }),
    );
    expect(TokenManager.getToken()).toBe("gho_test_token");
    expect(localStorage.getItem("github_password")).toBeNull();
    expect(GitHubAuthService.getAuthHeader().Authorization).toBe(
      "Bearer gho_test_token",
    );
    expect(localStorage.getItem("auth-store")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("trims pasted tokens and passes the same token to subsequent requests", async () => {
    fetchMock.mockResolvedValue(response(profile));
    expect(
      await useAuthStore.getState().loginWithToken("  ghp_test_token\n"),
    ).toBe(true);
    expect(useAuthStore.getState().token).toBe("ghp_test_token");
    expect(TokenManager.getToken()).toBe("ghp_test_token");
  });

  it("restores OAuth sessions after restart from the saved token", async () => {
    await TokenManager.saveSession("gho_saved", "outdated-name", "oauth");
    fetchMock.mockResolvedValue(response(profile));
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState()).toMatchObject({
      token: "gho_saved",
      username: "octocat",
      loginMode: "oauth",
      isLoggedIn: true,
    });
    expect(TokenManager.getUsername()).toBe("octocat");
  });

  it("clears rejected credentials but preserves them during network failure", async () => {
    await TokenManager.saveSession("gho_saved", "octocat", "oauth");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await useAuthStore.getState().checkAuth();
    expect(TokenManager.getToken()).toBe("gho_saved");
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().error).toContain("网络");
    fetchMock.mockResolvedValueOnce(response({}, 401));
    await useAuthStore.getState().checkAuth();
    expect(TokenManager.getToken()).toBeNull();
  });

  it("does not persist a failed or malformed OAuth identity", async () => {
    vi.spyOn(deviceAuth, "authorizeWithGitHub").mockResolvedValue(
      "gho_invalid",
    );
    fetchMock.mockResolvedValueOnce(response({}, 401));
    expect(await useAuthStore.getState().loginWithGitHub(vi.fn())).toBe(false);
    expect(TokenManager.getToken()).toBeNull();
    fetchMock.mockResolvedValueOnce(response({}));
    expect(await useAuthStore.getState().loginWithToken("ghp_test")).toBe(
      false,
    );
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("deletes legacy passwords without sending Basic auth", async () => {
    localStorage.setItem("github_password", "legacy-password");
    localStorage.setItem("github_username", "octocat");
    localStorage.setItem("github_login_mode", "username_password");
    await useAuthStore.getState().checkAuth();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("github_password")).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("cannot log in after the user cancels while identity validation is pending", async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = useAuthStore.getState().loginWithToken("ghp_late");
    await Promise.resolve();
    useAuthStore.getState().cancelLogin();
    finish(response(profile));
    expect(await pending).toBe(false);
    expect(TokenManager.getToken()).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: false,
      isLoading: false,
    });
  });

  it("logs out without leaving token, username, mode, password or profile behind", async () => {
    fetchMock.mockResolvedValue(response(profile));
    await useAuthStore.getState().loginWithToken("ghp_test");
    await useAuthStore.getState().logout();
    for (const key of [
      "github_token",
      "github_username",
      "github_password",
      "github_login_mode",
    ]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: false,
      token: null,
      userProfile: null,
    });
    expect(GitHubAuthService.getAuthHeader().Authorization).toBeUndefined();
  });
});

describe("multiple accounts", () => {
  const second = { ...profile, id: 2, login: "second", name: "Second Account" };
  async function addBoth() {
    fetchMock
      .mockResolvedValueOnce(response(profile))
      .mockResolvedValueOnce(response(second));
    await useAuthStore.getState().loginWithToken("first-fixture");
    await useAuthStore.getState().loginWithToken("second-fixture");
  }

  it("adds, switches, restores and refreshes identities without duplicating an account", async () => {
    await addBoth();
    expect(useAuthStore.getState().accounts).toHaveLength(2);
    expect(useAuthStore.getState().activeAccountId).toBe("2");
    fetchMock.mockImplementation(async () =>
      response({ ...profile, name: "Updated Name" }),
    );
    expect(await useAuthStore.getState().switchAccount("1")).toBe(true);
    expect(useAuthStore.getState()).toMatchObject({
      token: "first-fixture",
      activeAccountId: "1",
      userProfile: { name: "Updated Name" },
    });
    useAuthStore.setState({
      isLoggedIn: false,
      token: null,
      userProfile: null,
      activeAccountId: null,
      accounts: [],
    });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: true,
      activeAccountId: "1",
    });
    await useAuthStore.getState().loginWithToken("renewed-first-fixture");
    expect(useAuthStore.getState().accounts).toHaveLength(2);
    expect(TokenManager.getToken()).toBe("renewed-first-fixture");
    expect(
      useAuthStore
        .getState()
        .accounts.every((account) => !("token" in account)),
    ).toBe(true);
  });

  it("keeps the current account when adding or switching fails, and removes only revoked credentials", async () => {
    await addBoth();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect(await useAuthStore.getState().switchAccount("1")).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: true,
      token: "second-fixture",
      activeAccountId: "2",
    });
    expect(TokenManager.getAccounts()).toHaveLength(2);
    fetchMock.mockResolvedValueOnce(response({}, 401));
    expect(await useAuthStore.getState().switchAccount("1")).toBe(false);
    expect(TokenManager.getAccounts().map((account) => account.id)).toEqual([
      "2",
    ]);
    fetchMock.mockResolvedValueOnce(response({}, 401));
    expect(
      await useAuthStore.getState().loginWithToken("invalid-fixture"),
    ).toBe(false);
    expect(useAuthStore.getState().token).toBe("second-fixture");
  });

  it("removes one account while retaining the other and preserves the signed-out choice on restart", async () => {
    await addBoth();
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({
      isLoggedIn: false,
      activeAccountId: null,
    });
    expect(TokenManager.getAccounts().map((account) => account.id)).toEqual([
      "1",
    ]);
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    fetchMock.mockResolvedValueOnce(response(profile));
    expect(await useAuthStore.getState().switchAccount("1")).toBe(true);
    expect(useAuthStore.getState().token).toBe("first-fixture");
  });

  it("leaves the current identity active when encrypted persistence fails", async () => {
    await addBoth();
    const { SecureStorage } =
      await import("../src/services/auth/SecureStorage");
    vi.spyOn(SecureStorage, "write").mockRejectedValueOnce(
      new Error("storage full"),
    );
    fetchMock.mockResolvedValueOnce(response(profile));
    expect(await useAuthStore.getState().switchAccount("1")).toBe(false);
    expect(useAuthStore.getState().activeAccountId).toBe("2");
    expect(TokenManager.getToken()).toBe("second-fixture");
  });
});

it("retains a known encrypted identity when GitHub is temporarily rate limited during startup", async () => {
  await TokenManager.saveSession(
    "saved-token",
    profile.login,
    "oauth",
    profile,
  );
  fetchMock.mockResolvedValueOnce(response({}, 429));
  await useAuthStore.getState().checkAuth();
  expect(useAuthStore.getState()).toMatchObject({
    isLoggedIn: true,
    token: "saved-token",
    activeAccountId: String(profile.id),
  });
});

it("restores an interrupted OAuth login without blocking startup or losing the existing account", async () => {
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "resume-client");
  await TokenManager.saveSession("existing-token", "existing", "token", {
    ...profile,
    id: 2,
    login: "existing",
  } as never);
  await TokenManager.savePendingAuthorization(
    {
      id: "pending",
      clientId: "resume-client",
      deviceCode: "private-code",
      userCode: "CODE-1234",
      interval: 5,
      nextPollAt: Date.now(),
      expiresAt: Date.now() + 900000,
      accessToken: "exchanged-token",
    },
    new AbortController().signal,
  );
  let finish!: (value: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await useAuthStore.getState().checkAuth();
  await vi.waitFor(() =>
    expect(useAuthStore.getState().authorization?.userCode).toBe("CODE-1234"),
  );
  expect(useAuthStore.getState().isLoading).toBe(true);
  expect(useAuthStore.getState().username).toBe("existing");
  expect(JSON.stringify(useAuthStore.getState().authorization)).not.toContain(
    "private-code",
  );
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  finish(response(profile));
  await vi.waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false));
  expect(useAuthStore.getState().token).toBe("exchanged-token");
  expect(TokenManager.getAccounts()).toHaveLength(2);
  await TokenManager.loadSession();
  expect(TokenManager.getPendingAuthorization()).toBeNull();
  expect(TokenManager.getToken()).toBe("exchanged-token");
  vi.unstubAllEnvs();
});

it("explicit cancellation removes pending OAuth from the encrypted vault", async () => {
  await TokenManager.savePendingAuthorization(
    {
      id: "pending",
      clientId: "id",
      deviceCode: "private-code",
      userCode: "CODE-1234",
      interval: 5,
      nextPollAt: Date.now(),
      expiresAt: Date.now() + 900000,
    },
    new AbortController().signal,
  );
  useAuthStore.getState().cancelLogin();
  await TokenManager.loadSession();
  expect(TokenManager.getPendingAuthorization()).toBeNull();
});

it("keeps the displayed authorization after a transient profile failure on return", async () => {
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "resume-client");
  const session = {
    id: "returning-attempt",
    clientId: "resume-client",
    deviceCode: "private-code",
    userCode: "KEEP-CODE",
    interval: 5,
    nextPollAt: Date.now(),
    expiresAt: Date.now() + 900000,
    accessToken: "checkpoint-token",
  };
  await TokenManager.savePendingAuthorization(
    session,
    new AbortController().signal,
  );
  fetchMock.mockRejectedValueOnce(
    new TypeError("network not ready after resume"),
  );
  expect(await useAuthStore.getState().loginWithGitHub()).toBe(false);
  expect(useAuthStore.getState().authorization?.userCode).toBe("KEEP-CODE");
  expect(TokenManager.getPendingAuthorization()?.accessToken).toBe(
    "checkpoint-token",
  );
  fetchMock.mockResolvedValueOnce(response(profile));
  expect(await useAuthStore.getState().loginWithGitHub()).toBe(true);
  expect(useAuthStore.getState().token).toBe("checkpoint-token");
  expect(useAuthStore.getState().authorization).toBeNull();
  vi.unstubAllEnvs();
});
