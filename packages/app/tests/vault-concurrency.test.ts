import { beforeEach, expect, it, vi } from "vitest";
import { TokenManager } from "../src/services/auth/TokenManager";
import { SecureStorage } from "../src/services/auth/SecureStorage";

beforeEach(async () => {
  await TokenManager.clearAll();
  localStorage.clear();
});
async function otherContext() {
  vi.resetModules();
  const { TokenManager: other } =
    await import("../src/services/auth/TokenManager");
  await other.loadSession();
  return other;
}
it("does not resurrect a removed identity from another context's stale search/profile/pin/workspace writes", async () => {
  await TokenManager.saveSession("fixture-token", "fixture", "token", {
    id: 1,
    login: "fixture",
  });
  const other = await otherContext();
  await TokenManager.removeAccount("1");
  await other.saveRecentSearches("1", ["stale"]);
  await other.updateProfile("1", { id: 1, login: "fixture" });
  await expect(other.saveCustomPins("1", ["R_stale"])).rejects.toThrow(
    "账号已变更",
  );
  await expect(
    other.updateWorkspace("1", (workspace) => workspace),
  ).rejects.toThrow("来源账号已移除");
  expect(await TokenManager.loadSession()).toBeNull();
  expect(JSON.parse((await SecureStorage.read())!).accounts).toEqual([]);
});
it("merges simultaneous changes to different fields/accounts using the latest vault", async () => {
  await TokenManager.saveSession("first", "first", "token", {
    id: 1,
    login: "first",
  });
  await TokenManager.saveSession("second", "second", "token", {
    id: 2,
    login: "second",
  });
  const other = await otherContext();
  await Promise.all([
    TokenManager.saveRecentSearches("1", ["first query"]),
    other.saveCustomPins("1", ["R_first"]),
  ]);
  await Promise.all([
    TokenManager.saveRecentSearches("2", ["second query"]),
    other.updateProfile("1", { id: 1, login: "first", name: "Updated" }),
  ]);
  await TokenManager.loadSession();
  expect(TokenManager.getRecentSearches("1")).toEqual(["first query"]);
  expect(TokenManager.getCustomPins("1")).toEqual(["R_first"]);
  expect(TokenManager.getRecentSearches("2")).toEqual(["second query"]);
  expect(TokenManager.getAccount("1")?.profile?.name).toBe("Updated");
});
it("rejects a delayed token/device exchange after logout even without change broadcasts", async () => {
  await TokenManager.saveSession("fixture", "fixture", "token", {
    id: 1,
    login: "fixture",
  });
  const other = await otherContext(),
    generation = other.getGeneration();
  await TokenManager.removeAccount("1");
  await expect(
    other.saveSession(
      "late",
      "fixture",
      "oauth",
      { id: 1, login: "fixture" },
      undefined,
      generation,
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  await expect(
    other.savePendingAuthorization(
      {
        id: "pending",
        clientId: "client",
        deviceCode: "device",
        userCode: "code",
        expiresAt: Date.now() + 60_000,
        interval: 5,
        nextPollAt: Date.now(),
      },
      new AbortController().signal,
      generation,
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(await TokenManager.loadSession()).toBeNull();
});
it("does not overwrite another context's committed changes during cancellation compensation", async () => {
  await TokenManager.saveSession("first", "first", "token", {
    id: 1,
    login: "first",
  });
  const other = await otherContext();
  const update = SecureStorage.update.bind(SecureStorage);
  const controller = new AbortController();
  vi.spyOn(SecureStorage, "update").mockImplementationOnce(
    async (transform) => {
      const result = await update(transform);
      await other.removeAccount("1");
      controller.abort();
      return result;
    },
  );
  await expect(
    TokenManager.saveSession(
      "late",
      "second",
      "token",
      { id: 2, login: "second" },
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  await TokenManager.loadSession();
  expect(TokenManager.getAccount("1")).toBeNull();
  expect(TokenManager.getAccount("2")).toBeNull();
});
