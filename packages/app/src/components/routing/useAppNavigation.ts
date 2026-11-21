import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildNavigationTrail } from "./navigationTrail";
import {
  restoredDestination,
  usePageDestination,
  usePageSource,
} from "./PageState";

export function useNavigationTrail() {
  return buildNavigationTrail(
    useLocation(),
    usePageSource(),
    usePageDestination(),
    restoredDestination,
  );
}

/** Normalize existing hash links through the router, preserving real history keys.
 * Modified clicks, downloads, external links and component handlers keep their behavior.
 */
export function useAppLinkNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    const href = link?.getAttribute("href");
    if (
      !link ||
      !href?.startsWith("#/") ||
      href.startsWith("#//") ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    event.preventDefault();
    const to = href.slice(1);
    if (to !== location.pathname + location.search + location.hash)
      navigate(to);
  };
}
