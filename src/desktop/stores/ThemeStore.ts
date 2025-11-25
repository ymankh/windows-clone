import { create } from "zustand";
import { DEFAULT_THEME_ID, themes } from "../themes";

export type ThemeMode = "light" | "dark";

type ThemeStore = {
  themeId: string;
  mode: ThemeMode;
  setTheme: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  apply: () => void;
};

const STORAGE_KEY = "desktop-theme";
const STYLE_ID = "desktop-theme-style";

const persistState = (themeId: string, mode: ThemeMode) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, mode }));
  } catch {
    // ignore
  }
};

const loadInitialState = (): { themeId: string; mode: ThemeMode } => {
  if (typeof window === "undefined") {
    return { themeId: DEFAULT_THEME_ID, mode: "light" };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      themeId?: string;
      mode?: ThemeMode;
    };
    return {
      themeId: parsed.themeId ?? DEFAULT_THEME_ID,
      mode: parsed.mode ?? "light",
    };
  } catch {
    return { themeId: DEFAULT_THEME_ID, mode: "light" };
  }
};

const applyMode = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
};

const applyThemeCss = (themeId: string) => {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();

  const theme = themes.find((entry) => entry.id === themeId);
  if (!theme?.css) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = theme.css;
  document.head.appendChild(style);
};

const syncDom = (themeId: string, mode: ThemeMode) => {
  applyThemeCss(themeId);
  applyMode(mode);
};

const initial = loadInitialState();

const useThemeStore = create<ThemeStore>((set, get) => ({
  themeId: initial.themeId,
  mode: initial.mode,
  setTheme: (themeId) => {
    set({ themeId });
    const mode = get().mode;
    persistState(themeId, mode);
    syncDom(themeId, mode);
  },
  setMode: (mode) => {
    set({ mode });
    const themeId = get().themeId;
    persistState(themeId, mode);
    syncDom(themeId, mode);
  },
  apply: () => {
    const { themeId, mode } = get();
    syncDom(themeId, mode);
  },
}));

if (typeof document !== "undefined") {
  syncDom(initial.themeId, initial.mode);
}

export default useThemeStore;
