import { useEffect, useRef, useState } from "react";
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
import {
  collectIntersectedIconIds,
  createSelectionRect,
  getSelectionRectStyle,
  mergeSelections,
  movedPastThreshold,
  type SelectionRect,
} from "./helpers/marqueeSelection";
import { toggleIconSelection } from "./helpers/iconSelection";

type DesktopProps = {
  apps: DesktopApp[];
};

const Desktop = ({ apps }: DesktopProps) => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const [sortCounter, setSortCounter] = useState(0);
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const marqueeState = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    additive: boolean;
    baseSelection: string[];
  } | null>(null);
  const suppressBackgroundClick = useRef(false);
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
    >
      <DesktopContextMenu
        onSort={() => setSortCounter((n) => n + 1)}
        onOpenPersonalization={openPersonalization}
      >
        <div
          className="flex min-h-screen w-full flex-wrap gap-6 p-6"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            event.stopPropagation();
            const container = event.currentTarget;
            container.setPointerCapture(event.pointerId);
            marqueeState.current = {
              active: true,
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              additive: event.shiftKey,
              baseSelection: event.shiftKey ? selectedIconIds : [],
            };
            setSelectionRect(
              createSelectionRect(
                event.clientX,
                event.clientY,
                event.clientX,
                event.clientY
              )
            );
            if (!event.shiftKey) {
              setSelectedIconIds([]);
            }
          }}
          onPointerMove={(event) => {
            if (!marqueeState.current?.active) return;
            if (marqueeState.current.pointerId !== event.pointerId) return;
            const container = event.currentTarget;
            const nextRect = createSelectionRect(
              marqueeState.current.startX,
              marqueeState.current.startY,
              event.clientX,
              event.clientY
            );
            setSelectionRect(nextRect);
            const intersected = collectIntersectedIconIds(container, nextRect);
            setSelectedIconIds(
              marqueeState.current.additive
                ? mergeSelections(marqueeState.current.baseSelection, intersected)
                : intersected
            );
          }}
          onPointerUp={(event) => {
            if (!marqueeState.current?.active) return;
            if (marqueeState.current.pointerId !== event.pointerId) return;
            suppressBackgroundClick.current = movedPastThreshold(
              createSelectionRect(
                marqueeState.current.startX,
                marqueeState.current.startY,
                event.clientX,
                event.clientY
              )
            );
            marqueeState.current.active = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            setSelectionRect(null);
          }}
          onClick={(event) => {
            if (event.currentTarget !== event.target) return;
            if (suppressBackgroundClick.current) {
              suppressBackgroundClick.current = false;
              return;
            }
            setSelectedIconIds([]);
          }}
        >
          {apps.map((app) => (
            <DesktopIcon
              key={app.id}
              app={app}
              sortVersion={sortCounter}
              selected={selectedIconIds.includes(app.id)}
              selectedIds={selectedIconIds}
              onSelect={(options) =>
                setSelectedIconIds((prev) => {
                  if (options?.additive && options?.toggle) {
                    return toggleIconSelection(prev, app.id);
                  }
                  return [app.id];
                })
              }
              clearSelection={() => setSelectedIconIds([])}
            />
          ))}
          {selectionRect && (
            <div
              className="pointer-events-none absolute z-50 border border-primary/70 bg-primary/20"
              style={getSelectionRectStyle(selectionRect)}
            />
          )}
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
