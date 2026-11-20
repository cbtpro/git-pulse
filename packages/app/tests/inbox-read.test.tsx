import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxPage } from "../src/pages/InboxPage";
import { useAuthStore } from "../src/stores/authStore";
import {
  github,
  type Notification,
} from "../src/services/github/GitHubService";

const notification: Notification = {
  id: "123",
  unread: true,
  reason: "mention",
  updated_at: "2026-11-20T10:00:00Z",
  subject: {
    title: "Review notification",
    type: "PullRequest",
    url: "https://api.github.com/repos/test/repo/pulls/42",
  },
  repository: {
    full_name: "test/repo",
    html_url: "https://github.com/test/repo",
    owner: {
      login: "test",
      avatar_url: "",
      html_url: "https://github.com/test",
    },
  },
};
beforeEach(() =>
  useAuthStore.setState({ isLoggedIn: true, token: "inbox-test-token" }),
);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("marks the notification thread with authenticated PATCH and accepts its empty 205 response", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 205 }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    github.markNotificationRead(
      "123",
      "inbox-test-token",
      new AbortController().signal,
    ),
  ).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.github.com/notifications/threads/123",
    expect.objectContaining({
      method: "PATCH",
      headers: expect.objectContaining({
        Authorization: "Bearer inbox-test-token",
      }),
    }),
  );
});

it("keeps the destination usable, deduplicates clicks, and only removes unread items after success", async () => {
  vi.spyOn(github, "notifications").mockResolvedValue({
    data: [notification],
    hasNext: false,
  });
  let finish!: () => void;
  const mark = vi.spyOn(github, "markNotificationRead").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<InboxPage onShowLogin={vi.fn()} />);
  const link = await screen.findByRole("link", { name: /Review notification/ });
  expect(link.getAttribute("href")).toBe(
    "https://github.com/test/repo/pull/42",
  );
  expect(link.getAttribute("target")).toBe("_blank");
  // Cancel navigation only in the test; the component must leave the anchor default intact.
  link.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(link);
  fireEvent.click(link);
  expect(mark).toHaveBeenCalledTimes(1);
  expect(screen.getByText("未读")).toBeTruthy();
  await act(async () => finish());
  expect(await screen.findByText("目前没有未读通知")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("通知已标记为已读");
});

it("retains unread state on failure and allows retry without opening another tab", async () => {
  vi.spyOn(github, "notifications").mockResolvedValue({
    data: [notification],
    hasNext: false,
  });
  const mark = vi
    .spyOn(github, "markNotificationRead")
    .mockRejectedValueOnce(new Error("无法连接 GitHub，请检查网络后重试"))
    .mockResolvedValueOnce();
  render(<InboxPage onShowLogin={vi.fn()} />);
  const link = await screen.findByRole("link", { name: /Review notification/ });
  fireEvent(link, new MouseEvent("auxclick", { button: 1, bubbles: true }));
  expect(await screen.findByText("未能标记为已读，请重试。")).toBeTruthy();
  expect(screen.getByText("未读")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByText("目前没有未读通知")).toBeTruthy();
  expect(mark).toHaveBeenCalledTimes(2);
});

it("updates the all-notifications view without removing the item or repeating writes", async () => {
  vi.spyOn(github, "notifications").mockResolvedValue({
    data: [notification],
    hasNext: false,
  });
  const mark = vi.spyOn(github, "markNotificationRead").mockResolvedValue();
  render(<InboxPage onShowLogin={vi.fn()} />);
  await screen.findByRole("link", { name: /Review notification/ });
  await userEvent.click(screen.getByRole("radio", { name: "全部通知" }));
  const link = await screen.findByRole("link", { name: /Review notification/ });
  link.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(link);
  await waitFor(() => expect(screen.queryByText("未读")).toBeNull());
  fireEvent.click(link);
  expect(mark).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("link", { name: /Review notification/ }),
  ).toBeTruthy();
});

it("does not apply a previous account's completed read to the newly selected account", async () => {
  vi.spyOn(github, "notifications").mockResolvedValue({
    data: [notification],
    hasNext: false,
  });
  let finish!: () => void;
  vi.spyOn(github, "markNotificationRead").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<InboxPage onShowLogin={vi.fn()} />);
  const link = await screen.findByRole("link", { name: /Review notification/ });
  link.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(link);
  act(() => useAuthStore.setState({ token: "other-account-token" }));
  await screen.findByRole("link", { name: /Review notification/ });
  await act(async () => finish());
  expect(screen.getByText("未读")).toBeTruthy();
});
