import { useEffect, useState } from "react";
import { searchCategory, searchPages } from "../services/github/SearchService";
import { cachedGitHubPages, type PagesSite } from "../services/github/ProfileService";
import {
  SEARCH_CATEGORIES,
  type SearchCategory,
  type SearchGroup,
  type SearchScope,
} from "../types/search";

export function useAggregateSearch(
  query: string,
  scope: SearchScope,
  token: string | null,
  composing: boolean,
) {
  const [result, setResult] = useState<{
    query: string;
    scope: SearchScope;
    groups: Partial<Record<SearchCategory, SearchGroup>>;
    pending: SearchCategory[];
  }>({ query: "", scope, groups: {}, pending: [] });
  const [pages, setPages] = useState<{
    token: string | null;
    data?: PagesSite[];
    error?: string;
  }>({ token: null });
  const hasQuery = Boolean(query.trim());
  const needsPages =
    hasQuery && (scope === "all" || scope === "pages") && !composing;
  useEffect(() => {
    if (!token || !needsPages || (pages.token === token && pages.data)) return;
    const controller = new AbortController();
    setPages({ token });
    const timer = window.setTimeout(() => {
      cachedGitHubPages(token, controller.signal).then(
        (data) => {
          if (!controller.signal.aborted) setPages({ token, data });
        },
        () => {
          if (!controller.signal.aborted)
            setPages({ token, error: "无法加载 Pages，请稍后重试" });
        },
      );
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, needsPages]);
  useEffect(() => {
    if (!hasQuery || composing) {
      setResult({ query, scope, groups: {}, pending: [] });
      return;
    }
    const controller = new AbortController();
    const kinds = SEARCH_CATEGORIES.map((category) => category.id).filter(
      (kind) => kind !== "pages" && (scope === "all" || kind === scope),
    );
    setResult({ query, scope, groups: {}, pending: kinds });
    const timeout = window.setTimeout(async () => {
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(3, kinds.length) }, async () => {
          for (;;) {
            if (controller.signal.aborted) return;
            const kind = kinds[next++] as
              Exclude<SearchCategory, "pages"> | undefined;
            if (!kind) return;
            try {
              const group = await searchCategory(
                kind,
                query.trim(),
                token,
                controller.signal,
              );
              if (!controller.signal.aborted)
                setResult((current) => ({
                  ...current,
                  groups: { ...current.groups, [kind]: group },
                  pending: current.pending.filter((item) => item !== kind),
                }));
            } catch {
              if (controller.signal.aborted) return;
            }
          }
        }),
      );
    }, 600);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, scope, token, composing, hasQuery]);
  const current: Pick<typeof result, "groups" | "pending"> =
    result.query === query && result.scope === scope
      ? result
      : { groups: {}, pending: [] };
  const groups = { ...current.groups };
  let pending: SearchCategory[] = current.pending;
  if (hasQuery && (scope === "all" || scope === "pages") && !composing) {
    if (!token)
      groups.pages = {
        kind: "pages",
        hits: [],
        total: 0,
        error: "登录后可搜索你的 GitHub Pages",
      };
    else if (pages.token === token && pages.data)
      groups.pages = searchPages(pages.data, query);
    else if (pages.token === token && pages.error)
      groups.pages = { kind: "pages", hits: [], total: 0, error: pages.error };
    else pending = [...pending, "pages"];
  }
  return { groups, pending, loading: pending.length > 0 };
}
