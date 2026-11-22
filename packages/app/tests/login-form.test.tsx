import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubLoginForm } from "../src/components/GitHubLoginForm";
import { LoginModal } from "../src/components/LoginModal";
import { DesktopLoginView } from "../src/views/login/desktop/DesktopLoginView";
import { MobileLoginView } from "../src/views/login/mobile/MobileLoginView";
import { useAuthStore } from "../src/stores/authStore";
import * as deviceAuth from "../src/services/auth/GitHubDeviceAuth";
import * as transport from "../src/services/auth/GitHubOAuthTransport";

beforeEach(async () => {
  localStorage.clear();
  await useAuthStore.getState().logout();
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "test-public-id");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 1, login: "octocat" })),
      ),
  );
});
afterEach(() => {
  useAuthStore.getState().cancelLogin();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([GitHubLoginForm, DesktopLoginView, MobileLoginView])(
  "submits a Token once with Enter and returns the token to its caller",
  async (View) => {
    const onLoginSuccess = vi.fn();
    const user = userEvent.setup();
    render(<View onLoginSuccess={onLoginSuccess} />);
    await user.click(
      screen.getByRole("radio", { name: "Token 登录", exact: true }),
    );
    await user.type(
      screen.getByLabelText("Personal Access Token"),
      "ghp_test_token{Enter}",
    );
    await waitFor(() =>
      expect(onLoginSuccess).toHaveBeenCalledWith("ghp_test_token"),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("displays the code, opens the official page, and cancels authorization when the modal is closed", async () => {
  let authSignal: AbortSignal | undefined;
  vi.spyOn(deviceAuth, "authorizeWithGitHub").mockImplementation(
    async (onCode, signal) => {
      authSignal = signal;
      onCode({
        userCode: "ABCD-EFGH",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  );
  const open = vi
    .spyOn(transport, "openGitHubAuthorization")
    .mockResolvedValue();
  const onClose = vi.fn();
  const user = userEvent.setup();
  const view = render(<LoginModal isOpen onClose={onClose} />);
  expect(screen.queryByLabelText("密码")).toBeNull();
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  expect(await screen.findByLabelText("授权验证码")).toHaveProperty(
    "textContent",
    "ABCD-EFGH",
  );
  await user.click(
    screen.getByRole("button", { name: "打开 GitHub 授权页面" }),
  );
  expect(open).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "关闭登录" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(authSignal?.aborted).toBe(true);
  view.rerender(<LoginModal isOpen={false} onClose={onClose} />);
  expect(useAuthStore.getState().isLoading).toBe(false);
  expect(localStorage.getItem("github_token")).toBeNull();
});

it("uses an explicit cancel button to stop polling and allow a new attempt", async () => {
  vi.spyOn(deviceAuth, "authorizeWithGitHub").mockImplementation(
    async (onCode, signal) => {
      onCode({
        userCode: "ABCD-EFGH",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  );
  const user = userEvent.setup();
  render(<GitHubLoginForm />);
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await user.click(await screen.findByRole("button", { name: "取消授权" }));
  expect(screen.queryByLabelText("授权验证码")).toBeNull();
  expect(
    screen.getByRole("button", { name: "使用 GitHub 登录" }),
  ).toHaveProperty("disabled", false);
});

it("closes the modal after OAuth completes with a validated token", async () => {
  vi.spyOn(deviceAuth, "authorizeWithGitHub").mockResolvedValue(
    "gho_test_token",
  );
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<LoginModal isOpen onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(useAuthStore.getState().token).toBe("gho_test_token");
});

it("shows a usable Token alternative when OAuth is not configured", async () => {
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");
  const user = userEvent.setup();
  render(<GitHubLoginForm />);
  expect(
    screen.getByRole("button", { name: "使用 GitHub 登录" }),
  ).toHaveProperty("disabled", true);
  await user.click(
    screen.getByRole("radio", { name: "Token 登录", exact: true }),
  );
  expect(screen.getByLabelText("Personal Access Token")).toBeTruthy();
});

it("keeps the current code when a canceled native request returns late", async () => {
  let finishOld!: (value: string) => void;
  vi.spyOn(deviceAuth, "authorizeWithGitHub")
    .mockImplementationOnce(async (onCode) => {
      onCode({
        userCode: "OLD-CODE",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((resolve) => {
        finishOld = resolve;
      });
    })
    .mockImplementationOnce(async (onCode, signal) => {
      onCode({
        userCode: "NEW-CODE",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    });
  const user = userEvent.setup();
  render(<GitHubLoginForm />);
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await user.click(await screen.findByRole("button", { name: "取消授权" }));
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await waitFor(() =>
    expect(screen.getByLabelText("授权验证码").textContent).toBe("NEW-CODE"),
  );
  finishOld("late-token");
  await waitFor(() =>
    expect(screen.getByLabelText("授权验证码").textContent).toBe("NEW-CODE"),
  );
  expect(localStorage.getItem("github_token")).toBeNull();
});

it("copies only the displayed user code and resets feedback for a new authorization", async () => {
  let code = "ABCD-EFGH";
  const authorize = vi
    .spyOn(deviceAuth, "authorizeWithGitHub")
    .mockImplementation(async (onCode, signal) => {
      onCode({
        userCode: code,
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    });
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<GitHubLoginForm />);
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await user.click(await screen.findByRole("button", { name: "复制授权码" }));
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledWith("ABCD-EFGH");
  expect(await screen.findByText("授权码已复制")).toBeTruthy();
  expect(useAuthStore.getState().isLoading).toBe(true);
  expect(authorize).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "取消授权" }));
  code = "NEXT-CODE";
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  expect(screen.queryByText("授权码已复制")).toBeNull();
  await user.click(await screen.findByRole("button", { name: "复制授权码" }));
  expect(write).toHaveBeenLastCalledWith("NEXT-CODE");
});

it("keeps authorization active when clipboard access fails and supports retry", async () => {
  vi.spyOn(deviceAuth, "authorizeWithGitHub").mockImplementation(
    async (onCode, signal) => {
      onCode({
        userCode: "ABCD-EFGH",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  );
  const user = userEvent.setup();
  const write = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"))
    .mockResolvedValue();
  render(<GitHubLoginForm />);
  await user.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await user.click(await screen.findByRole("button", { name: "复制授权码" }));
  expect(
    await screen.findByText("复制失败，请选中授权码后手动复制。"),
  ).toBeTruthy();
  expect(screen.queryByText("授权码已复制")).toBeNull();
  expect(useAuthStore.getState().isLoading).toBe(true);
  expect(screen.getByLabelText("授权验证码").textContent).toBe("ABCD-EFGH");
  await user.click(screen.getByRole("button", { name: "复制授权码" }));
  expect(await screen.findByText("授权码已复制")).toBeTruthy();
  expect(write).toHaveBeenCalledTimes(2);
});

it("preserves the active authorization when the login view remounts", async () => {
  let signal!: AbortSignal;
  vi.spyOn(deviceAuth, "authorizeWithGitHub").mockImplementation(
    async (onCode, currentSignal) => {
      signal = currentSignal;
      onCode({
        userCode: "KEEP-CODE",
        verificationUri: transport.GITHUB_VERIFICATION_URL,
        expiresAt: Date.now() + 900000,
      });
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  );
  const view = render(<GitHubLoginForm />);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "使用 GitHub 登录" }));
  await screen.findByLabelText("授权验证码");
  view.unmount();
  expect(signal.aborted).toBe(false);
  render(<GitHubLoginForm />);
  expect(screen.getByLabelText("授权验证码").textContent).toBe("KEEP-CODE");
  expect(deviceAuth.authorizeWithGitHub).toHaveBeenCalledOnce();
});

it("uses token sign-in on Pages without offering an unavailable OAuth proxy", async () => {
  vi.stubEnv("MODE", "pages");
  const onLoginSuccess = vi.fn();
  render(<GitHubLoginForm onLoginSuccess={onLoginSuccess} />);
  expect(screen.queryByRole("button", { name: "使用 GitHub 登录" })).toBeNull();
  expect(screen.queryByRole("radio", { name: "GitHub 登录" })).toBeNull();
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Personal Access Token"),
    "pages-fixture-token{Enter}",
  );
  await waitFor(() =>
    expect(onLoginSuccess).toHaveBeenCalledWith("pages-fixture-token"),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
