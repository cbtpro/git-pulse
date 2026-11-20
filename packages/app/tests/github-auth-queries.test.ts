import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { github, requestGitHub } from "../src/services/github/GitHubService";
import {
  githubPages,
  profileReadme,
} from "../src/services/github/ProfileService";
import { pinnedItems, pinnableItems } from "../src/services/github/PinService";
import {
  popularSearches,
  recommendedSearches,
  searchCategory,
  clearSearchCache,
} from "../src/services/github/SearchService";
import { DirectGitHubApi } from "../src/services/api/implementations/DirectGitHubApi";
import { GitHubApiClient } from "../src/services/GitHubApiClient";
import { TokenManager } from "../src/services/auth/TokenManager";
const fetchMock = vi.fn<typeof fetch>();
const signal = () => new AbortController().signal;
beforeEach(async () => {
  await TokenManager.clearAll();
  clearSearchCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("attaches authorization to every active query family and compatibility client", async () => {
  await TokenManager.saveSession("active-fixture", "owner", "oauth");
  fetchMock.mockImplementation(async (input, options) => {
    const path = new URL(String(input)).pathname,
      body = String(options?.body || "");
    let data: unknown = [];
    if (path.startsWith("/search/")) data = { items: [], total_count: 0 };
    if (path.endsWith("/readme")) return new Response("{}", { status: 404 });
    if (path === "/graphql") {
      if (body.includes("GitPulseContributions"))
        data = {
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 0,
                  weeks: [
                    {
                      contributionDays: [
                        {
                          date: "2026-01-01",
                          weekday: 4,
                          contributionCount: 0,
                          contributionLevel: "NONE",
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        };
      else if (body.includes("pinnableItems"))
        data = {
          data: {
            viewer: {
              pinnableItems: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        };
      else data = { data: { viewer: { pinnedItems: { nodes: [] } } } };
    }
    return new Response(JSON.stringify(data));
  });
  const token = "active-fixture";
  await github.searchRepositories("query", "stars", 1, token, signal());
  await github.developers(token, signal());
  await github.notifications(false, false, 1, token, signal());
  await github.repositories(1, token, signal());
  await github.contributions(token, signal());
  await profileReadme("owner", token, signal());
  await githubPages(token, signal());
  await pinnedItems(token, signal());
  await pinnableItems(token, signal());
  await popularSearches(token, signal());
  await recommendedSearches(token, signal());
  for (const kind of [
    "repositories",
    "users",
    "organizations",
    "topics",
    "code",
    "commits",
    "issues",
  ] as const)
    await searchCategory(kind, "aggregation", token, signal());
  await new DirectGitHubApi().getUserEvents("owner");
  await GitHubApiClient.get("/user");
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(18);
  for (const [, options] of fetchMock.mock.calls)
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer active-fixture",
    );
});
it("resolves omitted credentials at request time across account switches and removes them on logout", async () => {
  fetchMock.mockImplementation(async () => new Response("[]"));
  const api = new DirectGitHubApi();
  await TokenManager.saveSession("first-token", "first", "token");
  await api.getUserEvents();
  await TokenManager.saveSession("second-token", "second", "token");
  await api.getUserEvents();
  await TokenManager.clearAll();
  await api.getUserEvents();
  expect(
    fetchMock.mock.calls.map(([, options]) =>
      new Headers(options?.headers).get("Authorization"),
    ),
  ).toEqual(["Bearer first-token", "Bearer second-token", null]);
  await expect(
    requestGitHub("/user/repos", null, signal()),
  ).rejects.toMatchObject({ status: 401 });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("distinguishes account limits, respects reset time and isolates search from core requests", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
  fetchMock.mockImplementation(async (input) =>
    String(input).includes("/search/")
      ? new Response("{}", {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(Date.now() / 1000 + 30),
          },
        })
      : new Response("[]"),
  );
  const first = requestGitHub("/search/repositories?q=a", "token", signal());
  await expect(first).rejects.toMatchObject({
    rateLimited: true,
    authenticated: true,
    retryAt: Date.now() + 30_000,
  });
  await expect(first).rejects.toThrow("当前账号");
  await expect(
    requestGitHub("/search/users?q=a", "token", signal()),
  ).rejects.toThrow("当前账号");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await requestGitHub("/user/repos", "token", signal());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await requestGitHub("/user/repos", "other-token", signal());
  expect(fetchMock).toHaveBeenCalledTimes(3);
  vi.setSystemTime(Date.now() + 31_000);
  fetchMock.mockImplementation(async () => new Response("{}"));
  await requestGitHub("/search/users?q=a", "token", signal());
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
it("honors secondary limits even when primary quota remains and never retries anonymously", async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ message: "You have exceeded a secondary rate limit" }),
      {
        status: 403,
        headers: { "x-ratelimit-remaining": "4999", "retry-after": "120" },
      },
    ),
  );
  await expect(
    requestGitHub("/user/repos", "token", signal()),
  ).rejects.toMatchObject({ rateLimited: true });
  await expect(
    requestGitHub("/search/users?q=a", "token", signal()),
  ).rejects.toMatchObject({ rateLimited: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(
    new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization"),
  ).toBe("Bearer token");
});
it("recognizes GraphQL rate limits returned with HTTP 200", async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }],
      }),
    ),
  );
  await expect(pinnedItems("token", signal())).rejects.toMatchObject({
    rateLimited: true,
    authenticated: true,
  });
});
it("caches repeated searches within the account without reusing private results for another account", async () => {
  fetchMock.mockImplementation(
    async () => new Response(JSON.stringify({ items: [], total_count: 0 })),
  );
  await github.searchRepositories("same", "stars", 1, "first", signal());
  await github.searchRepositories("same", "stars", 1, "first", signal());
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await github.searchRepositories("same", "stars", 1, "second", signal());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
