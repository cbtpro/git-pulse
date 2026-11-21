import { chromium, expect } from "@playwright/test";
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
  description: "Page state fixture",
  default_branch: "main",
  private: false,
  stargazers_count: 1,
  forks_count: 0,
  updated_at: "2026-11-20T00:00:00Z",
  owner: { login: "octo" },
  topics: [],
};
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      ...(width === 390
        ? {
            userAgent:
              "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
            isMobile: true,
            hasTouch: true,
          }
        : {}),
    });
    let searches = 0;
    await context.route("https://api.github.com/**", (route) => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname === "/search/repositories") {
        if (url.searchParams.get("q")?.includes("react")) searches++;
        const name = url.searchParams.get("q")?.includes("vue")
          ? "vue"
          : "project";
        data = {
          total_count: 300,
          items: Array.from({ length: 30 }, (_, i) => ({
            ...repo,
            id: i + 1,
            name: name + "-" + i,
            full_name: "octo/" + name + "-" + i,
          })),
        };
      } else if (url.pathname === "/repos/octo/project") data = repo;
      else if (url.pathname.endsWith("/branches")) data = [{ name: "main" }];
      else if (url.pathname.includes("/contents/"))
        data = {
          type: "file",
          name: "file.ts",
          path: "src/file.ts",
          size: 1500,
          encoding: "base64",
          content: Buffer.from(
            "const value = '" + "long line ".repeat(150) + "';",
          ).toString("base64"),
          html_url: repo.html_url,
        };
      else if (url.pathname.startsWith("/search/"))
        data = { items: [], total_count: 0 };
      return route.fulfill({ json: data });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const navigate = async (name) =>
      width === 390
        ? page
            .getByRole("navigation", { name: "底部导航" })
            .getByRole("link", { name, exact: true })
            .click()
        : page
            .getByRole("navigation", { name: "主导航" })
            .getByRole("menuitem", { name, exact: true })
            .click();
    await page.goto(`${origin}/#/explore?q=react&page=2`);
    await expect(
      page.locator('[data-route-page="/explore"] .gp-repo-card'),
    ).toHaveCount(30);
    const input = page.getByRole("textbox", {
      name: "搜索关键词",
      exact: true,
    });
    await input.fill("unfinished draft");
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    const requests = searches;
    await navigate(width === 390 ? "我的" : "我的空间");
    await expect(input).not.toBeVisible();
    await navigate("搜索");
    await expect(input).toHaveValue("unfinished draft");
    expect(page.url()).toContain("q=react&page=2");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    expect(searches).toBe(requests);
    await input.fill("vue");
    await input.press("Enter");
    await expect(page).toHaveURL(/q=vue/);
    // Old results can still be present for a frame before the loading skeleton.
    // Wait for the new response to render before testing the wheel position.
    await expect(
      page.locator('[data-route-page="/explore"] .gp-repo-card').first(),
    ).toContainText("vue-0");
    await expect(
      page.locator('[data-route-page="/explore"] .gp-repo-card'),
    ).toHaveCount(30);
    await page.mouse.move(width / 2, 550);
    await page.mouse.wheel(0, 450);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(450);
    await navigate(width === 390 ? "我的" : "我的空间");
    await navigate("搜索");
    await expect(input).toHaveValue("vue");
    await expect(page).toHaveURL(/q=vue/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(450);
    await page.goto(`${origin}/#/repo/octo/project?path=src/file.ts`);
    const code = page.locator(".gp-code");
    await expect(code).toBeVisible();
    await code.evaluate((element) => {
      element.scrollLeft = 240;
    });
    await navigate(width === 390 ? "我的" : "我的空间");
    await page.goBack();
    await expect(code).toBeVisible();
    await expect
      .poll(() => code.evaluate((element) => element.scrollLeft))
      .toBe(240);
    expect(errors).toEqual([]);
    console.log(
      `${width}px: draft, query, pagination, results, window scroll, code scroll, and browser back retained`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
