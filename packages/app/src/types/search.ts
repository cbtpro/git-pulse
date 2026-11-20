export const SEARCH_CATEGORIES = [
  { id: "repositories", label: "仓库" },
  { id: "users", label: "用户" },
  { id: "organizations", label: "组织" },
  { id: "topics", label: "主题" },
  { id: "code", label: "代码" },
  { id: "commits", label: "提交记录" },
  { id: "issues", label: "Issues / PR" },
  { id: "pages", label: "GitHub Pages" },
] as const;
export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]["id"];
export type SearchScope = SearchCategory | "all";
export interface SearchHit {
  id: string;
  kind: SearchCategory;
  title: string;
  description: string;
  query: string;
  url: string;
  detail?: string;
}
export interface SearchGroup {
  kind: SearchCategory;
  hits: SearchHit[];
  total: number;
  error?: string;
  requestError?: Error;
  incomplete?: boolean;
  externalSearch?: string;
}
export interface SearchSuggestion {
  title: string;
  query: string;
}
export interface SearchSelection {
  hit: SearchHit;
  sourceQuery: string;
}

export interface SearchHistoryEntry {
  query: string;
  kind: SearchCategory;
}
