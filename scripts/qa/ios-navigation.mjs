import { mkdtempSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const simulator = process.argv.slice(2).find((arg) => arg !== "--");
if (
  process.platform !== "darwin" ||
  !/^[A-F0-9-]{36}$/i.test(simulator || "")
) {
  console.error(
    "请在 macOS 指定已安装 GitPulse 的 iPhone 15 Pro Max 模拟器 UDID：pnpm test:ios:navigation -- <UDID>。测试使用简体中文界面，不操作真实账号或签名。",
  );
  process.exit(1);
}
// Simulator stores keyboard connectivity per device. Fail before compiling a
// test runner rather than silently accepting only the keyboard accessory bar.
const preferences = spawnSync(
  "defaults",
  ["export", "com.apple.iphonesimulator", "-"],
  {
    encoding: "utf8",
  },
);
const converted = spawnSync("plutil", ["-convert", "json", "-o", "-", "-"], {
  input: preferences.stdout || "",
  encoding: "utf8",
});
let hardwareKeyboard;
try {
  const values = JSON.parse(converted.stdout);
  hardwareKeyboard =
    values.DevicePreferences?.[simulator.toUpperCase()]
      ?.ConnectHardwareKeyboard ?? values.ConnectHardwareKeyboard;
} catch {
  // A missing preference cannot prove that the software keyboard is enabled.
}
if (hardwareKeyboard !== false && hardwareKeyboard !== 0) {
  console.error(
    `模拟器 ${simulator} 尚未关闭硬件键盘连接。请选中该模拟器，在 Simulator → I/O → Keyboard 取消 Connect Hardware Keyboard，再重跑相同命令；测试需要完整软键盘，不接受仅 Done 附件栏。脚本不会修改模拟器偏好。`,
  );
  process.exit(1);
}
const scriptDir = dirname(fileURLToPath(import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "gitpulse-navigation-"));
cpSync(join(scriptDir, "ios-navigation"), directory, { recursive: true });
const artifacts = join(scriptDir, "../../review-artifacts/ios-navigation");
mkdirSync(artifacts, { recursive: true });
const result = join(artifacts, `${Date.now()}.xcresult`);
for (const [command, args] of [
  ["xcodegen", ["generate", "--spec", join(directory, "project.yml")]],
  [
    "xcodebuild",
    [
      "-project",
      join(directory, "GitPulseGestureQA.xcodeproj"),
      "-scheme",
      "GestureTests",
      "-destination",
      `platform=iOS Simulator,id=${simulator}`,
      "-derivedDataPath",
      join(directory, "build"),
      "-resultBundlePath",
      result,
      "test",
    ],
  ],
]) {
  const child = spawnSync(command, args, { cwd: directory, stdio: "inherit" });
  if (child.error || child.status !== 0) {
    console.error(child.error?.message || `测试未通过，诊断目录：${directory}`);
    process.exit(child.status || 1);
  }
}
console.log(`iOS 原生返回测试通过，报告与前后截图：${result}`);
