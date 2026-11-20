import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExplorePage } from "../src/pages/ExplorePage";
import { useAuthStore } from "../src/stores/authStore";
import { TokenManager } from "../src/services/auth/TokenManager";
import { clearSearchCache } from "../src/services/github/SearchService";
const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown) => new Response(JSON.stringify(data));
beforeEach(async () => {
  await TokenManager.clearAll();
  clearSearchCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({
    token: "fixture",
    activeAccountId: null,
    isLoggedIn: true,
  });
});
afterEach(() => vi.unstubAllGlobals());
const mount = (url: string) =>
  render(
    <MemoryRouter
      initialEntries={[url]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ExplorePage onShowLogin={vi.fn()} />
    </MemoryRouter>,
  );
it("searches one selected type, displays full results and offers only relevant filters", async () => {
  fetchMock.mockResolvedValue(
    response({
      items: [
        { id: 1, login: "cbtpro", html_url: "https://github.com/cbtpro" },
      ],
      total_count: 26,
    }),
  );
  mount("/explore?type=users&q=user%3A%20cbtpro");
  expect(screen.getByRole("heading", { name: "搜索", level: 1 })).toBeTruthy();
  await screen.findByRole("link", { name: "cbtpro" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const url = new URL(String(fetchMock.mock.calls[0][0]));
  expect(url.pathname).toBe("/search/users");
  expect(url.searchParams.get("q")).toBe("cbtpro in:login type:user");
  expect(url.searchParams.get("per_page")).toBe("10");
  expect(screen.queryByRole("combobox", { name: "编程语言" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "结果排序" })).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "搜索结果分页" })).toBeTruthy();
  expect(screen.queryByRole("listbox", { name: "聚合搜索结果" })).toBeNull();
});
it("waits for explicit submission and blocks Enter during IME composition", async () => {
  fetchMock.mockResolvedValue(response({ items: [], total_count: 0 }));
  mount("/explore?type=code");
  await screen.findByText("输入关键词开始搜索");
  expect(fetchMock).not.toHaveBeenCalled();
  const input = screen.getByRole("textbox", { name: "搜索关键词" });
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "输入" } });
  fireEvent.submit(input.closest("form")!);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input, {
    target: { value: "useEffect repo:facebook/react" },
  });
  fireEvent.click(screen.getByRole("button", { name: "搜索", exact: true }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
    "/search/code",
  );
  expect(
    screen.getByRole("textbox", { name: "搜索关键词" }).getAttribute("value"),
  ).toBe("useEffect repo:facebook/react");
});
it("switches result type and clears irrelevant repository filters", async () => {
  fetchMock.mockResolvedValue(response({ items: [], total_count: 0 }));
  mount("/explore?q=react&sort=stars&language=TypeScript");
  await screen.findByText("暂无匹配结果");
  fireEvent.click(
    within(screen.getByRole("group", { name: "搜索类型" })).getByRole(
      "button",
      { name: "主题", exact: true },
    ),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const url = new URL(String(fetchMock.mock.calls[1][0]));
  expect(url.pathname).toBe("/search/topics");
  expect(url.searchParams.get("sort")).toBeNull();
  expect(url.searchParams.get("q")).toBe("react");
});
