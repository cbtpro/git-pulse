import { StrictMode } from "react";
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exit, onBackButtonPress } from "@tauri-apps/api/app";
import { invoke, isTauri, type PluginListener } from "@tauri-apps/api/core";
import { getPlatformInfo } from "../src/utils/PlatformDetector";
import {
  useBackDismiss,
  useMobileNavigation,
} from "../src/hooks/useMobileNavigation";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/api/app", () => ({
  exit: vi.fn(),
  onBackButtonPress: vi.fn(),
}));
vi.mock("../src/utils/PlatformDetector", () => ({ getPlatformInfo: vi.fn() }));

let pressBack: (payload: { canGoBack: boolean }) => void;
const unregister = vi.fn(async () => {});
function platform(os: "ios" | "android" | "macos", native = true) {
  vi.mocked(isTauri).mockReturnValue(native);
  vi.mocked(getPlatformInfo).mockReturnValue({ os } as ReturnType<
    typeof getPlatformInfo
  >);
}
beforeEach(() => {
  vi.clearAllMocks();
  platform("android");
  vi.mocked(invoke).mockResolvedValue(undefined);
  vi.mocked(exit).mockResolvedValue(undefined);
  vi.mocked(onBackButtonPress).mockImplementation(async (handler) => {
    pressBack = handler;
    return { unregister } as unknown as PluginListener;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("uses native history for Back and finishes the Android activity only at the root", async () => {
  const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  renderHook(useMobileNavigation);
  await waitFor(() => expect(onBackButtonPress).toHaveBeenCalledOnce());
  act(() => pressBack({ canGoBack: true }));
  expect(back).toHaveBeenCalledOnce();
  expect(exit).not.toHaveBeenCalled();
  act(() => pressBack({ canGoBack: false }));
  expect(exit).toHaveBeenCalledWith(0);
});

it("dismisses only the top visible overlay, even when there is no previous page", async () => {
  const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  renderHook(useMobileNavigation);
  const first = vi.fn(),
    second = vi.fn(),
    updated = vi.fn();
  renderHook(() => useBackDismiss(true, first));
  const top = renderHook(
    ({ visible, dismiss }) => useBackDismiss(visible, dismiss),
    {
      initialProps: { visible: true, dismiss: second },
    },
  );
  await act(async () => pressBack({ canGoBack: false }));
  expect(second).toHaveBeenCalledOnce();
  expect(first).not.toHaveBeenCalled();
  top.rerender({ visible: true, dismiss: updated });
  act(() => pressBack({ canGoBack: true }));
  expect(updated).toHaveBeenCalledOnce();
  top.rerender({ visible: false, dismiss: updated });
  act(() => pressBack({ canGoBack: true }));
  expect(first).toHaveBeenCalledOnce();
  expect(back).not.toHaveBeenCalled();
  expect(exit).not.toHaveBeenCalled();
});

it("ignores hidden retained-page dialogs and restores normal Back after unmount", async () => {
  const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  renderHook(useMobileNavigation);
  const dismiss = vi.fn();
  renderHook(() => useBackDismiss(false, dismiss));
  const overlay = renderHook(() => useBackDismiss(true, dismiss));
  overlay.unmount();
  await act(async () => pressBack({ canGoBack: true }));
  expect(dismiss).not.toHaveBeenCalled();
  expect(back).toHaveBeenCalledOnce();
});

it("does not consume Back after teardown, including a late native registration", async () => {
  let resolve!: (value: PluginListener) => void;
  vi.mocked(onBackButtonPress).mockImplementationOnce((handler) => {
    pressBack = handler;
    return new Promise((finish) => {
      resolve = finish;
    });
  });
  const hook = renderHook(useMobileNavigation);
  hook.unmount();
  await act(async () => resolve({ unregister } as unknown as PluginListener));
  act(() => pressBack({ canGoBack: false }));
  expect(unregister).toHaveBeenCalledOnce();
  expect(exit).not.toHaveBeenCalled();
});

it("registers just one surviving listener under StrictMode", async () => {
  const hook = renderHook(useMobileNavigation, { wrapper: StrictMode });
  await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
  act(() => pressBack({ canGoBack: false }));
  expect(exit).toHaveBeenCalledOnce();
  hook.unmount();
  expect(unregister).toHaveBeenCalledTimes(2);
});

it("enables native iOS gestures and blocks navigating behind nested overlays", async () => {
  platform("ios");
  renderHook(useMobileNavigation);
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith("set_navigation_gestures", {
      enabled: true,
    }),
  );
  const first = renderHook(() => useBackDismiss(true, vi.fn()));
  const second = renderHook(() => useBackDismiss(true, vi.fn()));
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith("set_navigation_gestures", {
      enabled: false,
    }),
  );
  second.unmount();
  await act(async () => {});
  expect(invoke).toHaveBeenLastCalledWith("set_navigation_gestures", {
    enabled: false,
  });
  first.unmount();
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith("set_navigation_gestures", {
      enabled: true,
    }),
  );
  expect(onBackButtonPress).not.toHaveBeenCalled();
});

it.each([
  ["ios", false],
  ["android", false],
  ["macos", true],
] as const)(
  "leaves browser and desktop navigation alone: %s, native=%s",
  (os, native) => {
    platform(os, native);
    renderHook(useMobileNavigation);
    renderHook(() => useBackDismiss(true, vi.fn()));
    expect(invoke).not.toHaveBeenCalled();
    expect(onBackButtonPress).not.toHaveBeenCalled();
  },
);
