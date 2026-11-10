import type { AppWindowComponentProps } from "@/apps/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TASKBAR_HEIGHT,
} from "../components/windows/windowing/constants";

export const WindowLayoutModes = {
  normal: "normal",
  maximized: "maximized",
  dockedLeft: "docked-left",
  dockedRight: "docked-right",
} as const;

export type WindowLayoutMode =
  (typeof WindowLayoutModes)[keyof typeof WindowLayoutModes];

export const WindowMenuItemTypes = {
  item: "item",
  separator: "separator",
  submenu: "submenu",
} as const;

export type WindowMenuItem =
  | {
      type?: typeof WindowMenuItemTypes.item;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | { type: typeof WindowMenuItemTypes.separator }
  | {
      type: typeof WindowMenuItemTypes.submenu;
      label: string;
      items: WindowMenuItem[];
      disabled?: boolean;
    };

export interface WindowMenu {
  label: string;
  items: WindowMenuItem[];
}

export interface WindowState {
  id: string;
  title: string;
  isMinimized: boolean;
  zIndex: number;
  appId: string;
  fileContext?: AppWindowComponentProps["fileContext"];
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  layoutMode: WindowLayoutMode;
}

type OpenWindowPayload = {
  id: string;
  title: string;
  appId: string;
  fileContext?: AppWindowComponentProps["fileContext"];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
};

interface WindowsManagerStore {
  windows: WindowState[];
  horizontalDockSplit: number;
  openWindow: (window: OpenWindowPayload) => void;
  minimizeWindow: (id: string) => void;
  activateWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  /** Closes every window of an app (used when it is uninstalled). */
  closeWindowsForApp: (appId: string) => void;
  setWindowTitle: (id: string, title: string) => void;
  setWindowLayoutMode: (id: string, layoutMode: WindowLayoutMode) => void;
  setHorizontalDockSplit: (split: number) => void;
  clampWindowsToViewport: () => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowBounds: (
    id: string,
    bounds: { x?: number; y?: number; width?: number; height?: number }
  ) => void;
}

declare global {
  interface Window {
    __windowsManagerStore?: typeof useWindowsManagerStore;
  }
}

const getNextZIndex = (windows: WindowState[]) =>
  windows.reduce((max, current) => Math.max(max, current.zIndex), 0) + 1;

// Renumber z-indexes to 1..n (preserving stacking order) so they never grow
// past the taskbar and other fixed layers during a long session.
const normalizeZIndexes = (windows: WindowState[]) => {
  [...windows]
    .sort((left, right) => left.zIndex - right.zIndex)
    .forEach((entry, index) => {
      entry.zIndex = index + 1;
    });
};

const CASCADE_STEP = 20;
const CASCADE_SLOTS = 10;

const getDesktopSize = () => {
  if (typeof window === "undefined") return null;
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height =
    (window.innerHeight || document.documentElement.clientHeight || 0) - TASKBAR_HEIGHT;
  return width > 0 && height > 0 ? { width, height } : null;
};

type WindowBounds = { x: number; y: number; width: number; height: number };

// Shrink and shift bounds so the window sits inside the usable desktop. The
// app's minimum size still wins on viewports smaller than that minimum.
const fitBoundsToDesktop = (
  bounds: WindowBounds,
  minWidth: number,
  minHeight: number
): WindowBounds => {
  const desktop = getDesktopSize();
  if (!desktop) return bounds;
  const width = Math.max(minWidth, Math.min(bounds.width, desktop.width));
  const height = Math.max(minHeight, Math.min(bounds.height, desktop.height));
  return {
    width,
    height,
    x: Math.min(Math.max(0, bounds.x), Math.max(0, desktop.width - width)),
    y: Math.min(Math.max(0, bounds.y), Math.max(0, desktop.height - height)),
  };
};

const clampHorizontalDockSplit = (split: number) =>
  Math.min(Math.max(split, 0.2), 0.8);

const useWindowsManagerStore = create<WindowsManagerStore>()(
  immer<WindowsManagerStore>((set) => ({
    windows: [],
    horizontalDockSplit: 0.5,
    openWindow: (win) =>
      set((state) => {
        const existingWindow = state.windows.find(({ id }) => id === win.id);
        const zIndex = win.zIndex ?? getNextZIndex(state.windows);
        const offset = (state.windows.length % CASCADE_SLOTS) * CASCADE_STEP;
        const fallbackX = 80 + offset;
        const fallbackY = 80 + offset;
        const minWidth = Math.max(MIN_WINDOW_WIDTH, win.minWidth ?? MIN_WINDOW_WIDTH);
        const minHeight = Math.max(MIN_WINDOW_HEIGHT, win.minHeight ?? MIN_WINDOW_HEIGHT);
        const fallbackWidth = Math.max(minWidth, win.width ?? 520);
        const fallbackHeight = Math.max(minHeight, win.height ?? 360);

        if (existingWindow) {
          existingWindow.title = win.title;
          existingWindow.appId = win.appId;
          existingWindow.fileContext = win.fileContext;
          existingWindow.isMinimized = false;
          existingWindow.zIndex = zIndex;
          if (win.x !== undefined) existingWindow.x = win.x;
          if (win.y !== undefined) existingWindow.y = win.y;
          if (win.minWidth !== undefined) existingWindow.minWidth = minWidth;
          if (win.minHeight !== undefined) existingWindow.minHeight = minHeight;
          if (win.width !== undefined) {
            existingWindow.width = Math.max(existingWindow.minWidth, win.width);
          }
          if (win.height !== undefined) {
            existingWindow.height = Math.max(existingWindow.minHeight, win.height);
          }
          normalizeZIndexes(state.windows);
          return;
        }

        const bounds = fitBoundsToDesktop(
          {
            x: win.x ?? fallbackX,
            y: win.y ?? fallbackY,
            width: fallbackWidth,
            height: fallbackHeight,
          },
          minWidth,
          minHeight
        );

        state.windows.push({
          ...win,
          isMinimized: false,
          zIndex,
          appId: win.appId,
          fileContext: win.fileContext,
          ...bounds,
          minWidth,
          minHeight,
          layoutMode: WindowLayoutModes.normal,
        });
        normalizeZIndexes(state.windows);
      }),
    minimizeWindow: (id) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        window.isMinimized = true;
      }),
    activateWindow: (id) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        window.isMinimized = false;
        window.zIndex = getNextZIndex(state.windows);
        normalizeZIndexes(state.windows);
      }),
    closeWindow: (id) =>
      set((state) => {
        state.windows = state.windows.filter(({ id: windowId }) => windowId !== id);
      }),
    closeWindowsForApp: (appId) =>
      set((state) => {
        state.windows = state.windows.filter((entry) => entry.appId !== appId);
        normalizeZIndexes(state.windows);
      }),
    setWindowTitle: (id, title) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        window.title = title;
      }),
    setWindowLayoutMode: (id, layoutMode) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        window.layoutMode = layoutMode;
      }),
    setHorizontalDockSplit: (split) =>
      set((state) => {
        state.horizontalDockSplit = clampHorizontalDockSplit(split);
      }),
    clampWindowsToViewport: () =>
      set((state) => {
        // Maximized and docked windows track the viewport in their own hooks.
        for (const entry of state.windows) {
          if (entry.layoutMode !== WindowLayoutModes.normal) continue;
          const next = fitBoundsToDesktop(entry, entry.minWidth, entry.minHeight);
          entry.x = next.x;
          entry.y = next.y;
          entry.width = next.width;
          entry.height = next.height;
        }
      }),
    updateWindowPosition: (id, x, y) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        window.x = x;
        window.y = y;
      }),
    updateWindowBounds: (id, bounds) =>
      set((state) => {
        const window = state.windows.find(({ id: windowId }) => windowId === id);
        if (!window) return;
        if (bounds.x !== undefined) window.x = bounds.x;
        if (bounds.y !== undefined) window.y = bounds.y;
        if (bounds.width !== undefined) {
          window.width = Math.max(window.minWidth, bounds.width);
        }
        if (bounds.height !== undefined) {
          window.height = Math.max(window.minHeight, bounds.height);
        }
      }),
  }))
);

export default useWindowsManagerStore;

// Exposed for the Playwright suite. Set VITE_EXPOSE_TEST_HOOKS=true at build
// time to run the same tests against a production build.
if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || import.meta.env.VITE_EXPOSE_TEST_HOOKS === "true")
) {
  window.__windowsManagerStore = useWindowsManagerStore;
}
