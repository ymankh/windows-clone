import { useEffect, useRef, useState } from "react";
import { PersonalizationApp, type DesktopApp } from "../apps";
import { buildAppWindow } from "../apps/windowBuilder";
import DesktopIcon from "./components/DesktopIcon";
import Window from "./components/windows/Window";
import Taskbar from "./components/Taskbar";
import useWindowsManagerStore from "./stores/WindowsStore";
import DesktopContextMenu from "./components/DesktopContextMenu";
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
import {
  getSortedIconPosition,
  persistIconPositions,
  type IconPositionsMap,
} from "./helpers/iconPositioning";

type DesktopProps = {
  apps: DesktopApp[];
};

const Desktop = ({ apps }: DesktopProps) => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const [sortedIconPositions, setSortedIconPositions] = useState<IconPositionsMap>({});
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
    openWindow(
      buildAppWindow(PersonalizationApp, {
        windowId: "personalization",
        title: "Personalization",
      })
    );

  const sortIcons = () => {
    const candidates = Object.fromEntries(
      apps.map((app, appIndex) => [
        app.id,
        getSortedIconPosition(app.id, appIndex),
      ])
    );
    setSortedIconPositions(
      persistIconPositions(
        candidates,
        apps.map((app) => app.id)
      )
    );
  };

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
        onSort={sortIcons}
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
          {apps.map((app, appIndex) => (
            <DesktopIcon
              key={app.id}
              app={app}
              appIndex={appIndex}
              sortedPosition={sortedIconPositions[app.id]}
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

      {windows.map((win) => (
        <Window key={win.id} id={win.id} />
      ))}

      <Taskbar />
    </div>
  );
};

export default Desktop;
