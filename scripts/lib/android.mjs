export const NDK_VERSION = "27.2.12479018";
export const BUILD_TOOLS = "36.0.0";
export function androidConfiguration(source) {
  const sdk = source.match(/compileSdk\s*=\s*(\d+)/)?.[1];
  if (!sdk)
    throw new Error("Cannot find compileSdk in the generated Android project.");
  const marker = "// GitPulse CI configuration";
  const block = `${marker}\nandroid {
    ndkVersion = System.getenv("NDK_VERSION") ?: "${NDK_VERSION}"
    buildToolsVersion = "${BUILD_TOOLS}"
    if (!System.getenv("ANDROID_KEYSTORE_PATH").isNullOrBlank()) {
        signingConfigs.create("gitpulseRelease") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword = System.getenv("ANDROID_STORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        }
        buildTypes.getByName("release").signingConfig = signingConfigs.getByName("gitpulseRelease")
    }
}\n// End GitPulse configuration\n`;
  const managed =
    /\/\/ GitPulse CI configuration\r?\nandroid \{[\s\S]*?\r?\n\}\r?\n?(?:\/\/ End GitPulse configuration\r?\n?)?/;
  if (source.includes(marker) && !managed.test(source))
    throw new Error(
      "Cannot safely update the GitPulse Android configuration block.",
    );
  let configured = source.includes(marker)
    ? source.replace(managed, block)
    : `${source.trimEnd()}\n\n${block}`;
  const tlsConfiguration =
    'apply(from = file("../../../android/rustls.gradle.kts"))';
  if (!configured.includes(tlsConfiguration))
    configured += `\n${tlsConfiguration}\n`;
  const widgetsConfiguration =
    'apply(from = file("../../../widgets/android/widgets.gradle.kts"))';
  if (!configured.includes(widgetsConfiguration))
    configured += `\n${widgetsConfiguration}\n`;
  return {
    sdk,
    source: configured,
  };
}
