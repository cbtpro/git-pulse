import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
try {
  for (const width of [390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1",
      isMobile: true,
      hasTouch: true,
    });
    let searches = 0;
    await context.route("https://api.github.com/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/search/repositories") {
        searches++;
        return route.fulfill({
          json: {
            total_count: 300,
            items: Array.from({ length: 30 }, (_, i) => ({
              id: i + 1,
              name: `project-${i}`,
              full_name: `octo/project-${i}`,
              html_url: `https://github.com/octo/project-${i}`,
              description: "Gesture fixture",
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
      }
      return route.fulfill({
        json: url.pathname.startsWith("/search/")
          ? { total_count: 0, items: [] }
          : [],
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/#/explore?q=react&page=2`);
    await expect(
      page.locator('[data-route-page="/explore"] .gp-repo-card'),
    ).toHaveCount(30);
    const input = page.getByRole("textbox", {
      name: "搜索关键词",
      exact: true,
    });
    await input.fill("unfinished draft");
    await input.blur();
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    const requests = searches;
    const nav = page.getByRole("navigation", { name: "底部导航" });
    await nav.getByRole("link", { name: "我的", exact: true }).click();
    await expect(input).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);

    // Exercise the production gesture controller and real application layout.
    // Native bridge activation is covered separately in component tests.
    await page.evaluate(async () => {
      const { installContentBackGesture } =
        await import("/src/components/routing/contentBackGesture.ts");
      window.gestureTest = installContentBackGesture(
        document.querySelector(".gp-content-viewport"),
        {
          canGoBack: () => window.history.state?.idx > 0,
          blocked: () => false,
          back: () => window.history.back(),
        },
      );
    });
    const client = await context.newCDPSession(page);
    const touch = (type, x = 5, y = 350) =>
      client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints:
          type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }],
      });
    const main = page.locator(".gp-main");
    const viewport = page.locator(".gp-content-viewport");
    const header = page.locator(".gp-topbar");
    const navBefore = await nav.boundingBox();
    const headerBefore = await header.boundingBox();
    const mainBefore = await main.boundingBox();
    await touch("touchStart");
    await touch("touchMove", 75);
    await expect(viewport).toHaveAttribute("data-back-swipe", "dragging");
    expect((await main.boundingBox()).x).toBeGreaterThan(mainBefore.x + 50);
    expect(await nav.boundingBox()).toEqual(navBefore);
    expect(await header.boundingBox()).toEqual(headerBefore);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({ path: `/tmp/gitpulse-content-back-${width}.png` });
    await touch("touchCancel");
    await expect(viewport).not.toHaveAttribute("data-back-swipe");
    expect(page.url()).toContain("#/profile");
    expect((await main.boundingBox()).x).toBe(mainBefore.x);

    await touch("touchStart");
    await touch("touchMove", 190);
    await touch("touchEnd");
    await expect(page).toHaveURL(/#\/explore\?q=react&page=2/);
    await expect(input).toHaveValue("unfinished draft");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    expect(searches).toBe(requests);
    expect(await nav.boundingBox()).toEqual(navBefore);
    await expect(viewport).not.toHaveAttribute("data-back-swipe");

    // A normal vertical drag near the left edge must still scroll the page.
    await touch("touchStart", 5, 500);
    await touch("touchMove", 7, 450);
    await touch("touchMove", 7, 350);
    await touch("touchEnd");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(700);
    await expect(viewport).not.toHaveAttribute("data-back-swipe");
    expect(page.url()).toContain("q=react&page=2");
    expect(errors).toEqual([]);
    await page.evaluate(() => window.gestureTest.destroy());
    console.log(
      `${width}px touch: only content moves; header/nav fixed; cancel, vertical scrolling, cached draft/results/scroll retained`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
