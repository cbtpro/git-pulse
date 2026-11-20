import { beforeEach, afterEach, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCommentDraft } from "../src/hooks/useOfflineWorkspace";
import { TokenManager } from "../src/services/auth/TokenManager";
beforeEach(async () => {
  await TokenManager.clearAll();
  await TokenManager.saveSession("t", "alice", "token");
});
afterEach(async () => {
  await TokenManager.clearAll();
});
it("flushes the last edit when leaving the page and restores it on return", async () => {
  const first = renderHook(() =>
    useCommentDraft("legacy:alice", "a/b", "issue", 1),
  );
  act(() => first.result.current.change("Keep the last keystroke"));
  first.unmount();
  await waitFor(() =>
    expect(
      TokenManager.getWorkspace("legacy:alice").drafts["a/b/issue/1"]?.body,
    ).toBe("Keep the last keystroke"),
  );
  const next = renderHook(() =>
    useCommentDraft("legacy:alice", "a/b", "issue", 1),
  );
  expect(next.result.current.body).toBe("Keep the last keystroke");
  await act(() => next.result.current.clear());
  next.unmount();
  expect(TokenManager.getWorkspace("legacy:alice").drafts).toEqual({});
});
it("does not resurrect a draft during unmount after explicit deletion", async () => {
  const editor = renderHook(() =>
    useCommentDraft("legacy:alice", "a/b", "issue", 1),
  );
  act(() => editor.result.current.change("Unsaved latest edit"));
  act(() =>
    window.dispatchEvent(
      new CustomEvent("gitpulse:discard-draft", {
        detail: "legacy:alice:a/b/issue/1",
      }),
    ),
  );
  await TokenManager.updateWorkspace("legacy:alice", (current) => ({
    ...current,
    drafts: {},
  }));
  editor.unmount();
  await new Promise((resolve) => setTimeout(resolve, 450));
  expect(TokenManager.getWorkspace("legacy:alice").drafts).toEqual({});
});
