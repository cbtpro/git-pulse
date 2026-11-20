import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const [kind, label, source] = process.argv.slice(2);
if (
  !["desktop", "android", "ios", "simulator"].includes(kind) ||
  !/^[a-z0-9-]+$/.test(label || "") ||
  !existsSync(source || "")
)
  throw new Error("Invalid artifact type, label or source directory.");
const destination = resolve("artifacts", label);
mkdirSync(destination, { recursive: true });
const accepted = {
  desktop: /\.(dmg|deb|rpm|AppImage|msi|exe)$/,
  android: /\.(apk|aab)$/,
  ios: /\.ipa$/,
  simulator: /$^/,
}[kind];
const collected = [];
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isSymbolicLink()) continue;
    if (item.isDirectory()) {
      if (item.name.endsWith(".xcarchive")) continue;
      if (item.name.endsWith(".app")) {
        if (kind === "desktop" || kind === "simulator") {
          const filename = `${label}-${item.name}.tar.gz`;
          if (collected.includes(filename))
            throw new Error(`Duplicate artifact: ${filename}`);
          execFileSync("tar", [
            "-czf",
            join(destination, filename),
            "-C",
            directory,
            item.name,
          ]);
          collected.push(filename);
        }
      } else walk(path);
    } else if (accepted.test(item.name)) {
      const filename = `${label}-${basename(path)}`;
      if (collected.includes(filename))
        throw new Error(`Duplicate artifact: ${filename}`);
      cpSync(path, join(destination, filename));
      collected.push(filename);
    }
  }
}
walk(source);
if (!collected.length)
  throw new Error(`No ${kind} packages found in ${source}`);
if (
  kind === "android" &&
  ![".apk", ".aab"].every((ext) => collected.some((file) => file.endsWith(ext)))
)
  throw new Error("Android build must produce both APK and AAB.");
writeFileSync(
  join(destination, "SHA256SUMS.txt"),
  collected
    .sort()
    .map(
      (file) =>
        `${createHash("sha256")
          .update(readFileSync(join(destination, file)))
          .digest("hex")}  ${file}`,
    )
    .join("\n") + "\n",
);
console.log(`Collected ${collected.length} packages in ${destination}`);
