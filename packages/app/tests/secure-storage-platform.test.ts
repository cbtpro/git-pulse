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
