import type { SearchCategory } from "../types/search";
const aliases: Record<string, SearchCategory> = {
  repo: "repositories",
  repository: "repositories",
  repositories: "repositories",
  user: "users",
  users: "users",
  org: "organizations",
  organization: "organizations",
  organizations: "organizations",
  topic: "topics",
  topics: "topics",
  code: "code",
  commit: "commits",
  commits: "commits",
  issue: "issues",
  issues: "issues",
  pr: "issues",
  pages: "pages",
  page: "pages",
};
export function searchIntent(input: string): {
  scope?: SearchCategory;
  explicit?: boolean;
  searchQuery: string;
  repositoryQuery: string;
} {
  const query = input.trim();
  const explicit = /(?:^|\s)type:\s*([\w-]+)(?=\s|$)/i.exec(query);
  if (explicit && aliases[explicit[1].toLowerCase()]) {
    const text = query.replace(explicit[0], " ").trim();
    return {
      scope: aliases[explicit[1].toLowerCase()],
      explicit: true,
      searchQuery: text,
      repositoryQuery: text,
    };
  }
  if (/(?:^|\s)is:\s*(?:issue|pr)(?=\s|$)/i.test(query))
    return {
      scope: "issues",
      searchQuery: query.replace(/is:\s+/g, "is:"),
      repositoryQuery: query,
    };
  const prefix =
    /^(repo|user|org|topic|code|commit|issue|pr|pages):\s*(.*)$/i.exec(query);
  if (prefix) {
    const type = prefix[1].toLowerCase(),
      text = prefix[2];
    const repositoryQuery = `${type}:${text}`;
    return {
      scope: aliases[type],
      searchQuery:
        type === "repo"
          ? repositoryQuery
          : type === "user" || type === "org"
            ? `${text}${text ? " in:login" : ""}`
            : type === "pr"
              ? `${text} is:pr`
              : text,
      repositoryQuery,
    };
  }
  return { searchQuery: query, repositoryQuery: query };
}
