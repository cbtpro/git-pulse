import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { CustomizePins } from "../src/components/profile/CustomizePins";
import { GitHubPages } from "../src/components/profile/GitHubPages";
import {
  pinnableItems,
  pinnedItems,
  type PinItem,
} from "../src/services/github/PinService";
import { TokenManager } from "../src/services/auth/TokenManager";
const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown) => new Response(JSON.stringify(data));
const repo = (id: string) => ({
  __typename: "Repository",
  id,
  name: id,
  nameWithOwner: `owner/${id}`,
  url: `https://github.com/owner/${id}`,
  description: `Project ${id}`,
  owner: { login: "owner" },
  updatedAt: "2026-01-01",
  stargazerCount: 1,
  forkCount: 0,
  repositoryTopics: { nodes: [] },
});
const gist = {
  __typename: "Gist",
  id: "g1",
  name: "abcd",
  url: "https://gist.github.com/owner/abcd",
  description: "Useful snippet",
  owner: { login: "owner" },
  files: [{ name: "hello.ts" }],
};
beforeEach(async () => {
  await TokenManager.clearAll();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("loads all candidate pages, includes gists and restores custom ordering", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({
        data: {
          viewer: {
            pinnableItems: {
              nodes: [repo("r1")],
              pageInfo: { hasNextPage: true, endCursor: "next" },
            },
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      response({
        data: {
          viewer: {
            pinnableItems: {
              nodes: [gist],
              pageInfo: { hasNextPage: false, endCursor: "end" },
            },
          },
        },
      }),
    );
  const items = await pinnableItems("token", new AbortController().signal);
  expect(items.map((i) => i.kind)).toEqual(["repository", "gist"]);
  expect(
    JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).variables.after,
  ).toBe("next");
  fetchMock.mockResolvedValueOnce(
    response({ data: { nodes: [repo("r1"), gist, null] } }),
  );
  expect(
    (
      await pinnedItems("token", new AbortController().signal, [
        "g1",
        "deleted",
        "r1",
      ])
    ).map((i) => i.id),
  ).toEqual(["g1", "r1"]);
});
it("filters pins, enforces the limit and saves hidden selections with the active account", async () => {
  await TokenManager.saveSession("token", "owner", "token");
  const accountId = TokenManager.getActiveAccount()!.id;
  fetchMock.mockResolvedValue(
    response({
      data: {
        viewer: {
          pinnableItems: {
            nodes: [
              ...Array.from({ length: 7 }, (_, i) => repo(`r${i}`)),
              gist,
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    }),
  );
  const saved = vi.fn();
  render(
    <CustomizePins
      token="token"
      accountId={accountId}
      initial={[]}
      onSaved={saved}
      onClose={vi.fn()}
    />,
  );
  await screen.findByRole("checkbox", { name: /owner\/r0/ });
  for (let i = 0; i < 6; i++)
    fireEvent.click(
      screen.getByRole("checkbox", { name: new RegExp(`owner/r${i}`) }),
    );
  expect(
    (screen.getByRole("checkbox", { name: /owner\/r6/ }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /owner\/r0/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Repo", exact: true }));
  expect(screen.queryByRole("checkbox", { name: /owner\/r1/ })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "搜索 Repo 和 Gist" }), {
    target: { value: "hello" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /owner\/hello.ts/ }));
  fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(["r1", "r2", "r3", "r4", "r5", "g1"]),
  );
  expect(TokenManager.getCustomPins(accountId)).toEqual([
    "r1",
    "r2",
    "r3",
    "r4",
    "r5",
    "g1",
  ]);
});
it("keeps canceled edits unsaved and retains the selection on storage failure", async () => {
  await TokenManager.saveSession("token", "owner", "token");
  const initial: PinItem[] = [
    {
      id: "g1",
      kind: "gist",
      title: "owner/hello.ts",
      url: gist.url,
      description: null,
    },
  ];
  fetchMock.mockResolvedValue(
    response({
      data: {
        viewer: {
          pinnableItems: {
            nodes: [gist],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    }),
  );
  const save = vi
    .spyOn(TokenManager, "saveCustomPins")
    .mockRejectedValueOnce(new Error("full"));
  const close = vi.fn();
  const saved = vi.fn();
  render(
    <CustomizePins
      token="token"
      accountId={TokenManager.getActiveAccount()!.id}
      initial={initial}
      onSaved={saved}
      onClose={close}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
  await screen.findByText("保存置顶失败，请重试。");
  expect(saved).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("checkbox", { name: /owner\/hello/ }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "取消", exact: true }));
  expect(close).toHaveBeenCalled();
  expect(save).toHaveBeenCalledTimes(1);
});
it("paginates Pages five at a time and resets to page one when filtering by domain", async () => {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/user/repos"))
      return response(
        Array.from({ length: 13 }, (_, i) => ({
          full_name: `owner/site-${i + 1}`,
          html_url: `https://github.com/owner/site-${i + 1}`,
          has_pages: true,
        })),
      );
    const n = url.match(/site-(\d+)\/pages/)![1];
    return response({
      html_url: `https://custom-${n}.example.com`,
      status: "built",
    });
  });
  render(<GitHubPages token="token" onShowLogin={vi.fn()} />);
  await screen.findByRole("link", { name: "owner/site-1" });
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "下一页" }));
  expect(screen.getByRole("link", { name: "owner/site-6" })).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "搜索 GitHub Pages" }), {
    target: { value: "CUSTOM-13" },
  });
  expect(screen.getByRole("link", { name: "owner/site-13" })).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(
    screen.queryByRole("navigation", { name: "GitHub Pages 分页" }),
  ).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "搜索 GitHub Pages" }), {
    target: { value: "none" },
  });
  expect(screen.getByText("没有匹配的 Pages 站点")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "搜索 GitHub Pages" }), {
    target: { value: "" },
  });
  expect(screen.getByRole("link", { name: "owner/site-1" })).toBeTruthy();
});
