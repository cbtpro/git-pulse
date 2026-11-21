import { useLayoutEffect } from "react";
import { getPlatformInfo } from "../utils/PlatformDetector";

/** Keep the mobile app viewport fixed without intercepting scrolling or desktop zoom. */
export function useMobileViewport() {
  const { os } = getPlatformInfo();
  useLayoutEffect(() => {
    if (os !== "ios" && os !== "android") return;

    const root = document.documentElement;
    const previousMode = root.getAttribute("data-mobile-viewport");
    const viewport = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    const previousViewport = viewport?.content;
    root.setAttribute("data-mobile-viewport", "fixed");
    if (viewport) {
      // Preserve viewport-fit=cover and keyboard/safe-area directives.
      const directives = viewport.content
        .split(",")
        .map((value) => value.trim())
        .filter(
          (value) =>
            value &&
            !/^(initial-scale|minimum-scale|maximum-scale|user-scalable)\s*=/i.test(
              value,
            ),
        );
      viewport.content = [
        ...directives,
        "initial-scale=1",
        "minimum-scale=1",
        "maximum-scale=1",
        "user-scalable=no",
      ].join(", ");
    }

    // iOS can allow zoom despite viewport limits. Cover WebKit gesture events,
    // including gestures that begin in dialogs portalled outside the app root.
    const preventViewportZoom = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener("gesturestart", preventViewportZoom, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventViewportZoom, {
      passive: false,
    });
    return () => {
      document.removeEventListener("gesturestart", preventViewportZoom);
      document.removeEventListener("gesturechange", preventViewportZoom);
      if (previousMode === null) root.removeAttribute("data-mobile-viewport");
      else root.setAttribute("data-mobile-viewport", previousMode);
      if (viewport && previousViewport !== undefined)
        viewport.content = previousViewport;
    };
  }, [os]);
}
