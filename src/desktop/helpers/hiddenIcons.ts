import { create } from "zustand";
import { z } from "zod";

const HIDDEN_ICONS_STORAGE_KEY = "desktop-hidden-icons";
const hiddenIconsSchema = z.array(z.string().min(1));

export const readHiddenIconIds = (): string[] => {
  try {
    const stored = localStorage.getItem(HIDDEN_ICONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = hiddenIconsSchema.safeParse(JSON.parse(stored));
    return parsed.success ? [...new Set(parsed.data)] : [];
  } catch {
    return [];
  }
};

export const writeHiddenIconIds = (ids: string[]) => {
  try {
    if (ids.length) {
      localStorage.setItem(HIDDEN_ICONS_STORAGE_KEY, JSON.stringify(ids));
    } else {
      localStorage.removeItem(HIDDEN_ICONS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

type HiddenIconsStore = {
  hiddenIds: string[];
  hide: (id: string) => void;
  /** Shows a single icon again (used when an app is installed or uninstalled). */
  unhide: (id: string) => void;
  restoreAll: () => void;
};

const commit = (ids: string[]) => {
  writeHiddenIconIds(ids);
  return { hiddenIds: ids };
};

export const useHiddenIconsStore = create<HiddenIconsStore>((set, get) => ({
  hiddenIds: typeof window === "undefined" ? [] : readHiddenIconIds(),
  hide: (id) => set(commit([...new Set([...get().hiddenIds, id])])),
  unhide: (id) => set(commit(get().hiddenIds.filter((hiddenId) => hiddenId !== id))),
  restoreAll: () => set(commit([])),
}));
