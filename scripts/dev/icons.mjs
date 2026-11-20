import sharp from "sharp";
import {
  cpSync, mkdirSync, mkdtempSync, readdirSync,
  rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app, root, packageBin } from "../lib/paths.mjs";
import { run } from "../lib/process.mjs";
import { syncMobileIcons } from "../lib/icons.mjs";

// The approved illustration is the only input. No redraw or recolouring.
const source = join(root, "design/brand/cat-mummy-standing-transparent-v1.png");
const background = "#e6e6e6";
const native = join(app, "src-tauri/icons");
const web = join(app, "public/icons");
const exports = join(root, "design/brand/exports");
const temporary = mkdtempSync(join(tmpdir(), "gitpulse-icons-"));
const png = { compressionLevel: 9 };

async function padded(size, artworkSize, transparent = false) {
  const artwork = await sharp(source).resize(artworkSize).ensureAlpha().png(png).toBuffer();
  return sharp({ create: {
    width: size, height: size, channels: 4,
    background: transparent ? "#00000000" : background,
  } }).composite([{ input: artwork, gravity: "centre" }]).png(png).toBuffer();
}
async function tauriIcons(input, output) {
  const code = await run(process.execPath, [
    packageBin("@tauri-apps/cli", "tauri"), "icon", input,
    "--output", output, "--ios-color", background,
  ], { cwd: app });
  if (code) throw new Error(`Icon generation failed (${code})`);
}

try {
  for (const dir of [native, web, exports]) mkdirSync(dir, { recursive: true });
  const master = join(temporary, "master.png");
  await sharp(source).resize(1024).ensureAlpha().png(png).toFile(master);
  const baseOutput = join(temporary, "base");
  // A temporary output keeps Tauri from writing directly into mobile projects.
  await tauriIcons(master, baseOutput);
  cpSync(baseOutput, native, { recursive: true });

  const catalog = { images: [], info: { version: 1, author: "xcode" } };
  for (const [idiom, sizes] of [
    ["iphone", [[20, 2], [20, 3], [29, 2], [29, 3], [40, 2], [40, 3], [60, 2], [60, 3]]],
    ["ipad", [[20, 1], [20, 2], [29, 1], [29, 2], [40, 1], [40, 2], [76, 1], [76, 2], [83.5, 2]]],
    ["ios-marketing", [[1024, 1]]],
  ]) {
    for (const [size, scale] of sizes) {
      const filename = `icon-${idiom}-${size}@${scale}x.png`;
      catalog.images.push({ idiom, size: `${size}x${size}`, scale: `${scale}x`, filename });
    }
  }
  // iOS requires opaque square images; the OS applies its own corner mask.
  rmSync(join(native, "ios"), { recursive: true, force: true });
  mkdirSync(join(native, "ios"), { recursive: true });
  for (const item of catalog.images) {
    const size = Number(item.size.split("x")[0]) * Number(item.scale.slice(0, -1));
    await sharp(master).resize(size).flatten({ background }).png(png).toFile(join(native, "ios", item.filename));
  }
  writeFileSync(join(native, "ios/Contents.json"), JSON.stringify(catalog, null, 2) + "\n");

  // Keep the cutout's alpha, including the tail opening and spaces between paws.
  // Desktop platforms need no baked-in tile or background.
  const desktop = join(temporary, "desktop.png");
  writeFileSync(desktop, await padded(1024, 896, true));
  const desktopOutput = join(temporary, "desktop");
  await tauriIcons(desktop, desktopOutput);
  for (const file of readdirSync(desktopOutput, { withFileTypes: true })) {
    if (file.isFile()) cpSync(join(desktopOutput, file.name), join(native, file.name));
  }

  // Adaptive icons use a 108dp layer, masked to ~72dp by the launcher.
  // 54% keeps the tail and all four paws inside the central safe area.
  const foreground = await padded(1080, 584, true);
  const legacy = await padded(1024, 768, true);
  for (const [density, size, layer] of [
    ["mdpi", 48, 108], ["hdpi", 72, 162], ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324], ["xxxhdpi", 192, 432],
  ]) {
    const directory = join(native, "android", `mipmap-${density}`);
    await sharp(foreground).resize(layer).png(png).toFile(join(directory, "ic_launcher_foreground.png"));
    for (const name of ["ic_launcher", "ic_launcher_round"]) {
      await sharp(legacy).resize(size).png(png).toFile(join(directory, `${name}.png`));
    }
  }
  // Keep Android's adaptive background opaque: launchers may render a transparent
  // background as black. The foreground and legacy PNGs still retain the cutout.
  cpSync(join(native, "android/mipmap-anydpi-v26/ic_launcher.xml"),
    join(native, "android/mipmap-anydpi-v26/ic_launcher_round.xml"));

  // Browser icons retain the entire illustration, with separate safe-area assets.
  for (const size of [16, 32, 48, 96, 192, 512]) {
    await sharp(master).resize(size).png(png).toFile(join(web, `icon-${size}.png`));
  }
  const webSafe = await padded(1024, 738);
  await sharp(webSafe).resize(512).removeAlpha().png(png).toFile(join(web, "icon-maskable-512.png"));
  await sharp(master).resize(180).flatten({ background }).png(png).toFile(join(web, "apple-touch-icon.png"));
  await sharp(master).resize(192).webp({ lossless: true }).toFile(join(web, "brand.webp"));
  cpSync(join(baseOutput, "icon.ico"), join(app, "public/favicon.ico"));
  writeFileSync(join(app, "public/site.webmanifest"), JSON.stringify({
    id: "./", name: "GitPulse", short_name: "GitPulse", start_url: "./",
    scope: "./", display: "standalone", background_color: background,
    theme_color: background,
    icons: [192, 512].map((size) => ({
      src: `icons/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any",
    })).concat([{ src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }]),
  }, null, 2) + "\n");

  for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
    await sharp(master).resize(size).png(png).toFile(join(exports, `gitpulse-${size}.png`));
  }
  await sharp(master).webp({ lossless: true }).toFile(join(exports, "gitpulse.webp"));
  cpSync(desktop, join(exports, "gitpulse-desktop.png"));
  for (const extension of ["ico", "icns"]) cpSync(join(native, `icon.${extension}`), join(exports, `gitpulse.${extension}`));
  for (const platform of ["ios", "android"]) syncMobileIcons(platform);
  console.log("GitPulse 图标已生成：Web、Windows、macOS、Linux、iOS、Android。通用格式位于 design/brand/exports。");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
