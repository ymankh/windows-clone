import { create } from "zustand";
import { z } from "zod";
import type { DesktopApp } from "./types";
import { FileTypes, type FileType } from "./fileTypes";
import { getAppsForFileType } from "./registry";

const STORAGE_KEY = "desktop-file-defaults";
const defaultsSchema = z.partialRecord(z.enum(FileTypes), z.string().min(1));

type FileDefaults = Partial<Record<FileType, string>>;

const loadDefaults = (): FileDefaults => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = defaultsSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

const persistDefaults = (defaults: FileDefaults) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // ignore
  }
};

type FileAssociationsStore = {
  /** User-chosen default app per file type. Missing entries use the first capable app. */
  defaults: FileDefaults;
  setDefaultApp: (fileType: FileType, appId: string) => void;
  /** Drops every default that points at the app (used when it is uninstalled). */
  forgetApp: (appId: string) => void;
};

export const useFileAssociationsStore = create<FileAssociationsStore>((set, get) => ({
  defaults: typeof window === "undefined" ? {} : loadDefaults(),
  setDefaultApp: (fileType, appId) => {
    const next = { ...get().defaults, [fileType]: appId };
    persistDefaults(next);
    set({ defaults: next });
  },
  forgetApp: (appId) => {
    const next = Object.fromEntries(
      Object.entries(get().defaults).filter(([, id]) => id !== appId)
    ) as FileDefaults;
    persistDefaults(next);
    set({ defaults: next });
  },
}));

/**
 * Picks the app that opens a file type: the user's choice if it is still
 * installed, otherwise the first capable app (built-in apps come first).
 */
export const resolveDefaultApp = (
  apps: DesktopApp[],
  defaults: FileDefaults,
  fileType: FileType
) => {
  const capable = apps.filter((app) =>
    app.fileCapabilities?.some((capability) => capability.fileType === fileType)
  );
  return capable.find((app) => app.id === defaults[fileType]) ?? capable[0];
};

export const getDefaultAppForFileType = (fileType: FileType) =>
  resolveDefaultApp(
    getAppsForFileType(fileType),
    useFileAssociationsStore.getState().defaults,
    fileType
  );
