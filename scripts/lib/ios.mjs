import { parseEnv } from "node:util";

// Keep per-developer signing settings out of shared project configuration.
// Explicit shell/CI values take precedence over the local file.
export function iosEnvironment(env = process.env, localFile = "") {
  const local = parseEnv(localFile);
  const result = { ...env };
  for (const name of ["APPLE_DEVELOPMENT_TEAM", "GITPULSE_IOS_DEVICE", "GITPULSE_IOS_WIDGETS"]) {
    const value = env[name] ?? local[name];
    if (value?.trim()) result[name] = value.trim();
    else delete result[name];
  }
  if (
    result.APPLE_DEVELOPMENT_TEAM &&
    !/^[A-Z0-9]{10}$/.test(result.APPLE_DEVELOPMENT_TEAM)
  )
    throw new Error(
      "APPLE_DEVELOPMENT_TEAM 应为 Apple 开发团队的 10 位 Team ID，请检查 .env.ios.local 或终端环境变量。",
    );
  if (result.GITPULSE_IOS_WIDGETS && !["auto", "enabled", "disabled"].includes(result.GITPULSE_IOS_WIDGETS))
    throw new Error("GITPULSE_IOS_WIDGETS 应为 auto、enabled 或 disabled。");
  return result;
}

export function preferredIOSDeviceArgs(args, extra, env) {
  const explicit = extra.filter((arg) => arg !== "--" && arg !== "--dry-run");
  return explicit.length === 0 && env.GITPULSE_IOS_DEVICE
    ? [...args, env.GITPULSE_IOS_DEVICE]
    : args;
}
