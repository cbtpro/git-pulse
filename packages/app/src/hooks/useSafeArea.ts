import { useLayoutEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

type Insets = Record<"top" | "right" | "bottom" | "left", number>;

export function useSafeArea(enabled: boolean) {
  useLayoutEffect(() => {
    document.body.dataset.safeArea = enabled ? "on" : "off";
    // Also update an already-open iOS WebView that loaded the older viewport meta.
    const viewport = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    if (viewport && !/viewport-fit\s*=\s*cover/.test(viewport.content)) {
      viewport.content = `${viewport.content.replace(/,?\s*viewport-fit=[^,]*/g, "")}, viewport-fit=cover`;
    }
    if (!isTauri() || !/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    const root = document.documentElement;
    const previousNativeViewport = root.dataset.nativeViewport;
    root.dataset.nativeViewport = "ios";
    let active = true;
    let request = 0;
    const sync = async () => {
      const current = ++request;
      try {
        const insets = await invoke<Insets>("configure_safe_area");
        if (!active || current !== request) return;
        for (const side of ["top", "right", "bottom", "left"] as const) {
          if (Number.isFinite(insets[side]) && insets[side] >= 0) {
            document.body.style.setProperty(
              `--gp-native-safe-${side}`,
              `${insets[side]}px`,
            );
          }
        }
      } catch {
        // CSS env() remains available in older native builds until they restart.
      }
    };
    void sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      active = false;
      if (previousNativeViewport === undefined)
        delete root.dataset.nativeViewport;
      else root.dataset.nativeViewport = previousNativeViewport;
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);
}
