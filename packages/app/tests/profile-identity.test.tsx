import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PROFILE_BADGES,
  profileBadges,
  profileOrganizations,
} from "../src/services/github/ProfileIdentityService";
import { ProfileIdentity } from "../src/components/profile/ProfileIdentity";
import { clearGitHubRequestState } from "../src/services/github/GitHubService";

const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers });
const flags = Object.fromEntries(
  PROFILE_BADGES.map(({ field }) => [field, false]),
);
const signal = () => new AbortController().signal;
beforeEach(() => {
  clearGitHubRequestState();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("uses authenticated official flags and never invents an achievement", async () => {
  fetchMock.mockResolvedValueOnce(
    response({
      data: {
        viewer: {
          ...flags,
          isDeveloperProgramMember: true,
          isGitHubStar: true,
        },
      },
    }),
  );
  expect(
    (await profileBadges("identity-token", signal())).map((b) => b.field),
  ).toEqual(["isGitHubStar", "isDeveloperProgramMember"]);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: "Bearer identity-token",
  });
  fetchMock.mockResolvedValueOnce(
    response({ data: { viewer: {} }, errors: [{ message: "denied" }] }),
  );
  await expect(profileBadges("identity-token", signal())).rejects.toThrow(
    "身份徽章",
  );
});

it("loads every page of public memberships with the current account's credentials", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response([{ id: 1, login: "first" }], 200, {
        link: '<https://api.github.com/users/owner/orgs?page=2>; rel="next"',
      }),
    )
    .mockResolvedValueOnce(response([{ id: 2, login: "second" }]));
  expect(
    (await profileOrganizations("owner", "org-token", signal())).map(
      (org) => org.login,
    ),
  ).toEqual(["first", "second"]);
  for (const [url, options] of fetchMock.mock.calls) {
    expect(String(url)).toContain("/users/owner/orgs?");
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer org-token",
    });
  }
  expect(String(fetchMock.mock.calls[1][0])).toContain("page=2");
});

it("renders organizations when the badge request fails and supports an independent retry", async () => {
  let failed = true;
  fetchMock.mockImplementation(async (url) =>
    String(url).endsWith("/graphql")
      ? failed
        ? response({}, 503)
        : response({ data: { viewer: { ...flags, isCampusExpert: true } } })
      : response([
          {
            id: 1,
            login: "my-organization",
            avatar_url: "https://avatars.githubusercontent.com/u/1",
            description: "Our team",
          },
        ]),
  );
  render(<ProfileIdentity login="octocat" token="identity-token" />);
  const org = await screen.findByRole("link", { name: "my-organization" });
  expect(org.getAttribute("href")).toBe("https://github.com/my-organization");
  expect(await screen.findByText("暂时无法加载身份徽章")).toBeTruthy();
  expect(screen.getByText("暂时无法获取 GitHub 数据，请稍后重试")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "查看 GitHub 成就" }).getAttribute("href"),
  ).toBe("https://github.com/octocat?tab=achievements");
  failed = false;
  await userEvent.click(screen.getByRole("button", { name: "刷新身份徽章" }));
  expect(await screen.findByText("校园专家")).toBeTruthy();
  expect(
    within(screen.getByRole("region", { name: "公开组织" })).getByRole("link"),
  ).toBe(org);
});

it("does not leak a previous account's organizations after a switch", async () => {
  let finish!: (value: Response) => void;
  fetchMock.mockImplementation(async (url) => {
    if (String(url).includes("/users/first/"))
      return new Promise((resolve) => {
        finish = resolve;
      });
    if (String(url).endsWith("/graphql"))
      return response({ data: { viewer: flags } });
    return response([]);
  });
  const view = render(<ProfileIdentity login="first" token="first-token" />);
  await screen.findByText("暂无公开身份徽章");
  expect(screen.getByText(/身份徽章用于 GitHub Star/)).toBeTruthy();
  expect(screen.queryByText("暂时无法加载身份徽章")).toBeNull();
  view.rerender(<ProfileIdentity login="second" token="second-token" />);
  await screen.findByText("暂无公开的组织成员身份");
  finish(response([{ id: 1, login: "private-to-first" }]));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByText("private-to-first")).toBeNull();
});

it.each([401, 403])(
  "offers account authorization for a %i rejection instead of treating it as no badges",
  async (status) => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/graphql") ? response({}, status) : response([]),
    );
    const onShowLogin = vi.fn();
    render(
      <ProfileIdentity
        login="octocat"
        token="identity-token"
        onShowLogin={onShowLogin}
      />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "重新登录" }),
    );
    expect(onShowLogin).toHaveBeenCalledOnce();
    expect(screen.queryByText("暂无公开身份徽章")).toBeNull();
    expect(
      screen.getByText(
        status === 401
          ? "登录凭证已失效，请重新登录"
          : "GitHub 拒绝了请求，请检查当前账号的访问权限。",
      ),
    ).toBeTruthy();
  },
);

it("explains rate limiting without asking the user to authorize again", async () => {
  fetchMock.mockResolvedValue(response({}, 429));
  render(
    <ProfileIdentity
      login="octocat"
      token="identity-token"
      onShowLogin={vi.fn()}
    />,
  );
  expect(
    await screen.findByText(
      "当前账号的 GitHub 请求次数已达上限，请等待额度恢复后重试。",
    ),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "重新登录" })).toBeNull();
});
