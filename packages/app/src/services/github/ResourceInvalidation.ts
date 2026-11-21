/** In-memory dependency tracking keyed by each loader's AbortSignal. Credentials
 * never enter DOM events or persistent cache keys; subscriptions die on unmount. */
type Kind =
  | "discussion"
  | "actions"
  | "repository"
  | "stars"
  | "notifications"
  | "code"
  | "releases"
  | "pages";
type Scope = { kind: Kind; repository?: string };
type Dependency = { account: string | null; scopes: Scope[] };
export type ResourceReadSet = Dependency[];
const readers = new Map<
  AbortSignal,
  { dependencies: Dependency[]; refresh: () => void }
>();
const matches = (a: Scope, b: Scope) =>
  a.kind === b.kind &&
  (!a.repository || !b.repository || a.repository === b.repository);
function scopes(path: string): Scope[] {
  const url = new URL(path, "https://api.github.com");
  const repo = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(.*))?$/);
  if (repo) {
    const repository = decodeURIComponent(repo[1]).toLowerCase();
    const tail = repo[2] || "";
    const kind: Kind = /^(issues|pulls)(\/|$)/.test(tail)
      ? "discussion"
      : /^actions(\/|$)/.test(tail)
        ? "actions"
        : /^(contents|readme|branches)(\/|$)/.test(tail)
          ? "code"
          : /^releases(\/|$)/.test(tail)
            ? "releases"
            : /^pages(\/|$)/.test(tail)
              ? "pages"
              : "repository";
    return [{ kind, repository }];
  }
  const star = url.pathname.match(/^\/user\/starred(?:\/([^/]+\/[^/]+))?$/);
  if (star) return [{ kind: "stars", repository: star[1]?.toLowerCase() }];
  if (url.pathname.startsWith("/notifications"))
    return [{ kind: "notifications" }];
  if (url.pathname === "/search/issues") {
    const repositories = [
      ...(url.searchParams.get("q") || "").matchAll(/\brepo:([^\s]+)/gi),
    ];
    return repositories.length
      ? repositories.map((m) => ({
          kind: "discussion",
          repository: m[1].toLowerCase(),
        }))
      : [{ kind: "discussion" }];
  }
  if (url.pathname === "/search/repositories" || /\/repos$/.test(url.pathname))
    return [{ kind: "repository" }];
  return [];
}
export function observeResourceReads(
  signal: AbortSignal,
  refresh: () => void,
  dependencies: ResourceReadSet = [],
) {
  readers.set(signal, { dependencies, refresh });
  return () => {
    readers.delete(signal);
  };
}
export function recordResourceRead(
  signal: AbortSignal,
  path: string,
  account: string | null,
  body?: RequestInit["body"],
) {
  const reader = readers.get(signal);
  if (!reader) return;
  const dependencies =
    path === "/graphql" && String(body).includes("stargazerCount")
      ? [{ kind: "repository" as const }]
      : scopes(path);
  if (
    !reader.dependencies.some(
      (entry) =>
        entry.account === account &&
        JSON.stringify(entry.scopes) === JSON.stringify(dependencies),
    )
  )
    reader.dependencies.push({ account, scopes: dependencies });
}
export function invalidateResourceWrite(path: string, account: string | null) {
  const affected = scopes(path);
  // Writes also affect repository counts and overview cards. PR metadata lives
  // on /issues, so both issue and PR readers intentionally share one category.
  for (const scope of [...affected]) {
    if (
      scope.repository &&
      (scope.kind === "discussion" || scope.kind === "stars")
    )
      affected.push({ kind: "repository", repository: scope.repository });
  }
  for (const reader of readers.values()) {
    if (
      reader.dependencies.some(
        (dependency) =>
          dependency.account === account &&
          dependency.scopes.some((read) =>
            affected.some((write) => matches(read, write)),
          ),
      )
    )
      reader.refresh();
  }
}
