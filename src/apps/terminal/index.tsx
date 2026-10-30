import { Terminal } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "../types";

const TerminalComponent = lazy(() => import("./Component"));

export const TerminalApp: DesktopApp = {
  id: "terminal",
  title: "Terminal",
  icon: Terminal,
  Component: TerminalComponent,
  minSize: { width: 420, height: 280 },
};
