import { create } from "zustand";
import useThemeStore from "../modules/personalization/store/ThemeStore";

type CustomBackground = { id: string; name: string; url: string };

type PersonalizationStore = {
  pendingThemeId: string;
  customBackgrounds: CustomBackground[];
  bgName: string;
  bgUrl: string;
  setPendingThemeId: (id: string) => void;
  setBgName: (value: string) => void;
  setBgUrl: (value: string) => void;
  addCustomBackground: () => CustomBackground | null;
};

const STORAGE_KEY = "desktop-custom-backgrounds";

const loadCustomBackgrounds = (): CustomBackground[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as CustomBackground[];
  } catch {
    return [];
  }
};

const persistCustomBackgrounds = (items: CustomBackground[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};

const usePersonalizationStore = create<PersonalizationStore>((set, get) => ({
  pendingThemeId: useThemeStore.getState().themeId,
  customBackgrounds: loadCustomBackgrounds(),
  bgName: "",
  bgUrl: "",
  setPendingThemeId: (id) => set({ pendingThemeId: id }),
  setBgName: (value) => set({ bgName: value }),
  setBgUrl: (value) => set({ bgUrl: value }),
  addCustomBackground: () => {
    const { bgName, bgUrl, customBackgrounds } = get();
    const trimmedUrl = bgUrl.trim();
    if (!trimmedUrl) return null;

    const entry: CustomBackground = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      name: bgName.trim() || "Custom background",
      url: trimmedUrl,
    };

    const next = [...customBackgrounds, entry];
    persistCustomBackgrounds(next);
    set({ customBackgrounds: next, bgName: "", bgUrl: "" });
    return entry;
  },
}));

export type { CustomBackground };
export default usePersonalizationStore;
