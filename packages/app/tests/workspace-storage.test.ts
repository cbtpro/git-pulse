import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { TokenManager } from "../src/services/auth/TokenManager";
import { SecureStorage } from "../src/services/auth/SecureStorage";
const annotation = {
  group: "Tools",
  tags: ["TypeScript"],
  note: "private workspace note",
  status: "later" as const,
};
beforeEach(async () => {
  await TokenManager.clearAll();
  await TokenManager.saveSession("token-a", "alice", "token");
  await TokenManager.saveSession("token-b", "bob", "token");
});
afterEach(async () => {
  vi.restoreAllMocks();
  await TokenManager.clearAll();
});
it("serializes concurrent updates without leaking notes across accounts or summaries", async () => {
  await Promise.all([
    TokenManager.updateWorkspace("legacy:alice", (current) => ({
      ...current,
      stars: { ...current.stars, "a/one": annotation },
    })),
    TokenManager.updateWorkspace("legacy:alice", (current) => ({
      ...current,
      stars: { ...current.stars, "a/two": annotation },
    })),
  ]);
  expect(Object.keys(TokenManager.getWorkspace("legacy:alice").stars)).toEqual([
    "a/one",
    "a/two",
  ]);
  expect(TokenManager.getWorkspace("legacy:bob").stars).toEqual({});
  expect(
    TokenManager.getAccounts().every(
      (account) => !("workspace" in account) && !("token" in account),
    ),
  ).toBe(true);
  expect(localStorage.getItem("private workspace note")).toBeNull();
  expect(JSON.stringify(localStorage)).not.toContain("private workspace note");
});
it("preserves notes during reauthorization and restores encrypted workspace data", async () => {
  await TokenManager.updateWorkspace("legacy:alice", (current) => ({
    ...current,
    stars: { "a/one": annotation },
  }));
  await TokenManager.saveSession("renewed", "alice", "oauth");
  await TokenManager.loadSession();
  expect(TokenManager.getWorkspace("legacy:alice").stars["a/one"]).toEqual(
    annotation,
  );
  expect(await SecureStorage.read()).toContain("private workspace note");
});
it("does not update memory after a failed encrypted write and rejects removed accounts", async () => {
  vi.spyOn(SecureStorage, "write").mockRejectedValueOnce(
    new Error("Disk unavailable"),
  );
  await expect(
    TokenManager.updateWorkspace("legacy:alice", (current) => ({
      ...current,
      stars: { "a/one": annotation },
    })),
  ).rejects.toThrow("Disk unavailable");
  expect(TokenManager.getWorkspace("legacy:alice").stars).toEqual({});
  await TokenManager.removeAccount("legacy:alice");
  await expect(
    TokenManager.updateWorkspace("legacy:alice", (current) => current),
  ).rejects.toThrow("来源账号");
});
