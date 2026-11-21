import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useSafeArea } from "../src/hooks/useSafeArea";
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.removeAttribute("style");
  delete document.body.dataset.safeArea;
});

it("toggles iOS insets immediately and refreshes native geometry after rotation", async () => {
  vi.stubGlobal("navigator", { userAgent: "iPhone" });
  vi.mocked(invoke).mockResolvedValue({
    top: 59,
    right: 0,
    bottom: 34,
    left: 0,
  });
  const hook = renderHook(({ enabled }) => useSafeArea(enabled), {
    initialProps: { enabled: true },
  });
  await waitFor(() =>
    expect(document.body.style.getPropertyValue("--gp-native-safe-top")).toBe(
      "59px",
    ),
  );
  expect(invoke).toHaveBeenCalledWith("configure_safe_area");
  expect(document.body.dataset.safeArea).toBe("on");
  expect(document.documentElement.dataset.nativeViewport).toBe("ios");
  hook.rerender({ enabled: false });
  expect(document.body.dataset.safeArea).toBe("off");
  expect(document.documentElement.dataset.nativeViewport).toBe("ios");
  hook.rerender({ enabled: true });
  expect(document.body.dataset.safeArea).toBe("on");
  vi.mocked(invoke).mockResolvedValue({
    top: 0,
    right: 59,
    bottom: 21,
    left: 59,
  });
  act(() => window.dispatchEvent(new Event("orientationchange")));
  await waitFor(() =>
    expect(document.body.style.getPropertyValue("--gp-native-safe-left")).toBe(
      "59px",
    ),
  );
  expect(document.body.style.getPropertyValue("--gp-native-safe-top")).toBe(
    "0px",
  );
  hook.unmount();
  expect(document.documentElement.dataset.nativeViewport).toBeUndefined();
});

it("does not apply the iOS viewport workaround to other platforms", () => {
  vi.stubGlobal("navigator", { userAgent: "Android" });
  const hook = renderHook(() => useSafeArea(true));
  expect(document.documentElement.dataset.nativeViewport).toBeUndefined();
  hook.unmount();
});

it("does not apply stale iOS measurements after toggling the setting", async () => {
  vi.stubGlobal("navigator", { userAgent: "iPhone" });
  let finish!: (value: unknown) => void;
  vi.mocked(invoke).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  vi.mocked(invoke).mockResolvedValue({
    top: 0,
    right: 59,
    bottom: 21,
    left: 59,
  });
  const hook = renderHook(({ enabled }) => useSafeArea(enabled), {
    initialProps: { enabled: true },
  });
  hook.rerender({ enabled: false });
  await waitFor(() =>
    expect(document.body.style.getPropertyValue("--gp-native-safe-top")).toBe(
      "0px",
    ),
  );
  await act(async () => finish({ top: 59, right: 0, bottom: 34, left: 0 }));
  expect(document.body.style.getPropertyValue("--gp-native-safe-top")).toBe(
    "0px",
  );
  expect(document.body.dataset.safeArea).toBe("off");
});
