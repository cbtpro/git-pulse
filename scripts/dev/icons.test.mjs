import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { app, root } from "../lib/paths.mjs";
import { syncMobileIcons } from "../lib/icons.mjs";

test("mobile icon restore is repeatable and preserves widget resources and application settings", (t) => {
  const root = mkdtempSync(join(tmpdir(), "gitpulse-icon-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const main = join(root, "gen/android/app/src/main");
  mkdirSync(join(main, "res/values"), { recursive: true });
  writeFileSync(join(main, "res/values/widget.xml"), "keep-widget");
  const manifest = join(main, "AndroidManifest.xml");
  writeFileSync(manifest, '<manifest><application android:icon="@mipmap/default" android:roundIcon="@mipmap/old" android:theme="@style/App"><receiver android:name="Widget"/></application></manifest>');
  const apple = join(root, "gen/apple/Assets.xcassets");
  mkdirSync(join(apple, "AppIcon.appiconset"), { recursive: true });
  writeFileSync(join(apple, "AppIcon.appiconset/old.png"), "old");
  writeFileSync(join(apple, "Contents.json"), "keep-catalog");
  for (const platform of ["ios", "android"]) syncMobileIcons(platform, root);
  const first = readFileSync(manifest, "utf8");
  syncMobileIcons("android", root);
  assert.equal(readFileSync(manifest, "utf8"), first);
  assert.match(first, /android:roundIcon="@mipmap\/ic_launcher_round"/);
  assert.match(first, /android:theme="@style\/App"/);
  assert.match(first, /<receiver android:name="Widget"/);
  assert.equal(readFileSync(join(main, "res/values/widget.xml"), "utf8"), "keep-widget");
  assert.equal(readFileSync(join(apple, "Contents.json"), "utf8"), "keep-catalog");
  assert(!existsSync(join(apple, "AppIcon.appiconset/old.png")));
  for (const name of ["ic_launcher", "ic_launcher_round"])
    assert(existsSync(join(main, `res/mipmap-anydpi-v26/${name}.xml`)));
});

test("shipped iOS, Android, desktop and web icon assets satisfy their format contracts", async () => {
  const native = join(app, "src-tauri/icons");
  const catalog = JSON.parse(readFileSync(join(native, "ios/Contents.json"), "utf8"));
  for (const item of catalog.images) {
    const size = Number(item.size.split("x")[0]) * Number(item.scale.slice(0, -1));
    const metadata = await sharp(join(native, "ios", item.filename)).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    assert.equal(metadata.hasAlpha, false, "iOS icons must be opaque");
  }
  const ico = readFileSync(join(native, "icon.ico"));
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = new Set(Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + 16 * i] || 256));
  for (const size of [16, 24, 32, 48, 64, 256]) assert(sizes.has(size));
  assert.equal(readFileSync(join(native, "icon.icns")).subarray(0, 4).toString(), "icns");
  for (const filename of ["32x32.png", "128x128.png", "128x128@2x.png"])
    assert.equal((await sharp(join(native, filename)).metadata()).channels, 4);
  for (const [density, launcher, foreground] of [["mdpi", 48, 108], ["hdpi", 72, 162], ["xhdpi", 96, 216], ["xxhdpi", 144, 324], ["xxxhdpi", 192, 432]]) {
    for (const [name, size] of [["ic_launcher", launcher], ["ic_launcher_round", launcher], ["ic_launcher_foreground", foreground]]) {
      const info = await sharp(join(native, `android/mipmap-${density}/${name}.png`)).metadata();
      assert.equal(info.width, size);
      assert.equal(info.height, size);
    }
  }
  const manifest = JSON.parse(readFileSync(join(app, "public/site.webmanifest"), "utf8"));
  assert(manifest.icons.some((icon) => icon.purpose === "maskable"));
  for (const icon of manifest.icons) {
    const info = await sharp(join(app, "public", icon.src)).metadata();
    assert.equal(`${info.width}x${info.height}`, icon.sizes);
  }
  // A transparent border alone is insufficient: the actual silhouette must be cut out.
  for (const filename of [
    join(root, "design/brand/exports/gitpulse-1024.png"),
    join(app, "public/icons/brand.webp"),
    join(app, "public/icons/icon-512.png"),
  ]) {
    const { data, info } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x, y) => data[(Math.floor(y * info.height) * info.width + Math.floor(x * info.width)) * 4 + 3];
    assert.equal(alpha(0.02, 0.5), 0, "outside silhouette must be transparent");
    assert(alpha(0.42, 0.22) < 16, "tail opening must be transparent");
    assert(alpha(0.43, 0.86) < 16, "space between paws must be transparent");
    assert(alpha(0.4, 0.5) > 240, "bandages must remain opaque");
  }
  assert.match(readFileSync(join(native, "android/values/ic_launcher_background.xml"), "utf8"), /#E6E6E6/);
});
