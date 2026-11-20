import { rmSync } from "node:fs";
import { join } from "node:path";
import { root } from "../lib/paths.mjs";
// Only generated frontend outputs; keep credentials, source, dependencies and native SDKs.
for (const directory of ["packages/app/dist", "packages/core/dist", ".turbo"])
  rmSync(join(root, directory), { recursive: true, force: true });
console.log("已清理前端构建产物。");
