import http from "node:http";
import type { StoreCatalogEntry } from "../src/apps/store/protocol";
import { toPackage, type CatalogApp } from "./catalog";
import type { InstallStats } from "./stats";

export type StoreServerOptions = {
  catalog: Map<string, CatalogApp>;
  stats: InstallStats;
  /** Value for Access-Control-Allow-Origin. The catalog is public, so "*" by default. */
  allowedOrigin?: string;
};

export type StoreResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const json = (status: number, body: unknown): StoreResponse => ({
  status,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const toCatalogEntry = (app: CatalogApp, stats: InstallStats): StoreCatalogEntry => ({
  ...app.manifest,
  iconUrl: `/api/apps/${app.manifest.id}/icon.svg`,
  installs: stats.get(app.manifest.id),
  sizeBytes: app.sizeBytes,
});

/**
 * Store API. Pure routing (no sockets) so it can be unit tested.
 *
 *   GET  /api/health                  liveness check
 *   GET  /api/apps                    catalog listing
 *   GET  /api/apps/:id                one catalog entry
 *   GET  /api/apps/:id/icon.svg       app icon
 *   GET  /api/apps/:id/package        everything needed to install and run the app
 *   POST /api/apps/:id/installs       record an install, returns the new count
 */
export const routeStoreRequest = (
  { catalog, stats }: Pick<StoreServerOptions, "catalog" | "stats">,
  method: string,
  url: string
): StoreResponse => {
  if (method === "OPTIONS") return { status: 204, headers: {}, body: "" };

  const { pathname } = new URL(url, "http://store.local");
  const segments = pathname.split("/").filter(Boolean);

  if (method === "GET" && pathname === "/api/health") {
    return json(200, { ok: true, apps: catalog.size });
  }

  if (segments[0] !== "api" || segments[1] !== "apps") {
    return json(404, { error: "Not found" });
  }

  if (segments.length === 2) {
    if (method !== "GET") return json(405, { error: "Method not allowed" });
    return json(200, { apps: [...catalog.values()].map((app) => toCatalogEntry(app, stats)) });
  }

  let appId: string;
  try {
    appId = decodeURIComponent(segments[2]);
  } catch {
    return json(400, { error: "Invalid app id" });
  }
  const app = catalog.get(appId);
  if (!app) return json(404, { error: "Unknown app" });

  const action = segments.length === 4 ? segments[3] : segments.length === 3 ? "" : null;

  if (method === "GET" && action === "") return json(200, toCatalogEntry(app, stats));

  if (method === "GET" && action === "icon.svg") {
    return {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        // Icons are images; never let them run script if opened directly.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "Cache-Control": "public, max-age=300",
      },
      body: app.icon,
    };
  }

  if (method === "GET" && action === "package") return json(200, toPackage(app));

  if (method === "POST" && action === "installs") {
    return json(200, { installs: stats.increment(app.manifest.id) });
  }

  return action === null ? json(404, { error: "Not found" }) : json(405, { error: "Method not allowed" });
};

export const createStoreServer = ({ allowedOrigin = "*", ...options }: StoreServerOptions) =>
  http.createServer((req, res) => {
    const response = routeStoreRequest(options, req.method ?? "GET", req.url ?? "/");
    res.writeHead(response.status, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Content-Type-Options": "nosniff",
      ...response.headers,
    });
    res.end(response.body);
  });
