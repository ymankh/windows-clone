import { Terminal } from "lucide-react";
import type { DesktopApp } from "./types";

const TerminalContent = () => (
  <div className="font-mono text-sm">
    <p>user@pc:~$ echo &quot;Hello World&quot;</p>
    <p>Hello World</p>
  </div>
);

export const TerminalApp: DesktopApp = {
  id: "terminal",
  title: "Terminal",
  icon: Terminal,
  Component: TerminalContent,
};

