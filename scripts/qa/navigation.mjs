import { chromium, webkit, expect } from "@playwright/test";

const browser =
  process.env.GITPULSE_TEST_BROWSER === "webkit"
    ? await webkit.launch({ headless: true })
    : await chromium.launch({
        executablePath:
          process.env.CHROME_PATH ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        headless: true,
      });
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
const repository = (owner, name, id = 1) => ({
  id,
  name,
  full_name: `${owner}/${name}`,
  html_url: `https://github.com/${owner}/${name}`,
  description: "Navigation fixture",
  default_branch: "main",
  private: false,
  stargazers_count: 1,
  forks_count: 0,
  updated_at: "2026-11-20T00:00:00Z",
  owner: { login: owner },
  topics: [],
});
try {
  for (const width of [320, 390, 1280]) {
    const mobile = width < 768;
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      ...(mobile
        ? {
            isMobile: true,
            hasTouch: true,
            userAgent:
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1",
          }
        : {}),
    });
    let searches = 0;
    await context.route("https://api.github.com/**", (route) => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname.startsWith("/search/")) {
        if (url.searchParams.get("q") === "react") searches++;
        data = {
          total_count: 300,
          items: Array.from({ length: 30 }, (_, i) =>
            repository("octo", `project-${i}`, i + 1),
          ),
        };
      } else if (/^\/repos\/[^/]+\/[^/]+$/.test(url.pathname)) {
        const [, , owner, name] = url.pathname.split("/");
        data = repository(owner, name);
      } else if (url.pathname.endsWith("/branches")) data = [{ name: "main" }];
      else if (url.pathname.endsWith("/contents/"))
        data = [{ type: "dir", name: "src", path: "src", size: 0 }];
      else if (url.pathname.endsWith("/contents/src"))
        data = [
          { type: "file", name: "file.ts", path: "src/file.ts", size: 20 },
        ];
      else if (url.pathname.includes("/contents/"))
        data = {
          type: "file",
          name: "file.ts",
          path: url.pathname.split("/contents/")[1],
          size: 20,
          encoding: "base64",
          content: Buffer.from("export const value = 1;").toString("base64"),
        };
      else if (url.pathname.endsWith("/readme"))
        return route.fulfill({ status: 404, json: { message: "Not found" } });
      return route.fulfill({ json: data });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const layout = async () => {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      const crumb = await page.locator(".gp-header-location").boundingBox();
      const actions = await page.locator(".gp-topbar-actions").boundingBox();
      expect(crumb.x + crumb.width).toBeLessThanOrEqual(actions.x);
      expect(
        (await page.locator(".gp-topbar").boundingBox()).height,
      ).toBeLessThanOrEqual(80);
    };
    const primary = () =>
      mobile
        ? page.getByRole("navigation", { name: "底部导航" })
        : page.getByRole("navigation", { name: "主导航" });
    const profile = () =>
      mobile
        ? primary().getByRole("link", { name: "我的", exact: true }).click()
        : primary()
            .getByRole("menuitem", { name: "我的空间", exact: true })
            .click();
    const settings = () =>
      page.getByRole("button", { name: "账号与外观", exact: true }).click();
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
    const repoLink = page
      .locator('[data-route-page="/explore"] .gp-repo-heading a')
      .nth(3);
    await repoLink.scrollIntoViewIfNeeded();
    const savedScroll = await page.evaluate(() => scrollY);
    const count = searches;
    await repoLink.click();
    await expect(
      page.getByRole("heading", { name: "octo/project-3", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "返回搜索", exact: true }),
    ).toBeVisible();
    if (mobile)
      await expect(
        primary().getByRole("link", { name: "搜索", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    await page
      .locator(".gp-file-list")
      .getByRole("button", { name: "src", exact: true })
      .click();
    await page
      .locator(".gp-file-list")
      .getByRole("button", { name: "file.ts", exact: true })
      .click();
    await expect(page.locator(".gp-code")).toBeVisible();
    await layout();
    await page.getByRole("link", { name: "返回src", exact: true }).click();
    await expect(page).toHaveURL(/path=src$/);
    await page
      .getByRole("link", { name: "返回octo/project-3", exact: true })
      .click();
    await page.getByRole("link", { name: "返回搜索", exact: true }).click();
    await expect(page).toHaveURL(/#\/explore\?q=react&page=2$/);
    await expect(input).toHaveValue("unfinished draft");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(savedScroll);
    expect(searches).toBe(count);
    await expect(page.locator("#main-content")).toBeFocused();

    await profile();
    await settings();
    await layout();
    await page.getByRole("link", { name: "返回我的空间", exact: true }).click();
    await expect(page).toHaveURL(/#\/profile$/);
    await settings();
    const crumbs = page.getByRole("navigation", { name: "面包屑导航" });
    if (mobile) {
      const toggle = crumbs.locator(".gp-crumb-mobile-overflow summary");
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(
        crumbs.locator(".gp-crumb-mobile-overflow details"),
      ).toHaveAttribute("open", "");
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await expect(
        crumbs.locator(".gp-crumb-mobile-overflow details"),
      ).not.toHaveAttribute("open");
      await toggle.click();
    }
    await crumbs.getByRole("link", { name: "概览", exact: true }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('[data-route-page="/"] h1')).toBeVisible();
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText("概览");

    const longName = "a-repository-with-a-very-long-name";
    await page.goto(
      `${origin}/#/repo/octo/${longName}?ref=release%2F1&path=src/components/long-directory/long-component-name.ts`,
    );
    await expect(page.locator(".gp-code")).toBeVisible();
    await page.reload();
    await expect(page.locator(".gp-code")).toBeVisible();
    await layout();
    await page.screenshot({ path: `/tmp/gitpulse-navigation-${width}.png` });
    const overflow = crumbs.locator(
      mobile
        ? ".gp-crumb-mobile-overflow summary"
        : ".gp-crumb-desktop-overflow summary",
    );
    await overflow.click();
    await expect(
      crumbs.getByRole("link", { name: `octo/${longName}`, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/gitpulse-navigation-menu-${width}.png`,
    });
    await crumbs
      .getByRole("link", { name: `octo/${longName}`, exact: true })
      .click();
    await expect(page).toHaveURL(/ref=release%2F1$/);
    await page.getByRole("link", { name: "返回搜索", exact: true }).click();
    await expect(page).toHaveURL(/#\/explore$/);
    await profile();
    await settings();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "English", exact: true }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Breadcrumb navigation" })
        .locator('[aria-current="page"]'),
    ).toHaveText("Account & appearance");
    await layout();
    await page.screenshot({
      path: `/tmp/gitpulse-navigation-english-${width}.png`,
    });
    expect(errors).toEqual([]);
    console.log(
      `${width}px: source query/draft/scroll, clickable root, parent returns, directory/ref, direct entry, keyboard menu and English layout passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
