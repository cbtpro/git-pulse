import { createContext, useContext } from "react";
import type { Location, NavigationType } from "react-router-dom";

export const pageKey = (
  location: Pick<Location, "pathname" | "search" | "hash">,
) => location.pathname + location.search + location.hash;

export type PageHistory = { entries: Location[]; index: number };
// This is metadata about observed router entries, never an alternative navigator.
// Unknown POPs (reload/external history) reset it instead of guessing a target.
export function recordPageHistory(
  history: PageHistory | undefined,
  location: Location,
  action: NavigationType | string,
): PageHistory {
  if (!history) return { entries: [location], index: 0 };
  const same = (entry: Location) =>
    entry.key === location.key && pageKey(entry) === pageKey(location);
  if (same(history.entries[history.index])) return history;
  if (action === "POP") {
    const index = history.entries.findIndex(same);
    return index < 0
      ? { entries: [location], index: 0 }
      : { ...history, index };
  }
  const entries =
    action === "REPLACE"
      ? history.entries.map((entry, index) =>
          index === history.index ? location : entry,
        )
      : [...history.entries.slice(0, history.index + 1), location];
  const index = action === "REPLACE" ? history.index : entries.length - 1;
  const trim = Math.max(0, entries.length - 96);
  return { entries: entries.slice(trim), index: index - trim };
}
export const PageHistoryContext = createContext<PageHistory>({
  entries: [],
  index: 0,
});
export const PageActivity = createContext(true);
export const usePageActive = () => useContext(PageActivity);
export const PageScroll = createContext<() => void>(() => {});
export const usePageScrollToTop = () => useContext(PageScroll);
