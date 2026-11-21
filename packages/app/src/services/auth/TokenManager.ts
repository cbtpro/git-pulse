import {
  normalizeWorkspace,
  type AccountWorkspace,
} from "../../types/workspace";
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
  workspace?: AccountWorkspace;
}
export type AccountSummary = Omit<SavedAccount, "token" | "workspace">;
interface AccountVault {
  version: 2;
  generation?: string;
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
    return this.vault.accounts.map(
      ({ token: _token, workspace: _workspace, ...account }) => account,
    );
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

  static getGeneration() {
    return this.vault.generation || "legacy";
  }
  private static listeners = new Set<() => void>();
  private static channel: BroadcastChannel | undefined;
  static observeExternalChanges(listener: () => void) {
    this.listeners.add(listener);
    this.ensureChannel();
    return () => {
      this.listeners.delete(listener);
    };
  }
  private static ensureChannel() {
    if (!this.channel && typeof window.BroadcastChannel === "function") {
      this.channel = new window.BroadcastChannel("gitpulse-vault-changed");
      this.channel.onmessage = () => {
        void this.serialize(async () => {
          const value = await SecureStorage.read();
          this.vault = value ? validateVault(JSON.parse(value)) : emptyVault();
          this.listeners.forEach((notify) => notify());
          window.dispatchEvent(
            new CustomEvent("gitpulse:workspace", {
              detail: this.vault.activeId,
            }),
          );
        }).catch(() => undefined);
      };
    }
  }
  private static announce() {
    this.ensureChannel();
    this.channel?.postMessage("changed");
  }
  private static mutate(
    change: (latest: AccountVault) => AccountVault,
    signal?: AbortSignal,
    generation?: string,
  ): Promise<void> {
    const revision = this.revision;
    return this.serialize(async () => {
      let before: string | null = null,
        written: string | null = null;
      const result = await SecureStorage.update((raw) => {
        signal?.throwIfAborted();
        if (revision !== this.revision)
          throw new DOMException("Canceled", "AbortError");
        const latest = raw ? validateVault(JSON.parse(raw)) : emptyVault();
        if (
          generation !== undefined &&
          (latest.generation || "legacy") !== generation
        )
          throw new DOMException("账号授权已失效，请重新登录", "AbortError");
        before = raw;
        const next = change(latest);
        written = JSON.stringify(next);
        return written;
      });
      if (signal?.aborted || revision !== this.revision) {
        // Never roll a newer tab's changes back to our old snapshot.
        await SecureStorage.update((current) => {
          if (current === written) return before;
          if (!current || !written) return current;
          const latest = validateVault(JSON.parse(current));
          const prior = before
            ? validateVault(JSON.parse(before))
            : emptyVault();
          const ours = validateVault(JSON.parse(written));
          const accounts = latest.accounts.flatMap((account) => {
            const committed = ours.accounts.find(
              (item) => item.id === account.id,
            );
            const old = prior.accounts.find((item) => item.id === account.id);
            if (
              !committed ||
              committed.token !== account.token ||
              old?.token === committed.token
            )
              return [account];
            // Undo only credentials introduced by this canceled login. Never
            // restore an identity invalidated by a newer logout generation.
            return old && latest.generation === prior.generation
              ? [
                  {
                    ...account,
                    token: old.token,
                    mode: old.mode,
                    profile: old.profile,
                    username: old.username,
                  },
                ]
              : [];
          });
          const next = { ...latest, accounts };
          if (
            next.activeId &&
            !accounts.some((account) => account.id === next.activeId)
          )
            next.activeId = null;
          if (
            ours.pendingAuthorization?.id !== prior.pendingAuthorization?.id &&
            next.pendingAuthorization?.id === ours.pendingAuthorization?.id
          )
            delete next.pendingAuthorization;
          return JSON.stringify(next);
        });
        this.announce();
        throw signal?.reason || new DOMException("Canceled", "AbortError");
      }
      this.vault = result ? validateVault(JSON.parse(result)) : emptyVault();
      this.announce();
    });
  }
  static savePendingAuthorization(
    value: PendingAuthorization,
    signal: AbortSignal,
    generation = this.getGeneration(),
  ): Promise<void> {
    return this.mutate(
      (latest) => ({ ...latest, pendingAuthorization: { ...value } }),
      signal,
      generation,
    );
  }
  static clearPendingAuthorization(id?: string): Promise<void> {
    return this.mutate((latest) => {
      if (
        !latest.pendingAuthorization ||
        (id && latest.pendingAuthorization.id !== id)
      )
        return latest;
      const { pendingAuthorization: _pending, ...next } = latest;
      return { ...next, generation: crypto.randomUUID() };
    });
  }
  static loadSession(): Promise<SavedAccount | null> {
    const revision = this.revision;
    this.clearPassword();
    return this.serialize(async () => {
      const value = await SecureStorage.update((raw) => {
        if (raw) {
          validateVault(JSON.parse(raw));
          return raw;
        }
        const token = localStorage.getItem("github_token"),
          username = localStorage.getItem("github_username");
        if (!token || !username) return null;
        let profile: UserProfile | undefined;
        try {
          profile = JSON.parse(localStorage.getItem("auth-store") || "{}").state
            ?.userProfile;
        } catch {
          /* optional legacy profile */
        }
        const id = profile?.id
          ? String(profile.id)
          : `legacy:${username.toLowerCase()}`;
        return JSON.stringify({
          version: 2,
          activeId: id,
          accounts: [
            {
              id,
              token,
              username,
              profile,
              mode:
                localStorage.getItem("github_login_mode") === "oauth"
                  ? "oauth"
                  : "token",
            },
          ],
        });
      });
      this.deleteLegacy();
      if (revision !== this.revision) return null;
      this.vault = value ? validateVault(JSON.parse(value)) : emptyVault();
      return this.getActiveAccount();
    });
  }
  static saveSession(
    token: string,
    username: string,
    mode: LoginMode,
    profile?: UserProfile,
    signal?: AbortSignal,
    generation = this.getGeneration(),
  ): Promise<void> {
    return this.mutate(
      (latest) => {
        const id = profile?.id
          ? String(profile.id)
          : `legacy:${username.toLowerCase()}`;
        const existing = latest.accounts.find(
          (item) =>
            item.id === id ||
            item.username.toLowerCase() === username.toLowerCase(),
        );
        const account = { ...existing, id, token, username, mode, profile };
        const { pendingAuthorization: _pending, ...rest } = latest;
        return {
          ...rest,
          activeId: id,
          accounts: [
            ...latest.accounts.filter((item) => item !== existing),
            account,
          ],
        };
      },
      signal,
      generation,
    ).then(() => this.deleteLegacy());
  }
  static removeAccount(id: string): Promise<void> {
    ++this.revision;
    return this.mutate((latest) => ({
      version: 2,
      generation: crypto.randomUUID(),
      accounts: latest.accounts.filter((account) => account.id !== id),
      activeId: latest.activeId === id ? null : latest.activeId,
    })).then(() => this.deleteLegacy());
  }
  static updateProfile(id: string, profile: UserProfile): Promise<void> {
    return this.mutate((latest) => ({
      ...latest,
      accounts: latest.accounts.map((account) =>
        account.id === id
          ? { ...account, profile, username: profile.login }
          : account,
      ),
    }));
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
    return this.mutate((latest) => ({
      ...latest,
      accounts: latest.accounts.map((account) =>
        account.id === id
          ? { ...account, recentSearches: queries.slice(0, 10) }
          : account,
      ),
    }));
  }
  static getCustomPins(id: string): string[] | undefined {
    const pins = this.getAccount(id)?.customPins;
    return Array.isArray(pins)
      ? pins.filter((pin): pin is string => typeof pin === "string").slice(0, 6)
      : undefined;
  }
  static saveCustomPins(id: string, pins: string[] | undefined): Promise<void> {
    return this.mutate((latest) => {
      if (!latest.accounts.some((account) => account.id === id))
        throw new Error("账号已变更，请重新打开置顶设置。");
      const customPins = pins ? [...new Set(pins)].slice(0, 6) : undefined;
      return {
        ...latest,
        accounts: latest.accounts.map((account) =>
          account.id === id ? { ...account, customPins } : account,
        ),
      };
    });
  }
  static getWorkspace(id: string | null): AccountWorkspace {
    return normalizeWorkspace(id ? this.getAccount(id)?.workspace : undefined);
  }
  static updateWorkspace(
    id: string,
    update: (current: AccountWorkspace) => AccountWorkspace,
  ): Promise<void> {
    return this.mutate((latest) => {
      const account = latest.accounts.find((item) => item.id === id);
      if (!account) throw new Error("来源账号已移除，请重新添加账号。");
      const workspace = normalizeWorkspace(
        update(normalizeWorkspace(account.workspace)),
      );
      const next = {
        ...latest,
        accounts: latest.accounts.map((item) =>
          item.id === id ? { ...item, workspace } : item,
        ),
      };
      if (
        new TextEncoder().encode(JSON.stringify(next)).byteLength >
        12 * 1024 * 1024
      )
        throw new Error("本地工作区已满，请清理部分缓存或笔记。");
      return next;
    })
      .then(() =>
        window.dispatchEvent(
          new CustomEvent("gitpulse:workspace", { detail: id }),
        ),
      )
      .then(() => undefined);
  }
  static clearAll(): Promise<void> {
    ++this.revision;
    this.clearPassword();
    return this.serialize(async () => {
      const next = { ...emptyVault(), generation: crypto.randomUUID() };
      await SecureStorage.update(() => JSON.stringify(next), true);
      this.vault = next;
      this.deleteLegacy();
      this.announce();
    });
  }
}
