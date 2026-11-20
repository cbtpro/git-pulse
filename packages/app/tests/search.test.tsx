import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { tokenizeSearch } from "../src/components/search/SearchHighlight";
import { GlobalSearch } from "../src/components/search/GlobalSearch";
import {
  clearSearchCache,
  searchCategory,
  searchPages,
} from "../src/services/github/SearchService";
import { useAuthStore } from "../src/stores/authStore";

const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const signal = () => new AbortController().signal;
beforeEach(() => {
  clearSearchCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
  useAuthStore.setState({
    token: null,
    activeAccountId: null,
    isLoggedIn: false,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("preserves quoted advanced queries and isolates cached results by account", async () => {
  fetchMock.mockResolvedValue(
    response({
      items: [
        {
          id: 1,
          full_name: "owner/demo",
          description: "Demo",
          html_url: "https://github.com/owner/demo",
          stargazers_count: 8,
        },
      ],
      total_count: 1,
    }),
  );
  const query = '"C++ parser" language:C++ stars:>10 archived:false';
  const first = await searchCategory(
    "repositories",
    query,
    "account-a",
    signal(),
  );
  expect(
    new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q"),
  ).toBe(query);
  expect(first.hits[0]).toMatchObject({
    query: "repo:owner/demo",
    title: "owner/demo",
  });
  await searchCategory("repositories", query, "account-a", signal());
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await searchCategory("repositories", query, "account-b", signal());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("maps each search type to a repository condition and preserves original links", async () => {
  const fixtures = [
    [
      "users",
      { id: 1, login: "octocat", html_url: "https://github.com/octocat" },
      "user:octocat",
    ],
    [
      "organizations",
      { id: 2, login: "org", html_url: "https://github.com/org" },
      "org:org",
    ],
    ["topics", { name: "react", display_name: "React" }, "topic:react"],
    [
      "code",
      {
        sha: "abc",
        name: "main.ts",
        path: "src/main.ts",
        html_url: "https://github.com/o/r/blob/main/src/main.ts",
        repository: { full_name: "o/r" },
      },
      "repo:o/r",
    ],
    [
      "commits",
      {
        sha: "abcd12345",
        html_url: "https://github.com/o/r/commit/abcd12345",
        commit: { message: "Fix\n\nDetails" },
        repository: { full_name: "o/r" },
      },
      "repo:o/r",
    ],
    [
      "issues",
      {
        id: 5,
        number: 8,
        title: "A PR",
        pull_request: {},
        html_url: "https://github.com/o/r/pull/8",
        repository_url: "https://api.github.com/repos/o/r",
      },
      "repo:o/r",
    ],
  ] as const;
  for (const [kind, item, query] of fixtures) {
    fetchMock.mockResolvedValueOnce(
      response({ items: [item], total_count: 1 }),
    );
    const result = await searchCategory(kind, "demo", "token", signal());
    expect(result.hits[0].query).toBe(query);
    if (kind === "issues") expect(result.hits[0].detail).toBe("PR #8");
  }
  expect(
    new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("q"),
  ).toBe("demo type:org");
});
it("handles code API limits and invalid category qualifiers without failing other groups", async () => {
  expect(
    (await searchCategory("code", "test", null, signal())).error,
  ).toContain("登录");
  expect(
    (await searchCategory("code", "symbol:parse", "token", signal()))
      .externalSearch,
  ).toContain("type=code");
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(response({}, 422));
  expect(
    (await searchCategory("users", "stars:>5", "token", signal())).error,
  ).toContain("当前条件");
});
it("matches Pages by repository, custom domain and repo qualifier", () => {
  const sites = [
    {
      repository: "owner/docs",
      repositoryUrl: "https://github.com/owner/docs",
      url: "https://Docs.example.com/",
      status: "built",
      error: null,
    },
  ];
  expect(searchPages(sites, "EXAMPLE.com").hits[0].query).toBe(
    "repo:owner/docs",
  );
  expect(searchPages(sites, "repo:owner/docs").total).toBe(1);
  expect(searchPages(sites, "missing").hits).toEqual([]);
});
function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function mount() {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <GlobalSearch onShowLogin={vi.fn()} />
      <Location />
    </MemoryRouter>,
  );
}
it("opens a combobox, suppresses IME requests and submits one debounced final query", async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValue(response({ items: [], total_count: 0 }));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  const input = screen.getByRole("combobox", { name: "聚合搜索" });
  await act(async () => {
    await Promise.resolve();
  });
  fetchMock.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "仓库", exact: true }));
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "zhong" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(900);
  });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
  expect(screen.getByRole("combobox")).toBeTruthy();
  fireEvent.compositionEnd(input, { target: { value: "中文" } });
  fireEvent.change(input, { target: { value: "中文 stars:>10" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(599);
  });
  expect(fetchMock).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(
    new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q"),
  ).toBe("中文 stars:>10");
});
it("supports keyboard choice, query transfer, history chips and Escape focus restoration", async () => {
  fetchMock.mockResolvedValue(
    response({
      items: [
        {
          id: 1,
          full_name: "owner/demo",
          html_url: "https://github.com/owner/demo",
          stargazers_count: 50,
        },
      ],
      total_count: 1,
    }),
  );
  mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  const input = screen.getByRole("combobox");
  await screen.findByRole("option", { name: /owner\/demo/ });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const activeId = input.getAttribute("aria-activedescendant");
  expect(
    document.getElementById(activeId!)?.getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getByTestId("location").textContent).toBe(
    "/explore?q=repo%3Aowner%2Fdemo&type=repositories",
  );
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  const recent = screen.getByRole("group", { name: "最近搜索" });
  expect(within(recent).getByRole("option").textContent).toContain(
    "repo:owner/demo",
  );
  expect(recent.querySelector(".gp-search-chips")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "聚合搜索" }),
    ),
  );
});
it("discards a delayed response for an obsolete query", async () => {
  let resolveOld!: (response: Response) => void;
  fetchMock.mockImplementation(async (input) => {
    const q = new URL(String(input)).searchParams.get("q") || "";
    if (q === "old")
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    return response({
      items:
        q === "new"
          ? [
              {
                id: 3,
                full_name: "owner/new",
                html_url: "https://github.com/owner/new",
                stargazers_count: 1,
              },
            ]
          : [],
      total_count: q === "new" ? 1 : 0,
    });
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  fireEvent.click(screen.getByRole("button", { name: "仓库", exact: true }));
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "old" } });
  await waitFor(() => expect(resolveOld).toBeTypeOf("function"));
  fireEvent.change(input, { target: { value: "new" } });
  await screen.findByRole("option", { name: /owner\/new/ });
  await act(async () =>
    resolveOld(
      response({
        items: [
          {
            id: 4,
            full_name: "owner/old",
            html_url: "https://github.com/owner/old",
            stargazers_count: 1,
          },
        ],
        total_count: 1,
      }),
    ),
  );
  expect(screen.queryByRole("option", { name: /owner\/old/ })).toBeNull();
});

it("highlights keywords without coloring qualifier names or altering advanced syntax", () => {
  const query = 'react repo:owner/project "web components" AND language:C++';
  const tokens = tokenizeSearch(query);
  expect(tokens.map((token) => token.text).join("")).toBe(query);
  expect(
    tokens
      .filter((token) => token.kind === "qualifier")
      .map((token) => token.text),
  ).toEqual(["repo:", "language:"]);
  expect(
    tokens
      .filter((token) => token.kind === "keyword")
      .map((token) => token.text),
  ).toEqual(["react", "owner/project", '"web components"', "C++"]);
});

it("routes user prefixes to users only and filters recent searches by type", async () => {
  const { TokenManager } = await import("../src/services/auth/TokenManager");
  await TokenManager.clearAll();
  await TokenManager.saveSession("fixture-token", "owner", "token");
  const accountId = TokenManager.getActiveAccount()!.id;
  await TokenManager.saveRecentSearches(accountId, [
    { query: "user:cbtpro", kind: "users" },
    { query: "repo:owner/demo", kind: "repositories" },
    { query: "repo:owner/source", kind: "code" },
  ]);
  useAuthStore.setState({
    token: "fixture-token",
    activeAccountId: accountId,
    isLoggedIn: true,
  });
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/user/starred")) return response([]);
    return response({
      items: url.includes("/search/users")
        ? [{ id: 7, login: "cbtpro", html_url: "https://github.com/cbtpro" }]
        : [],
      total_count: 1,
    });
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  fetchMock.mockClear();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "user: cbtpro" },
  });
  await screen.findByRole("option", { name: "cbtpro", exact: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(
    new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q"),
  ).toBe("cbtpro in:login type:user");
  expect(screen.queryByRole("group", { name: "仓库", exact: true })).toBeNull();
  const recent = screen.getByRole("group", { name: "最近搜索" });
  expect(within(recent).getAllByRole("option")).toHaveLength(1);
  expect(within(recent).getByRole("option").textContent).toContain(
    "user:cbtpro",
  );
  fireEvent.click(
    within(recent).getByRole("button", { name: "删除最近搜索 user:cbtpro" }),
  );
  expect(screen.getByRole("combobox")).toBeTruthy();
  expect(within(recent).queryByRole("option")).toBeNull();
  await waitFor(() =>
    expect(TokenManager.getSearchHistory(accountId)).toHaveLength(2),
  );
  expect(
    TokenManager.getSearchHistory(accountId).map((item) => item.kind),
  ).toEqual(["repositories", "code"]);
  await TokenManager.clearAll();
});

it("uses the selected code type for repo qualifiers without switching to repository results", async () => {
  fetchMock.mockResolvedValue(response({ items: [], total_count: 0 }));
  useAuthStore.setState({ token: "fixture-code" });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "聚合搜索" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  fetchMock.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "代码", exact: true }));
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "repo:owner/demo language:TypeScript" },
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
    "/search/code",
  );
  expect(
    new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q"),
  ).toBe("repo:owner/demo language:TypeScript");
});
