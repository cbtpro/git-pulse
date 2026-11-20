import { existsSync } from "node:fs";
import { join, delimiter } from "node:path";
import { homedir } from "node:os";
import { app, root, isMain } from "../lib/paths.mjs";
import { probe } from "../lib/process.mjs";
import { NDK_VERSION, BUILD_TOOLS } from "../lib/android.mjs";
import {
  androidPlatformPackage,
  androidPlatformRequirements,
  findAndroidPlatform,
} from "../lib/android-sdk.mjs";
export const hostPlatform = (host) =>
  ({ darwin: "macos", win32: "windows", linux: "linux" })[host];
export function androidEnvironment(env = process.env, host = process.platform) {
  const sdk =
    env.ANDROID_HOME ||
    env.ANDROID_SDK_ROOT ||
    (host === "darwin"
      ? join(homedir(), "Library/Android/sdk")
      : host === "win32"
        ? join(
            env.LOCALAPPDATA || join(homedir(), "AppData/Local"),
            "Android/Sdk",
          )
        : join(homedir(), "Android/Sdk"));
  const ndk = env.NDK_HOME || join(sdk, "ndk", env.NDK_VERSION || NDK_VERSION);
  return {
    ...env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    NDK_HOME: ndk,
    NDK_VERSION: env.NDK_VERSION || NDK_VERSION,
    PATH: [
      env.JAVA_HOME ? join(env.JAVA_HOME, "bin") : "",
      join(sdk, "platform-tools"),
      join(sdk, "cmdline-tools/latest/bin"),
      env.PATH,
    ]
      .filter(Boolean)
      .join(delimiter),
  };
}
export function diagnose(
  platform = "desktop",
  {
    host = process.platform,
    arch = process.arch,
    env = process.env,
    run = probe,
    exists = existsSync,
  } = {},
) {
  if (platform === "desktop") platform = hostPlatform(host);
  const rows = [];
  const add = (name, ok, help = "", warning = false) =>
    rows.push({ name, ok, help, warning });
  const tool = (name, command, args, help, customEnv = env) => {
    const result = run(command, args, customEnv);
    add(name, result.ok, result.ok ? result.text.split("\n")[0] : help);
    return result;
  };
  add(
    "Node.js",
    Number(process.versions.node.split(".")[0]) >= 20,
    `当前 ${process.versions.node}；CI 使用 Node.js 22`,
  );
  const pnpmVersion = env.npm_config_user_agent?.match(/pnpm\/([^ ]+)/)?.[1];
  add(
    "pnpm",
    !pnpmVersion || Number(pnpmVersion.split(".")[0]) === 10,
    pnpmVersion
      ? `当前 ${pnpmVersion}；项目锁定 10.34.9`
      : "请通过 pnpm run doctor 运行；推荐 pnpm 10.34.9",
    !pnpmVersion,
  );
  add(
    "项目依赖",
    exists(join(root, "node_modules/.pnpm")),
    "pnpm install --frozen-lockfile",
  );
  if (platform === "web") return rows;
  const expected = {
    ios: "darwin",
    macos: "darwin",
    windows: "win32",
    linux: "linux",
  }[platform];
  if (expected && host !== expected) {
    add(
      "主机平台",
      false,
      `${platform} 需要 ${expected} 主机；其他平台可使用 GitHub Actions`,
    );
    return rows;
  }
  if (!["macos", "windows", "linux", "ios", "android"].includes(platform)) {
    add(
      "平台",
      false,
      "使用 web、desktop、macos、windows、linux、ios 或 android",
    );
    return rows;
  }
  tool(
    "Rust",
    "rustc",
    ["--version"],
    "安装 rustup stable（Rust 2024 edition）",
  );
  tool("Cargo", "cargo", ["--version"], "安装 Rust 工具链");
  const rust = run("rustup", ["target", "list", "--installed"], env);
  const target =
    platform === "macos"
      ? `${arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`
      : platform === "windows"
        ? "x86_64-pc-windows-msvc"
        : platform === "linux"
          ? `${arch === "arm64" ? "aarch64" : "x86_64"}-unknown-linux-gnu`
          : null;
  if (target)
    add(
      "Rust 目标",
      rust.ok && rust.text.split(/\s+/).includes(target),
      `rustup target add ${target}`,
    );
  if (platform === "macos" || platform === "ios")
    tool(
      "Xcode",
      "xcodebuild",
      ["-version"],
      "安装完整 Xcode，并用 xcode-select 选择其 Developer 目录",
    );
  if (platform === "ios") {
    tool("XcodeGen", "xcodegen", ["--version"], "brew install xcodegen");
    tool(
      "iOS 模拟器工具",
      "xcrun",
      ["--find", "simctl"],
      "在 Xcode 设置中安装 iOS Simulator runtime",
    );
    const targets = [
      "aarch64-apple-ios",
      `${arch === "arm64" ? "aarch64" : "x86_64"}-apple-ios-sim`,
    ];
    // Intel uses the x86_64-apple-ios Rust target, while Tauri names it x86_64.
    if (arch !== "arm64") targets[1] = "x86_64-apple-ios";
    add(
      "iOS Rust 目标",
      rust.ok &&
        targets.every((target) => rust.text.split(/\s+/).includes(target)),
      `rustup target add ${targets.join(" ")}`,
    );
    add(
      "iOS 工程",
      exists(join(app, "src-tauri/gen/apple/project.yml")),
      "pnpm init:ios",
      true,
    );
  }
  if (platform === "windows") {
    tool("NASM", "nasm", ["-v"], "安装 NASM 并加入 PATH（与 Actions 相同）");
    const vswhere = join(
      env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
      "Microsoft Visual Studio/Installer/vswhere.exe",
    );
    const msvc = exists(vswhere)
      ? run(
          vswhere,
          [
            "-latest",
            "-products",
            "*",
            "-requires",
            "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
            "-property",
            "installationPath",
          ],
          env,
        )
      : { ok: false, text: "" };
    add(
      "MSVC C++ 工具链",
      msvc.ok && Boolean(msvc.text),
      "安装 Visual Studio Build Tools：Desktop development with C++、Windows SDK",
    );
    const webview = run(
      "reg",
      [
        "query",
        "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients",
        "/s",
        "/f",
        "Microsoft Edge WebView2 Runtime",
      ],
      env,
    );
    add(
      "WebView2 Runtime",
      webview.ok,
      "未在机器级注册表发现；若已按用户安装可继续，否则安装 WebView2 Evergreen Runtime",
      true,
    );
  }
  if (platform === "linux")
    tool(
      "Linux 系统库",
      "pkg-config",
      [
        "--exists",
        "webkit2gtk-4.1",
        "ayatana-appindicator3-0.1",
        "dbus-1",
        "openssl",
      ],
      "按 docs/LINUX_DEVELOPMENT.md 安装 WebKitGTK、Ayatana、DBus、OpenSSL 开发包",
    );
  if (platform === "android") {
    const android = androidEnvironment(env, host);
    const java = tool(
      "Java 21",
      "java",
      ["-version"],
      "安装 JDK 21 并设置 JAVA_HOME",
      android,
    );
    const major = Number(/version "(\d+)/.exec(java.text)?.[1]);
    if (java.ok)
      add(
        "JDK 版本",
        major === 21,
        `当前 ${major || "未知"}；使用 JDK 21 与 CI 对齐`,
      );
    add(
      "Android SDK",
      exists(android.ANDROID_HOME),
      `当前 SDK 路径：${android.ANDROID_HOME}`,
    );
    add(
      "Android NDK",
      exists(join(android.NDK_HOME, "source.properties")),
      `sdkmanager "ndk;${android.NDK_VERSION}"`,
    );
    add(
      "Android Build Tools",
      exists(join(android.ANDROID_HOME, "build-tools", BUILD_TOOLS)),
      `sdkmanager "build-tools;${BUILD_TOOLS}"`,
    );
    const adb = join(
      android.ANDROID_HOME,
      "platform-tools",
      host === "win32" ? "adb.exe" : "adb",
    );
    tool("ADB", adb, ["version"], 'sdkmanager "platform-tools"', android);
    const gradle = join(app, "src-tauri/gen/android/app/build.gradle.kts");
    if (exists(gradle)) {
      const sdkmanager = join(
        android.ANDROID_HOME,
        "cmdline-tools/latest/bin",
        host === "win32" ? "sdkmanager.bat" : "sdkmanager",
      );
      try {
        for (const { api, modules } of androidPlatformRequirements(
          join(app, "src-tauri/gen/android"),
        )) {
          const installed = findAndroidPlatform(android.ANDROID_HOME, api);
          add(
            `Android compileSdk ${api} (${modules.join(", ")})`,
            Boolean(installed),
            installed
              ? `API ${installed.api}：${installed.directory}`
              : `未在 ${android.ANDROID_HOME} 找到完整的 API ${api}；安装："${sdkmanager}" --sdk_root="${android.ANDROID_HOME}" "${androidPlatformPackage(api)}"`,
          );
        }
      } catch (error) {
        add("Android 模块 SDK", false, error.message);
      }
    } else
      add(
        "Android 工程",
        false,
        "pnpm init:android；生成后按 compileSdk 安装匹配的平台 SDK",
        true,
      );
    const targets = [
      "aarch64-linux-android",
      "armv7-linux-androideabi",
      "i686-linux-android",
      "x86_64-linux-android",
    ];
    add(
      "Android Rust 目标",
      rust.ok &&
        targets.every((target) => rust.text.split(/\s+/).includes(target)),
      `rustup target add ${targets.join(" ")}`,
    );
  }
  return rows;
}
export function report(platform, rows) {
  console.log(`\n${platform} 环境检查`);
  for (const row of rows)
    console.log(
      `[${row.ok ? "OK" : row.warning ? "提示" : "缺少"}] ${row.name}${row.help ? `: ${row.help}` : ""}`,
    );
}
if (isMain(import.meta.url)) {
  const requested =
    process.argv.slice(2).filter((arg) => arg !== "--")[0] || "desktop";
  const platforms =
    requested === "all"
      ? [
          "web",
          hostPlatform(process.platform),
          ...(process.platform === "darwin" ? ["ios"] : []),
          "android",
        ]
      : [requested];
  let failed = false;
  for (const platform of platforms) {
    const rows = diagnose(platform);
    report(platform, rows);
    failed ||= rows.some((row) => !row.ok && !row.warning);
  }
  process.exitCode = failed ? 1 : 0;
}
