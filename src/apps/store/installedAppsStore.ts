import { create } from "zustand";
import { z } from "zod";
import { storeAppPackageSchema, type StoreAppPackage } from "./protocol";

const STORAGE_KEY = "desktop-installed-apps";

const installedAppSchema = storeAppPackageSchema.extend({
  installedAt: z.number().int().min(0),
});

export type InstalledStoreApp = z.infer<typeof installedAppSchema>;

// Each entry is validated on its own so one corrupted app cannot wipe the rest.
const loadInstalledApps = (): InstalledStoreApp[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const result = installedAppSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
};

const persistInstalledApps = (apps: InstalledStoreApp[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    return true;
  } catch {
    return false;
  }
};

type InstalledAppsStore = {
  apps: InstalledStoreApp[];
  /** Adds or replaces (updates) an app. Returns false if it could not be saved. */
  install: (pkg: StoreAppPackage) => boolean;
  remove: (manifestId: string) => void;
};

const useInstalledAppsStore = create<InstalledAppsStore>((set, get) => ({
  apps: typeof window === "undefined" ? [] : loadInstalledApps(),
  install: (pkg) => {
    const entry: InstalledStoreApp = { ...pkg, installedAt: Date.now() };
    const next = [
      ...get().apps.filter((app) => app.manifest.id !== pkg.manifest.id),
      entry,
    ];
    if (!persistInstalledApps(next)) return false;
    set({ apps: next });
    return true;
  },
  remove: (manifestId) => {
    const next = get().apps.filter((app) => app.manifest.id !== manifestId);
    persistInstalledApps(next);
    set({ apps: next });
  },
}));

export default useInstalledAppsStore;
