import { chromium, webkit, expect } from "@playwright/test";

// Isolated native bridge + deterministic GitHub fixtures. Never reads a real
// account. Chromium sends trusted touch input; WebKit exercises the same DOM
// controller with synthetic touch events (not a substitute for iOS device QA).
const safari = process.env.GITPULSE_TEST_BROWSER === "webkit";
const browser = safari
  ? await webkit.launch({ headless: true })
  : await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
    });
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
try {
  for (const width of [320, 390, 1024]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1",
    });
    await context.addInitScript(() => {
      window.isTauri = true;
      window.qaCommands = [];
      window.__TAURI_INTERNALS__ = {
        invoke: async (command, args) => {
          window.qaCommands.push(command);
          switch (command) {
            case "read_auth_vault":
              return window.qaVault || null;
            case "compare_auth_vault":
              if ((window.qaVault || null) !== args.expected) return false;
              window.qaVault = args.value;
              return true;
            case "write_auth_vault":
              window.qaVault = args.value;
              return;
            case "clear_auth_vault":
              window.qaVault = null;
              return;
            case "set_navigation_gestures":
              return;
            case "configure_safe_area":
              return { top: 0, left: 0, right: 0, bottom: 0 };
            case "contribution_widget_status":
              return { supported: false, available: false, canPin: false };
            default:
              throw new Error(`Unexpected native command: ${command}`);
          }
        },
      };
    });
    let requests = 0;
    await context.route("https://api.github.com/**", (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith("/search/"))
        return route.fulfill({ json: [] });
      requests++;
      const query = url.searchParams.get("q");
      return route.fulfill({
        json: {
          total_count: 300,
          items: Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            name: `${query}-${i}`,
            full_name: `octo/${query}-${i}`,
            html_url: `https://github.com/octo/${query}-${i}`,
            description: "Retained navigation fixture",
            default_branch: "main",
            private: false,
            stargazers_count: 1,
            forks_count: 0,
            updated_at: "2026-11-20T00:00:00Z",
            owner: { login: "octo" },
            topics: [],
          })),
        },
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(10000);
    const cdp = safari ? null : await context.newCDPSession(page);
    const stack = page.locator(".gp-route-stack");
    const active = page.locator("[data-route-active=true]");
    const input = page.getByRole("textbox", {
      name: "搜索关键词",
      exact: true,
    });
    const phase = () => stack.getAttribute("data-back-phase");
    const touch = async (type, x, y = 400) => {
      if (cdp) {
        await cdp.send("Input.dispatchTouchEvent", {
          type,
          touchPoints:
            type === "touchEnd" || type === "touchCancel"
              ? []
              : [{ x, y, id: 0 }],
        });
      } else {
        await page.evaluate(
          ({ type, x, y }) => {
            if (type === "touchStart")
              window.qaTouchTarget = document.elementFromPoint(x, y);
            const event = new Event(type.toLowerCase(), {
              bubbles: true,
              cancelable: true,
            });
            const point = { clientX: x, clientY: y, identifier: 0 };
            Object.defineProperties(event, {
              touches: {
                value:
                  type === "touchEnd" || type === "touchCancel" ? [] : [point],
              },
              changedTouches: { value: [point] },
            });
            window.qaTouchTarget.dispatchEvent(event);
          },
          { type, x, y },
        );
      }
    };
    const start = async () => {
      const x = await stack.evaluate((e) => e.getBoundingClientRect().left);
      await touch("touchStart", x + 8);
      return x;
    };
    const move = async (x, distance) => {
      for (const fraction of [0.15, 0.4, 0.7, 1]) {
        await touch("touchMove", x + 8 + distance * fraction);
        await page.waitForTimeout(24);
      }
    };
    const settled = async () => expect.poll(phase).toBeNull();
    await page.goto(`${origin}/#/explore?q=react&page=2`);
    await expect(active.locator(".gp-repo-card")).toHaveCount(30);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.qaCommands.includes("set_navigation_gestures"),
        ),
      )
      .toBe(true);
    // No guessed previous page after direct entry.
    let x = await start();
    await move(x, 180);
    await touch("touchEnd", x + 188);
    await settled();
    await expect(page).toHaveURL(/q=react&page=2/);
    await input.fill("vue");
    await input.press("Enter");
    await expect(page).toHaveURL(/q=vue/);
    await expect(active.locator(".gp-repo-card").first()).toContainText(
      "vue-0",
    );
    await input.fill("unsent second query");
    await input.blur();
    await page.evaluate(() => {
      window.qaA = document.querySelector(
        '[data-route-url="/explore?q=react&page=2"]',
      );
      window.qaB = document.querySelector("[data-route-active=true]");
      window.qaA.scrollTop = 700;
      window.qaB.scrollTop = 420;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      canvas.getContext("2d").fillRect(0, 0, 16, 16);
      window.qaA.firstElementChild.append(canvas);
      window.qaCanvas = canvas;
      window.qaPixels = canvas.toDataURL();
    });
    const chromeBounds = () =>
      page.evaluate(() =>
        [".gp-topbar", ".gp-mobile-nav", ".gp-sidebar"].map((selector) => {
          const e = document.querySelector(selector);
          if (!e) return null;
          const { x, y, width, height } = e.getBoundingClientRect();
          return { x, y, width, height };
        }),
      );
    const fixed = await chromeBounds();
    const requestCount = requests;
    // Cancel a deliberate short drag: no URL, input, scroll or DOM replacement.
    x = await start();
    await move(x, 60);
    await expect.poll(phase).toBe("dragging");
    expect(await chromeBounds()).toEqual(fixed);
    expect(
      await page.evaluate(() => ({
        a: window.qaA.scrollTop,
        b: window.qaB.scrollTop,
        preview: getComputedStyle(window.qaA).visibility,
        same:
          document.querySelector('[data-back-layer="previous"]') === window.qaA,
        inert: window.qaA.inert && window.qaB.inert,
      })),
    ).toEqual({ a: 700, b: 420, preview: "visible", same: true, inert: true });
    await page.waitForTimeout(150); // remove flick velocity
    await touch("touchEnd", x + 68);
    await settled();
    await expect(page).toHaveURL(/q=vue/);
    await expect(input).toHaveValue("unsent second query");
    expect(await active.evaluate((e) => e.scrollTop)).toBe(420);
    // Sample every animation frame through release + React commit, including
    // original DOM identity, final geometry, visibility, scroll and canvas.
    await page.evaluate(() => {
      window.qaSamples = [];
      window.qaSampling = true;
      const sample = () => {
        if (!window.qaSampling) return;
        const a = window.qaA,
          b = window.qaB;
        window.qaSamples.push({
          phase: document.querySelector(".gp-route-stack").dataset.backPhase,
          a: {
            x: a.getBoundingClientRect().x,
            y: a.scrollTop,
            visible: getComputedStyle(a).visibility,
          },
          b: {
            x: b.getBoundingClientRect().x,
            y: b.scrollTop,
            visible: getComputedStyle(b).visibility,
          },
          returned: a.dataset.routeActive === "true",
          same: a.isConnected && b.isConnected && window.qaCanvas.isConnected,
        });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    x = await start();
    const distance = (await stack.boundingBox()).width * 0.7;
    await move(x, distance);
    await expect.poll(phase).toBe("dragging");
    expect(await chromeBounds()).toEqual(fixed);
    await touch("touchEnd", x + 8 + distance);
    await expect(page).toHaveURL(/q=react&page=2/);
    await settled();
    await page.waitForTimeout(100);
    const samples = await page.evaluate(() => {
      window.qaSampling = false;
      return window.qaSamples;
    });
    expect(samples.length).toBeGreaterThan(5);
    expect(samples.some((s) => s.phase === "settling")).toBe(true);
    expect(samples.some((s) => s.returned && !s.phase)).toBe(true);
    for (const sample of samples) {
      expect(sample.same).toBe(true);
      expect(sample.a.y).toBe(700);
      expect(sample.b.y).toBe(420);
      expect(
        sample.a.visible === "visible" || sample.b.visible === "visible",
      ).toBe(true);
      if (sample.returned && !sample.phase) {
        expect(sample.a.x).toBeCloseTo(x);
        expect(sample.a.visible).toBe("visible");
        expect(sample.b.visible).toBe("hidden");
      }
    }
    expect(
      await page.evaluate(() => ({
        same: document.querySelector("[data-route-active=true]") === window.qaA,
        pixels: window.qaCanvas.toDataURL() === window.qaPixels,
        inert: window.qaA.inert,
      })),
    ).toEqual({ same: true, pixels: true, inert: false });
    expect(requests).toBe(requestCount);
    // Forward restores B. Repeated swipes must still use the observed history.
    for (let repeat = 0; repeat < 2; repeat++) {
      await page.goForward();
      await expect(input).toHaveValue("unsent second query");
      expect(await active.evaluate((e) => e.scrollTop)).toBe(420);
      x = await start();
      await move(x, distance);
      await touch("touchEnd", x + 8 + distance);
      await expect(page).toHaveURL(/q=react&page=2/);
      await settled();
      expect(await active.evaluate((e) => e.scrollTop)).toBe(700);
    }
    await page.goForward();
    await expect(active).toHaveAttribute("data-route-url", /q=vue(?:&|$)/);
    await expect(input).toHaveValue("unsent second query");
    // Text editing and overlays own the interaction; they cannot navigate away.
    // The retained input can already be visible while the forward navigation
    // is finishing. Establish actual focus before sending the trusted gesture.
    await expect
      .poll(() =>
        input.evaluate((element) => {
          element.focus({ preventScroll: true });
          return document.activeElement === element;
        }),
      )
      .toBe(true);
    x = await start();
    await move(x, distance);
    await touch("touchEnd", x + 8 + distance);
    await settled();
    await expect(page).toHaveURL(/q=vue/);
    await input.blur();
    await active.evaluate((e) => (e.scrollTop = 420));
    x = await start();
    await move(x, 60);
    await expect.poll(phase).toBe("dragging");
    await page
      .locator(".gp-topbar")
      .getByRole("button", { name: "登录", exact: true })
      .evaluate((e) => e.click());
    await expect(page.getByRole("dialog")).toBeVisible();
    await settled();
    await touch("touchEnd", x + 68);
    await expect(page).toHaveURL(/q=vue/);
    await page.getByRole("button", { name: "关闭登录" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    // Suspending the app cancels an unfinished drag without consuming history.
    x = await start();
    await move(x, 60);
    await expect.poll(phase).toBe("dragging");
    await page.evaluate(() => {
      window.__GITPULSE_APP_ACTIVE__ = false;
      window.dispatchEvent(new Event("gitpulse:app-state"));
    });
    await touch("touchEnd", x + 68);
    await settled();
    await expect(page).toHaveURL(/q=vue/);
    await page.evaluate(() => {
      window.__GITPULSE_APP_ACTIVE__ = true;
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    x = await start();
    await move(x, distance);
    await touch("touchEnd", x + 8 + distance);
    await expect(page).toHaveURL(/q=react&page=2/);
    await settled();
    expect(await active.evaluate((e) => e.scrollTop)).toBe(700);
    // Tabs are separate top-level sections. Switching restores the original
    // query/draft/viewport, but cannot turn a swipe into another tab selection.
    const selectTab = async (
      mobileName,
      desktopName = mobileName,
      programmatic = false,
    ) => {
      const mobile = page.locator(".gp-mobile-nav");
      const item = (await mobile.isVisible())
        ? mobile.getByRole("link", { name: mobileName, exact: true })
        : page
            .locator(".gp-sidebar")
            .getByRole("menuitem", { name: desktopName, exact: true });
      if (programmatic) await item.evaluate((e) => e.click());
      else await item.click();
    };
    const swipe = async () => {
      const left = await start();
      await move(left, distance);
      await touch("touchEnd", left + 8 + distance);
      await settled();
    };
    await input.fill("preserved tab draft");
    await input.blur();
    await active.evaluate((e) => (e.scrollTop = 700));
    await selectTab("我的", "我的空间");
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(active).toHaveAttribute("data-route-url", "/profile");
    await expect(
      active.getByRole("button", { name: "账号与外观", exact: true }),
    ).toBeVisible();
    await swipe();
    await expect(page).toHaveURL(/#\/profile$/);
    await selectTab("搜索");
    await expect(input).toHaveValue("preserved tab draft");
    expect(
      await active.evaluate((e) => e === window.qaA && e.scrollTop === 700),
    ).toBe(true);
    await swipe();
    await expect(page).toHaveURL(/q=react&page=2/);
    // Chrome is pointer-disabled during a drag. An external/programmatic tab
    // change must still cancel the stale transition before it can commit Back.
    await input.fill("vue");
    await input.press("Enter");
    await input.blur();
    await expect(page).toHaveURL(/q=vue/);
    // A hash change precedes the React transition in WebKit. Wait for the
    // committed active frame before blurring its input and starting a gesture.
    await expect(active).toHaveAttribute("data-route-url", /q=vue/);
    await input.blur();
    x = await start();
    await move(x, 60);
    await expect.poll(phase).toBe("dragging");
    await selectTab("我的", "我的空间", true);
    await settled();
    await touch("touchEnd", x + 68);
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(active).toHaveAttribute("data-route-url", "/profile");
    // Drill-down Back still works within the current tab, including repeated
    // settings visits and a root selection while already inside that tab.
    await active
      .getByRole("button", { name: "账号与外观", exact: true })
      .click();
    await expect(active).toHaveAttribute("data-route-url", "/profile/settings");
    await expect(
      active.getByRole("heading", { name: "账号与外观", exact: true }),
    ).toBeVisible();
    const settingsScroll = await page.evaluate(() => {
      window.qaSettings = document.querySelector("[data-route-active=true]");
      window.qaSettings.scrollTop = 250;
      return window.qaSettings.scrollTop;
    });
    expect(settingsScroll).toBeGreaterThan(0);
    await swipe();
    await expect(page).toHaveURL(/#\/profile$/);
    await swipe();
    await expect(page).toHaveURL(/#\/profile$/);
    // Wait out the controller's 500ms post-gesture ghost-click guard before
    // beginning a genuinely separate tap (especially with reduced motion).
    await page.waitForTimeout(550);
    await active
      .getByRole("button", { name: "账号与外观", exact: true })
      .click();
    await expect(active).toHaveAttribute("data-route-url", "/profile/settings");
    expect(
      await active.evaluate((e) => ({
        same: e === window.qaSettings,
        scroll: e.scrollTop,
      })),
    ).toEqual({ same: true, scroll: settingsScroll });
    await selectTab("我的", "我的空间");
    await swipe();
    await expect(page).toHaveURL(/#\/profile$/);
    expect(await chromeBounds()).toEqual(fixed);
    expect(errors).toEqual([]);
    console.log(
      `${safari ? "WebKit synthetic" : "Chromium trusted touch"} ${width}px: cancel/commit/repeated Back, query/draft/scroll/canvas identity, tab boundaries, same-tab Back, fixed navigation and ${samples.length} transition frames passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
