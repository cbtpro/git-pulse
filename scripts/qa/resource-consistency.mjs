import { chromium, expect } from "@playwright/test";
// Isolated browser context and mocked GitHub responses. No real account or writes.
const origin = process.env.GITPULSE_TEST_URL || "http://127.0.0.1:1430";
const b = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const c = await b.newContext({
  viewport: {
    width: Number(process.env.GITPULSE_TEST_WIDTH || 390),
    height: 844,
  },
});
const p = await c.newPage();
let closed = false,
  reads = 0;
const item = (number = 7) => ({
  id: number,
  number,
  title: "Review issue " + number,
  body: "body",
  state: closed && number === 7 ? "closed" : "open",
  html_url: "https://github.com/octo/project/issues/7",
  user: { login: "fixture" },
  updated_at: "2026-11-20T00:00:00Z",
  created_at: "2026-11-20T00:00:00Z",
  comments: 0,
  labels: [],
  assignees: [],
});
await c.route("https://api.github.com/**", async (r) => {
  const u = new URL(r.request().url());
  let data = [];
  if (u.pathname === "/search/issues") {
    reads++;
    data = {
      total_count: closed ? 29 : 30,
      items: Array.from({ length: 30 }, (_, i) => item(i + 1)).filter(
        (i) => !closed || i.number !== 7,
      ),
    };
  } else if (u.pathname === "/repos/octo/project")
    data = {
      id: 1,
      name: "project",
      full_name: "octo/project",
      owner: { login: "octo" },
      html_url: "https://github.com/octo/project",
      default_branch: "main",
      permissions: { push: true },
      topics: [],
    };
  else if (u.pathname === "/repos/octo/project/issues/7") {
    if (r.request().method() === "PATCH") closed = true;
    data = item();
  } else if (u.pathname === "/search/repositories")
    data = { total_count: 0, items: [] };
  return r.fulfill({ json: data });
});
try {
  await p.goto(`${origin}/#/profile`);
  await p.getByRole("button", { name: "账号与外观", exact: true }).waitFor();
  await p.evaluate(async () => {
    const { TokenManager } = await import("/src/services/auth/TokenManager.ts");
    const { useAuthStore } = await import("/src/stores/authStore.ts");
    await TokenManager.saveSession("review-fixture-token", "fixture", "token", {
      id: 100,
      login: "fixture",
      name: "Fixture",
    });
    useAuthStore.setState({
      isLoggedIn: true,
      token: "review-fixture-token",
      username: "fixture",
      activeAccountId: "100",
      accounts: TokenManager.getAccounts(),
    });
  });
  await p.goto(`${origin}/#/repo/octo/project?account=100&tab=issues`);
  await p
    .getByRole("textbox", { name: "搜索讨论", exact: true })
    .fill("unsent list filter");
  await p.evaluate(() => {
    window.originalList = document.querySelector("[data-route-active=true]");
  });
  await p.getByRole("link", { name: /Review issue 7 / }).click();
  const savedScroll = await p.evaluate(() => window.originalList.scrollTop);
  await p.getByRole("button", { name: "关闭讨论", exact: true }).click();
  await p.getByRole("button", { name: "确定", exact: true }).click();
  await p.getByRole("button", { name: "重新打开", exact: true }).waitFor();
  const before = reads;
  await p.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(p.getByRole("link", { name: /Review issue 7 / })).toHaveCount(0);
  const result = {
    closedOnServer: closed,
    listReadsBeforeReturn: before,
    listReadsAfterReturn: reads,
    closedIssueStillListed: await p
      .getByRole("link", { name: /Review issue 7 / })
      .count(),
    url: p.url(),
  };
  console.log(JSON.stringify(result, null, 2));
  await expect(
    p.getByRole("textbox", { name: "搜索讨论", exact: true }),
  ).toHaveValue("unsent list filter");
  expect(
    await p.evaluate(
      () =>
        document.querySelector("[data-route-active=true]") ===
        window.originalList,
    ),
  ).toBe(true);
  expect(await p.evaluate(() => window.originalList.scrollTop)).toBe(
    savedScroll,
  );
  expect(result.closedOnServer).toBe(true);
  // The source list refreshes without replacing its page, input or scroll container.
  expect(result.closedIssueStillListed).toBe(0);
  expect(reads).toBeGreaterThan(1);
} finally {
  await b.close();
}
