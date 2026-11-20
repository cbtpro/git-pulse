import { androidConfiguration } from "../lib/android.mjs";
import {
  androidPlatformPackage,
  androidPlatformRequirements,
} from "../lib/android-sdk.mjs";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
const gradlePath = "packages/app/src-tauri/gen/android/app/build.gradle.kts";
const source = readFileSync(gradlePath, "utf8");
const configuration = androidConfiguration(source);
const sdk = configuration.sdk;
const platforms = androidPlatformRequirements(
  "packages/app/src-tauri/gen/android",
)
  .map(({ api }) => androidPlatformPackage(api))
  .join(" ");
const names = [
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_STORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];
const configured = names.filter((name) => Boolean(process.env[name]));
if (configured.length && configured.length !== names.length)
  throw new Error("Configure all four Android signing secrets together.");
const signed = configured.length === names.length;
if (signed) {
  const keyPath = join(process.env.RUNNER_TEMP, "gitpulse-release.keystore");
  writeFileSync(
    keyPath,
    Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, "base64"),
    { mode: 0o600 },
  );
  appendFileSync(process.env.GITHUB_ENV, `ANDROID_KEYSTORE_PATH=${keyPath}\n`);
}
writeFileSync(gradlePath, configuration.source);
appendFileSync(
  process.env.GITHUB_OUTPUT,
  `compile-sdk=${sdk}\nplatform-packages=${platforms}\nsigning=${signed ? "signed" : "unsigned"}\n`,
);
