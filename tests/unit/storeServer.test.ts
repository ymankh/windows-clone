import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { routeStoreRequest } from "../../server/app";
import { loadCatalog } from "../../server/catalog";
import { createInstallStats, type InstallStats } from "../../server/stats";
import {
  storeAppPackageSchema,
  storeCatalogEntrySchema,
  storeCatalogSchema,
} from "@/apps/store/protocol";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../server");
const catalog = loadCatalog(path.join(serverDir, "apps"), path.join(serverDir, "sdk"));

let stats: InstallStats;
const route = (method: string, url: string) => routeStoreRequest({ catalog, stats }, method, url);
const body = (method: string, url: string) => JSON.parse(route(method, url).body) as unknown;

beforeEach(() => {
  stats = createInstallStats(null);
});

describe("catalog loading", () => {
  it("loads every example app", () => {
    expect([...catalog.keys()].sort()).toEqual([
      "calculator",
      "focus-timer",
      "habit-garden",
      "markdown-pad",
      "memory-match",
      "palette-lab",
      "photo-filters",
      "pixel-studio",
      "task-board",
      "text-insights",
    ]);
  });

  it("injects the desktop SDK into each app", () => {
    for (const app of catalog.values()) {
      expect(app.html).toContain("desktop.onInit");
      expect(app.html).not.toContain("<!-- desktop-sdk -->");
    }
  });

  it("injects the shared UI library into each app that asks for it", () => {
    for (const app of catalog.values()) {
      expect(app.html).toContain(".ui-button");
      expect(app.html).toContain("window.desktop.ui =");
      expect(app.html).not.toContain("<!-- desktop-ui -->");
      expect(() => storeAppPackageSchema.parse({ manifest: app.manifest, html: app.html, icon: app.icon })).not.toThrow();
    }
  });

  it("registers the apps that open files", () => {
    expect(catalog.get("markdown-pad")?.manifest.fileTypes).toEqual(["notes"]);
    expect(catalog.get("text-insights")?.manifest.fileTypes).toEqual(["notes"]);
    expect(catalog.get("photo-filters")?.manifest.fileTypes).toEqual(["image"]);
  });
});

describe("store API", () => {
  it("lists a catalog that matches the shared schema", () => {
    const response = route("GET", "/api/apps");
    expect(response.status).toBe(200);
    const parsed = storeCatalogSchema.parse(JSON.parse(response.body));
    expect(parsed.apps.map((app) => app.id)).toContain("markdown-pad");
  });

  it("returns a single entry", () => {
    const entry = storeCatalogEntrySchema.parse(body("GET", "/api/apps/calculator"));
    expect(entry).toMatchObject({ id: "calculator", installs: 0, iconUrl: "/api/apps/calculator/icon.svg" });
  });

  it("serves an installable package", () => {
    const pkg = storeAppPackageSchema.parse(body("GET", "/api/apps/markdown-pad/package"));
    expect(pkg.manifest.id).toBe("markdown-pad");
    expect(pkg.icon).toContain("<svg");
  });

  it("serves icons as non-executable SVG", () => {
    const response = route("GET", "/api/apps/calculator/icon.svg");
    expect(response.headers["Content-Type"]).toBe("image/svg+xml");
    expect(response.headers["Content-Security-Policy"]).toContain("default-src 'none'");
  });

  it("counts installs", () => {
    expect(body("POST", "/api/apps/calculator/installs")).toEqual({ installs: 1 });
    expect(body("POST", "/api/apps/calculator/installs")).toEqual({ installs: 2 });
    expect(storeCatalogEntrySchema.parse(body("GET", "/api/apps/calculator")).installs).toBe(2);
  });

  it("rejects unknown apps, routes and methods", () => {
    expect(route("GET", "/api/apps/nope").status).toBe(404);
    expect(route("GET", "/api/apps/calculator/nope/deeper").status).toBe(404);
    expect(route("GET", "/elsewhere").status).toBe(404);
    expect(route("DELETE", "/api/apps/calculator").status).toBe(405);
    expect(route("POST", "/api/apps").status).toBe(405);
    expect(route("GET", "/api/apps/%E0%A4%A").status).toBe(400);
  });

  it("answers CORS preflight", () => {
    expect(route("OPTIONS", "/api/apps").status).toBe(204);
  });
});
