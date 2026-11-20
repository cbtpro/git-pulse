import { afterEach, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAppearance } from "../src/hooks/useAppearance";
import { usePreferencesStore } from "../src/stores/preferencesStore";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.removeAttribute("arco-theme");
  delete document.body.dataset.density;
  delete document.body.dataset.safeArea;
  delete document.body.dataset.headerBlur;
  document.documentElement.style.colorScheme = "";
  localStorage.clear();
});

it("defaults older settings to a frosted header and restores an explicitly disabled effect", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  usePreferencesStore.setState({ headerBlur: false });
  localStorage.setItem(
    "gitpulse-preferences",
    JSON.stringify({ state: { theme: "light" }, version: 0 }),
  );
  await usePreferencesStore.persist.rehydrate();
  const hook = renderHook(useAppearance);
  expect(document.body.dataset.headerBlur).toBe("on");
  act(() => usePreferencesStore.getState().setHeaderBlur(false));
  expect(document.body.dataset.headerBlur).toBe("off");
  const saved = localStorage.getItem("gitpulse-preferences")!;
  act(() => usePreferencesStore.getState().setHeaderBlur(true));
  localStorage.setItem("gitpulse-preferences", saved);
  await act(async () => {
    await usePreferencesStore.persist.rehydrate();
  });
  expect(document.body.dataset.headerBlur).toBe("off");
  expect(hook.result.current.headerBlur).toBe(false);
});

it("follows system appearance, persists preferences, and keeps a manual theme when the system changes", async () => {
  let listener = () => {};
  const media = {
    matches: true,
    addEventListener: vi.fn((_event, fn) => {
      listener = fn;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  usePreferencesStore.setState({
    theme: "system",
    density: "comfortable",
    safeArea: true,
  });
  const hook = renderHook(useAppearance);
  expect(document.body.getAttribute("arco-theme")).toBe("dark");
  act(() => {
    media.matches = false;
    listener();
  });
  expect(document.body.hasAttribute("arco-theme")).toBe(false);
  act(() => {
    usePreferencesStore.getState().setTheme("dark");
    usePreferencesStore.getState().setDensity("compact");
  });
  expect(document.body.getAttribute("arco-theme")).toBe("dark");
  expect(document.body.dataset.density).toBe("compact");
  const saved = JSON.parse(localStorage.getItem("gitpulse-preferences")!);
  expect(saved.state).toMatchObject({
    theme: "dark",
    density: "compact",
    safeArea: true,
  });
  act(() => {
    media.matches = false;
    listener();
  });
  expect(document.body.getAttribute("arco-theme")).toBe("dark");
  hook.unmount();
  expect(media.removeEventListener).toHaveBeenCalled();
});

it("defaults existing preferences to safe areas and restores the user's toggle after reload", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  usePreferencesStore.setState({
    theme: "system",
    density: "comfortable",
    safeArea: true,
  });
  localStorage.setItem(
    "gitpulse-preferences",
    JSON.stringify({
      state: { theme: "light", density: "compact" },
      version: 0,
    }),
  );
  await usePreferencesStore.persist.rehydrate();
  const hook = renderHook(useAppearance);
  expect(document.body.dataset.safeArea).toBe("on");
  expect(hook.result.current.theme).toBe("light");
  act(() => usePreferencesStore.getState().setSafeArea(false));
  expect(document.body.dataset.safeArea).toBe("off");
  const saved = localStorage.getItem("gitpulse-preferences")!;
  expect(JSON.parse(saved).state.safeArea).toBe(false);
  act(() => usePreferencesStore.getState().setSafeArea(true));
  expect(document.body.dataset.safeArea).toBe("on");
  localStorage.setItem("gitpulse-preferences", saved);
  await act(async () => {
    await usePreferencesStore.persist.rehydrate();
  });
  expect(document.body.dataset.safeArea).toBe("off");
  expect(hook.result.current.density).toBe("compact");
  hook.unmount();
});
