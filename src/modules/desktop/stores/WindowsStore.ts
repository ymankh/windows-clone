import type { ReactNode } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface Window {
  id: string;
  title: string;
  isOpen: boolean;
  zIndex: number;
  component: ReactNode;
}

interface WindowsManagerStore {
  windows: Window[];
  openWindow: (
    window: Omit<Window, "isOpen" | "zIndex"> & Partial<Pick<Window, "zIndex">>
  ) => void;
  closeWindow: (id: string) => void;
  toggleWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  removeWindow: (id: string) => void;
}

const getNextZIndex = (windows: Window[]) =>
  windows.reduce((max, current) => Math.max(max, current.zIndex), 0) + 1;

const useWindowsManagerStore = create<WindowsManagerStore>()(
  immer<WindowsManagerStore>((set) => ({
    windows: [],
    openWindow: (win) =>
      set((state: WindowsManagerStore) => {
        const existingWindow = state.windows.find(
          ({ id }: Window) => id === win.id
        );
        const zIndex = win.zIndex ?? getNextZIndex(state.windows);

        if (existingWindow) {
          existingWindow.title = win.title;
          existingWindow.component = win.component;
          existingWindow.isOpen = true;
          existingWindow.zIndex = zIndex;
          return;
        }

        state.windows.push({
          ...win,
          isOpen: true,
          zIndex,
        });
      }),
    closeWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;
        window.isOpen = false;
      }),
    toggleWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;

        const willOpen = !window.isOpen;
        window.isOpen = willOpen;
        if (willOpen) {
          window.zIndex = getNextZIndex(state.windows);
        }
      }),
    focusWindow: (id) =>
      set((state: WindowsManagerStore) => {
        const window = state.windows.find(
          ({ id: windowId }: Window) => windowId === id
        );
        if (!window) return;
        window.zIndex = getNextZIndex(state.windows);
      }),
    removeWindow: (id) =>
      set((state: WindowsManagerStore) => {
        state.windows = state.windows.filter(
          ({ id: windowId }: Window) => windowId !== id
        );
      }),
  }))
);

export default useWindowsManagerStore;
