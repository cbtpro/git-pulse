import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plan, compatibleBootedIOSSimulator } from "./platform.mjs";
import { inspectFrontend } from "./frontend.mjs";
import { diagnose } from "./doctor.mjs";
import { androidConfiguration } from "../lib/android.mjs";
import { iosEnvironment, preferredIOSDeviceArgs } from "../lib/ios.mjs";
import {
  androidPlatformPackage,
  androidPlatformRequirements,
  findAndroidPlatform,
} from "../lib/android-sdk.mjs";
import { app, root, packageBin } from "../lib/paths.mjs";

test("iOS local signing preserves shell overrides and loads only supported settings", () => {
  const file =
    'APPLE_DEVELOPMENT_TEAM=ABCDE12345\nGITPULSE_IOS_DEVICE="Test iPhone"\nUNRELATED_SECRET=ignored\n';
  const local = iosEnvironment({ KEEP_EXISTING: "yes" }, file);
  assert.equal(local.APPLE_DEVELOPMENT_TEAM, "ABCDE12345");
  assert.equal(local.GITPULSE_IOS_DEVICE, "Test iPhone");
  assert.equal(local.KEEP_EXISTING, "yes");
  assert.equal(local.UNRELATED_SECRET, undefined);
  assert.equal(
    iosEnvironment({ APPLE_DEVELOPMENT_TEAM: "OTHER12345" }, file)
      .APPLE_DEVELOPMENT_TEAM,
    "OTHER12345",
  );
  assert.equal(
    iosEnvironment({ APPLE_DEVELOPMENT_TEAM: "" }, file).APPLE_DEVELOPMENT_TEAM,
    undefined,
  );
  assert.equal(
    iosEnvironment({}, "APPLE_DEVELOPMENT_TEAM=\n").APPLE_DEVELOPMENT_TEAM,
    undefined,
  );
  assert.throws(
    () => iosEnvironment({}, "APPLE_DEVELOPMENT_TEAM=not-a-team"),
    /10 位 Team ID/,
  );
});

test("iOS local device preference keeps default development on the phone and respects explicit choices", () => {
  const env = { GITPULSE_IOS_DEVICE: "Test iPhone" };
  assert.deepEqual(preferredIOSDeviceArgs(["ios", "dev"], [], env), [
    "ios",
    "dev",
    "Test iPhone",
  ]);
  assert.deepEqual(preferredIOSDeviceArgs(["ios", "dev"], ["--dry-run"], env), [
    "ios",
    "dev",
    "Test iPhone",
  ]);
  const selected = ["ios", "dev", "iPhone 17 Pro Max"];
  assert.deepEqual(
    preferredIOSDeviceArgs(selected, ["iPhone 17 Pro Max"], env),
    selected,
  );
  assert.deepEqual(
    preferredIOSDeviceArgs(["ios", "dev", "--open"], ["--open"], env),
    ["ios", "dev", "--open"],
  );
});

test("iOS auto-selection respects the minimum patch version and excludes other runtimes", () => {
  const booted = (name) => [{ name, state: "Booted", isAvailable: true }];
  const devices = {
    "com.apple.CoreSimulator.SimRuntime.iOS-17-4": booted("old"),
    "com.apple.CoreSimulator.SimRuntime.iOS-18-7": booted("before-patch"),
    "com.apple.CoreSimulator.SimRuntime.iOS-18-7-7": booted("previous-patch"),
    "com.apple.CoreSimulator.SimRuntime.tvOS-26-0": booted("TV"),
  };
  assert.equal(compatibleBootedIOSSimulator(devices, "18.7.8"), undefined);
  assert.equal(
    compatibleBootedIOSSimulator(
      {
        ...devices,
        "com.apple.CoreSimulator.SimRuntime.iOS-18-7-8": booted("minimum"),
      },
      "18.7.8",
    )?.name,
    "minimum",
  );
  assert.equal(
    compatibleBootedIOSSimulator(
      {
        ...devices,
        "com.apple.CoreSimulator.SimRuntime.iOS-26-0": booted("current"),
      },
      "18.7.8",
    )?.name,
    "current",
  );
});

test("desktop plans match CI architectures, bundles and valid Tauri commands", () => {
  for (const [platform, host, arch, target, bundles] of [
    ["macos", "darwin", "arm64", "aarch64-apple-darwin", "app,dmg"],
    ["macos", "darwin", "x64", "x86_64-apple-darwin", "app,dmg"],
    ["windows", "win32", "x64", "x86_64-pc-windows-msvc", "nsis,msi"],
    [
      "linux",
      "linux",
      "arm64",
      "aarch64-unknown-linux-gnu",
      "deb,rpm,appimage",
    ],
    ["linux", "linux", "x64", "x86_64-unknown-linux-gnu", "deb,rpm,appimage"],
  ]) {
    assert.deepEqual(plan("build", platform, [], host, arch).args, [
      "build",
      "--target",
      target,
      "--bundles",
      bundles,
    ]);
    assert.deepEqual(plan("dev", platform, [], host, arch).args, ["dev"]);
  }
  assert.deepEqual(
    plan(
      "build",
      "macos",
      ["--target", "x86_64-apple-darwin", "--bundles", "app"],
      "darwin",
      "arm64",
    ).args,
    ["build", "--target", "x86_64-apple-darwin", "--bundles", "app"],
  );
});
test("mobile plans distinguish simulator, unsigned device and explicit signing", () => {
  assert.deepEqual(plan("build", "ios:simulator", [], "darwin", "arm64").args, [
    "ios",
    "build",
    "--target",
    "aarch64-sim",
    "--no-sign",
  ]);
  assert.deepEqual(plan("build", "ios:simulator", [], "darwin", "x64").args, [
    "ios",
    "build",
    "--target",
    "x86_64",
    "--no-sign",
  ]);
  assert(
    !plan(
      "build",
      "ios",
      ["--signed", "--export-method", "debugging"],
      "darwin",
    ).args.includes("--no-sign"),
  );
  assert.deepEqual(plan("build", "android", []).args, [
    "android",
    "build",
    "--apk",
    "--aab",
    "--target",
    "aarch64",
    "armv7",
    "i686",
    "x86_64",
  ]);
  assert.deepEqual(
    plan("build", "android", ["--apk", "--target", "aarch64"]).args,
    ["android", "build", "--apk", "--target", "aarch64"],
  );
});
test("doctor detects an unsupported host before suggesting local native builds", () => {
  const rows = diagnose("ios", {
    host: "linux",
    run: () => ({ ok: true, text: "" }),
    exists: () => true,
    env: {},
  });
  assert(rows.some((row) => row.name === "主机平台" && !row.ok));
});
test("only reuses the GitPulse frontend from the same workspace", async (t) => {
  let data = { name: "gitpulse", workspace: "matching" };
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(data));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await inspectFrontend(url, "matching"), true);
  data = { name: "gitpulse", workspace: "different" };
  assert.equal(await inspectFrontend(url, "matching"), false);
  data = { name: "other", workspace: "matching" };
  assert.equal(await inspectFrontend(url, "matching"), false);
});
test("Android local and CI configuration stay identical and preserve generated settings", () => {
  const source = "android { compileSdk = 37 }\n// keep custom source\n";
  const first = androidConfiguration(source);
  assert.equal(first.sdk, "37");
  assert(first.source.includes("// keep custom source"));
  assert(first.source.includes("27.2.12479018"));
  assert(first.source.includes("36.0.0"));
  assert(
    first.source.includes(
      'apply(from = file("../../../android/rustls.gradle.kts"))',
    ),
  );
  assert.equal(androidConfiguration(first.source).source, first.source);
  const custom = first.source + '\ntasks.register("customTask") {}\n';
  assert.equal(androidConfiguration(custom).source, custom);
});
test("package entrypoints resolve and every platform has root and package aliases", () => {
  assert(packageBin("vite", "vite").endsWith("vite.js"));
  assert(packageBin("@tauri-apps/cli", "tauri").endsWith("tauri.js"));
  const rootScripts = JSON.parse(readFileSync(`${root}/package.json`)).scripts;
  const appScripts = JSON.parse(readFileSync(`${app}/package.json`)).scripts;
  for (const platform of ["macos", "windows", "linux", "ios", "android"]) {
    assert(rootScripts[`dev:${platform}`]);
    assert(rootScripts[`build:${platform}`]);
    assert(appScripts[`tauri:${platform}`]);
    assert(appScripts[`tauri:${platform}:build`]);
  }
});

function sdkFixture(t) {
  const sdk = mkdtempSync(join(tmpdir(), "gitpulse-sdk-"));
  t.after(() => rmSync(sdk, { recursive: true, force: true }));
  const platform = (name, properties, jar = true) => {
    const directory = join(sdk, "platforms", name);
    mkdirSync(directory, { recursive: true });
    if (properties !== null)
      writeFileSync(join(directory, "source.properties"), properties);
    if (jar) writeFileSync(join(directory, "android.jar"), "fixture");
    return directory;
  };
  return { sdk, platform };
}

test("recognizes installed API 37.0 for compileSdk 37 and retains legacy platform support", (t) => {
  const { sdk, platform } = sdkFixture(t);
  const current = platform(
    "android-37.0",
    "AndroidVersion.ApiLevel=37.0\r\nAndroidVersion.CodeName=\r\nAndroidVersion.IsBaseSdk=true\r\n",
  );
  const legacy = platform("android-35", "AndroidVersion.ApiLevel=35\n");
  assert.equal(findAndroidPlatform(sdk, "37").directory, current);
  assert.equal(findAndroidPlatform(sdk, "37.0").directory, current);
  assert.equal(findAndroidPlatform(sdk, "35").directory, legacy);
  assert.equal(findAndroidPlatform(sdk, "36"), null);
});

test("rejects incomplete installations, different minor releases and preview or extension platforms", (t) => {
  const { sdk, platform } = sdkFixture(t);
  platform("android-37", "AndroidVersion.ApiLevel=37\n", false);
  platform("android-37.1", "AndroidVersion.ApiLevel=37.1\n");
  platform("android-370", "AndroidVersion.ApiLevel=370\n");
  platform(
    "android-preview",
    "AndroidVersion.ApiLevel=37\nAndroidVersion.CodeName=Preview\n",
  );
  platform(
    "android-37-ext",
    "AndroidVersion.ApiLevel=37\nAndroidVersion.IsBaseSdk=false\n",
  );
  assert.equal(findAndroidPlatform(sdk, "37"), null);
  const partial = platform("android-37.0", null, false);
  writeFileSync(
    join(partial, "package.xml"),
    '<repository><localPackage path="platforms;android-37.0"><api-level>37.0</api-level></localPackage></repository>',
  );
  assert.equal(findAndroidPlatform(sdk, "37"), null);
  writeFileSync(join(partial, "android.jar"), "fixture");
  assert.equal(findAndroidPlatform(sdk, "37").directory, partial);
});

test("does not trust a directory name instead of the SDK's metadata", (t) => {
  const { sdk, platform } = sdkFixture(t);
  platform("android-37", "AndroidVersion.ApiLevel=36\n");
  platform("android-37.0", null);
  assert.equal(findAndroidPlatform(sdk, "37"), null);
  assert.equal(findAndroidPlatform(join(sdk, "missing"), "37"), null);
});

test("uses the matching SDK package ID in local install instructions and CI", () => {
  assert.equal(androidPlatformPackage("37"), "platforms;android-37.0");
  assert.equal(androidPlatformPackage("37.0"), "platforms;android-37.0");
  assert.equal(androidPlatformPackage("36"), "platforms;android-36");
  assert.equal(androidPlatformPackage("36.1"), "platforms;android-36.1");
  assert.throws(() => androidPlatformPackage("preview"), /Invalid Android API/);
});

test("checks app and Tauri library SDKs before generated module paths are available", (t) => {
  const { sdk: project } = sdkFixture(t);
  mkdirSync(join(project, "app"));
  writeFileSync(
    join(project, "app/build.gradle.kts"),
    "android { compileSdk = 37 }",
  );
  assert.deepEqual(androidPlatformRequirements(project), [
    { api: "36", modules: ["tauri-android", "tauri-plugin-opener"] },
    { api: "37", modules: ["app"] },
  ]);
});

test("reads each generated library module and detects extra plugin SDK requirements", (t) => {
  const { sdk: project } = sdkFixture(t);
  mkdirSync(join(project, "app"));
  writeFileSync(
    join(project, "app/build.gradle.kts"),
    "// compileSdk = 32\nandroid { compileSdk = 37 }",
  );
  const modules = [
    ["tauri-android", "37"],
    ["tauri-plugin-opener", "36"],
    ["extra-plugin", "35"],
  ];
  const lines = [];
  for (const [name, api] of modules) {
    const directory = join(project, "dependencies with spaces", name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "build.gradle"),
      `android { compileSdkVersion ${api} }`,
    );
    lines.push(
      `project(':${name}').projectDir = new File(${JSON.stringify(directory)})`,
    );
  }
  writeFileSync(join(project, "tauri.settings.gradle"), lines.join("\n"));
  assert.deepEqual(androidPlatformRequirements(project), [
    { api: "35", modules: ["extra-plugin"] },
    { api: "36", modules: ["tauri-plugin-opener"] },
    { api: "37", modules: ["tauri-android", "app"] },
  ]);
  rmSync(join(project, "dependencies with spaces/extra-plugin/build.gradle"));
  assert.throws(() => androidPlatformRequirements(project), /extra-plugin/);
});
