import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  github,
  notificationUrl,
  recentRepositoryQuery,
  repositoryQuery,
  type Notification,
} from "../src/services/github/GitHubService";
import { useGitHubResource } from "../src/hooks/useGitHubResource";
import { InboxPage } from "../src/pages/InboxPage";
import { TokenManager } from "../src/services/auth/TokenManager";
import { useAuthStore } from "../src/stores/authStore";
import { MemoryRouter } from "react-router-dom";
import { ExplorePage } from "../src/pages/ExplorePage";

beforeEach(async () => {
  localStorage.clear();
  await useAuthStore.getState().logout();
});
afterEach(() => vi.unstubAllGlobals());

it("derives recent repository dates across year boundaries without a fixed date", () => {
  const now = new Date("2027-01-03T12:00:00Z");
  expect(recentRepositoryQuery(7, now)).toContain("created:>=2026-12-27");
  expect(now.toISOString()).toBe("2027-01-03T12:00:00.000Z");
});

it("encodes language and user search qualifiers without corrupting C++", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ items: [], total_count: 0 })),
    );
  vi.stubGlobal("fetch", fetchMock);
  await github.searchRepositories(
    repositoryQuery("topic:compiler", "C++"),
    "stars",
    2,
    "test-token",
    new AbortController().signal,
  );
  const [url, options] = fetchMock.mock.calls[0];
  expect(new URL(url).searchParams.get("q")).toBe(
    "topic:compiler language:C++",
  );
  expect(new URL(url).searchParams.get("page")).toBe("2");
  expect(options.headers.Authorization).toBe("Bearer test-token");
});

it("reports a rate limit as a failure, never an empty result", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      }),
    ),
  );
  await expect(
    github.notifications(
      false,
      false,
      1,
      "test-token",
      new AbortController().signal,
    ),
  ).rejects.toThrow("请求次数已达上限");
});

it("reads notification pagination and participation filters", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response("[]", {
      headers: {
        link: '<https://api.github.com/notifications?page=2>; rel="next"',
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const result = await github.notifications(
    true,
    true,
    1,
    "test-token",
    new AbortController().signal,
  );
  expect(result.hasNext).toBe(true);
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.get("all")).toBe("true");
  expect(url.searchParams.get("participating")).toBe("true");
});

it.each([
  ["pulls", "pull"],
  ["issues", "issues"],
  ["commits", "commit"],
])(
  "opens %s notifications on GitHub instead of the REST endpoint",
  (api, web) => {
    const notification = {
      subject: {
        url: `https://api.github.com/repos/octocat/example/${api}/42`,
      },
      repository: { html_url: "https://github.com/octocat/example" },
    } as Notification;
    expect(notificationUrl(notification)).toBe(
      `https://github.com/octocat/example/${web}/42`,
    );
    notification.subject.url = null;
    expect(notificationUrl(notification)).toBe(
      "https://github.com/octocat/example",
    );
  },
);

it("aborts an old query and ignores its late response after switching searches", async () => {
  let oldSignal!: AbortSignal;
  let finishOld!: (value: string) => void;
  const oldLoader = (signal: AbortSignal) => {
    oldSignal = signal;
    return new Promise<string>((resolve) => {
      finishOld = resolve;
    });
  };
  const newLoader = async () => "new query";
  const hook = renderHook(({ loader }) => useGitHubResource(loader), {
    initialProps: { loader: oldLoader },
  });
  await waitFor(() => expect(oldSignal).toBeDefined());
  hook.rerender({ loader: newLoader });
  await waitFor(() => expect(hook.result.current.data).toBe("new query"));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => finishOld("old query"));
  expect(hook.result.current.data).toBe("new query");
});

it("prompts signed-out users to connect without requesting private notifications", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const login = vi.fn();
  render(<InboxPage onShowLogin={login} />);
  await userEvent.click(screen.getByRole("button", { name: "登录 GitHub" }));
  expect(login).toHaveBeenCalledOnce();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("shows a failed inbox request with retry, then shows genuine empty results after recovery", async () => {
  await TokenManager.saveSession("test-token", "test", "token");
  useAuthStore.setState({
    isLoggedIn: true,
    token: "test-token",
    accounts: TokenManager.getAccounts(),
    activeAccountId: "legacy:test",
  });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}", { status: 500 }))
    .mockResolvedValueOnce(new Response("[]"));
  vi.stubGlobal("fetch", fetchMock);
  render(<InboxPage onShowLogin={vi.fn()} />);
  expect(await screen.findByText("暂时无法加载")).toBeTruthy();
  expect(screen.queryByText("目前没有未读通知")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByText("目前没有未读通知")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("submits repository searches on Enter and waits while editing the query", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ items: [], total_count: 0 })),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ExplorePage onShowLogin={vi.fn()} />
    </MemoryRouter>,
  );
  await screen.findByText("输入关键词开始搜索");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("搜索关键词"), "react");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.keyboard("{Enter}");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("q")).toBe(
    "react",
  );
});
