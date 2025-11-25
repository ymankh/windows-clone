import { useEffect, useState } from "react";
import type { DesktopApp } from "../apps";
import DesktopIcon from "./components/DesktopIcon";
import Window from "./components/windows/Window";
import Taskbar from "./components/Taskbar";
import useWindowsManagerStore from "./stores/WindowsStore";
import DesktopContextMenu from "./components/DesktopContextMenu";
import { AnimatePresence } from "motion/react";
import PersonalizationWindow from "./modules/personalization/components/PersonalizationWindow";
import { Palette } from "lucide-react";
import useThemeStore from "./modules/personalization/store/ThemeStore";

type DesktopProps = {
  apps: DesktopApp[];
};

const Desktop = ({ apps }: DesktopProps) => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const [sortCounter, setSortCounter] = useState(0);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const applyTheme = useThemeStore((state) => state.apply);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  const openPersonalization = () =>
    openWindow({
      id: "personalization",
      title: "Personalization",
      icon: Palette,
      component: <PersonalizationWindow />,
      width: 860,
      height: 560,
    });

  return (
    <div
      className="relative min-h-screen w-full bg-background text-foreground"
      style={{
        backgroundImage: "var(--desktop-background-image)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      onClick={() => setSelectedIconId(null)}
    >
      <DesktopContextMenu
        onSort={() => setSortCounter((n) => n + 1)}
        onOpenPersonalization={openPersonalization}
      >
        <div
          className="flex min-h-screen w-full flex-wrap gap-6 p-6"
          onClick={(event) => {
            if (event.currentTarget !== event.target) return;
            setSelectedIconId(null);
          }}
        >
          {apps.map((app) => (
            <DesktopIcon
              key={app.id}
              app={app}
              sortVersion={sortCounter}
              selected={selectedIconId === app.id}
              onSelect={() => setSelectedIconId(app.id)}
              clearSelection={() => setSelectedIconId(null)}
            />
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
