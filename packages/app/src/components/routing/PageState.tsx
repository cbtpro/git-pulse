import { ConfigProvider } from "@arco-design/web-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Routes, useLocation, type Location } from "react-router-dom";

const MAX_PAGES = 12;
const urlKey = (location: Location) =>
  location.pathname + location.search + location.hash;
const Destinations = createContext<(path: string) => Location | undefined>(
  () => undefined,
);
const PageActivity = createContext(true);
export const usePageActive = () => useContext(PageActivity);

/** Remounted at the account boundary; no page data is shared between identities. */
export function PageStateProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const destinations = useRef(new Map<string, Location>());
  // Navigation links restore the latest URL, including search filters and pagination.
  destinations.current.set(location.pathname, location);
  if (destinations.current.size > MAX_PAGES * 2)
    destinations.current.delete(destinations.current.keys().next().value!);
  const destination = useCallback(
    (path: string) => destinations.current.get(path),
    [],
  );
  return (
    <Destinations.Provider value={destination}>
      {children}
    </Destinations.Provider>
  );
}

export function usePageDestination() {
  const remembered = useContext(Destinations);
  return (path: string) => {
    const location = remembered(path);
    return {
      to: location
        ? { pathname: path, search: location.search, hash: location.hash }
        : path,
      state: location?.state?.aggregateSearch
        ? { ...location.state, aggregateSearch: false }
        : location?.state,
    };
  };
}

type ScrollSnapshot = {
  pathname: string;
  x: number;
  y: number;
  nested: { element: Element; x: number; y: number }[];
};

function PageFrame({
  active,
  location,
  children,
  register,
}: {
  active: boolean;
  location: Location;
  children: ReactNode;
  register: (path: string, element: HTMLDivElement | null) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const setContainer = useCallback(
    (element: HTMLDivElement | null) => {
      container.current = element;
      register(location.pathname, element);
    },
    [location.pathname, register],
  );
  const popupContainer = useCallback(
    () => container.current || document.body,
    [],
  );
  return (
    <div
      ref={setContainer}
      hidden={!active}
      aria-hidden={!active || undefined}
      data-route-page={location.pathname}
    >
      <PageActivity.Provider value={active}>
        <ConfigProvider
          getPopupContainer={popupContainer}
          effectGlobalModal={false}
          effectGlobalNotice={false}
          componentConfig={{
            Modal: {
              getPopupContainer: popupContainer,
              escToExit: active,
            },
            Drawer: {
              getPopupContainer: popupContainer,
              escToExit: active,
            },
          }}
        >
          <Routes location={location}>{children}</Routes>
        </ConfigProvider>
      </PageActivity.Provider>
    </div>
  );
}

/** Keep visited route instances mounted, with a bounded LRU cache. */
export function RetainedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [previous, setPrevious] = useState(location);
  const [pages, setPages] = useState([location]);
  const containers = useRef(new Map<string, HTMLDivElement>());
  const scroll = useRef(new Map<string, ScrollSnapshot>());
  const register = useCallback(
    (path: string, element: HTMLDivElement | null) => {
      if (element) containers.current.set(path, element);
      else containers.current.delete(path);
    },
    [],
  );

  if (previous !== location) {
    // Capture before React hides the old page: afterwards a shorter destination
    // can clamp window.scrollY and destroy the previous reading position.
    const root = containers.current.get(previous.pathname);
    scroll.current.set(urlKey(previous), {
      pathname: previous.pathname,
      x: window.scrollX,
      y: window.scrollY,
      nested: Array.from(root?.querySelectorAll("*") || [])
        .filter((element) => element.scrollTop || element.scrollLeft)
        .map((element) => ({
          element,
          x: element.scrollLeft,
          y: element.scrollTop,
        })),
    });
    if (scroll.current.size > MAX_PAGES * 4)
      scroll.current.delete(scroll.current.keys().next().value!);
    const retained = [
      ...pages.filter((page) => page.pathname !== location.pathname),
      location,
    ].slice(-MAX_PAGES);
    for (const [key, snapshot] of scroll.current) {
      if (!retained.some((page) => page.pathname === snapshot.pathname))
        scroll.current.delete(key);
    }
    setPrevious(location);
    setPages(retained);
  }

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const focusedPage =
      document.activeElement?.closest<HTMLElement>("[data-route-page]");
    if (focusedPage?.hidden)
      document.getElementById("main-content")?.focus({ preventScroll: true });
    const saved = scroll.current.get(urlKey(location));
    const restore = () => {
      for (const item of saved?.nested || []) {
        if (item.element.isConnected) {
          item.element.scrollLeft = item.x;
          item.element.scrollTop = item.y;
        }
      }
      window.scrollTo({
        left: saved?.x || 0,
        top: saved?.y || 0,
        behavior: "instant",
      });
    };
    restore();
    // Returning to another query can briefly show a loading placeholder. Wait
    // for its height to recover, but stop as soon as the user starts interacting.
    let settled: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    const frame = requestAnimationFrame(restore);
    const cancel = () => {
      cancelAnimationFrame(frame);
      clearTimeout(settled);
      clearTimeout(timeout);
      observer?.disconnect();
    };
    const root = containers.current.get(location.pathname);
    if (saved && root && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        clearTimeout(settled);
        if (
          document.documentElement.scrollHeight - window.innerHeight >=
          saved.y
        ) {
          restore();
          settled = setTimeout(cancel, 250);
        }
      });
      observer.observe(root);
      timeout = setTimeout(cancel, 10000);
    }
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.addEventListener(event, cancel, { once: true });
    return () => {
      cancel();
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
        window.removeEventListener(event, cancel);
    };
  }, [location]);

  return (
    <>
      {pages.map((page) => (
        <PageFrame
          key={page.pathname}
          location={page}
          active={page.pathname === location.pathname}
          register={register}
        >
          {children}
        </PageFrame>
      ))}
    </>
  );
}
