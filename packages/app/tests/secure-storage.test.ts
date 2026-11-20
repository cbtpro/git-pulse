import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecureStorage } from "../src/services/auth/SecureStorage";
import { TokenManager } from "../src/services/auth/TokenManager";

async function vaultEntries() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("gitpulse-secure-storage", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const result = await new Promise<{
    key: CryptoKey;
    session: { version: number; iv: Uint8Array; ciphertext: ArrayBuffer };
  }>((resolve, reject) => {
    const tx = db.transaction("vault", "readonly");
    const key = tx.objectStore("vault").get("key");
    const session = tx.objectStore("vault").get("session");
    tx.oncomplete = () => resolve({ key: key.result, session: session.result });
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return result;
}

beforeEach(async () => {
  await TokenManager.clearAll();
  localStorage.clear();
});

describe("encrypted storage", () => {
  it("stores authenticated ciphertext with fresh nonces and a non-exportable key", async () => {
    const plaintext = JSON.stringify({
      token: "fixture-secret",
      profile: { login: "fixture-user" },
    });
    await SecureStorage.write(plaintext);
    const first = await vaultEntries();
    expect(first.key.extractable).toBe(false);
    expect(new TextDecoder().decode(first.session.ciphertext)).not.toContain(
      "fixture-secret",
    );
    expect(await SecureStorage.read()).toBe(plaintext);
    await SecureStorage.write(plaintext);
    const second = await vaultEntries();
    expect(second.session.iv).not.toEqual(first.session.iv);
    expect(Array.from(new Uint8Array(second.session.ciphertext))).not.toEqual(
      Array.from(new Uint8Array(first.session.ciphertext)),
    );
    expect(localStorage.length).toBe(0);
    await SecureStorage.clear();
    expect(await SecureStorage.read()).toBeNull();
  });

  it("rejects altered ciphertext instead of accepting a corrupt session", async () => {
    await SecureStorage.write('{"token":"fixture-secret"}');
    const { session } = await vaultEntries();
    new Uint8Array(session.ciphertext)[0] ^= 1;
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("gitpulse-secure-storage", 1);
      open.onsuccess = () => {
        const tx = open.result.transaction("vault", "readwrite");
        tx.objectStore("vault").put(session, "session");
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    await expect(SecureStorage.read()).rejects.toThrow("校验失败");
  });

  it("migrates old credentials only after encryption succeeds", async () => {
    localStorage.setItem("github_token", "legacy-fixture");
    localStorage.setItem("github_username", "octocat");
    localStorage.setItem("github_password", "obsolete-password");
    const write = vi
      .spyOn(SecureStorage, "write")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(TokenManager.loadSession()).rejects.toThrow(
      "storage unavailable",
    );
    expect(localStorage.getItem("github_token")).toBe("legacy-fixture");
    expect(localStorage.getItem("github_password")).toBeNull();
    write.mockRestore();
    expect(await TokenManager.loadSession()).toMatchObject({
      token: "legacy-fixture",
      username: "octocat",
    });
    expect(localStorage.getItem("github_token")).toBeNull();
    expect(JSON.parse((await SecureStorage.read())!).accounts).toHaveLength(1);
  });

  it("rolls back a canceled encrypted write without losing existing accounts", async () => {
    await TokenManager.saveSession("first-fixture", "first", "token");
    const original = SecureStorage.write.bind(SecureStorage);
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(SecureStorage, "write").mockImplementationOnce(async (value) => {
      await original(value);
      started();
      await gate;
    });
    const controller = new AbortController();
    const saving = TokenManager.saveSession(
      "second-fixture",
      "second",
      "oauth",
      undefined,
      controller.signal,
    );
    await entered;
    controller.abort();
    release();
    await expect(saving).rejects.toMatchObject({ name: "AbortError" });
    expect(TokenManager.getToken()).toBe("first-fixture");
    const restored = await TokenManager.loadSession();
    expect(restored?.username).toBe("first");
    expect(TokenManager.getAccounts()).toHaveLength(1);
  });
});

it("keeps pins and recent searches encrypted, separate per account, and across reauthorization", async () => {
  await TokenManager.saveSession("first-token", "first", "token");
  const first = TokenManager.getActiveAccount()!.id;
  await TokenManager.saveCustomPins(first, ["R_first", "G_first"]);
  await TokenManager.saveRecentSearches(first, ['repo:secret/project']);
  await TokenManager.saveSession("second-token", "second", "token");
  const second = TokenManager.getActiveAccount()!.id;
  expect(TokenManager.getCustomPins(second)).toBeUndefined();
  expect(TokenManager.getRecentSearches(second)).toEqual([]);
  await TokenManager.saveCustomPins(second, []);
  expect(TokenManager.getCustomPins(second)).toEqual([]);
  await TokenManager.saveSession("new-first-token", "first", "oauth");
  await TokenManager.loadSession();
  expect(TokenManager.getCustomPins(first)).toEqual(["R_first", "G_first"]);
  expect(TokenManager.getRecentSearches(first)).toEqual(['repo:secret/project']);
  const stored = await vaultEntries();
  const bytes = new TextDecoder().decode(stored.session.ciphertext);
  expect(bytes).not.toContain("secret/project");
  expect(bytes).not.toContain("R_first");
  expect(Object.values(localStorage).join()).not.toContain("secret/project");
  await TokenManager.removeAccount(first);
  await TokenManager.loadSession();
  expect(TokenManager.getCustomPins(first)).toBeUndefined();
  expect(TokenManager.getRecentSearches(first)).toEqual([]);
});
