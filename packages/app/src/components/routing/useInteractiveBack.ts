import { useEffect, useRef, type RefObject } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Location } from "react-router-dom";
import { getPlatformInfo } from "../../utils/PlatformDetector";
import {
  hasBackOverlay,
  observeBackOverlays,
} from "../../hooks/useMobileNavigation";
import { installInteractiveBack } from "./interactiveBack";
import { pageKey } from "./pageRuntime";

export function useInteractiveBack(
  stack: RefObject<HTMLDivElement>,
  options: { current: Location; previous?: Location; navigate: () => void },
) {
  const latest = useRef(options);
  latest.current = options;
  const controller = useRef<ReturnType<typeof installInteractiveBack>>();
  useEffect(() => {
    if (!isTauri() || getPlatformInfo().os !== "ios") return;
    let active = true;
    void invoke("set_navigation_gestures", { enabled: false })
      .then(() => {
        if (!active || !stack.current) return;
        controller.current = installInteractiveBack(stack.current, {
          blocked: () =>
            hasBackOverlay() ||
            Boolean(document.querySelector(".gp-crumb-menu[open]")),
          target: () => {
            const { current, previous } = latest.current;
            if (!previous || pageKey(previous) === pageKey(current))
              return null;
            const pages = Array.from(
              stack.current?.children || [],
            ) as HTMLElement[];
            const from = pages.find(
              (page) => page.dataset.routeUrl === pageKey(current),
            );
            const to = pages.find(
              (page) => page.dataset.routeUrl === pageKey(previous),
            );
            if (
              !from ||
              !to ||
              to.querySelector(
                "[data-route-loading],.arco-skeleton,.arco-spin-loading",
              )
            )
              return null;
            return { current: from, previous: to, key: previous.key };
          },
          back: () => latest.current.navigate(),
        });
      })
      .catch((error) =>
        console.warn("Unable to configure interactive Back", error),
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
  }, [stack]);
  return controller;
}
