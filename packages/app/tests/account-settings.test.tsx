import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSettingsCard } from "../src/components/AccountSettingsCard";
import { useAuthStore } from "../src/stores/authStore";
import { TokenManager } from "../src/services/auth/TokenManager";

beforeEach(async () => {
  useAuthStore.getState().cancelLogin();
  await TokenManager.clearAll();
  useAuthStore.setState({
    accounts: [],
    activeAccountId: null,
    isLoggedIn: false,
    token: null,
    userProfile: null,
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const second = options.headers.Authorization === "Bearer second-fixture";
      return new Response(
        JSON.stringify({
          id: second ? 2 : 1,
          login: second ? "second" : "first",
          name: second ? "Second Account" : "First Account",
          avatar_url: "",
        }),
      );
    }),
  );
  await useAuthStore.getState().loginWithToken("first-fixture");
  await useAuthStore.getState().loginWithToken("second-fixture");
});
afterEach(() => vi.unstubAllGlobals());

it("provides add, switch and remove controls for independent saved accounts", async () => {
  const user = userEvent.setup();
  const add = vi.fn();
  render(<AccountSettingsCard onShowLogin={add} />);
  expect(
    screen.getByRole("list", { name: "已保存的账号" }).children,
  ).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "添加账号" }));
  expect(add).toHaveBeenCalledOnce();
  expect(useAuthStore.getState().activeAccountId).toBe("2");
  await user.click(screen.getByRole("button", { name: "切换到 first" }));
  await waitFor(() =>
    expect(useAuthStore.getState().activeAccountId).toBe("1"),
  );
  expect(screen.queryByRole("button", { name: "切换到 first" })).toBeNull();
  expect(screen.getByRole("button", { name: "切换到 second" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "移除账号 second" }));
  await waitFor(() => expect(screen.queryByText("@second")).toBeNull());
  expect(useAuthStore.getState()).toMatchObject({
    activeAccountId: "1",
    isLoggedIn: true,
  });
});
