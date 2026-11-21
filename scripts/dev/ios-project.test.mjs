import { test } from "node:test";
import assert from "node:assert/strict";
import { iosEnvironment } from "../lib/ios.mjs";
import { iosSimulatorRequest, iosWidgetsEnabled, localIOSProjectSpec } from "../lib/ios-project.mjs";

test("iOS widget mode respects shell overrides and rejects invalid local values", () => {
  assert.equal(iosEnvironment({}, "GITPULSE_IOS_WIDGETS=disabled").GITPULSE_IOS_WIDGETS, "disabled");
  assert.equal(iosEnvironment({ GITPULSE_IOS_WIDGETS: "enabled" }, "GITPULSE_IOS_WIDGETS=disabled").GITPULSE_IOS_WIDGETS, "enabled");
  assert.throws(() => iosEnvironment({}, "GITPULSE_IOS_WIDGETS=oops"), /GITPULSE_IOS_WIDGETS/);
});

test("auto mode requires a confirmed paid team for signed device widgets", () => {
  assert.equal(iosWidgetsEnabled({ simulator: false, personalTeam: true }), false);
  assert.equal(iosWidgetsEnabled({ simulator: true, personalTeam: true }), true);
  assert.equal(iosWidgetsEnabled({ simulator: false, unsigned: true, personalTeam: true }), true);
  assert.equal(iosWidgetsEnabled({ simulator: false, personalTeam: false }), true);
  assert.equal(iosWidgetsEnabled({ simulator: false, personalTeam: null }), false);
  assert.equal(iosWidgetsEnabled({ simulator: false }), false);
  assert.equal(iosWidgetsEnabled({ simulator: true, personalTeam: null }), true);
  assert.equal(iosWidgetsEnabled({ simulator: false, unsigned: true, personalTeam: null }), true);
  assert.equal(iosWidgetsEnabled({ simulator: true, preference: "disabled", personalTeam: false }), false);
  assert.throws(() => iosWidgetsEnabled({ simulator: false, preference: "enabled", personalTeam: true }), /App Groups/);
});

test("explicit widget choices work without a cached Xcode team", () => {
  assert.equal(iosWidgetsEnabled({ simulator: false, preference: "enabled", personalTeam: null }), true);
  assert.equal(iosWidgetsEnabled({ simulator: false, preference: "enabled", personalTeam: false }), true);
  for (const simulator of [true, false]) {
    for (const unsigned of [true, false]) {
      assert.equal(iosWidgetsEnabled({ simulator, unsigned, preference: "disabled", personalTeam: null }), false);
    }
  }
});

test("simulator detection distinguishes explicit build targets and simulator names from physical devices", () => {
  assert(iosSimulatorRequest(["ios", "build", "--target", "aarch64-sim"]));
  assert(iosSimulatorRequest(["ios", "build", "--target=x86_64"]));
  assert(!iosSimulatorRequest(["ios", "build", "--target", "aarch64"]));
  assert(!iosSimulatorRequest(["ios", "build", "--target", "aarch64-sim", "aarch64"]));
  const devices = { ios: [{ name: "Test Simulator", udid: "sim-id", isAvailable: true }] };
  assert(iosSimulatorRequest(["ios", "dev", "Test Simulator"], devices));
  assert(iosSimulatorRequest(["ios", "dev", "sim-id"], devices));
  assert(!iosSimulatorRequest(["ios", "dev", "Test Phone"], devices));
});

test("local signing changes neither the shared project nor its full widget definition", () => {
  const original = {
    settings: { base: { GITPULSE_APP_GROUP: "group.test" } },
    targets: {
      gitpulse_iOS: {
        settings: { base: { PRODUCT_BUNDLE_IDENTIFIER: "com.test.app" } },
        sources: [{ path: "Sources" }, { path: "../../widgets/ios/Host" }, { path: "../../widgets/ios/Shared" }],
        dependencies: [{ target: "GitPulseWidgetsExtension", embed: true }, { sdk: "Security.framework" }],
        entitlements: { path: "host.entitlements", properties: { "com.apple.security.application-groups": ["group.test"] } },
      },
      GitPulseWidgetsExtension: { settings: { base: { CODE_SIGN_STYLE: "Automatic" } } },
    },
  };
  const before = JSON.stringify(original);
  const personal = localIOSProjectSpec(original, { team: "ABCDE12345", widgets: false });
  assert.equal(personal.targets.GitPulseWidgetsExtension, undefined);
  assert.deepEqual(personal.targets.gitpulse_iOS.dependencies, [{ sdk: "Security.framework" }]);
  assert.deepEqual(personal.targets.gitpulse_iOS.sources, [{ path: "Sources" }]);
  assert.deepEqual(personal.targets.gitpulse_iOS.entitlements.properties, {});
  assert.match(personal.targets.gitpulse_iOS.entitlements.path, /local\.entitlements$/);
  const full = localIOSProjectSpec(original, { team: "ABCDE12345", widgets: true });
  for (const target of Object.values(full.targets)) assert.equal(target.settings.base.DEVELOPMENT_TEAM, "ABCDE12345");
  assert.equal(full.targets.gitpulse_iOS.dependencies[0].target, "GitPulseWidgetsExtension");
  assert.deepEqual(full.targets.gitpulse_iOS.entitlements, original.targets.gitpulse_iOS.entitlements);
  assert.equal(JSON.stringify(original), before);
});
