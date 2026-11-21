import { StrictMode } from "react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMobileViewport } from "../src/hooks/useMobileViewport";
import { getPlatformInfo } from "../src/utils/PlatformDetector";
vi.mock("../src/utils/PlatformDetector", () => ({ getPlatformInfo: vi.fn() }));
let viewport: HTMLMetaElement;
const original =
  "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
beforeEach(() => {
  viewport = document.createElement("meta");
  viewport.name = "viewport";
  viewport.content = original;
  document.head.append(viewport);
});
afterEach(() => {
  viewport.remove();
  document.documentElement.removeAttribute("data-mobile-viewport");
  vi.restoreAllMocks();
});
function platform(os: "ios" | "android" | "macos" | "windows" | "linux") {
  vi.mocked(getPlatformInfo).mockReturnValue({ os } as ReturnType<
    typeof getPlatformInfo
  >);
}
it.each(["ios", "android"] as const)(
  "fixes %s scale and cancels zoom gestures without blocking scrolling or keyboard events",
  (os) => {
    platform(os);
    const hook = renderHook(() => useMobileViewport(), { wrapper: StrictMode });
    expect(viewport.content).toContain("maximum-scale=1");
    expect(viewport.content).toContain("user-scalable=no");
    expect(viewport.content).toContain("viewport-fit=cover");
    expect(viewport.content).toContain("interactive-widget=resizes-content");
    expect(document.documentElement.dataset.mobileViewport).toBe("fixed");
    const dialog = document.createElement("div");
    document.body.append(dialog);
    for (const type of ["gesturestart", "gesturechange"]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      dialog.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    for (const type of [
      "touchstart",
      "touchmove",
      "pointermove",
      "wheel",
      "keydown",
    ]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      dialog.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    hook.unmount();
    const gesture = new Event("gesturestart", {
      bubbles: true,
      cancelable: true,
    });
    dialog.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(false);
    expect(viewport.content).toBe(original);
    expect(document.documentElement.dataset.mobileViewport).toBeUndefined();
    dialog.remove();
  },
);
it.each(["macos", "windows", "linux"] as const)(
  "preserves %s browser zoom",
  (os) => {
    platform(os);
    renderHook(() => useMobileViewport());
    expect(viewport.content).toBe(original);
    const event = new Event("gesturestart", { cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.documentElement.dataset.mobileViewport).toBeUndefined();
  },
);
