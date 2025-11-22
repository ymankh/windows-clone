import type { DesktopApp } from "../apps";
import DesktopIcon from "./components/DesktopIcon";
import Window from "./components/windows/Window";
import Taskbar from "./components/Taskbar";
import useWindowsManagerStore from "./stores/WindowsStore";
import DesktopContextMenu from "./components/DesktopContextMenu";
import { useState } from "react";
import { AnimatePresence } from "motion/react";

type DesktopProps = {
  apps: DesktopApp[];
};

const Desktop = ({ apps }: DesktopProps) => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const [sortCounter, setSortCounter] = useState(0);

  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(0,0,0,0.05),transparent_25%)] bg-background text-foreground">
      <DesktopContextMenu onSort={() => setSortCounter((n) => n + 1)}>
        <div className="flex min-h-screen w-full flex-wrap gap-6 p-6">
          {apps.map((app) => (
            <DesktopIcon key={app.id} app={app} sortVersion={sortCounter} />
          ))}
        </div>
      </DesktopContextMenu>

      <AnimatePresence>
        {windows.map((win) =>
          win.isMinimized ? null : (
            <Window key={win.id} id={win.id} title={win.title} icon={win.icon}>
              {win.component}
            </Window>
          )
        )}
      </AnimatePresence>

      <Taskbar />
    </div>
  );
};

export default Desktop;
