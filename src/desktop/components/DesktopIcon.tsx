import type { ComponentType, SVGProps } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { DesktopApp } from "../../apps";
import useWindowsManagerStore from "../stores/WindowsStore";
import DesktopIconMenu from "./DesktopIconMenu";
import { cn } from "@/lib/utils";

type DesktopIconProps = {
  app: DesktopApp;
  sortVersion?: number;
  selected?: boolean;
  onSelect?: () => void;
  clearSelection?: () => void;
};

const STORAGE_KEY = "desktop-icon-positions";

const DesktopIcon = ({
  app,
  sortVersion = 0,
  selected = false,
  onSelect,
  clearSelection,
}: DesktopIconProps) => {
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const Icon: ComponentType<SVGProps<SVGSVGElement>> = app.icon;
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<
          string,
          { x: number; y: number }
        >;
        if (parsed[app.id]) return parsed[app.id];
      }
    } catch {
      // ignore
    }
    return {
      x: Math.random() * 200,
      y: Math.random() * 200,
    };
  });
  const dragState = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const persistPosition = (next: { x: number; y: number }) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed =
        stored ? (JSON.parse(stored) as Record<string, { x: number; y: number }>) : {};
      parsed[app.id] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  };
  const applySortedPosition = useEffectEvent(() => {
    if (!sortVersion) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed =
      stored ? (JSON.parse(stored) as Record<string, { x: number; y: number }>) : {};
    const ids = Object.keys(parsed).length ? Object.keys(parsed) : [];
    const index = ids.indexOf(app.id) >= 0 ? ids.indexOf(app.id) : ids.length;

    // vertical stacking (columns wrap after N rows)
    const rowHeight = 140;
    const colWidth = 120;
    const rowsPerCol = 5;
    const col = Math.floor(index / rowsPerCol);
    const row = index % rowsPerCol;

    const next = {
      x: col * colWidth,
      y: row * rowHeight,
    };
    setPosition(next);
    persistPosition(next);
  });

  useEffect(() => {
    applySortedPosition();
  }, [sortVersion]);

  if (hidden) return null;

  return (
    <DesktopIconMenu
      onOpen={() =>
        openWindow({
          id: app.id,
          title: app.title,
          icon: app.icon,
          component: <app.Component />,
          menubar: app.menubar,
        })
      }
      onDelete={() => setHidden(true)}
    >
      <button
        type="button"
        className={cn(
          "absolute flex w-24 flex-col items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground/80 transition hover:bg-white/15 backdrop-blur-md",
          selected && "bg-white/20 ring-2 ring-primary/60"
        )}
        style={{ left: position.x, top: position.y }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragState.current = {
            dragging: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
          if (!selected) {
            onSelect?.();
          }
        }}
        onPointerMove={(event) => {
          if (!dragState.current.dragging) return;
          event.stopPropagation();
          const deltaX = event.clientX - dragState.current.startX;
          const deltaY = event.clientY - dragState.current.startY;
          if (!dragState.current.moved && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
            dragState.current.moved = true;
          }
          const next = {
            x: Math.max(0, dragState.current.originX + deltaX),
            y: Math.max(0, dragState.current.originY + deltaY),
          };
          setPosition(next);
          persistPosition(next);
        }}
        onPointerUp={(event) => {
          if (!dragState.current.dragging) return;
          event.stopPropagation();
          dragState.current.dragging = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (dragState.current.moved) return;
          onSelect?.();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          clearSelection?.();
          openWindow({
            id: app.id,
            title: app.title,
            icon: app.icon,
            component: <app.Component />,
            menubar: app.menubar,
          });
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white/5 shadow-sm">
          <Icon className="h-8 w-8" />
        </div>
        <span className="text-center leading-tight">{app.title}</span>
      </button>
    </DesktopIconMenu>
  );
};

export default DesktopIcon;
