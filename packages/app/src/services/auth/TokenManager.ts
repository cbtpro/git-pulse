import { searchIntent } from "../../utils/searchIntent";
import { SEARCH_CATEGORIES, type SearchHistoryEntry } from "../../types/search";
import type { UserProfile, PendingAuthorization } from "../../types/auth";
import { SecureStorage } from "./SecureStorage";

export type LoginMode = "token" | "oauth";
export interface SavedAccount {
  id: string;
  token: string;
  username: string;
  mode: LoginMode;
  profile?: UserProfile;
  recentSearches?: (string | SearchHistoryEntry)[];
  customPins?: string[];
}
export type AccountSummary = Omit<SavedAccount, "token">;
interface AccountVault {
  version: 2;
  activeId: string | null;
  accounts: SavedAccount[];
  pendingAuthorization?: PendingAuthorization;
}
const emptyVault = (): AccountVault => ({
  version: 2,
  activeId: null,
  accounts: [],
});
const LEGACY_KEYS = [
  "github_token",
  "github_username",
  "github_password",
  "github_login_mode",
  "auth-store",
];

function validateVault(value: unknown): AccountVault {
  const vault = value as AccountVault;
  if (
    !vault ||
    vault.version !== 2 ||
    !Array.isArray(vault.accounts) ||
    vault.accounts.some(
      (account) =>
        !account ||
        typeof account !== "object" ||
        typeof account.id !== "string" ||
        !account.id ||
        typeof account.token !== "string" ||
        !account.token ||
        typeof account.username !== "string" ||
        !account.username ||
        !["token", "oauth"].includes(account.mode),
    ) ||
    new Set(vault.accounts.map((account) => account.id)).size !==
      vault.accounts.length ||
    (vault.activeId !== null &&
      !vault.accounts.some((account) => account.id === vault.activeId))
  ) {
    throw new Error("加密账号数据格式无效");
  }
  return vault;
}

/** Secrets live in memory while signed in; only authenticated ciphertext reaches storage. */
export class TokenManager {
  private static vault = emptyVault();
  private static revision = 0;
  private static queue: Promise<unknown> = Promise.resolve();

  private static serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private static deleteLegacy() {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  }
  static clearPassword() {
    localStorage.removeItem("github_password");
  }
  static getToken() {
    return this.getActiveAccount()?.token ?? null;
  }
  static getUsername() {
    return this.getActiveAccount()?.username ?? null;
  }
  static getLoginMode(): LoginMode {
    return this.getActiveAccount()?.mode ?? "token";
  }
  static getActiveAccount() {
    return (
      this.vault.accounts.find(
        (account) => account.id === this.vault.activeId,
      ) ?? null
    );
  }
  static getAccount(id: string) {
    return this.vault.accounts.find((account) => account.id === id) ?? null;
  }
  static getAccounts(): AccountSummary[] {
    return this.vault.accounts.map(({ token: _token, ...account }) => account);
  }

  static getPendingAuthorization(): PendingAuthorization | null {
    const value = this.vault.pendingAuthorization;
    if (
      !value ||
      !value.id ||
      !value.clientId ||
      !value.deviceCode ||
      !value.userCode ||
      !Number.isFinite(value.expiresAt) ||
      !Number.isFinite(value.nextPollAt) ||
      !Number.isFinite(value.interval) ||
      value.interval <= 0 ||
      (value.accessToken !== undefined && typeof value.accessToken !== "string")
    )
      return null;
    return { ...value };
  }

  static savePendingAuthorization(
    value: PendingAuthorization,
    signal: AbortSignal,
  ): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      signal.throwIfAborted();
      if (revision !== this.revision)
        throw new DOMException("Canceled", "AbortError");
      const previous = this.vault;
      const next = { ...previous, pendingAuthorization: { ...value } };
      await SecureStorage.write(JSON.stringify(next));
      if (signal.aborted || revision !== this.revision) {
        await SecureStorage.write(JSON.stringify(previous));
        throw signal.reason || new DOMException("Canceled", "AbortError");
      }
      this.vault = next;
    });
  }

  static clearPendingAuthorization(id?: string): Promise<void> {
    return this.serialize(async () => {
      if (
        !this.vault.pendingAuthorization ||
        (id && this.vault.pendingAuthorization.id !== id)
      )
        return;
      const { pendingAuthorization: _pending, ...next } = this.vault;
      await SecureStorage.write(JSON.stringify(next));
      this.vault = next;
    });
  }

  static loadSession(): Promise<SavedAccount | null> {
    const revision = this.revision;
    this.clearPassword();
    return this.serialize(async () => {
      const encrypted = await SecureStorage.read();
      let vault = encrypted
        ? validateVault(JSON.parse(encrypted))
        : emptyVault();
      if (!encrypted) {
        const token = localStorage.getItem("github_token");
        const username = localStorage.getItem("github_username");
        if (token && username) {
          let profile: UserProfile | undefined;
          try {
            profile = JSON.parse(localStorage.getItem("auth-store") || "{}")
              .state?.userProfile;
          } catch {
            /* Older optional profile cache may be malformed. */
          }
          const id = profile?.id
            ? String(profile.id)
            : `legacy:${username.toLowerCase()}`;
          const account: SavedAccount = {
            id,
            token,
            username,
            profile,
            mode:
              localStorage.getItem("github_login_mode") === "oauth"
                ? "oauth"
                : "token",
          };
          vault = { version: 2, activeId: id, accounts: [account] };
          await SecureStorage.write(JSON.stringify(vault));
        }
      }
      // Never remove the old credentials if encryption failed above.
      this.deleteLegacy();
      if (revision !== this.revision) return null;
      this.vault = vault;
      return this.getActiveAccount();
    });
  }

  static saveSession(
    token: string,
    username: string,
    mode: LoginMode,
    profile?: UserProfile,
    signal?: AbortSignal,
  ): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      signal?.throwIfAborted();
      if (revision !== this.revision)
        throw new DOMException("Canceled", "AbortError");
      const previous = this.vault;
      const id = profile?.id
        ? String(profile.id)
        : `legacy:${username.toLowerCase()}`;
      const index = previous.accounts.findIndex(
        (item) =>
          item.id === id ||
          item.username.toLowerCase() === username.toLowerCase(),
      );
      const account = {
        id,
        token,
        username,
        mode,
        profile,
        recentSearches: previous.accounts[index]?.recentSearches,
        customPins: previous.accounts[index]?.customPins,
      };
      const accounts = [...previous.accounts];
      if (index >= 0) accounts[index] = account;
      else accounts.push(account);
      const next: AccountVault = { version: 2, activeId: id, accounts };
      await SecureStorage.write(JSON.stringify(next));
      if (signal?.aborted || revision !== this.revision) {
        if (previous.accounts.length)
          await SecureStorage.write(JSON.stringify(previous));
        else await SecureStorage.clear();
        throw signal?.reason || new DOMException("Canceled", "AbortError");
      }
      this.vault = next;
      this.deleteLegacy();
    });
  }

  static removeAccount(id: string): Promise<void> {
    const revision = ++this.revision;
    const previous = this.vault;
    const next: AccountVault = {
      version: 2,
      accounts: previous.accounts.filter((account) => account.id !== id),
      activeId: previous.activeId === id ? null : previous.activeId,
    };
    this.vault = next;
    return this.serialize(async () => {
      try {
        if (next.accounts.length)
          await SecureStorage.write(JSON.stringify(next));
        else await SecureStorage.clear();
        this.deleteLegacy();
      } catch (error) {
        if (revision === this.revision) this.vault = previous;
        throw error;
      }
    });
  }
  static updateProfile(id: string, profile: UserProfile): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      if (revision !== this.revision || !this.getAccount(id)) return;
      const next = {
        ...this.vault,
        accounts: this.vault.accounts.map((account) =>
          account.id === id
            ? { ...account, profile, username: profile.login }
            : account,
        ),
      };
      await SecureStorage.write(JSON.stringify(next));
      if (revision === this.revision) this.vault = next;
    });
  }
  static getRecentSearches(id: string): string[] {
    return this.getSearchHistory(id).map((entry) => entry.query);
  }
  static getSearchHistory(id: string): SearchHistoryEntry[] {
    const history = this.getAccount(id)?.recentSearches;
    if (!Array.isArray(history)) return [];
    return history
      .flatMap((item) => {
        const query = typeof item === "string" ? item : item?.query;
        if (typeof query !== "string" || !query.trim() || query.length > 1024)
          return [];
        const kind =
          typeof item !== "string" &&
          SEARCH_CATEGORIES.some((category) => category.id === item.kind)
            ? item.kind
            : searchIntent(query).scope || "repositories";
        return [{ query, kind }];
      })
      .slice(0, 10);
  }
  static saveRecentSearches(
    id: string,
    queries: (string | SearchHistoryEntry)[],
  ): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      if (revision !== this.revision || !this.getAccount(id)) return;
      const next = {
        ...this.vault,
        accounts: this.vault.accounts.map((account) =>
          account.id === id
            ? { ...account, recentSearches: queries.slice(0, 10) }
            : account,
        ),
      };
      await SecureStorage.write(JSON.stringify(next));
      if (revision === this.revision) this.vault = next;
    });
  }
  static getCustomPins(id: string): string[] | undefined {
    const pins = this.getAccount(id)?.customPins;
    return Array.isArray(pins)
      ? pins.filter((pin): pin is string => typeof pin === "string").slice(0, 6)
      : undefined;
  }
  static saveCustomPins(id: string, pins: string[] | undefined): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      if (revision !== this.revision || !this.getAccount(id))
        throw new Error("账号已变更，请重新打开置顶设置。");
      const customPins = pins ? [...new Set(pins)].slice(0, 6) : undefined;
      const next = {
        ...this.vault,
        accounts: this.vault.accounts.map((account) =>
          account.id === id ? { ...account, customPins } : account,
        ),
      };
      await SecureStorage.write(JSON.stringify(next));
      if (revision !== this.revision)
        throw new Error("账号已变更，请重新打开置顶设置。");
      this.vault = next;
    });
  }
  static clearAll(): Promise<void> {
    ++this.revision;
    this.vault = emptyVault();
    this.clearPassword();
    return this.serialize(async () => {
      await SecureStorage.clear();
      this.deleteLegacy();
    });
  }
}
