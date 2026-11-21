import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getPlatformInfo } from "../../utils/PlatformDetector";
import {
  hasBackOverlay,
  observeBackOverlays,
} from "../../hooks/useMobileNavigation";
import { installContentBackGesture } from "./contentBackGesture";
import "./content-back.css";

export function ContentBackTransition({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof installContentBackGesture>>();
  const location = useLocation();
  useLayoutEffect(() => {
    controller.current?.cancel();
  }, [location.key]);
  useEffect(() => {
    if (!isTauri() || getPlatformInfo().os !== "ios") return;
    let active = true;
    // Await native confirmation so old installed shells cannot animate the whole
    // WebView at the same time as this content-only transition.
    void invoke("set_navigation_gestures", { enabled: false })
      .then(() => {
        if (!active || !viewport.current) return;
        controller.current = installContentBackGesture(viewport.current, {
          canGoBack: () =>
            Number.isInteger(window.history.state?.idx) &&
            window.history.state.idx > 0,
          blocked: hasBackOverlay,
          back: () => window.history.back(),
        });
      })
      .catch((error) =>
        console.warn("Unable to configure content navigation", error),
      );
    const unsubscribe = observeBackOverlays(() => {
      if (hasBackOverlay()) controller.current?.cancel();
    });
    return () => {
      active = false;
      unsubscribe();
      controller.current?.destroy();
      controller.current = undefined;
    };
  }, []);
  return (
    <div className="gp-content-viewport" ref={viewport}>
      <span className="gp-back-swipe-hint" aria-hidden="true">
        <ChevronLeft size={22} />
      </span>
      {children}
    </div>
  );
}
