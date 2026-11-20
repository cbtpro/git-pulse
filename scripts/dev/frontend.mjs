import { createServer } from "node:net";
import { app, workspaceId, packageBin, isMain } from "../lib/paths.mjs";
import { run } from "../lib/process.mjs";
export const port = 1420;
export async function inspectFrontend(
  base = "http://127.0.0.1:1420",
  expected = workspaceId,
) {
  try {
    const response = await fetch(`${base}/__gitpulse_dev__`, {
      signal: AbortSignal.timeout(1500),
    });
    const data = await response.json();
    return (
      response.ok && data.name === "gitpulse" && data.workspace === expected
    );
  } catch {
    return false;
  }
}
async function available() {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
export async function frontend(args = []) {
  const host = process.env.TAURI_DEV_HOST;
  const base = host
    ? `http://${host.includes(":") ? `[${host}]` : host}:${port}`
    : `http://127.0.0.1:${port}`;
  if (await inspectFrontend()) {
    if (host && !(await inspectFrontend(base)))
      throw new Error(
        `当前 GitPulse 前端无法通过 ${base} 访问。请在原终端停止前端，再运行 pnpm dev:web；不要关闭其他服务。`,
      );
    console.log(`复用此工作区的 GitPulse 前端：${base}`);
    return 0;
  }
  if (!(await available()))
    throw new Error(
      "端口 1420 已被其他服务或旧版前端占用。请检查原终端；确认属于 GitPulse 后重新运行 pnpm dev:web。脚本不会结束已有进程。",
    );
  const code = await run(
    process.execPath,
    [packageBin("vite", "vite"), ...args],
    { cwd: app },
  );
  // If two native launches raced, reuse the matching workspace that won the port.
  return code && code !== 130 && (await inspectFrontend()) ? 0 : code;
}
if (isMain(import.meta.url))
  frontend(process.argv.slice(2).filter((arg) => arg !== "--"))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
