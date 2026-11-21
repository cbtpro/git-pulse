import { useEffect, useLayoutEffect, useRef } from "react";
import { exit, onBackButtonPress } from "@tauri-apps/api/app";
import { invoke, isTauri, type PluginListener } from "@tauri-apps/api/core";
import { getPlatformInfo } from "../utils/PlatformDetector";

const overlays: { dismiss: () => void }[] = [];

/** A retained, hidden page must not consume Back. */
export function useBackDismiss(visible: boolean, dismiss: () => void) {
  const latest = useRef(dismiss);
  latest.current = dismiss;
  useLayoutEffect(() => {
    const { os } = getPlatformInfo();
    if (!visible || !isTauri() || os !== "android") return;
    const overlay = { dismiss: () => latest.current() };
    overlays.push(overlay);
    return () => {
      const index = overlays.indexOf(overlay);
      if (index >= 0) overlays.splice(index, 1);
    };
  }, [visible]);
}

/** Use native history rather than maintaining a second route stack. */
export function useMobileNavigation() {
  useEffect(() => {
    if (!isTauri()) return;
    const { os } = getPlatformInfo();
    if (os === "ios") {
      // Also disable whole-WebView gestures in previously installed dev shells.
      void invoke("set_navigation_gestures", { enabled: false }).catch(
        (error) =>
          console.warn("Unable to disable native navigation gestures", error),
      );
      return;
    }
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
