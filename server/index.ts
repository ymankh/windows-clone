import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStoreServer } from "./app";
import { loadCatalog } from "./catalog";
import { createInstallStats } from "./stats";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.STORE_PORT ?? "4000");
const host = process.env.STORE_HOST ?? "127.0.0.1";

const catalog = loadCatalog(
  path.join(serverDir, "apps"),
  path.join(serverDir, "sdk", "desktop-sdk.js")
);
const stats = createInstallStats(path.join(serverDir, "data", "installs.json"));

createStoreServer({
  catalog,
  stats,
  allowedOrigin: process.env.STORE_ALLOWED_ORIGIN ?? "*",
}).listen(port, host, () => {
  console.log(`[store] ${catalog.size} apps available at http://${host}:${port}/api/apps`);
});
