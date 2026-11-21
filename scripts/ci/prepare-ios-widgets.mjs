import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { app, isMain } from "../lib/paths.mjs";

export function validateWidgetProfile(
  profile,
  bundleID,
  team,
  group,
  now = new Date(),
) {
  const entitlements = profile.Entitlements || {};
  const prefix = profile.ApplicationIdentifierPrefix?.[0];
  if (
    !prefix ||
    entitlements["application-identifier"] !== `${prefix}.${bundleID}`
  )
    throw new Error(`描述文件不匹配 ${bundleID}`);
  if (!profile.TeamIdentifier?.includes(team))
    throw new Error("描述文件开发团队不匹配");
  if (!entitlements["com.apple.security.application-groups"]?.includes(group))
    throw new Error(`主应用和小组件描述文件都必须包含 ${group}`);
  if (
    !/^[A-Fa-f0-9-]{36}$/.test(profile.UUID || "") ||
    !(new Date(profile.ExpirationDate) > now)
  )
    throw new Error("描述文件已过期或 UUID 无效");
}

function command(binary, args, input) {
  const result = spawnSync(binary, args, { input, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${binary} 处理 iOS 签名配置失败`);
  return result.stdout;
}

export function prepareIOSWidgets(env = process.env) {
  const team = env.APPLE_DEVELOPMENT_TEAM;
  if (!team || !env.IOS_MOBILE_PROVISION || !env.IOS_WIDGET_MOBILE_PROVISION)
    throw new Error("iOS 签名需配置团队、主应用和小组件的两个描述文件");
  const apple = join(app, "src-tauri/gen/apple");
  const spec = readFileSync(join(apple, "project.yml"), "utf8");
  const group = spec.match(/^\s+GITPULSE_APP_GROUP:\s*(\S+)/m)?.[1];
  if (!group) throw new Error("project.yml 缺少 GITPULSE_APP_GROUP");
  const temporary = mkdtempSync(join(tmpdir(), "gitpulse-widget-profile-"));
  try {
    let widgetUUID;
    for (const [bundleID, value] of [
      ["com.chenbitao.gitpulse", env.IOS_MOBILE_PROVISION],
      ["com.chenbitao.gitpulse.widgets", env.IOS_WIDGET_MOBILE_PROVISION],
    ]) {
      const bytes = Buffer.from(value, "base64");
      const file = join(temporary, "profile.mobileprovision");
      writeFileSync(file, bytes, { mode: 0o600 });
      const xml = command("security", ["cms", "-D", "-i", file]);
      const profile = JSON.parse(
        command(
          "python3",
          [
            "-c",
            `import sys, plistlib, json
p = plistlib.loads(sys.stdin.buffer.read())
keys = ["UUID", "TeamIdentifier", "ApplicationIdentifierPrefix", "Entitlements"]
result = {key: p.get(key) for key in keys}
result["ExpirationDate"] = p["ExpirationDate"].isoformat() + "Z"
print(json.dumps(result))`,
          ],
          xml,
        ),
      );
      validateWidgetProfile(profile, bundleID, team, group);
      if (bundleID.endsWith(".widgets")) {
        widgetUUID = profile.UUID;
        for (const directory of ["MobileDevice", "Developer/Xcode/UserData"]) {
          const destination = join(
            homedir(),
            "Library",
            directory,
            "Provisioning Profiles",
          );
          mkdirSync(destination, { recursive: true });
          writeFileSync(
            join(destination, `${widgetUUID}.mobileprovision`),
            bytes,
            { mode: 0o600 },
          );
        }
      }
    }
    const override = join(apple, "widgets.signing.local.json");
    writeFileSync(
      override,
      JSON.stringify(
        {
          include: ["project.yml"],
          settings: { base: { DEVELOPMENT_TEAM: team } },
          targets: {
            GitPulseWidgetsExtension: {
              settings: {
                base: {
                  CODE_SIGN_STYLE: "Manual",
                  "PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]": widgetUUID,
                  "CODE_SIGN_IDENTITY[sdk=iphoneos*]":
                    env.IOS_EXPORT_METHOD === "debugging" ||
                    !env.IOS_EXPORT_METHOD
                      ? "Apple Development"
                      : "Apple Distribution",
                },
              },
            },
          },
        },
        null,
        2,
      ),
    );
    command("xcodegen", ["generate", "--spec", override]);
    command(
      "plutil",
      ["-convert", "xml1", "-o", join(apple, "ExportOptions.plist"), "-"],
      JSON.stringify({
        provisioningProfiles: { "com.chenbitao.gitpulse.widgets": widgetUUID },
      }),
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
if (isMain(import.meta.url)) {
  try {
    prepareIOSWidgets();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
