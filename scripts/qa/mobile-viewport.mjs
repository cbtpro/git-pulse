import { chromium, expect } from "@playwright/test";

// Run against pnpm dev:web; override GITPULSE_TEST_URL and CHROME_PATH as needed.
// Chromium device emulation checks viewport behavior, not native Safari gestures.
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
const repo = {
  id: 1,
  name: "project",
  full_name: "octo/project",
  html_url: "https://github.com/octo/project",
  description: "Viewport fixture",
  default_branch: "main",
  private: false,
  stargazers_count: 0,
  owner: { login: "octo" },
};
async function pinch(cdp, x, y) {
  await cdp.send("Input.synthesizePinchGesture", {
    x,
    y,
    scaleFactor: 1.8,
    relativeSpeed: 400,
    gestureSourceType: "touch",
  });
}
try {
  for (const device of [
    {
      name: "Android",
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    },
    {
      name: "iPad desktop UA",
      viewport: { width: 1024, height: 768 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    },
  ]) {
    const context = await browser.newContext({
      viewport: device.viewport,
      userAgent: device.userAgent,
      isMobile: true,
      hasTouch: true,
    });
    if (device.name.startsWith("iPad"))
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
        Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
      });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    // Verify the gesture really scales an unrestricted viewport before testing the app.
    await page.setContent(
      '<meta name="viewport" content="width=device-width, initial-scale=1"><div style="height:2000px">Zoom control</div>',
    );
    await pinch(cdp, 195, 340);
    expect(await page.evaluate(() => visualViewport.scale)).toBeGreaterThan(
      1.4,
    );
    await page.route("https://api.github.com/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path === "/repos/octo/project") data = repo;
      else if (path.endsWith("/branches")) data = [{ name: "main" }];
      else if (path.includes("/contents/"))
        data = {
          type: "file",
          name: "file.ts",
          path: "src/file.ts",
          size: 2000,
          encoding: "base64",
          content: Buffer.from(
            "const text = '" + "long code ".repeat(200) + "';",
          ).toString("base64"),
          html_url: repo.html_url,
        };
      else if (path.startsWith("/search/"))
        data = { items: [], total_count: 0 };
      return route.fulfill({ json: data });
    });
    await page.goto(origin);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await expect(page.locator("html")).toHaveAttribute(
      "data-mobile-viewport",
      "fixed",
    );
    await pinch(cdp, 195, 340);
    expect(await page.evaluate(() => visualViewport.scale)).toBeCloseTo(1, 3);
    await cdp.send("Input.synthesizeScrollGesture", {
      x: 195,
      y: 450,
      yDistance: -260,
      speed: 500,
      gestureSourceType: "touch",
    });
    expect(
      await page
        .locator("[data-route-active=true]")
        .evaluate((element) => element.scrollTop),
    ).toBeGreaterThan(50);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    await pinch(
      cdp,
      Math.round(bounds.x + bounds.width / 2),
      Math.round(Math.max(100, bounds.y) + 100),
    );
    expect(await page.evaluate(() => visualViewport.scale)).toBeCloseTo(1, 3);
    await page.goto(`${origin}/#/repo/octo/project?path=src/file.ts`);
    await page.reload();
    const code = page.locator(".gp-code");
    await expect(code).toBeVisible();
    await code.scrollIntoViewIfNeeded();
    const box = await code.boundingBox();
    const x = Math.round(box.x + Math.min(box.width - 40, 200)),
      y = Math.round(box.y + 25);
    await cdp.send("Input.synthesizeScrollGesture", {
      x,
      y,
      xDistance: -180,
      yDistance: 0,
      speed: 400,
      gestureSourceType: "touch",
    });
    expect(
      await code.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(50);
    await pinch(cdp, x, y);
    expect(await page.evaluate(() => visualViewport.scale)).toBeCloseTo(1, 3);
    await page.getByRole("textbox", { name: "文件路径", exact: true }).tap();
    expect(await page.evaluate(() => visualViewport.scale)).toBeCloseTo(1, 3);
    console.log(
      `${device.name}: scale stays 1 in page/dialog/code; vertical and horizontal touch scrolling pass`,
    );
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ json: { items: [], total_count: 0 } }),
  );
  await page.goto(origin);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-mobile-viewport",
    "fixed",
  );
  expect(
    await page.locator('meta[name="viewport"]').getAttribute("content"),
  ).not.toMatch(/maximum-scale|user-scalable/);
  expect(
    await page.evaluate(() => {
      const event = new Event("gesturestart", { cancelable: true });
      document.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
  console.log("Narrow desktop window: browser zoom remains available");
  await context.close();
} finally {
  await browser.close();
}
