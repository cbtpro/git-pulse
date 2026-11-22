import { chromium, expect } from "@playwright/test";

const url = process.env.GITPULSE_TEST_URL || "http://127.0.0.1:1433/git-pulse/";
const base = new URL(url);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const errors = [];
    const failedAssets = [];
    let oauthRequests = 0;
    await context.route("https://api.github.com/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/user") {
        expect(route.request().headers().authorization).toBe(
          "Bearer pages-test-token",
        );
        return route.fulfill({
          json: {
            id: 88991,
            login: "pages-fixture",
            avatar_url: "",
            public_repos: 0,
            followers: 0,
            following: 0,
          },
        });
      }
      return route.fulfill({
        json: path.startsWith("/search/") ? { items: [], total_count: 0 } : [],
      });
    });
    await context.route("**/api/github/login/**", (route) => {
      oauthRequests++;
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().startsWith(base.origin) && response.status() >= 400)
        failedAssets.push(response.url());
    });
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "发现值得关注的开源" }),
    ).toBeVisible();
    const brand = page.locator('img[src$="icons/brand.webp"]').first();
    await expect(brand).toHaveAttribute(
      "src",
      `${base.pathname}icons/brand.webp`,
    );
    expect(
      await brand.evaluate((image) => image.complete && image.naturalWidth > 0),
    ).toBe(true);
    const manifest = await context.request.get(
      new URL("site.webmanifest", url).href,
    );
    expect(manifest.ok()).toBe(true);
    for (const icon of (await manifest.json()).icons) {
      expect(
        (await context.request.get(new URL(icon.src, url).href)).ok(),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByLabel("Personal Access Token")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "使用 GitHub 登录" }),
    ).toHaveCount(0);
    await page.getByLabel("Personal Access Token").fill("pages-test-token");
    await page
      .getByRole("button", { name: "使用 Token 登录", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.values(localStorage).some((value) =>
          value.includes("pages-test-token"),
        ),
      ),
    ).toBe(false);
    await page.goto(`${url}#/profile/settings`);
    await expect(
      page.getByRole("heading", { name: "账号与外观", level: 1 }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "账号与外观", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "登录", exact: true }),
    ).toHaveCount(0);
    expect(oauthRequests).toBe(0);
    expect(failedAssets).toEqual([]);
    expect(errors).toEqual([]);
    console.log(
      `${width}px: Pages subpath assets, manifest icons, token sign-in, encrypted restore and hash-route reload passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
