export interface CachedDocument {
  key: string;
  repository: string;
  kind: "readme" | "issue" | "pull";
  number?: number;
  ref?: string;
  title: string;
  body: string;
  url: string;
  savedAt: number;
  comments?: { author: string; body: string; url: string }[];
}
export interface CommentDraft {
  key: string;
  repository: string;
  kind: "issue" | "pull";
  number: number;
  body: string;
  updatedAt: number;
}
export interface StarNote {
  group: string;
  tags: string[];
  note: string;
  status: "none" | "later" | "read" | "using";
}
export interface AccountWorkspace {
  stars: Record<string, StarNote>;
  subscriptions: string[];
  documents: Record<string, CachedDocument>;
  drafts: Record<string, CommentDraft>;
  offlineEnabled?: boolean;
}
export const emptyWorkspace = (): AccountWorkspace => ({
  stars: {},
  subscriptions: [],
  documents: {},
  drafts: {},
});
export function normalizeWorkspace(value: unknown): AccountWorkspace {
  const input = value as Partial<AccountWorkspace> | undefined;
  const stars: Record<string, StarNote> = {};
  for (const [repo, item] of Object.entries(input?.stars || {}).slice(
    0,
    2000,
  )) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !item || typeof item !== "object")
      continue;
    stars[repo] = {
      group: typeof item.group === "string" ? item.group.slice(0, 80) : "",
      tags: Array.isArray(item.tags)
        ? [
            ...new Set(
              item.tags
                .filter((tag) => typeof tag === "string")
                .map((tag) => tag.slice(0, 40)),
            ),
          ].slice(0, 12)
        : [],
      note: typeof item.note === "string" ? item.note.slice(0, 4000) : "",
      status: ["none", "later", "read", "using"].includes(item.status)
        ? item.status
        : "none",
    };
  }
  const subscriptions = Array.isArray(input?.subscriptions)
    ? [
        ...new Set(
          input.subscriptions
            .filter(
              (name) =>
                typeof name === "string" && /^[\w.-]+\/[\w.-]+$/.test(name),
            )
            .map((name) => name.toLowerCase()),
        ),
      ].slice(0, 30)
    : [];
  const documents: Record<string, CachedDocument> = {},
    drafts: Record<string, CommentDraft> = {};
  for (const [key, item] of Object.entries(input?.documents || {}).slice(
    0,
    60,
  )) {
    if (
      !item ||
      typeof item !== "object" ||
      item.key !== key ||
      typeof item.body !== "string" ||
      item.body.length > 300_000 ||
      !["readme", "issue", "pull"].includes(item.kind) ||
      typeof item.repository !== "string" ||
      !/^https:\/\/github\.com\//.test(item.url || "") ||
      typeof item.title !== "string" ||
      key !==
        `${item.repository.toLowerCase()}/${item.kind}/${item.kind === "readme" ? item.ref : item.number}` ||
      !Number.isFinite(item.savedAt)
    )
      continue;
    documents[key] = {
      ...item,
      comments: Array.isArray(item.comments)
        ? item.comments
            .filter(
              (comment) =>
                comment &&
                typeof comment.author === "string" &&
                typeof comment.body === "string" &&
                typeof comment.url === "string",
            )
            .slice(0, 20)
            .map((comment) => ({ ...comment }))
        : undefined,
    };
  }
  for (const [key, item] of Object.entries(input?.drafts || {}).slice(0, 100)) {
    if (
      !item ||
      typeof item !== "object" ||
      item.key !== key ||
      typeof item.body !== "string" ||
      !["issue", "pull"].includes(item.kind) ||
      typeof item.repository !== "string" ||
      key !== `${item.repository.toLowerCase()}/${item.kind}/${item.number}` ||
      !Number.isSafeInteger(item.number) ||
      item.number < 1
    )
      continue;
    drafts[key] = { ...item, body: item.body.slice(0, 65536) };
  }
  return {
    stars,
    subscriptions,
    documents,
    drafts,
    offlineEnabled: input?.offlineEnabled !== false,
  };
}
