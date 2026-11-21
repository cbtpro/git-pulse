import { chromium, expect } from "@playwright/test";
const origin = process.env.GITPULSE_TEST_URL || "http://localhost:1420";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  for (const notifications of [false, true]) {
    const context = await browser.newContext();
    if (!notifications)
      await context.addInitScript(() => {
        window.BroadcastChannel = undefined;
      });
    await context.route("https://api.github.com/**", (route) => route.abort());
    const a = await context.newPage(),
      b = await context.newPage();
    for (const page of [a, b]) {
      await page.goto(origin);
      await page.locator(".gp-app").waitFor();
    }
    await a.evaluate(async () => {
      const { TokenManager: T } =
        await import("/src/services/auth/TokenManager.ts");
      await T.saveSession("isolated-audit-fixture", "audit-fixture", "token", {
        id: 998877,
        login: "audit-fixture",
      });
    });
    await b.evaluate(async () => {
      const { TokenManager: T } =
        await import("/src/services/auth/TokenManager.ts");
      const { useAuthStore } = await import("/src/stores/authStore.ts");
      await T.loadSession();
      window.qaGeneration = T.getGeneration();
      useAuthStore.setState({
        isLoggedIn: true,
        token: T.getToken(),
        activeAccountId: "998877",
      });
    });
    // Two tabs editing different account fields must merge rather than overwrite.
    await Promise.all([
      a.evaluate(async () => {
        const { TokenManager: T } =
          await import("/src/services/auth/TokenManager.ts");
        await T.saveCustomPins("998877", ["R_fixture"]);
      }),
      b.evaluate(async () => {
        const { TokenManager: T } =
          await import("/src/services/auth/TokenManager.ts");
        await T.saveRecentSearches("998877", ["fixture-query"]);
      }),
    ]);
    expect(
      await a.evaluate(async () => {
        const { TokenManager: T } =
          await import("/src/services/auth/TokenManager.ts");
        await T.loadSession();
        return {
          pins: T.getCustomPins("998877"),
          queries: T.getRecentSearches("998877"),
        };
      }),
    ).toEqual({ pins: ["R_fixture"], queries: ["fixture-query"] });
    // The same removeAccount operation used by the UI logout path.
    await a.evaluate(async () => {
      const { TokenManager: T } =
        await import("/src/services/auth/TokenManager.ts");
      await T.removeAccount("998877");
    });
    if (notifications) {
      await expect
        .poll(() =>
          b.evaluate(async () => {
            const { useAuthStore } = await import("/src/stores/authStore.ts");
            return useAuthStore.getState().isLoggedIn;
          }),
        )
        .toBe(false);
    }
    const results = await b.evaluate(async () => {
      const { TokenManager: T } =
        await import("/src/services/auth/TokenManager.ts");
      await T.saveRecentSearches("998877", ["stale"]);
      await T.updateProfile("998877", { id: 998877, login: "audit-fixture" });
      let rejected = 0;
      for (const attempt of [
        () =>
          T.saveSession(
            "late-fixture",
            "audit-fixture",
            "oauth",
            { id: 998877, login: "audit-fixture" },
            undefined,
            window.qaGeneration,
          ),
        () =>
          T.savePendingAuthorization(
            {
              id: "late",
              clientId: "client",
              deviceCode: "device",
              userCode: "code",
              expiresAt: Date.now() + 60000,
              interval: 5,
              nextPollAt: Date.now(),
            },
            new AbortController().signal,
            window.qaGeneration,
          ),
      ]) {
        try {
          await attempt();
        } catch (error) {
          if (error.name === "AbortError") rejected++;
          else throw error;
        }
      }
      await T.loadSession();
      return {
        rejected,
        accounts: T.getAccounts().length,
        active: T.getToken() !== null,
        pending: T.getPendingAuthorization() !== null,
      };
    });
    expect(results).toEqual({
      rejected: 2,
      accounts: 0,
      active: false,
      pending: false,
    });
    await a.reload();
    await a.locator(".gp-app").waitFor();
    expect(
      await a.evaluate(async () => {
        const { TokenManager: T } =
          await import("/src/services/auth/TokenManager.ts");
        return T.getAccounts().length;
      }),
    ).toBe(0);
    console.log(
      `BroadcastChannel ${notifications ? "enabled" : "disabled"}: concurrent edits merged; logout stayed durable; late token/device writes rejected; reload remained signed out`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
