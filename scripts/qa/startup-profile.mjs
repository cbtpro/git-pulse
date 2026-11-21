import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Run against a production preview to exercise the bundled startup path.
const origin = process.env.GITPULSE_TEST_URL || "http://127.0.0.1:1421";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const profile = {
  id: 100,
  login: "fixture",
  name: "Open Source Builder",
  avatar_url: "https://fixture.invalid/avatar.svg",
  bio: "Building useful things together.",
  location: "Shanghai",
  created_at: "2020-01-01",
  public_repos: 24,
  public_gists: 8,
  followers: 128,
  following: 32,
};
const flags = {
  isGitHubStar: true,
  isDeveloperProgramMember: true,
  isCampusExpert: false,
  isBountyHunter: false,
  isEmployee: false,
  isSiteAdmin: false,
};
await mkdir("review-artifacts/startup", { recursive: true });
try {
  for (const device of [
    {
      name: "iOS",
      width: 390,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1",
    },
    {
      name: "Android",
      width: 320,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
    },
    { name: "Desktop", width: 1280 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: 844 },
      userAgent: device.userAgent,
      isMobile: device.width < 600,
      hasTouch: device.width < 600,
    });
    let mode = "online",
      pendingProfile,
      profileRequests = 0;
    await context.route("https://fixture.invalid/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="16" fill="#37a570"/><circle cx="40" cy="40" r="18" fill="#fff"/></svg>',
      }),
    );
    await context.route("https://api.github.com/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/user") {
        profileRequests++;
        if (mode === "hold") {
          pendingProfile = route;
          return;
        }
        if (mode === "offline") return route.abort("internetdisconnected");
        return route.fulfill({ json: profile });
      }
      if (mode === "offline") return route.abort("internetdisconnected");
      if (path === "/graphql") {
        const query = route.request().postDataJSON().query;
        if (query.includes("GitPulseProfileBadges"))
          return route.fulfill({
            json: {
              data: {
                viewer:
                  mode === "restricted"
                    ? Object.fromEntries(
                        Object.keys(flags).map((key) => [key, false]),
                      )
                    : flags,
              },
            },
          });
        return route.fulfill({
          json: {
            data: {
              viewer: {
                login: "fixture",
                contributionsCollection: {
                  contributionCalendar: { totalContributions: 0, weeks: [] },
                },
              },
            },
          },
        });
      }
      if (path.endsWith("/orgs")) {
        expect(route.request().headers().authorization).toBe(
          "Bearer startup-fixture-token",
        );
        if (mode === "restricted")
          return route.fulfill({
            status: path === "/user/memberships/orgs" ? 403 : 200,
            json: path === "/user/memberships/orgs" ? {} : [],
          });
        return route.fulfill({
          json: ["OpenSource", "a-long-organization-name-that-must-wrap"].map(
            (login, index) => ({
              state: "active",
              organization: {
                id: index,
                login,
                avatar_url: "https://fixture.invalid/avatar.svg",
              },
            }),
          ),
        });
      }
      return route.fulfill({
        json: path.startsWith("/search/") ? { items: [], total_count: 0 } : [],
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/#/profile`);
    await page
      .getByRole("button", { name: "登录", exact: true })
      .first()
      .click();
    await page.getByText("Token 登录", { exact: true }).click();
    await page
      .getByLabel("Personal Access Token", { exact: true })
      .fill("startup-fixture-token");
    await page
      .getByRole("button", { name: "使用 Token 登录", exact: true })
      .click();
    await expect(page.locator(".gp-profile-name h2")).toHaveText(profile.name);
    await expect(
      page.getByText("开发者计划成员", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "OpenSource", exact: true }),
    ).toBeVisible();
    // Leave /user entirely unresolved. A cached cold start must still render.
    mode = "hold";
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const start = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".gp-profile-name h2")).toHaveText(profile.name, {
      timeout: 3000,
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
    await expect.poll(() => Boolean(pendingProfile)).toBe(true);
    expect(profileRequests).toBe(2);
    await expect(page.locator(".gp-startup")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "OpenSource", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const avatar = await page
      .locator(".gp-profile-main > .arco-avatar")
      .boundingBox();
    expect(Math.abs(avatar.width - avatar.height)).toBeLessThan(1);
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const { x, y, width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        main: rect(".gp-profile-main"),
        stats: rect(".gp-profile-stats"),
        identity: rect(".gp-profile-identity"),
        badgeHeading: rect(
          ".gp-profile-identity > section:first-child .gp-profile-identity-heading",
        ),
        orgHeading: rect(
          ".gp-profile-identity > section:last-child .gp-profile-identity-heading",
        ),
        badges: rect(".gp-profile-badges"),
        orgs: rect(".gp-profile-organizations"),
      };
    });
    expect(Math.abs(geometry.main.x - geometry.stats.x)).toBeLessThan(1);
    expect(Math.abs(geometry.main.x - geometry.identity.x)).toBeLessThan(1);
    expect(Math.abs(geometry.main.width - geometry.stats.width)).toBeLessThan(
      1,
    );
    if (device.width > 768) {
      expect(
        Math.abs(geometry.badgeHeading.y - geometry.orgHeading.y),
      ).toBeLessThan(1);
      expect(Math.abs(geometry.badges.y - geometry.orgs.y)).toBeLessThan(1);
    } else {
      expect(
        Math.abs(geometry.badgeHeading.x - geometry.orgHeading.x),
      ).toBeLessThan(1);
    }
    await page.locator(".gp-profile-card").screenshot({
      path: `review-artifacts/startup/profile-${device.name}.png`,
    });
    await pendingProfile.fulfill({
      json: { ...profile, name: "Updated in background" },
    });
    await expect(page.locator(".gp-profile-name h2")).toHaveText(
      "Updated in background",
    );
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    mode = "offline";
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".gp-profile-name h2")).toHaveText(
      "Updated in background",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Restricted results explain their visibility without an authorization button
    // in the profile card, including localized text and dark mode on narrow screens.
    mode = "restricted";
    for (const language of device.name === "Android"
      ? ["zh-CN", "en", "ja", "zh-TW"]
      : ["zh-CN"]) {
      await page.evaluate((language) => {
        const preferences = JSON.parse(
          localStorage.getItem("gitpulse-preferences") || '{"state":{}}',
        );
        preferences.state.language = language;
        preferences.state.theme = language === "en" ? "dark" : "light";
        localStorage.setItem(
          "gitpulse-preferences",
          JSON.stringify(preferences),
        );
      }, language);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.locator(
          ".gp-profile-identity > section:last-child .gp-profile-identity-footer p",
        ),
      ).toBeVisible();
      await expect(
        page.locator(".gp-profile-identity > section:last-child button"),
      ).toHaveCount(0);
      await expect(page.locator(".gp-profile-badges")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.locator(".gp-profile-card").screenshot({
        path: `review-artifacts/startup/profile-${device.name}-${language}-restricted.png`,
      });
    }
    expect(errors).toEqual([]);
    console.log(
      `${device.name}: cached profile visible in ${duration}ms at 4x CPU slowdown with /user still pending; offline restore, badges, organizations and layout passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
