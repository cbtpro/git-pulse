import { syncMobileIcons } from "../lib/icons.mjs";

for (const platform of process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["ios", "android"]) {
  syncMobileIcons(platform);
}
