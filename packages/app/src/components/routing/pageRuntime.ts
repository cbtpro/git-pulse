import { createContext, useContext } from "react";
import type { Location, NavigationType } from "react-router-dom";

export const pageKey = (
  location: Pick<Location, "pathname" | "search" | "hash">,
) => location.pathname + location.search + location.hash;

export type PageHistory = {
  entries: Location[];
  index: number;
  section?: string;
};
// This is metadata about observed router entries, never an alternative navigator.
// Unknown POPs (reload/external history) reset it instead of guessing a target.
export function recordPageHistory(
  history: PageHistory | undefined,
  location: Location,
  action: NavigationType | string,
  section?: string,
  tabNavigation = false,
): PageHistory {
  const reset = (): PageHistory => ({
    entries: [location],
    index: 0,
    ...(section === undefined ? {} : { section }),
  });
  if (!history) return reset();
  const same = (entry: Location) =>
    entry.key === location.key && pageKey(entry) === pageKey(location);
  if (same(history.entries[history.index])) return history;
  // Tabs are top-level destinations, not a sequence of drill-down pages.
  // Only reset preview metadata: cached DOM and actual browser history survive.
  if (section !== history.section || (tabNavigation && action !== "POP"))
    return reset();
  if (action === "POP") {
    const index = history.entries.findIndex(same);
    return index < 0 ? reset() : { ...history, index };
  }
  const entries =
    action === "REPLACE"
      ? history.entries.map((entry, index) =>
          index === history.index ? location : entry,
        )
      : [...history.entries.slice(0, history.index + 1), location];
  const index = action === "REPLACE" ? history.index : entries.length - 1;
  const trim = Math.max(0, entries.length - 96);
  return { ...history, entries: entries.slice(trim), index: index - trim };
}
export const PageHistoryContext = createContext<PageHistory>({
  entries: [],
  index: 0,
});
export const PageActivity = createContext(true);
export const usePageActive = () => useContext(PageActivity);
export const PageScroll = createContext<() => void>(() => {});
export const usePageScrollToTop = () => useContext(PageScroll);
