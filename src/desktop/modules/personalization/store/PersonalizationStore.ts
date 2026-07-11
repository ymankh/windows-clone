import { create } from "zustand";
import { z } from "zod";

type CustomBackground = { id: string; name: string; url: string };

type PersonalizationStore = {
  customBackgrounds: CustomBackground[];
  bgName: string;
  bgUrl: string;
  setBgName: (value: string) => void;
  setBgUrl: (value: string) => void;
  addCustomBackground: () => CustomBackground | null;
};

const STORAGE_KEY = "desktop-custom-backgrounds";
const backgroundUrlSchema = z.string().trim().refine((value) => {
  if (value.startsWith("/") || value.startsWith("data:image/") || value.startsWith("blob:")) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Enter a valid image URL");
const customBackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: backgroundUrlSchema,
});
const customBackgroundsSchema = z.array(customBackgroundSchema);

const loadCustomBackgrounds = (): CustomBackground[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = customBackgroundsSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : [];
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
  customBackgrounds: loadCustomBackgrounds(),
  bgName: "",
  bgUrl: "",
  setBgName: (value) => set({ bgName: value }),
  setBgUrl: (value) => set({ bgUrl: value }),
  addCustomBackground: () => {
    const { bgName, bgUrl, customBackgrounds } = get();
    const parsedUrl = backgroundUrlSchema.safeParse(bgUrl);
    if (!parsedUrl.success) return null;

    const entry: CustomBackground = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      name: bgName.trim() || "Custom background",
      url: parsedUrl.data,
    };

    const next = [...customBackgrounds, entry];
    persistCustomBackgrounds(next);
    set({ customBackgrounds: next, bgName: "", bgUrl: "" });
    return entry;
  },
}));

export type { CustomBackground };
export default usePersonalizationStore;
