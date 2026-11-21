import { StrictMode } from "react";
import { HashRouter } from "react-router-dom";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getPlatformInfo } from "../src/utils/PlatformDetector";
import { useBackDismiss } from "../src/hooks/useMobileNavigation";
import { ContentBackTransition } from "../src/components/routing/ContentBackTransition";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock("../src/utils/PlatformDetector", () => ({ getPlatformInfo: vi.fn() }));

let back: ReturnType<typeof vi.spyOn>;
let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(getPlatformInfo).mockReturnValue({ os: "ios" } as ReturnType<
    typeof getPlatformInfo
  >);
  vi.mocked(invoke).mockReset().mockResolvedValue(undefined);
  reduced = false;
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  window.history.replaceState({ idx: 1 }, "", "#/profile/settings");
  back = vi.spyOn(window.history, "back").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  const view = render(
    <StrictMode>
      <HashRouter>
        <ContentBackTransition>
          <main className="gp-main">
            <input />
            <button>Action</button>
            <canvas />
          </main>
        </ContentBackTransition>
      </HashRouter>
    </StrictMode>,
  );
  const viewport = view.container.querySelector<HTMLElement>(
    ".gp-content-viewport",
  )!;
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
    left: 0,
    width: 390,
  } as DOMRect);
  await act(async () => {});
  return { ...view, viewport };
}

function touch(
  target: Element,
  type: string,
  x: number,
  y = 300,
  time = 0,
  count = 1,
  cancelable = true,
) {
  const point = { identifier: 1, clientX: x, clientY: y };
  const event = new Event(type, { bubbles: true, cancelable });
  Object.defineProperties(event, {
    touches: {
      value:
        type === "touchend" || type === "touchcancel"
          ? []
          : Array.from({ length: count }, (_, i) => ({
              ...point,
              identifier: i + 1,
            })),
    },
    changedTouches: { value: [point] },
    timeStamp: { value: time },
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}
function swipe(target: Element, endX = 190) {
  touch(target, "touchstart", 5);
  touch(target, "touchmove", endX, 300, 200);
  touch(target, "touchend", endX, 300, 400);
  act(() => vi.advanceTimersByTime(180));
}

it("waits for native gestures to be disabled before moving content, with one Back under StrictMode", async () => {
  let confirm!: () => void;
  const pending = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  vi.mocked(invoke).mockReturnValue(pending);
  const { viewport, unmount } = await mount();
  swipe(viewport);
  expect(back).not.toHaveBeenCalled();
  await act(async () => confirm());
  swipe(viewport);
  expect(back).toHaveBeenCalledOnce();
  for (const args of vi.mocked(invoke).mock.calls)
    expect(args).toEqual(["set_navigation_gestures", { enabled: false }]);
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(viewport.dataset.backSwipe).toBeUndefined();
  unmount();
  swipe(viewport);
  expect(back).toHaveBeenCalledOnce();
});

it("restores content when a short swipe or system interruption cancels the gesture", async () => {
  const { viewport } = await mount();
  swipe(viewport, 70);
  expect(back).not.toHaveBeenCalled();
  expect(viewport.style.getPropertyValue("--gp-back-x")).toBe("");
  touch(viewport, "touchstart", 5);
  touch(viewport, "touchmove", 190, 300, 200);
  expect(viewport.dataset.backSwipe).toBe("dragging");
  touch(viewport, "touchcancel", 190, 300, 250);
  act(() => vi.advanceTimersByTime(500));
  expect(viewport.dataset.backSwipe).toBeUndefined();
  expect(back).not.toHaveBeenCalled();
});

it("preserves scrolling, editing and multi-touch, and never goes Back from the root", async () => {
  const { viewport } = await mount();
  // Outside the screen edge and vertical scrolling must not be consumed.
  touch(viewport, "touchstart", 70);
  expect(touch(viewport, "touchmove", 200, 300, 200).defaultPrevented).toBe(
    false,
  );
  touch(viewport, "touchend", 200, 300, 400);
  touch(viewport, "touchstart", 5);
  expect(touch(viewport, "touchmove", 12, 340, 200).defaultPrevented).toBe(
    false,
  );
  touch(viewport, "touchend", 12, 340, 400);
  for (const selector of ["input", "button", "canvas"])
    swipe(viewport.querySelector(selector)!);
  const input = viewport.querySelector("input")!;
  input.focus();
  swipe(viewport);
  input.blur();
  touch(viewport, "touchstart", 5);
  touch(viewport, "touchmove", 180, 300, 200, 2);
  touch(viewport, "touchend", 180, 300, 400);
  touch(viewport, "touchstart", 5);
  touch(viewport, "touchmove", 180, 300, 200, 1, false);
  touch(viewport, "touchend", 180, 300, 400);
  window.history.replaceState({ idx: 0 }, "");
  swipe(viewport);
  expect(back).not.toHaveBeenCalled();
  expect(viewport.dataset.backSwipe).toBeUndefined();
});

it("cancels a running swipe when an overlay opens and stays blocked until all overlays close", async () => {
  const { viewport } = await mount();
  touch(viewport, "touchstart", 5);
  touch(viewport, "touchmove", 190, 300, 200);
  const first = renderHook(() => useBackDismiss(true, vi.fn()));
  expect(viewport.dataset.backSwipe).toBeUndefined();
  const second = renderHook(() => useBackDismiss(true, vi.fn()));
  swipe(viewport);
  second.unmount();
  swipe(viewport);
  expect(back).not.toHaveBeenCalled();
  first.unmount();
  swipe(viewport);
  expect(back).toHaveBeenCalledOnce();
});

it("cancels navigation during settling on a route change and supports reduced motion", async () => {
  const { viewport } = await mount();
  touch(viewport, "touchstart", 5);
  touch(viewport, "touchmove", 200, 300, 200);
  touch(viewport, "touchend", 200, 300, 400);
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  act(() => vi.advanceTimersByTime(500));
  expect(back).not.toHaveBeenCalled();
  reduced = true;
  swipe(viewport);
  expect(back).toHaveBeenCalledOnce();
});

it.each([
  ["ios", false],
  ["android", true],
  ["macos", true],
] as const)(
  "does not install iOS content gestures for %s, native=%s",
  async (os, native) => {
    vi.mocked(isTauri).mockReturnValue(native);
    vi.mocked(getPlatformInfo).mockReturnValue({ os } as ReturnType<
      typeof getPlatformInfo
    >);
    const { viewport } = await mount();
    swipe(viewport);
    expect(invoke).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  },
);
