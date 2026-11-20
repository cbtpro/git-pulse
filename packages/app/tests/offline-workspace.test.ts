import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { TokenManager } from "../src/services/auth/TokenManager";
import {
  cacheDocument,
  documentKey,
  saveDraft,
  trimDocuments,
} from "../src/services/auth/OfflineWorkspace";
import type { CachedDocument } from "../src/types/workspace";
beforeEach(async () => {
  await TokenManager.clearAll();
  await TokenManager.saveSession("t", "alice", "token");
});
afterEach(async () => {
  vi.restoreAllMocks();
  await TokenManager.clearAll();
});
it("stores readable snapshots and drafts per account without network writes", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  const key = documentKey("A/B", "issue", 7);
  await cacheDocument("legacy:alice", {
    key,
    kind: "issue",
    number: 7,
    repository: "A/B",
    title: "Offline issue",
    body: "Private body",
    url: "https://github.com/a/b/issues/7",
  });
  await saveDraft("legacy:alice", {
    key,
    kind: "issue",
    number: 7,
    repository: "A/B",
    body: "Unsent text",
    updatedAt: Date.now(),
  });
  await TokenManager.loadSession();
  expect(TokenManager.getWorkspace("legacy:alice").drafts[key].body).toBe(
    "Unsent text",
  );
  expect(TokenManager.getWorkspace("legacy:alice").documents[key].body).toBe(
    "Private body",
  );
  expect(TokenManager.getWorkspace("other").documents).toEqual({});
  expect(fetcher).not.toHaveBeenCalled();
});
it("respects the cache toggle and skips oversized documents", async () => {
  const doc = {
    key: "a/b/readme/main",
    kind: "readme" as const,
    repository: "a/b",
    title: "Readme",
    body: "text",
    url: "https://github.com/a/b",
  };
  await TokenManager.updateWorkspace("legacy:alice", (data) => ({
    ...data,
    offlineEnabled: false,
  }));
  await cacheDocument("legacy:alice", doc);
  expect(TokenManager.getWorkspace("legacy:alice").documents).toEqual({});
  expect(
    await cacheDocument("legacy:alice", { ...doc, body: "x".repeat(300001) }),
  ).toBe(false);
});
it("evicts old documents to bound encrypted cache size and leaves recent ones", () => {
  const documents: Record<string, CachedDocument> = {};
  for (let n = 1; n <= 80; n++)
    documents[String(n)] = {
      key: String(n),
      repository: "a/b",
      kind: "readme",
      title: "readme",
      url: "https://github.com/a/b",
      body: "x".repeat(50000),
      savedAt: n,
    };
  const result = trimDocuments(documents);
  expect(Object.keys(result).length).toBeLessThanOrEqual(60);
  expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThan(
    2_000_000,
  );
  expect(result["80"]).toBeTruthy();
  expect(result["1"]).toBeUndefined();
});
