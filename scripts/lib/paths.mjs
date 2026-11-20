import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const app = join(root, "packages/app");
export const requireApp = createRequire(join(app, "package.json"));
export const workspaceId = createHash("sha256")
  .update(realpathSync(app))
  .digest("hex")
  .slice(0, 20);
export const isMain = (url) =>
  process.argv[1] && url === pathToFileURL(resolve(process.argv[1])).href;
export function packageBin(name, command) {
  const path = requireApp.resolve(`${name}/package.json`);
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  return resolve(
    dirname(path),
    typeof pkg.bin === "string" ? pkg.bin : pkg.bin[command],
  );
}
