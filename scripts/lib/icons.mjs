import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "./paths.mjs";

// Keep canonical assets outside gen/: Tauri init can replace generated projects.
export function syncMobileIcons(platform, nativeRoot = join(app, "src-tauri")) {
  const source = join(app, "src-tauri/icons", platform);
  if (platform === "ios") {
    const apple = join(nativeRoot, "gen/apple");
    if (!existsSync(apple)) return;
    if (!existsSync(join(source, "Contents.json")))
      throw new Error("缺少 iOS 图标，请先运行 pnpm icons:generate。");
    const catalog = join(apple, "Assets.xcassets/AppIcon.appiconset");
    rmSync(catalog, { recursive: true, force: true });
    cpSync(source, catalog, { recursive: true });
  } else if (platform === "android") {
    const main = join(nativeRoot, "gen/android/app/src/main");
    const manifest = join(main, "AndroidManifest.xml");
    if (!existsSync(manifest)) return;
    // Merge only icon resources; retain theme, strings and widget resources.
    cpSync(source, join(main, "res"), { recursive: true });
    const current = readFileSync(manifest, "utf8");
    const updated = current.replace(/<application\b([^>]*)>/, (_, attributes) => {
      const rest = attributes.replace(/\s+android:(?:icon|roundIcon)="[^"]*"/g, "");
      return `<application\n        android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher_round"${rest}>`;
    });
    if (updated !== current) writeFileSync(manifest, updated);
  } else throw new Error(`Unknown icon platform: ${platform}`);
}
