import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const scripts = resolve("scripts/ci");
function fixture(t) {
  const path = mkdtempSync(join(tmpdir(), "gitpulse-ci-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
function run(cwd, script, args = [], env = {}) {
  return spawnSync(process.execPath, [join(scripts, script), ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}
test("Android setup detects SDK, is repeatable, and never puts signing passwords in Gradle", (t) => {
  const cwd = fixture(t);
  const dir = join(cwd, "packages/app/src-tauri/gen/android/app");
  mkdirSync(join(dir, "src/main"), { recursive: true });
  writeFileSync(
    join(dir, "src/main/AndroidManifest.xml"),
    "<manifest><application></application></manifest>",
  );
  const path = join(dir, "build.gradle.kts");
  writeFileSync(path, "android { compileSdk = 37 }\n");
  const env = {
    RUNNER_TEMP: cwd,
    GITHUB_ENV: join(cwd, "env"),
    GITHUB_OUTPUT: join(cwd, "output"),
    ANDROID_KEYSTORE_BASE64: Buffer.from("fixture-key").toString("base64"),
    ANDROID_STORE_PASSWORD: "private-fixture-password",
    ANDROID_KEY_ALIAS: "fixture-alias",
    ANDROID_KEY_PASSWORD: "private-fixture-password",
  };
  assert.equal(run(cwd, "prepare-android.mjs", [], env).status, 0);
  assert.equal(run(cwd, "prepare-android.mjs", [], env).status, 0);
  const gradle = readFileSync(path, "utf8");
  assert.equal(gradle.split("// GitPulse CI configuration").length, 2);
  assert(!gradle.includes("private-fixture-password"));
  assert.equal(
    statSync(join(cwd, "gitpulse-release.keystore")).mode & 0o777,
    0o600,
  );
  assert(
    readFileSync(env.GITHUB_OUTPUT, "utf8").includes(
      "compile-sdk=37\nplatform-packages=platforms;android-36 platforms;android-37.0\nsigning=signed",
    ),
  );
});
test("partial signing fails and missing signing produces explicitly unsigned configuration", (t) => {
  const cwd = fixture(t);
  const dir = join(cwd, "packages/app/src-tauri/gen/android/app");
  mkdirSync(join(dir, "src/main"), { recursive: true });
  writeFileSync(
    join(dir, "src/main/AndroidManifest.xml"),
    "<manifest><application></application></manifest>",
  );
  writeFileSync(join(dir, "build.gradle.kts"), "android { compileSdk = 37 }");
  const env = {
    RUNNER_TEMP: cwd,
    GITHUB_ENV: join(cwd, "env"),
    GITHUB_OUTPUT: join(cwd, "output"),
    ANDROID_KEYSTORE_BASE64: "",
    ANDROID_STORE_PASSWORD: "",
    ANDROID_KEY_ALIAS: "",
    ANDROID_KEY_PASSWORD: "",
  };
  const failed = run(cwd, "prepare-android.mjs", [], {
    ...env,
    ANDROID_STORE_PASSWORD: "never-log-me",
  });
  assert.notEqual(failed.status, 0);
  assert(!failed.stderr.includes("never-log-me"));
  assert.equal(run(cwd, "prepare-android.mjs", [], env).status, 0);
  assert(readFileSync(env.GITHUB_OUTPUT, "utf8").includes("signing=unsigned"));
});
test("collects both Android formats with checksums and rejects missing bundles", (t) => {
  const cwd = fixture(t);
  const source = join(cwd, "output");
  mkdirSync(source);
  writeFileSync(join(source, "app.apk"), "apk");
  assert.notEqual(
    run(cwd, "collect-artifacts.mjs", ["android", "android-unsigned", source])
      .status,
    0,
  );
  writeFileSync(join(source, "app.aab"), "aab");
  assert.equal(
    run(cwd, "collect-artifacts.mjs", ["android", "android-unsigned", source])
      .status,
    0,
  );
  const dir = join(cwd, "artifacts/android-unsigned");
  assert.equal(readdirSync(dir).length, 3);
  assert.equal(
    readFileSync(join(dir, "SHA256SUMS.txt"), "utf8").trim().split("\n").length,
    2,
  );
});
test("archives simulator app permissions and excludes xcarchive contents", (t) => {
  const cwd = fixture(t);
  const source = join(cwd, "output");
  const app = join(source, "GitPulse.app");
  mkdirSync(app, { recursive: true });
  writeFileSync(join(app, "GitPulse"), "fixture", { mode: 0o755 });
  mkdirSync(join(source, "ignored.xcarchive", "Duplicate.app"), {
    recursive: true,
  });
  assert.equal(
    run(cwd, "collect-artifacts.mjs", ["simulator", "ios-simulator", source])
      .status,
    0,
  );
  const archive = join(
    cwd,
    "artifacts/ios-simulator/ios-simulator-GitPulse.app.tar.gz",
  );
  const restored = join(cwd, "restored");
  mkdirSync(restored);
  assert.equal(spawnSync("tar", ["-xzf", archive, "-C", restored]).status, 0);
  assert.equal(
    statSync(join(restored, "GitPulse.app/GitPulse")).mode & 0o777,
    0o755,
  );
  assert.equal(readdirSync(join(cwd, "artifacts/ios-simulator")).length, 2);
});
