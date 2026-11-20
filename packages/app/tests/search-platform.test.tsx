import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GlobalSearch } from "../src/components/search/GlobalSearch";
import { usePlatform } from "../src/hooks/usePlatform";
import { useAuthStore } from "../src/stores/authStore";
import { clearSearchCache } from "../src/services/github/SearchService";
import type { DeviceOS } from "../src/utils/PlatformDetector";

vi.mock("../src/hooks/usePlatform", () => ({ usePlatform: vi.fn() }));

function platform(os: DeviceOS, isMobile = false) {
  vi.mocked(usePlatform).mockReturnValue({
    os,
    isMobile,
    isDesktop: !isMobile,
    platform: isMobile ? "mobile" : "desktop",
    isNative: false,
    screenWidth: isMobile ? 390 : 1280,
    screenHeight: 900,
    devicePixelRatio: 1,
  });
}

beforeEach(() => {
  platform("windows");
  clearSearchCache();
  useAuthStore.setState({
    token: null,
    activeAccountId: null,
    isLoggedIn: false,
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ items: [], total_count: 0 })),
      ),
  );
});
afterEach(() => vi.unstubAllGlobals());

function mount() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <GlobalSearch onShowLogin={vi.fn()} />
    </MemoryRouter>,
  );
}

it.each(["macos", "windows", "linux"] as const)(
  "shows and handles the %s shortcut without taking over other platform keys",
  async (os) => {
    platform(os);
    const { container } = mount();
    const apple = os === "macos";
    const trigger = screen.getByRole("button", { name: "聚合搜索" });
    expect(trigger.getAttribute("aria-keyshortcuts")).toBe(
      apple ? "Meta+K" : "Control+K",
    );
    expect(trigger.querySelector("kbd")?.textContent).toBe(
      apple ? "⌘ K" : "Ctrl K",
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: apple, metaKey: !apple });
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.keyDown(document, { key: "k", ctrlKey: !apple, metaKey: apple });
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("enterkeyhint")).toBe("search");
    const hint = document.getElementById(
      input.getAttribute("aria-describedby")!,
    );
    expect(hint?.textContent).toContain(apple ? "↵" : "Enter");
    // Holding the shortcut must not repeatedly toggle the panel.
    fireEvent.keyDown(input, {
      key: "k",
      ctrlKey: !apple,
      metaKey: apple,
      repeat: true,
    });
    expect(screen.getByRole("combobox")).toBe(input);
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(container.querySelector(".gp-search-footer")).toBeNull();
  },
);

it.each(["ios", "android"] as const)(
  "hides keyboard instructions on %s while keeping tap and external keyboard access",
  async (os) => {
    platform(os, true);
    const { container } = mount();
    const trigger = screen.getByRole("button", { name: "聚合搜索" });
    expect(trigger.querySelector("kbd")).toBeNull();
    fireEvent.click(trigger);
    const input = screen.getByRole("combobox");
    expect(container.querySelector(".gp-search-footer")).toBeNull();
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    expect(screen.queryByRole("combobox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    fireEvent.keyDown(document, {
      key: "k",
      ctrlKey: os === "android",
      metaKey: os === "ios",
    });
    expect(screen.getByRole("combobox")).toBeTruthy();
  },
);

it("ignores composing input, AltGr and modified or already-handled shortcuts", () => {
  mount();
  for (const extra of [
    { isComposing: true },
    { keyCode: 229 },
    { altKey: true },
    { shiftKey: true },
    { metaKey: true },
  ]) {
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, ...extra });
    expect(screen.queryByRole("combobox")).toBeNull();
  }
  const handled = new KeyboardEvent("keydown", {
    key: "k",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  handled.preventDefault();
  fireEvent(document, handled);
  expect(screen.queryByRole("combobox")).toBeNull();
});

it("updates instructions when the primary input changes between touch and mouse", async () => {
  const media = Object.assign(new EventTarget(), { matches: true });
  vi.stubGlobal("matchMedia", () => media);
  const { container } = mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  expect(container.querySelector(".gp-search-footer")).toBeNull();
  await act(async () => {
    media.matches = false;
    media.dispatchEvent(new Event("change"));
  });
  expect(container.querySelector(".gp-search-footer")).toBeTruthy();
  expect(
    screen.getByRole("combobox").getAttribute("aria-describedby"),
  ).toBeTruthy();
});
