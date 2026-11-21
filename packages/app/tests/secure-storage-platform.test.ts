import { afterEach, expect, it, vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(),
}));
import { invoke } from "@tauri-apps/api/core";
import { SecureStorage } from "../src/services/auth/SecureStorage";
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(invoke).mockReset();
});
it("uses encrypted WebView storage on Android without unsupported keyring calls", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (Linux; Android 15)",
  );
  await SecureStorage.write("android-fixture");
  expect(await SecureStorage.read()).toBe("android-fixture");
  await SecureStorage.clear();
  expect(await SecureStorage.read()).toBeNull();
  expect(invoke).not.toHaveBeenCalled();
});
it("uses the native encrypted vault on iOS and desktop", async () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
  ]) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    await SecureStorage.write("native-fixture");
    expect(invoke).toHaveBeenLastCalledWith("write_auth_vault", {
      value: "native-fixture",
    });
    await SecureStorage.read();
    expect(invoke).toHaveBeenLastCalledWith("read_auth_vault");
  }
});
it("recomputes native changes from the newest vault after a CAS conflict", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)",
  );
  let reads = 0,
    commits = 0;
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === "read_auth_vault")
      return JSON.stringify({ count: reads++ ? 4 : 0 });
    if (command === "compare_auth_vault") return commits++ > 0;
    throw new Error("unexpected command");
  });
  expect(
    await SecureStorage.update((raw) =>
      JSON.stringify({ count: JSON.parse(raw!).count + 1 }),
    ),
  ).toBe('{"count":5}');
  expect(invoke).toHaveBeenLastCalledWith("compare_auth_vault", {
    expected: '{"count":4}',
    value: '{"count":5}',
  });
});
