import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { app } from "./paths.mjs";
import { probe, run } from "./process.mjs";

export function iosSimulatorRequest(args, devices = {}) {
  if (args[1] === "build") {
    const targets = [];
    for (let i = 2; i < args.length; i++) {
      if (args[i].startsWith("--target=")) targets.push(args[i].slice(9));
      if (args[i] === "--target" || args[i] === "-t") {
        while (args[i + 1] && !args[i + 1].startsWith("-")) targets.push(args[++i]);
      }
    }
    return targets.length > 0 && targets.every((target) => ["aarch64-sim", "x86_64"].includes(target));
  }
  return Object.values(devices).flat().some((device) =>
    device.isAvailable && args.slice(2).some((arg) => arg === device.name || arg === device.udid),
  );
}

// Read only the configured team's membership flag; never log account details.
export function personalIOSTeam(team) {
  if (!team) return null;
  const result = spawnSync("python3", ["-c", `
import json, plistlib, sys
try:
    with open(sys.argv[1], "rb") as f: p = plistlib.load(f)
    teams = p.get("IDEProvisioningTeamByIdentifier", {})
    values = [t for v in teams.values() for t in (v if isinstance(v, list) else [v])]
    team = next((t for t in values if isinstance(t, dict) and t.get("teamID") == sys.argv[2]), {})
    print(json.dumps(team.get("isFreeProvisioningTeam")))
except (OSError, ValueError, TypeError):
    print("null")
`, join(homedir(), "Library/Preferences/com.apple.dt.Xcode.plist"), team], {
    encoding: "utf8", timeout: 5000,
  });
  try {
    const value = JSON.parse(result.stdout);
    return typeof value === "boolean" ? value : null;
  } catch { return null; }
}

export function iosWidgetsEnabled({ preference = "auto", simulator, unsigned = false, personalTeam }) {
  if (preference === "disabled") return false;
  if (preference === "enabled" && personalTeam === true && !simulator && !unsigned)
    throw new Error("Personal Team 无法签署小组件所需的 App Groups。请设 GITPULSE_IOS_WIDGETS=auto，或改用支持 App Groups 的付费团队。");
  return simulator || unsigned || personalTeam !== true;
}

export function localIOSProjectSpec(source, { team, widgets }) {
  const spec = structuredClone(source);
  spec.settings ??= {};
  spec.settings.base ??= {};
  if (team) {
    spec.settings.base.DEVELOPMENT_TEAM = team;
    for (const target of Object.values(spec.targets)) {
      target.settings ??= {};
      target.settings.base ??= {};
      target.settings.base.DEVELOPMENT_TEAM = team;
    }
  }
  if (!widgets) {
    delete spec.targets.GitPulseWidgetsExtension;
    const host = spec.targets.gitpulse_iOS;
    host.dependencies = host.dependencies.filter((dependency) => dependency.target !== "GitPulseWidgetsExtension");
    host.sources = host.sources.filter((source) =>
      !["../../widgets/ios/Host", "../../widgets/ios/Shared"].includes(typeof source === "string" ? source : source.path),
    );
    // No App Group entitlement or bridge in the Personal Team build. The native
    // status command reports unavailable, so the frontend never attempts a sync.
    host.entitlements = { path: "gitpulse_iOS/PersonalTeam.local.entitlements", properties: {} };
  }
  return spec;
}

export async function prepareLocalIOSProject(args, env, mode) {
  const apple = join(app, "src-tauri/gen/apple");
  const original = join(apple, "project.yml");
  if (!existsSync(original)) throw new Error("缺少 iOS project.yml，请先初始化 iOS 工程。");
  const devices = probe("xcrun", ["simctl", "list", "devices", "available", "--json"]);
  let simulator = mode === "init";
  if (!simulator) {
    let list = {};
    try { if (devices.ok) list = JSON.parse(devices.text).devices; } catch { /* device build */ }
    simulator = iosSimulatorRequest(args, list);
  }
  const personalTeam = personalIOSTeam(env.APPLE_DEVELOPMENT_TEAM);
  const widgets = iosWidgetsEnabled({ preference: env.GITPULSE_IOS_WIDGETS, simulator, unsigned: args.includes("--no-sign"), personalTeam });
  const dump = probe("xcodegen", ["dump", "--no-env", "--type", "json", "--spec", original], env);
  if (!dump.ok) throw new Error(`无法读取 iOS 工程配置：${dump.text}`);
  const spec = localIOSProjectSpec(JSON.parse(dump.text), { team: env.APPLE_DEVELOPMENT_TEAM, widgets });
  const local = join(apple, "project.local.json");
  for (const directory of ["assets", "Externals", "gitpulse_iOS"])
    mkdirSync(join(apple, directory), { recursive: true });
  if (!widgets) {
    writeFileSync(join(apple, "gitpulse_iOS/PersonalTeam.local.entitlements"),
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict/></plist>\n');
    // Xcode may retain an embedded extension after removing its copy phase.
    for (const arch of simulator ? ["arm64-sim", "x86_64"] : ["arm64"])
      rmSync(join(apple, "build", arch, "GitPulse.app/PlugIns/GitPulseWidgetsExtension.appex"), { recursive: true, force: true });
  }
  writeFileSync(local, JSON.stringify(spec, null, 2) + "\n");
  const result = await run("xcodegen", ["generate", "--spec", local], { cwd: apple, env });
  if (result) throw new Error("生成本机 iOS 签名配置失败。");
  console.log(widgets
    ? "iOS：保留贡献小组件，主应用与扩展使用同一开发团队。"
    : personalTeam ? "iOS：Personal Team 真机模式，仅构建主应用；模拟器仍支持贡献小组件。"
      : "iOS：当前构建已关闭贡献小组件。");
  return { widgets, simulator, personalTeam };
}
