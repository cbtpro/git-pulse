import { spawn, spawnSync } from "node:child_process";
export function probe(command, args = [], env = process.env) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 12000,
    env,
    windowsHide: true,
  });
  return {
    ok: !result.error && result.status === 0,
    text: ((result.stdout || "") + (result.stderr || "")).trim(),
  };
}
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });
    const interrupt = () => child.kill("SIGINT"),
      terminate = () => child.kill("SIGTERM");
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", terminate);
    const cleanup = () => {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
    };
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      resolve(code ?? (signal === "SIGINT" ? 130 : 1));
    });
  });
}
