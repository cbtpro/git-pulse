import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AppBreadcrumbs } from "../src/components/navigation/AppBreadcrumbs";
import {
  PageStateProvider,
  restoredDestination,
} from "../src/components/routing/PageState";
import { buildNavigationTrail } from "../src/components/routing/navigationTrail";
import {
  useAppLinkNavigation,
  useNavigationTrail,
} from "../src/components/routing/useAppNavigation";

const location = (url: string, state: unknown = null): Location => {
  const parsed = new URL(url, "https://gitpulse.test");
  return {
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    key: url,
    state,
  };
};
const describe = (url: string, from?: string) =>
  buildNavigationTrail(
    location(url),
    from ? location(from) : undefined,
    (path) => ({ to: path }),
    restoredDestination,
  );
beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));

it.each([
  ["/", ["概览"], "home"],
  ["/explore", ["概览", "搜索"], "explore"],
  ["/inbox", ["概览", "收件箱"], "inbox"],
  ["/profile/settings", ["概览", "我的空间", "账号与外观"], "profile"],
  ["/profile/collections", ["概览", "我的空间", "Star 收藏管理"], "profile"],
  ["/profile/releases", ["概览", "我的空间", "版本更新中心"], "profile"],
  ["/profile/offline", ["概览", "我的空间", "离线阅读与草稿"], "profile"],
])("builds explicit parents for %s", (url, labels, section) => {
  const navigation = describe(url as string);
  expect(navigation.trail.map((item) => item.label)).toEqual(labels);
  expect(navigation.section).toBe(section);
});

it("provides safe repository parents on direct entry and preserves account/ref while ascending directories", () => {
  const { trail, section } = describe(
    "/repo/octo/project?account=alice&ref=release%2F1&path=src%2F搜索%2Ffile.ts",
  );
  expect(trail.map((item) => item.label)).toEqual([
    "概览",
    "搜索",
    "octo/project",
    "src",
    "搜索",
    "file.ts",
  ]);
  expect(trail.at(-2)?.literal).toBe(true);
  expect(trail.at(-2)?.to).toEqual({
    pathname: "/repo/octo/project",
    search: "?account=alice&ref=release%2F1&path=src%2F%E6%90%9C%E7%B4%A2",
  });
  expect(section).toBe("explore");
});

it.each([
  ["issues", "number"],
  ["pulls", "number"],
  ["actions", "run"],
])(
  "links a %s detail to its list without losing the source account",
  (tab, key) => {
    const { trail, section } = describe(
      `/repo/octo/project?account=alice&tab=${tab}&${key}=42`,
      "/profile/collections",
    );
    expect(trail.slice(0, 3).map((item) => item.label)).toEqual([
      "概览",
      "我的空间",
      "Star 收藏管理",
    ]);
    expect(trail.at(-1)?.label).toBe("#42");
    expect(trail.at(-2)?.to).toEqual({
      pathname: "/repo/octo/project",
      search: `?account=alice&tab=${tab}`,
    });
    expect(section).toBe("profile");
  },
);

function NavigationFixture() {
  const { trail, section } = useNavigationTrail();
  const navigateLink = useAppLinkNavigation();
  const navigate = useNavigate();
  const current = useLocation();
  return (
    <div onClick={navigateLink}>
      <AppBreadcrumbs trail={trail} />
      <output aria-label="url">{current.pathname + current.search}</output>
      <output aria-label="section">{section}</output>
      <output aria-label="state">{JSON.stringify(current.state)}</output>
      <a href="#/repo/octo/project" data-testid="repo">
        Open repository
      </a>
      <a href="#/repo/octo/project?tab=issues&number=42">Open issue</a>
      <a href="#/profile/settings">Open settings</a>
      <a href="#/inbox?filter=unread">Open inbox</a>
      <a href="#/repo/octo/project" target="_blank">
        New tab
      </a>
      <a href="#/repo/octo/project" download>
        Download
      </a>
      <a href="#/repo/octo/project" onClick={(event) => event.preventDefault()}>
        Canceled link
      </a>
      <button onClick={() => navigate(-1)}>History back</button>
      <button onClick={() => navigate(1)}>History forward</button>
      <main id="main-content" tabIndex={-1}>
        Page content
      </main>
    </div>
  );
}
function Fixture({ entry = "/explore?q=react&page=2" }: { entry?: string }) {
  const [account, setAccount] = useState("alice");
  return (
    <MemoryRouter
      initialEntries={[
        {
          ...location(entry),
          state: { aggregateSearch: true, searchType: "repositories" },
        },
      ]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <button onClick={() => setAccount("bob")}>Switch account</button>
      <PageStateProvider key={account}>
        <NavigationFixture />
      </PageStateProvider>
    </MemoryRouter>
  );
}

it("returns from a repository to the exact source query and clears one-shot search behavior", async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByTestId("repo"));
  expect(screen.getByLabelText("section").textContent).toBe("explore");
  await user.click(screen.getByRole("link", { name: "Open issue" }));
  await user.click(screen.getByRole("link", { name: "返回Issues" }));
  expect(screen.getByLabelText("url").textContent).toBe(
    "/repo/octo/project?tab=issues",
  );
  await user.click(screen.getByRole("link", { name: "返回octo/project" }));
  await user.click(screen.getByRole("link", { name: "返回搜索" }));
  expect(screen.getByLabelText("url").textContent).toBe(
    "/explore?q=react&page=2",
  );
  expect(JSON.parse(screen.getByLabelText("state").textContent!)).toEqual({
    aggregateSearch: false,
    searchType: "repositories",
  });
  expect(document.activeElement?.id).toBe("main-content");
});

it("keeps history-entry origins separate when the same repository is opened from another section", async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByTestId("repo"));
  await user.click(screen.getByRole("link", { name: "Open inbox" }));
  await user.click(screen.getByTestId("repo"));
  expect(screen.getByRole("link", { name: "返回收件箱" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "History back" }));
  await user.click(screen.getByRole("button", { name: "History back" }));
  expect(screen.getByRole("link", { name: "返回搜索" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "History forward" }));
  await user.click(screen.getByRole("button", { name: "History forward" }));
  expect(screen.getByRole("link", { name: "返回收件箱" })).toBeTruthy();
});

it("does not re-open settings after returning to its parent, and a root breadcrumb reaches home", async () => {
  const user = userEvent.setup();
  render(<Fixture entry="/profile" />);
  await user.click(screen.getByRole("link", { name: "Open settings" }));
  await user.click(screen.getByRole("link", { name: "返回我的空间" }));
  await user.click(screen.getByRole("button", { name: "History back" }));
  expect(screen.getByLabelText("url").textContent).toBe("/profile");
  const crumb = screen.getByRole("navigation", { name: "面包屑导航" });
  await user.click(within(crumb).getByRole("link", { name: "概览" }));
  expect(screen.getByLabelText("url").textContent).toBe("/");
  expect(within(crumb).queryByRole("link")).toBeNull();
  expect(crumb.querySelector('[aria-current="page"]')?.textContent).toBe(
    "概览",
  );
});

it("drops source-list context when switching accounts and uses the direct-entry fallback", async () => {
  const user = userEvent.setup();
  render(<Fixture entry="/inbox?filter=unread" />);
  await user.click(screen.getByTestId("repo"));
  expect(screen.getByRole("link", { name: "返回收件箱" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Switch account" }));
  expect(screen.getByRole("link", { name: "返回搜索" })).toBeTruthy();
});

it("keeps a menu link clickable when Safari blurs the summary without focusing the link", () => {
  render(<Fixture entry="/profile/settings" />);
  const menu = document.querySelector<HTMLDetailsElement>(
    ".gp-crumb-mobile-overflow details",
  )!;
  menu.open = true;
  fireEvent.blur(menu.querySelector("summary")!, { relatedTarget: null });
  expect(menu.open).toBe(true);
  fireEvent.click(
    within(menu).getByRole("link", { name: "概览", exact: true }),
  );
  expect(screen.getByLabelText("url").textContent).toBe("/");
});

it("leaves modified clicks, new tabs, downloads and prevented links to their existing handlers", () => {
  render(<Fixture />);
  for (const modifier of [
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
  ]) {
    fireEvent.click(screen.getByTestId("repo"), modifier);
    expect(screen.getByLabelText("url").textContent).toBe(
      "/explore?q=react&page=2",
    );
  }
  for (const name of ["New tab", "Download", "Canceled link"])
    fireEvent.click(screen.getByRole("link", { name }));
  expect(screen.getByLabelText("url").textContent).toBe(
    "/explore?q=react&page=2",
  );
});
