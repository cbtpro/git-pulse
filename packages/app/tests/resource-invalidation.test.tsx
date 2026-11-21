import { act, renderHook, waitFor } from "@testing-library/react";
import { useCallback } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGitHubResource } from "../src/hooks/useGitHubResource";
import {
  clearGitHubRequestState,
  requestGitHub,
} from "../src/services/github/GitHubService";
import { TokenManager } from "../src/services/auth/TokenManager";
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  clearGitHubRequestState();
  vi.spyOn(TokenManager, "getToken").mockReturnValue(null);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const signal = () => new AbortController().signal;
function reader(path: string, token = "account-a") {
  return renderHook(() =>
    useGitHubResource(
      useCallback(
        (abort: AbortSignal) =>
          requestGitHub<{ value: number }>(path, token, abort),
        [path, token],
      ),
    ),
  );
}
it("refreshes matching retained resources in place, keeping unrelated repositories and accounts isolated", async () => {
  let value = 1;
  let release!: () => void;
  let blocked = false;
  fetchMock.mockImplementation(async (_, options) => {
    if (options?.method === "PATCH")
      return new Response(JSON.stringify({ state: "closed" }));
    if (blocked)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return new Response(JSON.stringify({ value }));
  });
  const match = reader("/search/issues?q=repo:octo/project+is:open");
  const otherRepo = reader("/search/issues?q=repo:other/project+is:open");
  const otherAccount = reader(
    "/search/issues?q=repo:octo/project+is:open",
    "account-b",
  );
  await waitFor(() => expect(match.result.current.data?.data.value).toBe(1));
  await waitFor(() =>
    expect(otherAccount.result.current.data?.data.value).toBe(1),
  );
  const original = match.result.current.data;
  blocked = true;
  value = 2;
  await act(() =>
    requestGitHub("/repos/octo/project/issues/7", "account-a", signal(), {
      method: "PATCH",
    }),
  );
  await waitFor(() => expect(match.result.current.refreshing).toBe(true));
  expect(match.result.current.data).toBe(original);
  expect(match.result.current.loading).toBe(false);
  expect(otherRepo.result.current.refreshing).toBe(false);
  expect(otherAccount.result.current.refreshing).toBe(false);
  await act(async () => {
    release();
  });
  await waitFor(() => expect(match.result.current.data?.data.value).toBe(2));
  match.unmount();
  otherRepo.unmount();
  otherAccount.unmount();
});
it.each([
  [
    "/repos/octo/project/issues/7/comments",
    "POST",
    "/repos/octo/project/pulls/7",
  ],
  [
    "/repos/octo/project/pulls/7/merge",
    "PUT",
    "/search/issues?q=repo:octo/project+is:pr",
  ],
  ["/user/starred/octo/project", "PUT", "/user/starred?per_page=100"],
  ["/user/starred/octo/project", "DELETE", "/user/starred/octo/project"],
  [
    "/repos/octo/project/actions/runs/7/rerun",
    "POST",
    "/repos/octo/project/actions/runs",
  ],
  ["/notifications/threads/7", "PATCH", "/notifications"],
])("invalidates successful %s writes", async (write, method, read) => {
  let reads = 0;
  fetchMock.mockImplementation(
    async (_, options) =>
      new Response(
        JSON.stringify(options?.method ? { merged: true } : { value: ++reads }),
      ),
  );
  const hook = reader(read);
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(() => requestGitHub(write, "account-a", signal(), { method }));
  await waitFor(() => expect(reads).toBe(2));
  hook.unmount();
});
it("does not refresh on failed mutations, rejected merges or GraphQL queries; preserves data on refresh errors", async () => {
  let reads = 0,
    failRead = false;
  fetchMock.mockImplementation(async (input, options) => {
    if (String(input).endsWith("/graphql"))
      return new Response(JSON.stringify({ data: {} }));
    if (options?.method === "PUT")
      return new Response(JSON.stringify({ merged: false }));
    if (options?.method === "PATCH") return new Response("{}", { status: 403 });
    if (failRead) return new Response("{}", { status: 500 });
    return new Response(JSON.stringify({ value: ++reads }));
  });
  const hook = reader("/repos/octo/project/pulls/7");
  await waitFor(() => expect(hook.result.current.data).not.toBeNull());
  await act(async () => {
    await expect(
      requestGitHub("/repos/octo/project/issues/7", "account-a", signal(), {
        method: "PATCH",
      }),
    ).rejects.toThrow();
    await requestGitHub(
      "/repos/octo/project/pulls/7/merge",
      "account-a",
      signal(),
      { method: "PUT" },
    );
    await requestGitHub("/graphql", "account-a", signal(), {
      method: "POST",
      body: '{"query":"query { viewer { login } }"}',
    });
  });
  expect(reads).toBe(1);
  failRead = true;
  act(() => hook.result.current.reload());
  await waitFor(() =>
    expect(hook.result.current.refreshError).toBeInstanceOf(Error),
  );
  expect(hook.result.current.data?.data.value).toBe(1);
  expect(hook.result.current.loading).toBe(false);
  hook.unmount();
});

it("keeps dependencies across refresh registration so an in-flight write cannot fall into the loader microtask gap", async () => {
  const { observeResourceReads, recordResourceRead, invalidateResourceWrite } =
    await import("../src/services/github/ResourceInvalidation");
  const dependencies: import("../src/services/github/ResourceInvalidation").ResourceReadSet =
    [];
  const first = signal(),
    next = signal(),
    refresh = vi.fn();
  const remove = observeResourceReads(first, refresh, dependencies);
  recordResourceRead(first, "/repos/octo/project/issues/7", "account-a");
  remove();
  const removeNext = observeResourceReads(next, refresh, dependencies);
  invalidateResourceWrite("/repos/octo/project/issues/7", "account-a");
  expect(refresh).toHaveBeenCalledOnce();
  removeNext();
  invalidateResourceWrite("/repos/octo/project/issues/7", "account-a");
  expect(refresh).toHaveBeenCalledOnce();
});

it("updates Star state across retained tabs without reloading repository code or another identity", async () => {
  const { repositories } =
    await import("../src/services/github/RepositoryService");
  let starred = false,
    codeReads = 0;
  fetchMock.mockImplementation(async (input, options) => {
    if (options?.method === "PUT") {
      starred = true;
      return new Response(null, { status: 204 });
    }
    if (String(input).includes("/contents/")) {
      codeReads++;
      return new Response(JSON.stringify({ value: 1 }));
    }
    const account = (options?.headers as Record<string, string>).Authorization;
    return starred && account === "Bearer account-a"
      ? new Response(null, { status: 204 })
      : new Response("{}", { status: 404 });
  });
  const mount = (token: string) =>
    renderHook(() =>
      useGitHubResource(
        useCallback(
          (abort: AbortSignal) =>
            repositories.starred("octo", "project", token, abort),
          [token],
        ),
      ),
    );
  const first = mount("account-a"),
    second = mount("account-a"),
    other = mount("account-b");
  const code = reader("/repos/octo/project/contents/file.ts");
  await waitFor(() => expect(first.result.current.data).toBe(false));
  await waitFor(() => expect(second.result.current.data).toBe(false));
  await waitFor(() => expect(other.result.current.data).toBe(false));
  await waitFor(() => expect(codeReads).toBe(1));
  await act(() => repositories.star("octo", "project", true, "account-a"));
  await waitFor(() => expect(first.result.current.data).toBe(true));
  await waitFor(() => expect(second.result.current.data).toBe(true));
  expect(other.result.current.data).toBe(false);
  expect(codeReads).toBe(1);
  [first, second, other, code].forEach((hook) => hook.unmount());
});
