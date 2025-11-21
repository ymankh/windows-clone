import type { ComponentType, ReactNode, SVGProps } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type WindowIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type WindowMenuItem =
  | {
      type?: "item";
      label: string;
      shortcut?: string;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | { type: "separator" }
  | { type: "submenu"; label: string; items: WindowMenuItem[]; disabled?: boolean };

export interface WindowMenu {
  label: string;
  items: WindowMenuItem[];
}

interface Window {
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
  zIndex?: number;
  menubar?: WindowMenu[];
};

interface WindowsManagerStore {
  windows: Window[];
  openWindow: (window: OpenWindowPayload) => void;
  closeWindow: (id: string) => void;
  toggleWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  removeWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowBounds: (
    id: string,
    bounds: { x?: number; y?: number; width?: number; height?: number }
  ) => void;
}

const getNextZIndex = (windows: Window[]) =>
  windows.reduce((max, current) => Math.max(max, current.zIndex), 0) + 1;

const useWindowsManagerStore = create<WindowsManagerStore>()(
  immer<WindowsManagerStore>((set) => ({
    windows: [],
    openWindow: (win) =>
      set((state: WindowsManagerStore) => {
        const existingWindow = state.windows.find(({ id }) => id === win.id);
        const zIndex = win.zIndex ?? getNextZIndex(state.windows);
        const offset = state.windows.length * 20;
        const fallbackX = 80 + offset;
        const fallbackY = 80 + offset;
        const fallbackWidth = win.width ?? 520;
        const fallbackHeight = win.height ?? 360;

        if (existingWindow) {
          existingWindow.title = win.title;
          existingWindow.icon = win.icon;
          existingWindow.component = win.component;
          existingWindow.isMinimized = false;
          existingWindow.zIndex = zIndex;
          if (win.x !== undefined) existingWindow.x = win.x;
          if (win.y !== undefined) existingWindow.y = win.y;
          if (win.width !== undefined) existingWindow.width = win.width;
          if (win.height !== undefined) existingWindow.height = win.height;
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
          menubar: win.menubar,
        });
      }),
    closeWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;
        window.isMinimized = true;
      }),
    toggleWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;

        const willMinimize = !window.isMinimized;
        window.isMinimized = willMinimize;
        if (!willMinimize) {
          window.zIndex = getNextZIndex(state.windows);
        }
      }),
    focusWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }) => windowId === id
        );
        if (!window) return;
        window.isMinimized = false;
        window.zIndex = getNextZIndex(state.windows);
      }),
    removeWindow: (id) =>
      set((state: WindowsManagerStore) => {
        state.windows = state.windows.filter(
          ({ id: windowId }) => windowId !== id
        );
      }),
    updateWindowPosition: (id, x, y) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;
        window.x = x;
        window.y = y;
      }),
    updateWindowBounds: (id, bounds) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;
        if (bounds.x !== undefined) window.x = bounds.x;
        if (bounds.y !== undefined) window.y = bounds.y;
        if (bounds.width !== undefined) window.width = bounds.width;
        if (bounds.height !== undefined) window.height = bounds.height;
      }),
  }))
);

export default useWindowsManagerStore;
