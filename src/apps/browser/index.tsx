import { Globe } from "lucide-react";
import type { DesktopApp } from "../types";
import BrowserComponent from "./Component";

const createBrowserMenubar = (windowId: string) => [
  {
    label: "Navigate",
    items: [
      {
        label: "Back",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("browser-command", {
              detail: { type: "back", windowId },
            })
          ),
      },
      {
        label: "Forward",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("browser-command", {
              detail: { type: "forward", windowId },
            })
          ),
      },
      {
        label: "Reload",
        shortcut: "Ctrl+R",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("browser-command", {
              detail: { type: "reload", windowId },
            })
          ),
      },
      {
        label: "Home",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("browser-command", {
              detail: { type: "home", windowId },
            })
          ),
      },
    ],
  },
];

export const BrowserApp: DesktopApp = {
  id: "browser",
  title: "Browser",
  icon: Globe,
  Component: BrowserComponent,
  createMenubar: createBrowserMenubar,
};
