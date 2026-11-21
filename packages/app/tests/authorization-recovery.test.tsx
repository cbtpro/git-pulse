import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuthorizationRecovery } from "../src/hooks/useAuthorizationRecovery";
import { useAuthStore } from "../src/stores/authStore";
import { TokenManager } from "../src/services/auth/TokenManager";
import { GitHubAuthService } from "../src/services/auth/GitHubAuthService";
import { authorizationBrowserFailed } from "../src/services/auth/AuthorizationLifecycle";

const profile = { id: 41, login: "resumed-user" } as never;
beforeEach(async () => {
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "resume-client");
  useAuthStore.getState().cancelLogin();
  await TokenManager.clearAll();
  useAuthStore.setState({
    isLoggedIn: false,
    token: null,
    error: null,
    authorization: null,
  });
  await TokenManager.savePendingAuthorization(
    {
      id: "resume-attempt",
      clientId: "resume-client",
      deviceCode: "private-code",
      userCode: "KEEP-CODE",
      interval: 5,
      nextPollAt: Date.now(),
      expiresAt: Date.now() + 900000,
      accessToken: "approved-token",
    },
    new AbortController().signal,
  );
});
afterEach(() => {
  useAuthStore.getState().cancelLogin();
  authorizationBrowserFailed();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("recovers when the foreground event arrives before a suspended profile request fails", async () => {
  let finish!: (result: { success: false; error: string }) => void;
  const login = vi
    .spyOn(GitHubAuthService, "loginWithToken")
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ success: true, token: "approved-token", profile });
  const view = renderHook(() => useAuthorizationRecovery(true));
  const pending = useAuthStore.getState().loginWithGitHub();
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new Event("gitpulse:app-state"));
  expect(login).toHaveBeenCalledTimes(1);
  vi.useFakeTimers();
  await act(async () => {
    finish({ success: false, error: "temporarily offline" });
    await pending;
  });
  expect(useAuthStore.getState().authorization?.userCode).toBe("KEEP-CODE");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  await vi.waitFor(() => expect(useAuthStore.getState().isLoggedIn).toBe(true));
  expect(login).toHaveBeenCalledTimes(2);
  expect(login.mock.calls.every(([token]) => token === "approved-token")).toBe(
    true,
  );
  expect(TokenManager.getPendingAuthorization()).toBeNull();
  view.unmount();
});

it("does not resurrect canceled authorization on foreground, online, or retry timers", async () => {
  vi.spyOn(GitHubAuthService, "loginWithToken").mockResolvedValue({
    success: false,
    error: "offline",
  });
  const view = renderHook(() => useAuthorizationRecovery(true));
  await act(async () => {
    await useAuthStore.getState().loginWithGitHub();
  });
  useAuthStore.getState().cancelLogin();
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new Event("online"));
  await TokenManager.loadSession();
  expect(TokenManager.getPendingAuthorization()).toBeNull();
  expect(GitHubAuthService.loginWithToken).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().authorization).toBeNull();
  view.unmount();
});
