/** Base URL of the app store server (see `server/`). */
export const STORE_API_URL = (
  import.meta.env.VITE_STORE_API_URL ?? "http://127.0.0.1:4000"
).replace(/\/+$/, "");

export const resolveStoreUrl = (path: string) => new URL(path, `${STORE_API_URL}/`).href;
