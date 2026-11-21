import { chromium, expect } from "@playwright/test";

// CSS regression with iPhone 15 Pro Max geometry; native bounds are covered by
// the iOS XCTest because a browser cannot reproduce Tao's WebView sizing.
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  isMobile: true,
  hasTouch: true,
});
await context.route("https://api.github.com/**", (route) =>
  route.fulfill({ json: { total_count: 0, items: [] } }),
);
const page = await context.newPage();
page.setDefaultTimeout(15_000);
try {
  await page.goto(
    `${process.env.GITPULSE_TEST_URL || "http://localhost:1420"}/#/settings`,
  );
  const toggle = page.getByRole("switch", { name: "开启安全区", exact: true });
  await toggle.waitFor();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-native-viewport",
    "ios",
  );
  await page.evaluate(() => {
    document.documentElement.dataset.nativeViewport = "ios";
    document.body.style.setProperty("--gp-native-safe-top", "59px");
    document.body.style.setProperty("--gp-native-safe-bottom", "34px");
  });
  const measure = () =>
    page.evaluate(() => {
      const nav = document.querySelector(".gp-mobile-nav");
      const link = nav.querySelector("a");
      const header = document.querySelector(".gp-topbar");
      const content = document.querySelector(
        "[data-route-active=true] .gp-page-content",
      );
      return {
        viewport: innerHeight,
        navBottom: nav.getBoundingClientRect().bottom,
        navHeight: nav.getBoundingClientRect().height,
        linkBottom: link.getBoundingClientRect().bottom,
        headerHeight: header.getBoundingClientRect().height,
        contentPaddingBottom: parseFloat(
          getComputedStyle(content).paddingBottom,
        ),
        safeArea: document.body.dataset.safeArea,
        bodyHeight: document.body.getBoundingClientRect().height,
        rootMinHeight: getComputedStyle(document.documentElement).minHeight,
      };
    });
  const enabled = await measure();
  expect(enabled).toMatchObject({
    viewport: 932,
    navBottom: 932,
    navHeight: 100,
    headerHeight: 117,
    safeArea: "on",
    bodyHeight: 932,
    rootMinHeight: "932px",
  });
  expect(enabled.linkBottom).toBe(932 - 34 - 7);
  expect(enabled.contentPaddingBottom).toBe(80 + 34);
  await toggle.click();
  await expect(page.locator("body")).toHaveAttribute("data-safe-area", "off");
  const disabled = await measure();
  expect(disabled).toMatchObject({
    viewport: 932,
    navBottom: 932,
    navHeight: 66,
    headerHeight: 58,
    safeArea: "off",
    bodyHeight: 932,
  });
  expect(disabled.linkBottom).toBe(932 - 7);
  expect(disabled.contentPaddingBottom).toBe(80);
  await toggle.click();
  await expect(page.locator("body")).toHaveAttribute("data-safe-area", "on");
  // Navigating and restoring a scrolled page must not move the global navbar.
  await page
    .locator(".gp-mobile-nav")
    .getByRole("link", { name: "搜索", exact: true })
    .click();
  expect((await measure()).navBottom).toBe(932);
  await page.goBack();
  await toggle.waitFor();
  expect(await measure()).toEqual(enabled);
  console.log(JSON.stringify({ enabled, disabled, restored: true }, null, 2));
} finally {
  await browser.close();
}
