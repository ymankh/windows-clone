import {
  storeAppPackageSchema,
  storeCatalogSchema,
  type StoreAppPackage,
  type StoreCatalogEntry,
} from "../store/protocol";
import { STORE_API_URL } from "../store/config";

export type StoreApiErrorKind = "offline" | "server" | "invalid";

/**
 * `message` is technical detail for the console only. The UI picks its own
 * wording from `kind` (see `toUserMessage`).
 */
export class StoreApiError extends Error {
  readonly kind: StoreApiErrorKind;

  constructor(kind: StoreApiErrorKind, message: string) {
    super(message);
    this.name = "StoreApiError";
    this.kind = kind;
  }
}

/** Plain-language text that is safe to show to people using the store. */
export const toUserMessage = (error: unknown, action: "catalog" | "install"): string => {
  if (error instanceof StoreApiError && error.kind === "offline") {
    return "The App Store is unavailable right now. Please try again in a moment.";
  }
  return action === "install"
    ? "This app couldn't be installed. Please try again in a moment."
    : "Something went wrong while loading the App Store. Please try again in a moment.";
};

const request = async (path: string, init?: RequestInit) => {
  let response: Response;
  try {
    response = await fetch(`${STORE_API_URL}${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new StoreApiError(
      "offline",
      `Can't reach the App Store server at ${STORE_API_URL}. Start it with "npm run dev" or "npm run store:dev".`
    );
  }
  if (!response.ok) {
    throw new StoreApiError(
      "server",
      `The App Store server responded with ${response.status} for ${path}.`
    );
  }
  return response.json() as Promise<unknown>;
};

export const fetchCatalog = async (signal?: AbortSignal): Promise<StoreCatalogEntry[]> => {
  const parsed = storeCatalogSchema.safeParse(await request("/api/apps", { signal }));
  if (!parsed.success) {
    throw new StoreApiError("invalid", "The App Store sent an invalid catalog.");
  }
  return parsed.data.apps;
};

export const fetchAppPackage = async (manifestId: string): Promise<StoreAppPackage> => {
  const parsed = storeAppPackageSchema.safeParse(
    await request(`/api/apps/${encodeURIComponent(manifestId)}/package`)
  );
  if (!parsed.success || parsed.data.manifest.id !== manifestId) {
    throw new StoreApiError("invalid", "The App Store sent an invalid app package.");
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
