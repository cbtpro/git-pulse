import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const repo = {
  id: 1,
  name: "project",
  full_name: "octo/project",
  html_url: "https://github.com/octo/project",
  description: "Workspace smoke fixture",
  default_branch: "main",
  private: false,
  permissions: { pull: true, push: true, admin: false },
  stargazers_count: 12,
  forks_count: 2,
  open_issues_count: 1,
  owner: { login: "octo", avatar_url: "", html_url: "https://github.com/octo" },
};
const run = {
  id: 77,
  name: "Build",
  display_title: "Build app",
  run_number: 3,
  run_attempt: 1,
  head_branch: "main",
  head_sha: "abc1234567",
  event: "push",
  status: "completed",
  conclusion: "failure",
  created_at: "2026-11-21T00:00:00Z",
  html_url: "https://github.com/octo/project/actions/runs/77",
};
const issue = {
  id: 7,
  number: 7,
  title: "A useful issue",
  body: "Discussion fixture",
  state: "open",
  html_url: "https://github.com/octo/project/issues/7",
  user: { login: "tester" },
  labels: [],
  assignees: [],
  updated_at: "2026-11-21T00:00:00Z",
  comments: 0,
};
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  await mkdir("review-artifacts/business", { recursive: true });
  for (const width of [390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      locale: "zh-CN",
    });
    const page = await context.newPage();
    const errors = [];
    let commentWrites = 0;
    let mergedPull = false;
    const mergeBodies = [];
    const reviewBodies = [];
    const commentAccounts = [];
    const readAccounts = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://api.github.com/**", async (route) => {
      const url = new URL(route.request().url());
      let data = {};
      if (
        url.pathname.endsWith("/issues/7/comments") &&
        route.request().method() === "POST"
      ) {
        commentWrites++;
        commentAccounts.push(route.request().headers().authorization);
        data = {
          id: 9,
          body: "Offline draft fixture",
          html_url: issue.html_url,
          user: { login: "fixture" },
        };
      } else if (url.pathname === "/notifications")
        data = [
          {
            id: "42",
            unread: !readAccounts.includes(
              route.request().headers().authorization,
            ),
            reason: "mention",
            updated_at: "2026-11-21T00:00:00Z",
            subject: {
              title: "Account notification",
              type: "Issue",
              url: "https://api.github.com/repos/octo/project/issues/7",
            },
            repository: repo,
          },
        ];
      else if (url.pathname === "/notifications/threads/42") {
        readAccounts.push(route.request().headers().authorization);
        return route.fulfill({ status: 205, body: "" });
      } else if (url.pathname === "/user")
        data = {
          id:
            route.request().headers().authorization ===
            "Bearer second-smoke-token"
              ? 101
              : 100,
          login:
            route.request().headers().authorization ===
            "Bearer second-smoke-token"
              ? "second"
              : "fixture",
          name: "Fixture",
          avatar_url: "",
          html_url: "https://github.com/fixture",
          public_repos: 1,
          followers: 0,
          following: 0,
        };
      else if (url.pathname === "/user/starred") data = [repo];
      else if (url.pathname === "/repos/octo/project") data = repo;
      else if (url.pathname === "/repos/octo/project/pulls/7/merge") {
        mergeBodies.push(route.request().postDataJSON());
        mergedPull = true;
        data = { merged: true, message: "Merged" };
      } else if (
        url.pathname === "/repos/octo/project/pulls/7/reviews" &&
        route.request().method() === "POST"
      ) {
        reviewBodies.push(route.request().postDataJSON());
        data = {
          id: 1,
          state: "COMMENTED",
          body: "Review fixture",
          user: { login: "fixture" },
          html_url: issue.html_url,
        };
      } else if (url.pathname === "/repos/octo/project/pulls/7")
        data = {
          ...issue,
          title: "Reviewable PR",
          html_url: "https://github.com/octo/project/pull/7",
          head: { sha: "viewed-sha", ref: "feature" },
          base: { ref: "main" },
          mergeable: true,
          mergeable_state: "clean",
          state: mergedPull ? "closed" : "open",
          merged: mergedPull,
        };
      else if (url.pathname === "/repos/octo/project/pulls/7/files")
        data = [
          {
            sha: "sha",
            filename: "src/file.ts",
            status: "modified",
            additions: 1,
            deletions: 1,
            patch: "@@ -1 +1 @@\n-old\n+new",
            blob_url: repo.html_url,
          },
        ];
      else if (url.pathname === "/repos/octo/project/actions/runs")
        data = { workflow_runs: [run], total_count: 1 };
      else if (url.pathname === "/repos/octo/project/actions/runs/77")
        data = run;
      else if (url.pathname.endsWith("/jobs"))
        data = {
          jobs: [
            {
              id: 88,
              name: "Build job",
              status: "completed",
              conclusion: "failure",
              html_url: run.html_url,
              steps: [
                {
                  number: 1,
                  name: "Compile",
                  status: "completed",
                  conclusion: "failure",
                },
              ],
            },
          ],
        };
      else if (url.pathname.endsWith("/artifacts"))
        data = {
          artifacts: [
            {
              id: 9,
              name: "Expired artifact",
              expired: true,
              size_in_bytes: 1024,
              expires_at: "2026-01-01T00:00:00Z",
            },
          ],
        };
      else if (url.pathname.endsWith("/jobs/88/logs"))
        return route.fulfill({
          contentType: "text/plain",
          body: "Build log fixture",
        });
      else if (url.pathname.endsWith("/releases"))
        data = [
          {
            id: 6,
            name: "Release fixture",
            tag_name: "v1.0",
            body: "Release notes fixture",
            draft: false,
            prerelease: false,
            published_at: "2026-11-21T00:00:00Z",
            html_url: "https://github.com/octo/project/releases/tag/v1.0",
            assets: [],
          },
        ];
      else if (url.pathname.endsWith("/branches"))
        data = [{ name: "main" }, { name: "feature/ui" }];
      else if (url.pathname.endsWith("/readme"))
        data = {
          name: "README.md",
          encoding: "base64",
          content: Buffer.from("# Project\nA readable README.").toString(
            "base64",
          ),
          size: 30,
          html_url: repo.html_url + "/blob/main/README.md",
          download_url:
            "https://raw.githubusercontent.com/octo/project/main/README.md",
        };
      else if (url.pathname.endsWith("/contents/src/index.ts"))
        data = {
          name: "index.ts",
          path: "src/index.ts",
          encoding: "base64",
          content: Buffer.from("export const value = 42;").toString("base64"),
          size: 24,
          html_url: repo.html_url,
        };
      else if (url.pathname.includes("/contents/"))
        data = [
          { type: "file", name: "index.ts", path: "src/index.ts", size: 24 },
        ];
      else if (url.pathname === "/search/issues")
        data = { items: [issue], total_count: 1 };
      else if (url.pathname === "/repos/octo/project/issues/7") data = issue;
      else if (url.pathname.includes("/search/"))
        data = { items: [], total_count: 0 };
      else data = [];
      await route.fulfill({ json: data });
    });
    await page.goto("http://localhost:1420/#/repo/octo/project");
    await expect(
      page.getByRole("heading", { name: "octo/project" }),
    ).toBeVisible();
    await expect(page.getByText("A readable README.")).toBeVisible();
    await page.getByRole("button", { name: "index.ts", exact: true }).click();
    await expect(
      page.getByText("export const value = 42;", { exact: true }),
    ).toBeVisible();
    await page.goto("http://localhost:1420/#/repo/octo/project?tab=issues");
    await page.getByRole("link", { name: /A useful issue/ }).click();
    await expect(page.getByText("Discussion fixture")).toBeVisible();
    await page.evaluate(async () => {
      const { TokenManager } =
        await import("/src/services/auth/TokenManager.ts");
      const { useAuthStore } = await import("/src/stores/authStore.ts");
      await TokenManager.saveSession(
        "isolated-smoke-token",
        "fixture",
        "token",
        { id: 100, login: "fixture", name: "Fixture" },
      );
      useAuthStore.setState({
        isLoggedIn: true,
        token: "isolated-smoke-token",
        username: "fixture",
        activeAccountId: "100",
        accounts: TokenManager.getAccounts(),
      });
    });
    await page.goto("http://localhost:1420/#/");
    await page.reload();
    await expect(page.getByText("我的待办", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "分配给我", exact: true }).click();
    await expect(
      page.getByRole("link", { name: /A useful issue/ }),
    ).toHaveAttribute("href", /#\/repo\/octo\/project\?account=100/);
    await page.goto("http://localhost:1420/#/repo/octo/project?tab=actions");
    await page.screenshot({
      path: `review-artifacts/business/actions-debug-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: /Build app/ }).click();
    await expect(page.getByText("Build job", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "查看日志", exact: true }).click();
    await expect(page.getByText("Build log fixture")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "下载 Expired artifact" }),
    ).toBeDisabled();
    await page.goto("http://localhost:1420/#/profile/collections");
    await page.getByRole("button", { name: "整理收藏", exact: true }).click();
    await page
      .getByLabel("私人笔记", { exact: true })
      .fill("Encrypted browser fixture note");
    await page.getByRole("button", { name: "保存修改", exact: true }).click();
    await expect(page.locator(".gp-work-note")).toHaveText(
      "Encrypted browser fixture note",
    );
    await page.reload();
    await expect(page.locator(".gp-work-note")).toHaveText(
      "Encrypted browser fixture note",
    );
    await page.screenshot({
      path: `review-artifacts/business/collections-${width}.png`,
      fullPage: true,
    });
    await page.goto("http://localhost:1420/#/profile/releases");
    await page.getByLabel("订阅仓库", { exact: true }).fill("octo/project");
    await page.getByRole("button", { name: "添加订阅", exact: true }).click();
    await expect(
      page.getByText("Release fixture", { exact: true }),
    ).toBeVisible();
    await page.getByText("更新说明", { exact: true }).click();
    await expect(
      page.getByText("Release notes fixture", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `review-artifacts/business/releases-${width}.png`,
      fullPage: true,
    });
    await page.goto(
      "http://localhost:1420/#/repo/octo/project?tab=issues&number=7",
    );
    await page
      .getByRole("textbox", { name: "添加评论", exact: true })
      .fill("Offline draft fixture");
    await expect(
      page.getByText("草稿已在本机加密保存", { exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.evaluate(() => {
      location.hash = "/profile/offline";
    });
    await page.getByRole("button", { name: /^A useful issue/ }).click();
    await expect(
      page.getByText("Discussion fixture", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "添加评论", exact: true }),
    ).toHaveValue("Offline draft fixture");
    await expect(
      page.getByRole("button", { name: "发送评论", exact: true }),
    ).toBeDisabled();
    await context.setOffline(false);
    await expect(
      page.getByRole("button", { name: "发送评论", exact: true }),
    ).toBeEnabled();
    expect(commentWrites).toBe(0);
    await page.getByRole("button", { name: "发送评论", exact: true }).click();
    await expect(page.getByText("评论已发送", { exact: true })).toBeVisible();
    expect(commentWrites).toBe(1);
    await expect(page.getByText("暂无评论草稿", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `review-artifacts/business/offline-${width}.png`,
      fullPage: true,
    });
    await page.evaluate(async () => {
      const { TokenManager } =
        await import("/src/services/auth/TokenManager.ts");
      await TokenManager.loadSession();
      await TokenManager.saveSession("second-smoke-token", "second", "token", {
        id: 101,
        login: "second",
        name: "Second",
      });
    });
    await page.goto("http://localhost:1420/#/inbox");
    await page.reload();
    await expect(
      page.getByRole("link", { name: /Account notification/ }),
    ).toHaveCount(2);
    const sourceLink = page.getByRole("link", {
      name: /Account notification.*@fixture/,
    });
    await expect(sourceLink).toHaveAttribute(
      "href",
      /#\/repo\/octo\/project\?account=100&tab=issues&number=7/,
    );
    await page.screenshot({
      path: `review-artifacts/business/inbox-${width}.png`,
      fullPage: true,
    });
    await sourceLink.click();
    await page
      .getByRole("textbox", { name: "添加评论", exact: true })
      .fill("Reply as source account");
    await page.getByRole("button", { name: "发送评论", exact: true }).click();
    await expect(page.getByText("评论已发送", { exact: true })).toBeVisible();
    expect(readAccounts).toEqual(["Bearer isolated-smoke-token"]);
    expect(commentAccounts.at(-1)).toBe("Bearer isolated-smoke-token");
    await page.goto(
      "http://localhost:1420/#/repo/octo/project?account=100&tab=pulls&number=7",
    );
    await page.getByRole("tab", { name: "文件改动", exact: true }).click();
    await expect(
      page.locator(".gp-diff-add").filter({ hasText: "+new" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "评审意见", exact: true })
      .fill("Review fixture");
    await page.getByRole("button", { name: "提交评审", exact: true }).click();
    await expect.poll(() => reviewBodies.length).toBe(1);
    expect(reviewBodies[0].commit_id).toBe("viewed-sha");
    await page.getByRole("button", { name: "合并 PR", exact: true }).click();
    await page.getByRole("button", { name: "确定", exact: true }).click();
    await expect(page.getByText("已合并", { exact: true })).toBeVisible();
    expect(mergeBodies).toEqual([{ sha: "viewed-sha", merge_method: "merge" }]);
    await page.screenshot({
      path: `review-artifacts/business/pull-${width}.png`,
      fullPage: true,
    });
    for (const [language, title] of [
      ["en", "Star collections"],
      ["zh-TW", "Star 收藏管理"],
      ["ja", "Star コレクション"],
    ]) {
      await page.evaluate((language) => {
        const preferences = JSON.parse(
          localStorage.getItem("gitpulse-preferences") ||
            '{"state":{},"version":0}',
        );
        preferences.state.language = language;
        preferences.state.theme = "dark";
        localStorage.setItem(
          "gitpulse-preferences",
          JSON.stringify(preferences),
        );
      }, language);
      await page.goto("http://localhost:1420/#/profile/collections");
      await page.reload();
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await expect(page.locator("body")).toHaveAttribute("arco-theme", "dark");
    }
    await page.screenshot({
      path: `review-artifacts/business/dark-ja-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow, `Horizontal overflow at ${width}`).toBe(false);
    expect(errors).toEqual([]);
    console.log(
      `Repository ${width}px: all 8 workspaces, encrypted restore, offline explicit send and source-account reply passed`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
