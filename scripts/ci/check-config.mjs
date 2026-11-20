import { readFileSync } from "node:fs";
const app = JSON.parse(readFileSync("packages/app/package.json", "utf8"));
const tauri = JSON.parse(
  readFileSync("packages/app/src-tauri/tauri.conf.json", "utf8"),
);
if (app.version !== tauri.version)
  throw new Error("App and Tauri versions must match before packaging.");
if (
  process.env.GITHUB_REF_TYPE === "tag" &&
  process.env.GITHUB_REF_NAME !== `v${app.version}`
) {
  throw new Error(`Release tag must match the app version: v${app.version}`);
}
if (!process.env.VITE_GITHUB_CLIENT_ID?.trim()) {
  console.log(
    "::warning::Set repository variable VITE_GITHUB_CLIENT_ID to enable browser authorization. Token login remains available.",
  );
}
