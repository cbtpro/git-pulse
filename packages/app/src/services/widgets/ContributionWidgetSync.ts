import type { ContributionCalendar } from "../../types/contributions";
import type { Language } from "../../i18n/languages";

const levels = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];
export interface WidgetSnapshot {
  version: 1;
  accountId: string | null;
  username: string | null;
  language: Language;
  status: "ready" | "loading" | "signedOut" | "unavailable";
  updatedAt: number | null;
  total: number;
  weeks: number;
  days: {
    date: string;
    weekday: number;
    week: number;
    count: number;
    level: number;
  }[];
}
export interface WidgetAccount {
  id: string;
  username: string;
  token: string;
}
export interface SyncState {
  syncing: boolean;
  updatedAt: number | null;
  error: "fetch" | "write" | null;
}

/** The only payload allowed across the native boundary: no credentials or profile data. */
export function widgetSnapshot(
  account: WidgetAccount | null,
  language: Language,
  calendar?: ContributionCalendar | null,
  updatedAt: number | null = null,
  status?: WidgetSnapshot["status"],
): WidgetSnapshot {
  return {
    version: 1,
    accountId: account?.id ?? null,
    username: account?.username ?? null,
    language,
    status:
      status ?? (account ? (calendar ? "ready" : "loading") : "signedOut"),
    updatedAt: calendar ? updatedAt : null,
    total: calendar?.totalContributions ?? 0,
    weeks: calendar?.weeks.length ?? 0,
    days:
      calendar?.weeks.flatMap((week, index) =>
        week.contributionDays.map((day) => ({
          date: day.date,
          weekday: day.weekday,
          week: index,
          count: day.contributionCount,
          level: Math.max(0, levels.indexOf(day.contributionLevel)),
        })),
      ) ?? [],
  };
}

export function createWidgetSynchronizer(deps: {
  fetch: (token: string, signal: AbortSignal) => Promise<ContributionCalendar>;
  write: (snapshot: WidgetSnapshot) => Promise<void>;
  changed: (state: SyncState) => void;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  let account: WidgetAccount | null = null;
  let language: Language = "zh-CN";
  let calendar: ContributionCalendar | null = null;
  let updatedAt: number | null = null;
  let syncedAt: number | null = null;
  let generation = 0;
  let disposed = false;
  let request: AbortController | null = null;
  let writes: Promise<void> = Promise.resolve();
  const state = (syncing: boolean, error: SyncState["error"] = null) =>
    deps.changed({ syncing, error, updatedAt: syncedAt });
  const write = (
    snapshot = widgetSnapshot(account, language, calendar, updatedAt),
  ) => {
    const current = generation;
    const next = writes.then(async () => {
      if (disposed || current !== generation) return;
      try {
        await deps.write(snapshot);
        if (!disposed && current === generation) {
          syncedAt = snapshot.updatedAt;
          state(Boolean(request));
        }
      } catch {
        if (!disposed && current === generation) state(false, "write");
      }
    });
    writes = next.catch(() => undefined);
    return next;
  };
  const accept = (data: ContributionCalendar, token: string) => {
    if (disposed || !account || token !== account.token) return;
    ++generation;
    request?.abort();
    request = null;
    calendar = data;
    updatedAt = now();
    state(false);
    return write();
  };
  const refresh = async (force = false) => {
    if (disposed || !account || (request && !force)) return;
    if (!force && updatedAt !== null && now() - updatedAt < 5 * 60_000) return;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const current = ++generation;
    const token = account.token;
    state(true);
    try {
      const data = await deps.fetch(token, controller.signal);
      if (disposed || controller.signal.aborted || current !== generation)
        return;
      await accept(data, token);
    } catch {
      if (disposed || controller.signal.aborted || current !== generation)
        return;
      request = null;
      // An account with no snapshot never falls back to another account's image.
      if (!calendar)
        await write(
          widgetSnapshot(account, language, null, null, "unavailable"),
        );
      state(false, "fetch");
    }
  };
  return {
    async setAccount(next: WidgetAccount | null, locale: Language) {
      if (disposed) return;
      const changed =
        account?.id !== next?.id || account?.token !== next?.token;
      const relabel =
        language !== locale || account?.username !== next?.username;
      language = locale;
      if (changed || (!account && !next)) {
        ++generation;
        request?.abort();
        request = null;
        account = next;
        calendar = null;
        updatedAt = null;
        syncedAt = null;
        state(Boolean(next));
        // Await erasure before fetching; a slow fetch cannot leave the previous account visible.
        await write();
        if (
          !disposed &&
          next &&
          account?.id === next.id &&
          account?.token === next.token &&
          !request &&
          !calendar
        )
          await refresh(true);
      } else if (relabel) {
        account = next;
        await write();
      }
    },
    refresh,
    accept,
    dispose() {
      disposed = true;
      ++generation;
      request?.abort();
      request = null;
    },
    settled: () => writes,
  };
}
