import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function androidWidgetManifest(source) {
  const marker = "<!-- GitPulse contribution widgets -->";
  const end = "<!-- End GitPulse contribution widgets -->";
  const receivers = ["2D", "3D"]
    .map(
      (
        mode,
      ) => `        <receiver android:name="com.chenbitao.gitpulse.widgets.ContributionWidget${mode}"
            android:label="@string/widget_${mode.toLowerCase()}_name" android:exported="false">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/contribution_widget_${mode.toLowerCase()}" />
        </receiver>`,
    )
    .join("\n");
  const block = `${marker}\n${receivers}\n        ${end}`;
  if (!source.includes("</application>"))
    throw new Error("Android manifest is missing its application element.");
  if (source.includes(marker)) {
    if (!source.includes(end))
      throw new Error("Incomplete widget manifest block.");
    return source.replace(
      /<!-- GitPulse contribution widgets -->[\s\S]*?<!-- End GitPulse contribution widgets -->/,
      block,
    );
  }
  return source.replace("</application>", `${block}\n    </application>`);
}
export function prepareAndroidWidgets(androidRoot) {
  const manifest = join(androidRoot, "app/src/main/AndroidManifest.xml");
  const previous = readFileSync(manifest, "utf8");
  const next = androidWidgetManifest(previous);
  if (next !== previous) writeFileSync(manifest, next);
}
