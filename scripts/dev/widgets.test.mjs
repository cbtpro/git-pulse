import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { androidWidgetManifest } from "../lib/widgets.mjs";
import { androidConfiguration } from "../lib/android.mjs";
import { validateWidgetProfile } from "../ci/prepare-ios-widgets.mjs";

test("iOS widget signing rejects another app, team, missing group or expired profile", () => {
  const id = "com.chenbitao.gitpulse.widgets",
    team = "ABCDE12345",
    group = "group.com.chenbitao.gitpulse";
  const profile = {
    UUID: "11111111-2222-3333-4444-555555555555",
    ApplicationIdentifierPrefix: [team],
    TeamIdentifier: [team],
    ExpirationDate: "2030-01-01",
    Entitlements: {
      "application-identifier": `${team}.${id}`,
      "com.apple.security.application-groups": [group],
    },
  };
  const validate = (p = profile, b = id, t = team, g = group) =>
    validateWidgetProfile(p, b, t, g, new Date("2026-01-01"));
  assert.doesNotThrow(() => validate());
  assert.throws(() => validate(profile, "com.chenbitao.gitpulse"));
  assert.throws(() => validate(profile, id, "OTHER12345"));
  assert.throws(() => validate(profile, id, team, "group.other"));
  assert.throws(() => validate({ ...profile, ExpirationDate: "2025-01-01" }));
});

test("widget preparation preserves existing manifest entries and remains idempotent", () => {
  const source =
    '<manifest><application><activity android:name=".MainActivity" /></application></manifest>';
  const once = androidWidgetManifest(source);
  assert.equal(androidWidgetManifest(once), once);
  assert.match(once, /MainActivity/);
  assert.equal((once.match(/<receiver /g) || []).length, 2);
  assert.equal((once.match(/android:exported="false"/g) || []).length, 2);
  const gradle = androidConfiguration("android { compileSdk = 37 }").source;
  assert.equal(androidConfiguration(gradle).source, gradle);
  assert.equal(gradle.split("widgets/android/widgets.gradle.kts").length, 2);
});
test("iOS host and widget extension share the requested minimum deployment version", () => {
  const root = new URL("../../", import.meta.url);
  const config = JSON.parse(
    readFileSync(
      new URL("packages/app/src-tauri/tauri.conf.json", root),
      "utf8",
    ),
  );
  const project = readFileSync(
    new URL("packages/app/src-tauri/gen/apple/project.yml", root),
    "utf8",
  );
  assert.equal(config.bundle.iOS.minimumSystemVersion, "17.4");
  assert.match(project, /iOS: "17\.4"/);
  assert.match(project, /deploymentTarget: "17\.4"/);
  assert.match(project, /target: GitPulseWidgetsExtension\s+embed: true/);
  assert.match(project, /com\.apple\.security\.application-groups/);
});
