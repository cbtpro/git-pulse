import { clearGitHubRequestState } from "../services/github/GitHubService";
import { create } from "zustand";
import { GitHubAuthService } from "../services/auth/GitHubAuthService";
import {
  authorizeWithGitHub,
  pendingGitHubAuthorization,
  type DeviceAuthorization,
} from "../services/auth/GitHubDeviceAuth";
import {
  TokenManager,
  type LoginMode,
  type AccountSummary,
} from "../services/auth/TokenManager";
import type { UserProfile } from "../types/auth";
export type { UserProfile } from "../types/auth";

export interface AuthState {
  authorization: DeviceAuthorization | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  username: string | null;
  userProfile: UserProfile | null;
  loginMode: LoginMode | null;
  accounts: AccountSummary[];
  activeAccountId: string | null;
  loginWithToken: (token: string) => Promise<boolean>;
  loginWithGitHub: (
    onCode?: (code: DeviceAuthorization) => void,
  ) => Promise<boolean>;
  switchAccount: (id: string) => Promise<boolean>;
  removeAccount: (id: string) => Promise<void>;
  cancelLogin: () => void;
  fetchUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
}
const signedOut = {
  isLoggedIn: false,
  token: null,
  username: null,
  userProfile: null,
  loginMode: null,
  activeAccountId: null,
};
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "GitHub 登录失败，请检查网络后重试";

// Auth state stays in memory. TokenManager persists all accounts in an encrypted vault.
export const useAuthStore = create<AuthState>()((set, get) => {
  let pending: AbortController | null = null;
  let operation = 0;
  const authenticate = async (
    getToken: (signal: AbortSignal) => Promise<string>,
    mode: LoginMode,
    restoring = false,
    accountId?: string,
  ): Promise<boolean> => {
    pending?.abort();
    ++operation;
    const controller = new AbortController();
    pending = controller;
    set({ isLoading: true, error: null });
    try {
      const token = await getToken(controller.signal);
      controller.signal.throwIfAborted();
      const result = await GitHubAuthService.loginWithToken(
        token,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      if (!result.success) {
        if (result.invalidCredentials && accountId) {
          await TokenManager.removeAccount(accountId);
          controller.signal.throwIfAborted();
          set({ accounts: TokenManager.getAccounts() });
        }
        if (restoring) {
          const cached = accountId ? TokenManager.getAccount(accountId) : null;
          if (
            !result.invalidCredentials &&
            cached?.profile?.login &&
            typeof cached.profile.id === "number"
          ) {
            set({
              isLoggedIn: true,
              token: cached.token,
              username: cached.username,
              userProfile: cached.profile,
              loginMode: cached.mode,
              activeAccountId: cached.id,
              accounts: TokenManager.getAccounts(),
              error: result.error,
            });
            return true;
          }
          set(signedOut);
        }
        if (result.invalidCredentials && mode === "oauth") {
          await TokenManager.clearPendingAuthorization();
          controller.signal.throwIfAborted();
        }
        set({ error: result.error });
        return false;
      }
      await TokenManager.saveSession(
        result.token,
        result.profile.login,
        mode,
        result.profile,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      if (get().token !== result.token) clearGitHubRequestState();
      set({
        isLoggedIn: true,
        token: result.token,
        username: result.profile.login,
        userProfile: result.profile,
        loginMode: mode,
        accounts: TokenManager.getAccounts(),
        activeAccountId: TokenManager.getActiveAccount()!.id,
        error: null,
      });
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        if (restoring) set(signedOut);
        set({ error: errorMessage(error) });
      }
      return false;
    } finally {
      if (pending === controller) {
        pending = null;
        set({ isLoading: false, authorization: null });
      }
    }
  };
  return {
    ...signedOut,
    authorization: null,
    accounts: [],
    isLoading: false,
    error: null,
    loginWithToken: (token) => {
      get().cancelLogin();
      return authenticate(async () => token, "token");
    },
    loginWithGitHub: (onCode) => {
      if (pending && get().authorization) return Promise.resolve(false);
      return authenticate(
        (signal) =>
          authorizeWithGitHub((code) => {
            if (signal.aborted) return;
            set({ authorization: code });
            onCode?.(code);
          }, signal),
        "oauth",
      );
    },
    switchAccount: async (id) => {
      if (get().activeAccountId === id && get().isLoggedIn) return true;
      const account = TokenManager.getAccount(id);
      if (!account) return false;
      get().cancelLogin();
      return authenticate(async () => account.token, account.mode, false, id);
    },
    cancelLogin: () => {
      ++operation;
      pending?.abort();
      pending = null;
      set({ isLoading: false, authorization: null });
      const current = operation;
      void TokenManager.clearPendingAuthorization().catch((error) => {
        if (current === operation) set({ error: errorMessage(error) });
      });
    },
    removeAccount: async (id) => {
      get().cancelLogin();
      const current = operation;
      const previous = get();
      if (previous.activeAccountId === id) {
        clearGitHubRequestState();
        set(signedOut);
      }
      set({ isLoading: true, error: null });
      try {
        await TokenManager.removeAccount(id);
        set({ accounts: TokenManager.getAccounts() });
      } catch (error) {
        if (current === operation)
          set({
            isLoggedIn: previous.isLoggedIn,
            token: previous.token,
            username: previous.username,
            userProfile: previous.userProfile,
            loginMode: previous.loginMode,
            activeAccountId: previous.activeAccountId,
            error: errorMessage(error),
          });
      } finally {
        if (current === operation) set({ isLoading: false });
      }
    },
    logout: async () => {
      const active = get().activeAccountId;
      if (active) await get().removeAccount(active);
      else {
        get().cancelLogin();
        set({ ...signedOut, error: null });
      }
    },
    fetchUserProfile: async () => {
      const { token, activeAccountId } = get();
      if (!token || !activeAccountId) return;
      const result = await GitHubAuthService.loginWithToken(token);
      if (result.success && get().token === token)
        get().updateUserProfile(result.profile);
    },
    updateUserProfile: (profile) => {
      const id = get().activeAccountId;
      if (!id) return;
      set({ userProfile: profile });
      void TokenManager.updateProfile(id, profile)
        .then(() => set({ accounts: TokenManager.getAccounts() }))
        .catch((error) => set({ error: errorMessage(error) }));
    },
    clearError: () => set({ error: null }),
    checkAuth: async () => {
      pending?.abort();
      pending = null;
      set({ authorization: null });
      const current = ++operation;
      try {
        const account = await TokenManager.loadSession();
        if (current !== operation) return;
        set({ accounts: TokenManager.getAccounts() });
        if (pendingGitHubAuthorization()) {
          if (account?.profile)
            set({
              isLoggedIn: true,
              token: account.token,
              username: account.username,
              userProfile: account.profile,
              loginMode: account.mode,
              activeAccountId: account.id,
            });
          // Do not block application startup on the user's browser approval.
          void get().loginWithGitHub();
          return;
        }
        await TokenManager.clearPendingAuthorization();
        if (current !== operation) return;
        if (!account) {
          set({ ...signedOut, error: null });
          return;
        }
        await authenticate(
          async () => account.token,
          account.mode,
          true,
          account.id,
        );
      } catch (error) {
        if (current === operation)
          set({ ...signedOut, error: errorMessage(error) });
      }
    },
  };
});
