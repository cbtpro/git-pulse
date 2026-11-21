import { useEffect, useLayoutEffect, useRef } from "react";
import { exit, onBackButtonPress } from "@tauri-apps/api/app";
import { isTauri, type PluginListener } from "@tauri-apps/api/core";
import { getPlatformInfo } from "../utils/PlatformDetector";

const overlays: { dismiss: () => void }[] = [];
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((subscriber) => subscriber());

export const hasBackOverlay = () => overlays.length > 0;
export function observeBackOverlays(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** A retained, hidden page must not consume Back. */
export function useBackDismiss(visible: boolean, dismiss: () => void) {
  const latest = useRef(dismiss);
  latest.current = dismiss;
  useLayoutEffect(() => {
    const { os } = getPlatformInfo();
    if (!visible || !isTauri() || (os !== "ios" && os !== "android")) return;
    const overlay = { dismiss: () => latest.current() };
    overlays.push(overlay);
    notify();
    return () => {
      const index = overlays.indexOf(overlay);
      if (index >= 0) overlays.splice(index, 1);
      notify();
    };
  }, [visible]);
}

/** Use native history rather than maintaining a second route stack. */
export function useMobileNavigation() {
  useEffect(() => {
    if (!isTauri()) return;
    const { os } = getPlatformInfo();
    if (os !== "android") return;
    let active = true;
    let listener: PluginListener | undefined;
    void onBackButtonPress(({ canGoBack }) => {
      if (!active) return;
      const overlay = overlays.at(-1);
      if (overlay) overlay.dismiss();
      else if (canGoBack) window.history.back();
      else
        void exit(0).catch((error) =>
          console.warn("Unable to leave activity", error),
        );
    })
      .then((registered) => {
        if (active) listener = registered;
        else void registered.unregister();
      })
      .catch((error) => console.warn("Unable to register system Back", error));
    return () => {
      active = false;
      void listener?.unregister();
    };
  }, []);
}
