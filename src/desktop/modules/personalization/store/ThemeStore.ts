import { create } from "zustand";
import { DEFAULT_THEME_ID, themes } from "../../../themes";
import { DEFAULT_BACKGROUND_ID, backgrounds } from "../../../backgrounds";

export type ThemeMode = "light" | "dark";

type ThemeStore = {
  themeId: string;
  mode: ThemeMode;
  backgroundUrl: string;
  setTheme: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  setBackground: (url: string) => void;
  apply: () => void;
};

const STORAGE_KEY = "desktop-theme";
const STYLE_ID = "desktop-theme-style";
const BG_VAR = "--desktop-background-image";

const persistState = (themeId: string, mode: ThemeMode, backgroundUrl: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, mode, backgroundUrl }));
  } catch {
    // ignore
  }
};

const loadInitialState = (): { themeId: string; mode: ThemeMode; backgroundUrl: string } => {
  if (typeof window === "undefined") {
    return {
      themeId: DEFAULT_THEME_ID,
      mode: "light",
      backgroundUrl: backgrounds.find((b) => b.id === DEFAULT_BACKGROUND_ID)?.image ?? "",
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      themeId?: string;
      mode?: ThemeMode;
      backgroundUrl?: string;
    };
    return {
      themeId: parsed.themeId ?? DEFAULT_THEME_ID,
      mode: parsed.mode ?? "light",
      backgroundUrl:
        parsed.backgroundUrl ??
        backgrounds.find((b) => b.id === DEFAULT_BACKGROUND_ID)?.image ??
        "",
    };
  } catch {
    return {
      themeId: DEFAULT_THEME_ID,
      mode: "light",
      backgroundUrl: backgrounds.find((b) => b.id === DEFAULT_BACKGROUND_ID)?.image ?? "",
    };
  }
};

const applyMode = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
};

const applyBackground = (backgroundUrl: string) => {
  if (typeof document === "undefined") return;
  if (!backgroundUrl) return;
  document.documentElement.style.setProperty(BG_VAR, `url("${backgroundUrl}")`);
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

const syncDom = (themeId: string, mode: ThemeMode, backgroundUrl: string) => {
  applyThemeCss(themeId);
  applyMode(mode);
  applyBackground(backgroundUrl);
};

const initial = loadInitialState();

const useThemeStore = create<ThemeStore>((set, get) => ({
  themeId: initial.themeId,
  mode: initial.mode,
  backgroundUrl: initial.backgroundUrl,
  setTheme: (themeId) => {
    set({ themeId });
    const { mode, backgroundUrl } = get();
    persistState(themeId, mode, backgroundUrl);
    syncDom(themeId, mode, backgroundUrl);
  },
  setMode: (mode) => {
    set({ mode });
    const { themeId, backgroundUrl } = get();
    persistState(themeId, mode, backgroundUrl);
    syncDom(themeId, mode, backgroundUrl);
  },
  setBackground: (backgroundUrl) => {
    set({ backgroundUrl });
    const { themeId, mode } = get();
    persistState(themeId, mode, backgroundUrl);
    syncDom(themeId, mode, backgroundUrl);
  },
  apply: () => {
    const { themeId, mode, backgroundUrl } = get();
    syncDom(themeId, mode, backgroundUrl);
  },
}));

if (typeof document !== "undefined") {
  syncDom(initial.themeId, initial.mode, initial.backgroundUrl);
}

export default useThemeStore;
