import { Terminal } from "lucide-react";
import type { DesktopApp } from "../types";
import TerminalComponent from "./Component";

export const TerminalApp: DesktopApp = {
  id: "terminal",
  title: "Terminal",
  icon: Terminal,
  Component: TerminalComponent,
};
