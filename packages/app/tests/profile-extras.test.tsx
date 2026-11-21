import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  githubPages,
  profileReadme,
  pinnedRepositories,
} from "../src/services/github/ProfileService";
import {
  ProfileMarkdown,
  readmeUrl,
} from "../src/components/profile/ProfileReadmeCard";
import { ProfilePage } from "../src/pages/ProfilePage";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "../src/stores/authStore";
import { usePreferencesStore } from "../src/stores/preferencesStore";
const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers });
const signal = () => new AbortController().signal;
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("paginates all owned repositories and keeps custom domains and per-site permission errors", async () => {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("page=1"))
      return response(
        [
          {
            full_name: "owner/site",
            html_url: "https://github.com/owner/site",
            has_pages: true,
          },
          { full_name: "owner/no-site", has_pages: false },
        ],
        200,
        { link: '<https://api.github.com/user/repos?page=2>; rel="next"' },
      );
    if (url.endsWith("page=2"))
      return response([
        {
          full_name: "owner/restricted",
          html_url: "https://github.com/owner/restricted",
          has_pages: true,
        },
      ]);
    if (url.endsWith("/site/pages"))
      return response({
        html_url: "https://custom.example.com/docs/",
        status: "built",
      });
    if (url.endsWith("/restricted/pages")) return response({}, 403);
    throw new Error("unexpected request");
  });
  const sites = await githubPages("fixture-token", signal());
  expect(sites).toHaveLength(2);
  expect(sites[0]).toMatchObject({
    url: "https://custom.example.com/docs/",
    status: "built",
    error: null,
  });
  expect(sites[1]).toMatchObject({
    url: null,
    error: expect.stringContaining("权限"),
  });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("reports rate limits instead of mislabeling them as missing sites", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response([{ full_name: "owner/site", has_pages: true }]),
    )
    .mockResolvedValueOnce(response({}, 403, { "x-ratelimit-remaining": "0" }));
  await expect(githubPages("fixture-token", signal())).rejects.toMatchObject({
    status: 403,
    rateLimited: true,
  });
});

it("loads UTF-8 profile readmes and treats missing readmes as an empty state", async () => {
  fetchMock.mockResolvedValueOnce(
    response({
      encoding: "base64",
      content: btoa(String.fromCharCode(...new TextEncoder().encode("# 你好"))),
      html_url: "https://github.com/owner/owner/blob/main/README.md",
      download_url:
        "https://raw.githubusercontent.com/owner/owner/main/README.md",
    }),
  );
  expect(await profileReadme("owner", "fixture-token", signal())).toMatchObject(
    { markdown: "# 你好" },
  );
  expect(String(fetchMock.mock.calls[0][0])).toContain(
    "/repos/owner/owner/readme",
  );
  fetchMock.mockResolvedValueOnce(response({}, 404));
  expect(await profileReadme("owner", "fixture-token", signal())).toBeNull();
});

it("sanitizes profile HTML and resolves relative images and links without executable URLs", () => {
  const readme = {
    htmlUrl: "https://github.com/owner/owner/blob/main/README.md",
    rawUrl: "https://raw.githubusercontent.com/owner/owner/main/README.md",
    markdown:
      '<script>alert(1)</script><iframe src="https://example.com"></iframe><img src="./image.png" onerror="alert(2)"><a href="javascript:alert(3)">bad</a>\n\n[Docs](./docs.md)\n\n![Hello](./image.png)',
  };
  const { container } = render(<ProfileMarkdown readme={readme} />);
  expect(container.querySelector("script, iframe, [onerror]")).toBeNull();
  expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe(
    "https://github.com/owner/owner/blob/main/docs.md",
  );
  expect(screen.getByAltText("Hello").getAttribute("src")).toBe(
    "https://raw.githubusercontent.com/owner/owner/main/image.png",
  );
  expect(readmeUrl("javascript:alert(1)", false, readme)).toBe("");
  expect(readmeUrl("data:text/html,test", false, readme)).toBe("");
  expect(readmeUrl("#about", false, readme)).toContain("README.md#about");
});

it("fails clearly when GitHub denies pinned repositories", async () => {
  fetchMock.mockResolvedValueOnce(
    response({ data: null, errors: [{ message: "denied" }] }),
  );
  await expect(
    pinnedRepositories("fixture-token", signal()),
  ).rejects.toMatchObject({ status: 403 });
});

it("keeps optional profile sections off by default and avoids their requests", async () => {
  expect(usePreferencesStore.getState()).toMatchObject({
    showProfileReadme: false,
    showPinnedRepositories: false,
    showGitHubPages: false,
  });
  useAuthStore.setState({
    isLoggedIn: true,
    token: "fixture-token",
    userProfile: {
      id: 1,
      login: "fixture",
      name: "Fixture",
      avatar_url: "",
      bio: null,
      location: null,
      email: null,
      twitter_username: null,
      public_repos: 0,
      public_gists: 0,
      followers: 0,
      following: 0,
      created_at: "2020-01-01",
      updated_at: "2026-01-01",
    },
  });
  fetchMock.mockResolvedValue(response({}, 403));
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ProfilePage onShowLogin={vi.fn()} />
    </MemoryRouter>,
  );
  // Contributions, repositories, identity badges and public organizations.
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(
    fetchMock.mock.calls.some(
      ([url, options]) =>
        String(url).endsWith("/readme") ||
        String(url).endsWith("/pages") ||
        String(options?.body).includes("pinnedItems"),
    ),
  ).toBe(false);
});
