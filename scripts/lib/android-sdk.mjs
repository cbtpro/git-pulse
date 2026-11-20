import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Fallback before Tauri generates module paths (e.g. a clean CI checkout).
// Keep in sync with the Tauri/opener versions in Cargo.lock.
const libraryPlatforms = new Map([
  ["tauri-android", "36"],
  ["tauri-plugin-opener", "36"],
]);

export function androidPlatformRequirements(projectDirectory) {
  const modules = new Map(libraryPlatforms);
  const compileSdk = (directory) => {
    const source =
      readOptional(join(directory, "build.gradle.kts")) ||
      readOptional(join(directory, "build.gradle"));
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .match(
        /\bcompileSdk(?:Version)?\s*(?:=\s*|\(\s*)?["']?(\d+)(?![\d.])/,
      )?.[1];
  };
  const appSdk = compileSdk(join(projectDirectory, "app"));
  if (!appSdk) throw new Error("无法读取 app/build.gradle.kts 的 compileSdk");
  modules.set("app", appSdk);
  const settings = readOptional(
    join(projectDirectory, "tauri.settings.gradle"),
  );
  for (const match of settings.matchAll(
    /project\(['"]:([^'"]+)['"]\)\.projectDir\s*=\s*new File\(("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\)/g,
  )) {
    const literal = match[2];
    const directory = resolve(
      projectDirectory,
      literal.startsWith('"')
        ? JSON.parse(literal)
        : literal.slice(1, -1).replace(/\\(['\\])/g, "$1"),
    );
    const api = compileSdk(directory);
    if (!api)
      throw new Error(
        `无法读取 Android 模块 ${match[1]} 的 compileSdk：${directory}`,
      );
    modules.set(match[1], api);
  }
  const requirements = new Map();
  for (const [module, api] of modules) {
    if (!requirements.has(api)) requirements.set(api, { api, modules: [] });
    requirements.get(api).modules.push(module);
  }
  return [...requirements.values()].sort(
    (a, b) => Number(a.api) - Number(b.api),
  );
}

function apiVersion(value) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  return match
    ? { major: Number(match[1]), minor: Number(match[2] || 0) }
    : null;
}

// Android 17's base SDK package is named android-37.0, while Gradle still
// accepts compileSdk = 37. Older base platforms use integer package names.
export function androidPlatformPackage(api) {
  const version = apiVersion(api);
  if (!version) throw new Error(`Invalid Android API version: ${api}`);
  const { major, minor } = version;
  return `platforms;android-${major < 37 && minor === 0 ? major : `${major}.${minor}`}`;
}

function readOptional(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function findAndroidPlatform(sdkRoot, requestedApi) {
  const requested = apiVersion(requestedApi);
  if (!requested) return null;
  const platforms = join(sdkRoot, "platforms");
  let entries;
  try {
    entries = readdirSync(platforms, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const directory = join(platforms, entry.name);
    const properties = Object.fromEntries(
      readOptional(join(directory, "source.properties"))
        .split(/\r?\n/)
        .map((line) => /^\s*([^#!\s=]+)\s*=\s*(.*?)\s*$/.exec(line))
        .filter(Boolean)
        .map((match) => [match[1], match[2]]),
    );
    const xml = readOptional(join(directory, "package.xml"));
    const xmlValue = (name) =>
      new RegExp(`<(?:[\\w-]+:)?${name}>([^<]*)</(?:[\\w-]+:)?${name}>`)
        .exec(xml)?.[1]
        ?.trim();
    const api = properties["AndroidVersion.ApiLevel"] || xmlValue("api-level");
    const version = apiVersion(api);
    if (
      !version ||
      version.major !== requested.major ||
      version.minor !== requested.minor
    )
      continue;
    const codename =
      properties["AndroidVersion.CodeName"] ?? xmlValue("codename");
    if (codename && codename !== "REL") continue;
    if (
      (properties["AndroidVersion.IsBaseSdk"] ?? xmlValue("base-extension")) ===
      "false"
    )
      continue;
    // SDK Manager can leave package.xml after removal or interrupted downloads.
    // A directory or metadata file alone does not make a usable platform.
    try {
      if (statSync(join(directory, "android.jar")).isFile())
        return {
          directory,
          api,
          package:
            /<localPackage\b[^>]*\bpath="([^"]+)"/.exec(xml)?.[1] ||
            `platforms;${entry.name}`,
        };
    } catch {
      /* Try the next installed platform. */
    }
  }
  return null;
}
