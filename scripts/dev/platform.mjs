import { prepareAndroidWidgets } from "../lib/widgets.mjs";
import { syncMobileIcons } from "../lib/icons.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, root, packageBin, isMain } from "../lib/paths.mjs";
import { run, probe } from "../lib/process.mjs";
import { androidConfiguration } from "../lib/android.mjs";
import { iosEnvironment, preferredIOSDeviceArgs } from "../lib/ios.mjs";
import { prepareLocalIOSProject } from "../lib/ios-project.mjs";
import {
  androidPlatformPackage,
  androidPlatformRequirements,
} from "../lib/android-sdk.mjs";
import {
  diagnose,
  report,
  hostPlatform,
  androidEnvironment,
} from "./doctor.mjs";

export function plan(
  mode,
  platform,
  extra = [],
  host = process.platform,
  arch = process.arch,
) {
  if (!["dev", "build", "init"].includes(mode))
    throw new Error("使用 dev、build 或 init");
  if (platform === "desktop") platform = hostPlatform(host);
  const args = extra.filter(
    (arg) => arg !== "--" && arg !== "--dry-run" && arg !== "--signed",
  );
  const has = (flag) =>
    args.some(
      (arg) =>
        arg === flag ||
        arg.startsWith(`${flag}=`) ||
        (flag === "--target" && arg === "-t") ||
        (flag === "--bundles" && arg === "-b"),
    );
  const signed = extra.includes("--signed") || has("--export-method");
  if (signed && has("--no-sign"))
    throw new Error("--signed/--export-method 不能和 --no-sign 同时使用");
  if (["macos", "windows", "linux"].includes(platform)) {
    if (mode === "init") throw new Error("桌面应用不需要初始化移动工程");
    const base = [mode];
    if (mode === "build") {
      if (!has("--target"))
        base.push(
          "--target",
          platform === "windows"
            ? "x86_64-pc-windows-msvc"
            : `${arch === "arm64" ? "aarch64" : "x86_64"}-${platform === "macos" ? "apple-darwin" : "unknown-linux-gnu"}`,
        );
      if (!has("--bundles"))
        base.push(
          "--bundles",
          { macos: "app,dmg", windows: "nsis,msi", linux: "deb,rpm,appimage" }[
            platform
          ],
        );
    }
    return {
      platform,
      args: [...base, ...args],
      env:
        platform === "macos" && mode === "build"
          ? {
              APPLE_SIGNING_IDENTITY: process.env.APPLE_SIGNING_IDENTITY || "-",
            }
          : {},
    };
  }
  if (platform === "ios" || platform === "ios:simulator") {
    const base = ["ios", mode];
    if (mode === "build") {
      if (!has("--target"))
        base.push(
          "--target",
          platform === "ios:simulator"
            ? arch === "arm64"
              ? "aarch64-sim"
              : "x86_64"
            : "aarch64",
        );
      const targets = [...base, ...args];
      const simulator =
        !targets.includes("aarch64") &&
        targets.some((arg) =>
          [
            "aarch64-sim",
            "x86_64",
            "--target=aarch64-sim",
            "--target=x86_64",
          ].includes(arg),
        );
      // Xcode's local simulator signature embeds App Group and Keychain entitlements.
      if (!simulator && !signed && !has("--no-sign")) base.push("--no-sign");
    }
    return { platform: "ios", args: [...base, ...args], env: {} };
  }
  if (platform === "android") {
    const base = ["android", mode];
    if (mode === "build") {
      if (!has("--apk") && !has("--aab")) base.push("--apk", "--aab");
      if (!has("--target"))
        base.push("--target", "aarch64", "armv7", "i686", "x86_64");
    }
    return { platform, args: [...base, ...args], env: {} };
  }
  throw new Error(
    "平台应为 desktop、macos、windows、linux、ios、ios:simulator 或 android",
  );
}
export function compatibleBootedIOSSimulator(devices, minimumVersion) {
  const minimum = minimumVersion.split(".").map(Number);
  return Object.entries(devices)
    .filter(([runtime]) => {
      const match = runtime.match(/\.iOS-(\d+)-(\d+)(?:-(\d+))?$/);
      if (!match) return false;
      const version = match.slice(1).map((part) => Number(part || 0));
      for (let index = 0; index < 3; index++) {
        const difference = version[index] - (minimum[index] || 0);
        if (difference) return difference > 0;
      }
      return true;
    })
    .flatMap(([, entries]) => entries)
    .find((device) => device.state === "Booted" && device.isAvailable);
}

function androidSigning(env) {
  const keys = [
    "ANDROID_KEYSTORE_PATH",
    "ANDROID_STORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD",
  ];
  const count = keys.filter((key) => Boolean(env[key])).length;
  if (count && count !== keys.length)
    throw new Error(
      "本地 Android 签名需要同时配置 ANDROID_KEYSTORE_PATH、ANDROID_STORE_PASSWORD、ANDROID_KEY_ALIAS、ANDROID_KEY_PASSWORD。",
    );
  if (count && !existsSync(env.ANDROID_KEYSTORE_PATH))
    throw new Error("ANDROID_KEYSTORE_PATH 指定的签名文件不存在。");
}
export async function execute(mode, platform, extra = []) {
  const command = plan(mode, platform, extra);
  let env = { ...process.env, ...command.env };
  if (command.platform === "ios") {
    const local = join(root, ".env.ios.local");
    env = iosEnvironment(
      env,
      existsSync(local) ? readFileSync(local, "utf8") : "",
    );
    if (mode === "dev")
      command.args = preferredIOSDeviceArgs(command.args, extra, env);
  }
  if (extra.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          cwd: app,
          command: "tauri",
          args: command.args,
          signing: extra.includes("--signed") ? "configured" : "local/default",
        },
        null,
        2,
      ),
    );
    return 0;
  }
  if (extra.some((arg) => arg === "--help" || arg === "-h"))
    return run(
      process.execPath,
      [packageBin("@tauri-apps/cli", "tauri"), ...command.args],
      { cwd: app },
    );
  const rows = diagnose(command.platform);
  report(command.platform, rows);
  const blocked = rows.filter((row) => !row.ok && !row.warning);
  if (blocked.length)
    throw new Error(
      "请先补齐上述环境，再运行相同命令。详见 docs/DEVELOPMENT.md。",
    );
  if (command.platform === "android") env = androidEnvironment(env);
  if (["ios", "android"].includes(command.platform))
    syncMobileIcons(command.platform);
  if (
    mode === "init" &&
    command.platform === "ios" &&
    existsSync(join(app, "src-tauri/gen/apple/project.yml"))
  ) {
    await prepareLocalIOSProject(command.args, env, mode);
    return 0;
  }
  if (command.platform === "android" && mode !== "init") {
    const path = join(app, "src-tauri/gen/android/app/build.gradle.kts");
    if (!existsSync(path))
      throw new Error(
        "先运行 pnpm init:android，再安装生成工程要求的 Android SDK。",
      );
    if (mode === "build") androidSigning(env);
    prepareAndroidWidgets(join(app, "src-tauri/gen/android"));
    writeFileSync(
      path,
      androidConfiguration(readFileSync(path, "utf8")).source,
    );
  }
  // Prefer a booted simulator only if its runtime meets the app's minimum OS.
  if (
    mode === "dev" &&
    command.platform === "ios" &&
    !env.GITPULSE_IOS_DEVICE &&
    extra.filter((arg) => arg !== "--").length === 0
  ) {
    const devices = probe("xcrun", [
      "simctl",
      "list",
      "devices",
      "booted",
      "--json",
    ]);
    if (devices.ok) {
      try {
        const config = JSON.parse(
          readFileSync(join(app, "src-tauri/tauri.conf.json"), "utf8"),
        );
        const booted = compatibleBootedIOSSimulator(
          JSON.parse(devices.text).devices,
          // XcodeGen is the source for the native deployment target.
          readFileSync(
            join(app, "src-tauri/gen/apple/project.yml"),
            "utf8",
          ).match(/^\s+iOS:\s*["']?(\d+(?:\.\d+){0,2})/m)?.[1] ||
            config.bundle?.iOS?.minimumSystemVersion ||
            "15.0",
        );
        if (booted) command.args.push(booted.name);
      } catch {
        /* Let Tauri prompt if simulator discovery fails. */
      }
    }
  }
  if (command.platform === "ios" && mode !== "init")
    await prepareLocalIOSProject(command.args, env, mode);
  const code = await run(
    process.execPath,
    [packageBin("@tauri-apps/cli", "tauri"), ...command.args],
    { cwd: app, env },
  );
  if (code) return code;
  if (mode === "init" && ["ios", "android"].includes(command.platform))
    syncMobileIcons(command.platform);
  if (mode === "init" && command.platform === "android") {
    prepareAndroidWidgets(join(app, "src-tauri/gen/android"));
    const path = join(app, "src-tauri/gen/android/app/build.gradle.kts");
    const config = androidConfiguration(readFileSync(path, "utf8"));
    writeFileSync(path, config.source);
    const platforms = androidPlatformRequirements(
      join(app, "src-tauri/gen/android"),
    )
      .map(({ api }) => `"${androidPlatformPackage(api)}"`)
      .join(" ");
    console.log(
      `Android 已初始化。安装主应用与依赖模块的 SDK：sdkmanager --sdk_root="${env.ANDROID_HOME}" ${platforms}，然后运行 pnpm run doctor android。`,
    );
  }
  if (mode === "build")
    console.log(
      `构建完成。产物目录：${command.platform === "ios" ? "packages/app/src-tauri/gen/apple/build" : command.platform === "android" ? "packages/app/src-tauri/gen/android/app/build/outputs" : "packages/app/src-tauri/target/<target>/release/bundle"}。`,
    );
  return 0;
}
if (isMain(import.meta.url))
  execute(process.argv[2], process.argv[3], process.argv.slice(4))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
