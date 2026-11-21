import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { resources, i18n } from "../src/i18n";
import { usePreferencesStore } from "../src/stores/preferencesStore";
import { formatDate, formatNumber } from "../src/utils/format";
import { RequestError } from "../src/components/common/ResourceState";

// This suite verifies live localization, not Vite's cold module transforms.
// Prepare the real lazy route before RTL's short UI wait starts; keep the actual
// App, auth startup, Suspense and language controls in the test path.
beforeAll(async () => {
  await import("../src/pages/SettingsPage");
});

beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({
    language: "zh-CN",
    theme: "light",
    safeArea: true,
  });
  window.location.hash = "#/profile/settings";
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  act(() =>
    usePreferencesStore.setState({
      language: "zh-CN",
      theme: "system",
      safeArea: true,
    }),
  );
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("switches the live app through four languages and restores the saved choice", async () => {
  const user = userEvent.setup();
  // Flush the real lazy import and Suspense commit before polling translated UI.
  await act(async () => {
    render(<App />);
    await vi.dynamicImportSettled();
  });
  await screen.findByRole("heading", { name: "账号与外观", level: 1 });
  for (const [option, language, heading, safeArea] of [
    ["English", "en", "Account & appearance", "Enable safe areas"],
    ["日本語", "ja", "アカウントと表示", "セーフエリアを有効にする"],
    ["繁體中文", "zh-TW", "帳號與外觀", "開啟安全區"],
    ["简体中文", "zh-CN", "账号与外观", "开启安全区"],
  ]) {
    await user.click(screen.getByRole("combobox"));
    const choice = screen.getByRole("option", { name: option, exact: true });
    await waitFor(() =>
      expect(getComputedStyle(choice).pointerEvents).not.toBe("none"),
    );
    await user.click(choice);
    expect(
      screen.getByRole("heading", { name: heading, level: 1 }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("switch", { name: safeArea })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(document.documentElement.lang).toBe(language);
    expect(document.title).toBe(`${heading} · GitPulse`);
    expect(
      JSON.parse(localStorage.getItem("gitpulse-preferences")!).state.language,
    ).toBe(language);
  }
  act(() => usePreferencesStore.getState().setLanguage("ja"));
  const saved = localStorage.getItem("gitpulse-preferences")!;
  act(() => usePreferencesStore.getState().setLanguage("en"));
  localStorage.setItem("gitpulse-preferences", saved);
  await act(async () => {
    await usePreferencesStore.persist.rehydrate();
  });
  expect(
    screen.getByRole("heading", { name: "アカウントと表示", level: 1 }),
  ).toBeTruthy();
  expect(usePreferencesStore.getState().safeArea).toBe(true);
});

it("translates existing error states and formats dates and numbers using the selected language", () => {
  render(
    <RequestError
      error={new Error("无法连接 GitHub，请检查网络后重试")}
      retry={() => {}}
    />,
  );
  act(() => usePreferencesStore.getState().setLanguage("en"));
  expect(
    screen.getByText(
      "Unable to connect to GitHub. Check your network and try again.",
    ),
  ).toBeTruthy();
  expect(formatNumber(12000)).toBe("12K");
  expect(formatDate("2026-05-14T12:00:00Z")).toBe("May 14");
  act(() => usePreferencesStore.getState().setLanguage("ja"));
  expect(
    screen.getByText(
      "GitHub に接続できません。ネットワークを確認して再試行してください",
    ),
  ).toBeTruthy();
  expect(formatNumber(12000)).toBe("1.2万");
});

it("covers the same messages and interpolation variables in all four catalogs", () => {
  const source = resources["zh-CN"].translation;
  const placeholders = (value: string) =>
    [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
  for (const [language, { translation }] of Object.entries(resources)) {
    expect(Object.keys(translation).sort(), language).toEqual(
      Object.keys(source).sort(),
    );
    for (const [key, value] of Object.entries(source)) {
      const translated = translation[key as keyof typeof translation];
      expect(translated.trim().length, `${language}: ${key}`).toBeGreaterThan(
        0,
      );
      expect(placeholders(translated), `${language}: ${key}`).toEqual(
        placeholders(value),
      );
    }
  }
});

it("ignores an unsupported persisted language without losing display preferences", async () => {
  localStorage.setItem(
    "gitpulse-preferences",
    JSON.stringify({
      state: { language: "invalid", density: "compact" },
      version: 0,
    }),
  );
  await usePreferencesStore.persist.rehydrate();
  expect(i18n.language).toBe("zh-CN");
  expect(usePreferencesStore.getState().density).toBe("compact");
});
