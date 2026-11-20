import { github, type Notification } from "./GitHubService";
import { TokenManager } from "../auth/TokenManager";
export interface InboxSource {
  id: string;
  username: string;
  token: string;
}
export interface AccountNotification extends Notification {
  accountId: string;
  accountName: string;
}
interface Stream {
  source: InboxSource;
  items: AccountNotification[];
  page: number;
  hasNext: boolean;
  error?: Error;
}
export function notificationKey(item: AccountNotification) {
  return `${item.accountId}:${item.id}`;
}
/** Merge account streams by timestamp; fetch another source page only when it could change the requested page. */
export class UnifiedInboxFeed {
  private streams: Stream[];
  constructor(
    sources: InboxSource[],
    private all: boolean,
    private participating: boolean,
  ) {
    this.streams = sources.map((source) => ({
      source,
      items: [],
      page: 0,
      hasNext: true,
    }));
  }
  private async fetch(streams: Stream[], signal: AbortSignal) {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, streams.length) }, async () => {
        while (next < streams.length) {
          const stream = streams[next++];
          signal.throwIfAborted();
          try {
            if (!stream.source.token)
              throw new Error("来源账号已移除，请重新添加账号。");
            const result = await github.notifications(
              this.all,
              this.participating,
              stream.page + 1,
              stream.source.token,
              signal,
            );
            signal.throwIfAborted();
            const map = new Map(stream.items.map((item) => [item.id, item]));
            for (const item of result.data)
              map.set(item.id, {
                ...item,
                accountId: stream.source.id,
                accountName: stream.source.username,
              });
            stream.items = [...map.values()];
            stream.page++;
            stream.hasNext = result.hasNext && result.data.length > 0;
            stream.error = undefined;
          } catch (error) {
            signal.throwIfAborted();
            stream.error =
              error instanceof Error ? error : new Error("加载失败，请重试");
          }
        }
      }),
    );
  }
  async load(page: number, signal: AbortSignal) {
    const end = page * 20;
    await this.fetch(
      this.streams.filter((stream) => stream.page === 0 && !stream.error),
      signal,
    );
    let merged: AccountNotification[] = [];
    while (true) {
      signal.throwIfAborted();
      merged = this.streams
        .flatMap((stream) => stream.items)
        .sort(
          (a, b) =>
            b.updated_at.localeCompare(a.updated_at) ||
            notificationKey(a).localeCompare(notificationKey(b)),
        );
      const threshold = merged[end - 1]?.updated_at;
      const needed = this.streams.filter(
        (stream) =>
          stream.hasNext &&
          !stream.error &&
          (!threshold ||
            !stream.items.length ||
            stream.items.at(-1)!.updated_at >= threshold),
      );
      if (!needed.length) break;
      await this.fetch(needed, signal);
    }
    return {
      data: merged.slice((page - 1) * 20, end),
      hasNext:
        merged.length > end ||
        this.streams.some((stream) => stream.hasNext && !stream.error),
      errors: this.streams
        .filter((stream) => stream.error)
        .map((stream) => ({
          accountId: stream.source.id,
          accountName: stream.source.username,
          error: stream.error!,
        })),
    };
  }
}
export async function markSourceNotificationRead(item: AccountNotification) {
  const account = TokenManager.getAccount(item.accountId);
  if (!account?.token) throw new Error("来源账号已移除，请重新添加账号。");
  await github.markNotificationRead(
    item.id,
    account.token,
    new AbortController().signal,
  );
}
