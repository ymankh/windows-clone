import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  storeAppManifestSchema,
  type StoreAppManifest,
  type StoreAppPackage,
} from "../src/apps/store/protocol";

export type CatalogApp = {
  manifest: StoreAppManifest;
  html: string;
  icon: string;
  sizeBytes: number;
};

const SDK_MARKER = "<!-- desktop-sdk -->";
const UI_MARKER = "<!-- desktop-ui -->";

// Every app gets the same SDK, injected at packaging time, so app authors only
// write plain HTML and call `window.desktop.*`.
const injectSdk = (html: string, sdk: string) => {
  const script = `<script>\n${sdk}\n</script>`;
  if (html.includes(SDK_MARKER)) return html.replace(SDK_MARKER, () => script);
  if (html.includes("</head>")) return html.replace("</head>", () => `${script}\n</head>`);
  return `${script}\n${html}`;
};

// The shared UI library is opt-in: only apps with the marker get it. It goes
// where the marker is, so an app's own <style> after it can override it.
const injectUi = (html: string, css: string, js: string) =>
  html.replace(UI_MARKER, () => `<style>\n${css}\n</style>\n<script>\n${js}\n</script>`);

/**
 * Reads every app folder under `appsDir`. Each folder holds `manifest.json`,
 * `index.html` and `icon.svg`. Invalid apps are reported and skipped so one
 * broken entry cannot take down the store.
 *
 * `sdkDir` holds what gets injected into the apps: `desktop-sdk.js`,
 * `desktop-ui.css` and `desktop-ui.js`.
 */
export const loadCatalog = (appsDir: string, sdkDir: string): Map<string, CatalogApp> => {
  const sdk = readFileSync(path.join(sdkDir, "desktop-sdk.js"), "utf8");
  const uiCss = readFileSync(path.join(sdkDir, "desktop-ui.css"), "utf8");
  const uiJs = readFileSync(path.join(sdkDir, "desktop-ui.js"), "utf8");
  const catalog = new Map<string, CatalogApp>();

  for (const folder of readdirSync(appsDir).sort()) {
    const appDir = path.join(appsDir, folder);
    if (!statSync(appDir).isDirectory()) continue;

    try {
      const manifest = storeAppManifestSchema.parse(
        JSON.parse(readFileSync(path.join(appDir, "manifest.json"), "utf8"))
      );
      if (manifest.id !== folder) {
        throw new Error(`manifest id "${manifest.id}" must match its folder name`);
      }
      const html = injectSdk(
        injectUi(readFileSync(path.join(appDir, "index.html"), "utf8"), uiCss, uiJs),
        sdk
      );
      const icon = readFileSync(path.join(appDir, "icon.svg"), "utf8");
      catalog.set(manifest.id, {
        manifest,
        html,
        icon,
        sizeBytes: Buffer.byteLength(html) + Buffer.byteLength(icon),
      });
    } catch (error) {
      console.warn(`[store] Skipping app "${folder}": ${(error as Error).message}`);
    }
  }

  return catalog;
};

export const toPackage = (app: CatalogApp): StoreAppPackage => ({
  manifest: app.manifest,
  html: app.html,
  icon: app.icon,
});
