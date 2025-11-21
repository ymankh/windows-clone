import type { ComponentType, MouseEvent, ReactNode, SVGProps } from "react";
import { useCallback, useEffect, useRef } from "react";
import { Minus, Square, X } from "lucide-react";
import useWindowsManagerStore from "../../stores/WindowsStore";
import WindowMenubar from "./WindowMenubar";

type WindowProps = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
};

const Window = ({ id, title, icon, children }: WindowProps) => {
  const windowData = useWindowsManagerStore((state) =>
    state.windows.find((win) => win.id === id)
  );
  const removeWindow = useWindowsManagerStore((state) => state.removeWindow);
  const minimizeWindow = useWindowsManagerStore((state) => state.closeWindow);
  const toggleWindow = useWindowsManagerStore((state) => state.toggleWindow);
  const focusWindow = useWindowsManagerStore((state) => state.focusWindow);
  const updateWindowPosition = useWindowsManagerStore(
    (state) => state.updateWindowPosition
  );

  const windowRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    maxX: Number.POSITIVE_INFINITY,
    maxY: Number.POSITIVE_INFINITY,
  });

  const handleFocus = () => focusWindow(id);
  const stop: React.MouseEventHandler = (event: MouseEvent) =>
    event.stopPropagation();

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragState.current.dragging) return;
      event.preventDefault();
      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      const nextX = Math.min(
        Math.max(0, dragState.current.originX + deltaX),
        dragState.current.maxX
      );
      const nextY = Math.min(
        Math.max(0, dragState.current.originY + deltaY),
        dragState.current.maxY
      );
      updateWindowPosition(id, nextX, nextY);
    },
    [id, updateWindowPosition]
  );

  const handlePointerUp = useCallback(() => {
    dragState.current.dragging = false;
    window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp]
  );

  if (!windowData) return null;

  const startDrag: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    handleFocus();
    event.preventDefault();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const { width = 0, height = 0 } = windowRef.current?.getBoundingClientRect() ?? {};
    dragState.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: windowData.x,
      originY: windowData.y,
      maxX: Math.max(0, viewportWidth - width),
      maxY: Math.max(0, viewportHeight - height),
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return (
    <div
      className="absolute w-[420px] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
      style={{ zIndex: windowData.zIndex, left: windowData.x, top: windowData.y }}
      onMouseDown={handleFocus}
      ref={windowRef}
    >
      <div
        className="flex cursor-move items-center justify-between bg-muted px-3 py-2 text-sm font-semibold select-none"
        onPointerDown={startDrag}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-muted-foreground">
            {(() => {
              const IconComponent =
                windowData.icon ?? icon;
              return <IconComponent className="h-4 w-4" />;
            })()}
          </span>
          <span className="truncate">{windowData.title || title}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={(event) => {
              stop(event);
              minimizeWindow(id);
            }}
            aria-label="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={(event) => {
              stop(event);
              toggleWindow(id);
            }}
            aria-label={windowData.isMinimized ? "Restore" : "Maximize"}
          >
            <Square size={14} />
          </button>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
            onClick={(event) => {
              stop(event);
              removeWindow(id);
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {windowData.menubar ? (
        <WindowMenubar menu={windowData.menubar} />
      ) : null}

      {!windowData.isMinimized && <div className="p-4">{children}</div>}
    </div>
  );
};

export default Window;
