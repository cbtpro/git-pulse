import { ConfigProvider } from "@arco-design/web-react";
import {
  Suspense,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router-dom";
import { LoadingCards } from "../common/ResourceState";
import {
  PageActivity,
  PageHistoryContext,
  PageScroll,
  pageKey,
} from "./pageRuntime";
import { useInteractiveBack } from "./useInteractiveBack";
import "./page-stack.css";

const MAX_PAGES = 12;

function PageFrame({
  active,
  location,
  children,
  footer,
}: {
  active: boolean;
  location: Location;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const popupContainer = useCallback(
    () => container.current || document.body,
    [],
  );
  const scrollToTop = useCallback(
    () => container.current?.scrollTo({ top: 0, left: 0, behavior: "instant" }),
    [],
  );
  useLayoutEffect(() => {
    if (container.current) container.current.inert = !active;
  }, [active]);
  return (
    <div
      ref={container}
      className="gp-route-frame"
      hidden={!active}
      aria-hidden={!active || undefined}
      data-route-page={location.pathname}
      data-route-url={pageKey(location)}
      data-route-active={active ? "true" : undefined}
    >
      <div className="gp-page-content">
        <PageActivity.Provider value={active}>
          <PageScroll.Provider value={scrollToTop}>
            <ConfigProvider
              getPopupContainer={popupContainer}
              effectGlobalModal={false}
              effectGlobalNotice={false}
              componentConfig={{
                Modal: { getPopupContainer: popupContainer, escToExit: active },
                Drawer: {
                  getPopupContainer: popupContainer,
                  escToExit: active,
                },
              }}
            >
              <Suspense
                fallback={
                  <div data-route-loading>
                    <LoadingCards />
                  </div>
                }
              >
                <Routes location={location}>{children}</Routes>
              </Suspense>
            </ConfigProvider>
          </PageScroll.Provider>
        </PageActivity.Provider>
        {footer}
      </div>
    </div>
  );
}

/** The original DOM, React state, canvas and scroll containers stay mounted.
 * URL variants have distinct instances, so returning never switches a live page's
 * query and then waits for an effect/network response to reconstruct its view.
 */
export function RetainedRoutes({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const action = useNavigationType();
  const history = useContext(PageHistoryContext);
  const [visited, setVisited] = useState({
    key: location.key,
    url: pageKey(location),
    pages: [location],
    recent: [pageKey(location)],
  });
  const stack = useRef<HTMLDivElement>(null);
  const currentKey = pageKey(location);
  if (visited.key !== location.key || visited.url !== currentKey) {
    const retained = visited.pages.find((page) => pageKey(page) === currentKey);
    const recent = [
      ...visited.recent.filter((key) => key !== currentKey),
      currentKey,
    ].slice(-MAX_PAGES);
    // A deliberate aggregate-search selection carries new content in state,
    // even when its URL was visited before. Ordinary returns keep the frozen
    // entry so they do not replay its initial focus/selection effects.
    const newSearch = action !== "POP" && location.state?.aggregateSearch;
    setVisited({
      key: location.key,
      url: currentKey,
      // Never reorder retained DOM nodes: moving a scroll container through
      // insertBefore can reset its scroll position, even when React keeps state.
      pages: (retained ? visited.pages : [...visited.pages, location])
        .filter((page) => recent.includes(pageKey(page)))
        .map((page) =>
          newSearch && pageKey(page) === currentKey ? location : page,
        ),
      recent,
    });
  }
  const previous = history.entries[history.index - 1];
  const back = useInteractiveBack(stack, {
    current: location,
    previous,
    navigate: () => navigate(-1),
  });
  useLayoutEffect(() => {
    // Commit the route while the destination is already visible at progress=1.
    // Both retain the same DOM and scrollTop; cleanup occurs before browser paint.
    const returned = back.current?.routeCommitted(location.key);
    const focusedPage =
      document.activeElement?.closest<HTMLElement>("[data-route-page]");
    if (returned || focusedPage?.hidden)
      document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.key, currentKey, back]);
  return (
    <div className="gp-route-stack" ref={stack}>
      {visited.pages.map((page) => (
        <PageFrame
          key={pageKey(page)}
          location={page}
          active={pageKey(page) === currentKey}
          footer={footer}
        >
          {children}
        </PageFrame>
      ))}
    </div>
  );
}
