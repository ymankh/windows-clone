import type { ComponentType, ReactNode, SVGProps } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "../components/windows/windowing/constants";

type WindowIcon = ComponentType<SVGProps<SVGSVGElement>>;

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
  icon: WindowIcon;
  component: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  layoutMode: WindowLayoutMode;
  menubar?: WindowMenu[];
}

type OpenWindowPayload = {
  id: string;
  title: string;
  icon: WindowIcon;
  component: ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  menubar?: WindowMenu[];
};

interface WindowsManagerStore {
  windows: WindowState[];
  horizontalDockSplit: number;
  openWindow: (window: OpenWindowPayload) => void;
  minimizeWindow: (id: string) => void;
  activateWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  setWindowLayoutMode: (id: string, layoutMode: WindowLayoutMode) => void;
  setHorizontalDockSplit: (split: number) => void;
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
        const offset = state.windows.length * 20;
        const fallbackX = 80 + offset;
        const fallbackY = 80 + offset;
        const minWidth = Math.max(MIN_WINDOW_WIDTH, win.minWidth ?? MIN_WINDOW_WIDTH);
        const minHeight = Math.max(MIN_WINDOW_HEIGHT, win.minHeight ?? MIN_WINDOW_HEIGHT);
        const fallbackWidth = Math.max(minWidth, win.width ?? 520);
        const fallbackHeight = Math.max(minHeight, win.height ?? 360);

        if (existingWindow) {
          existingWindow.title = win.title;
          existingWindow.icon = win.icon;
          existingWindow.component = win.component;
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
          if (win.menubar !== undefined) existingWindow.menubar = win.menubar;
          return;
        }

        state.windows.push({
          ...win,
          isMinimized: false,
          zIndex,
          icon: win.icon,
          x: win.x ?? fallbackX,
          y: win.y ?? fallbackY,
          width: fallbackWidth,
          height: fallbackHeight,
          minWidth,
          minHeight,
          layoutMode: WindowLayoutModes.normal,
          menubar: win.menubar,
        });
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
      }),
    closeWindow: (id) =>
      set((state) => {
        state.windows = state.windows.filter(({ id: windowId }) => windowId !== id);
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

if (typeof window !== "undefined" && import.meta.env.DEV) {
  window.__windowsManagerStore = useWindowsManagerStore;
}
