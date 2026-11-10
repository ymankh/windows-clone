import {
  storeAppPackageSchema,
  storeCatalogSchema,
  type StoreAppPackage,
  type StoreCatalogEntry,
} from "../store/protocol";
import { STORE_API_URL } from "../store/config";

export class StoreApiError extends Error {}

const request = async (path: string, init?: RequestInit) => {
  let response: Response;
  try {
    response = await fetch(`${STORE_API_URL}${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new StoreApiError(`Can't reach the App Store server at ${STORE_API_URL}.`);
  }
  if (!response.ok) {
    throw new StoreApiError(`The App Store server responded with ${response.status}.`);
  }
  return response.json() as Promise<unknown>;
};

export const fetchCatalog = async (signal?: AbortSignal): Promise<StoreCatalogEntry[]> => {
  const parsed = storeCatalogSchema.safeParse(await request("/api/apps", { signal }));
  if (!parsed.success) throw new StoreApiError("The App Store sent an invalid catalog.");
  return parsed.data.apps;
};

export const fetchAppPackage = async (manifestId: string): Promise<StoreAppPackage> => {
  const parsed = storeAppPackageSchema.safeParse(
    await request(`/api/apps/${encodeURIComponent(manifestId)}/package`)
  );
  if (!parsed.success || parsed.data.manifest.id !== manifestId) {
    throw new StoreApiError("The App Store sent an invalid app package.");
  }
  return parsed.data;
};

/** Best effort: a failed counter update must never block an install. */
export const recordInstall = async (manifestId: string): Promise<number | null> => {
  try {
    const body = await request(`/api/apps/${encodeURIComponent(manifestId)}/installs`, {
      method: "POST",
    });
    const installs = (body as { installs?: unknown }).installs;
    return typeof installs === "number" ? installs : null;
  } catch {
    return null;
  }
};
