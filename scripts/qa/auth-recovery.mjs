import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
try {
  for (const userAgent of [
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1",
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent,
      isMobile: true,
      hasTouch: true,
    });
    let codeRequests = 0,
      exchanges = 0,
      profiles = 0,
      approved = false;
    await context.route("**/api/github/login/**", (route) => {
      if (route.request().url().endsWith("/device/code")) {
        codeRequests++;
        return route.fulfill({
          json: {
            device_code: "private-fixture-code",
            user_code: "KEEP-CODE",
            verification_uri: "https://github.com/login/device",
            expires_in: 900,
            interval: 1,
          },
        });
      }
      exchanges++;
      return route.fulfill({
        json: approved
          ? { access_token: "approved-fixture-token" }
          : { error: "authorization_pending" },
      });
    });
    await context.route("https://api.github.com/**", (route) => {
      if (new URL(route.request().url()).pathname === "/user") {
        profiles++;
        if (profiles === 1) return route.abort("failed");
        return route.fulfill({
          json: {
            id: 41,
            login: "resumed-user",
            avatar_url: "",
            public_repos: 0,
            followers: 0,
            following: 0,
          },
        });
      }
      return route.fulfill({ json: { items: [], total_count: 0 } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => console.error(error.message));
    await page.goto(origin);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page
      .getByRole("button", { name: "使用 GitHub 登录", exact: true })
      .click();
    await expect(page.getByLabel("授权验证码", { exact: true })).toHaveText(
      "KEEP-CODE",
    );
    await page.evaluate(() => {
      window.__GITPULSE_APP_ACTIVE__ = false;
      window.dispatchEvent(new Event("gitpulse:app-state"));
    });
    const before = exchanges;
    await page.waitForTimeout(1200);
    expect(exchanges).toBe(before);
    approved = true;
    // A recreated WebView must recover the encrypted pending login, including UI.
    await page.reload();
    await expect(page.getByLabel("授权验证码", { exact: true })).toHaveText(
      "KEEP-CODE",
    );
    await expect(
      page.getByText("授权进度已保存，将自动继续登录。"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "查看我的空间", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(codeRequests).toBe(1);
    expect(profiles).toBe(2);
    console.log(
      `${userAgent.includes("Android") ? "Android" : "iOS"} browser emulation: encrypted restart + transient profile failure recovered with the original code`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
