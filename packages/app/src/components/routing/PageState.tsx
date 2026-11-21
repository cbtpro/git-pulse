import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useLocation,
  useNavigationType,
  type Location,
} from "react-router-dom";
import { isMainPagePath, isRepositoryPath } from "../../types/navigation";

import { navigationSection } from "./navigationTrail";
import { PageHistoryContext, pageKey, recordPageHistory } from "./pageRuntime";
export { usePageActive, usePageScrollToTop } from "./pageRuntime";
export { RetainedRoutes } from "./RetainedRoutes";

const MAX_PAGES = 12;
const Destinations = createContext<(path: string) => Location | undefined>(
  () => undefined,
);
const Sources = createContext<(key: string) => Location | undefined>(
  () => undefined,
);

/** Remounted at the account boundary; no page data is shared between identities. */
export function PageStateProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const action = useNavigationType();
  const destinations = useRef(new Map<string, Location>());
  const sources = useRef(new Map<string, Location | undefined>());
  const previous = useRef<Location>();
  // Associate each history entry with its source list, including query changes
  // inside a repository. POP restores the association instead of inventing one.
  if (!sources.current.has(location.key)) {
    const from = previous.current;
    const source =
      action !== "POP" && from && isRepositoryPath(location.pathname)
        ? isRepositoryPath(from.pathname)
          ? sources.current.get(from.key)
          : isMainPagePath(from.pathname)
            ? from
            : undefined
        : undefined;
    sources.current.set(location.key, source);
    if (sources.current.size > MAX_PAGES * 8)
      sources.current.delete(sources.current.keys().next().value!);
  }
  const section = navigationSection(
    location,
    sources.current.get(location.key),
  );
  const [history, setHistory] = useState(() =>
    recordPageHistory(undefined, location, action, section),
  );
  if (
    history.entries[history.index]?.key !== location.key ||
    pageKey(history.entries[history.index]) !== pageKey(location)
  )
    setHistory(
      recordPageHistory(
        history,
        location,
        action,
        section,
        location.state?.navigationIntent === "tab",
      ),
    );
  previous.current = location;
  // Navigation links restore the latest URL, including search filters and pagination.
  destinations.current.set(location.pathname, location);
  if (destinations.current.size > MAX_PAGES * 2)
    destinations.current.delete(destinations.current.keys().next().value!);
  const destination = useCallback(
    (path: string) => destinations.current.get(path),
    [],
  );
  const source = useCallback((key: string) => sources.current.get(key), []);
  return (
    <Destinations.Provider value={destination}>
      <Sources.Provider value={source}>
        <PageHistoryContext.Provider value={history}>
          {children}
        </PageHistoryContext.Provider>
      </Sources.Provider>
    </Destinations.Provider>
  );
}

export function usePageSource() {
  const source = useContext(Sources);
  return source(useLocation().key);
}

export function restoredDestination(location: Location) {
  return {
    to: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
    state: location.state?.aggregateSearch
      ? { ...location.state, aggregateSearch: false }
      : location.state,
  };
}

export function usePageDestination() {
  const remembered = useContext(Destinations);
  return (path: string) => {
    const location = remembered(path);
    return location
      ? restoredDestination(location)
      : { to: path, state: undefined };
  };
}

/** Switching top-level menus restores their page but starts a new Back boundary. */
export function useTabDestination() {
  const destination = usePageDestination();
  return (path: string) => {
    const target = destination(path);
    return {
      ...target,
      state: { ...target.state, navigationIntent: "tab" },
    };
  };
}
