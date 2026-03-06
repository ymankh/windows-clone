import type {
  ComponentType,
  MouseEvent,
  PointerEventHandler,
  ReactNode,
  SVGProps,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import useWindowsManagerStore from "../../stores/WindowsStore";
import WindowMenubar from "./WindowMenubar";

type WindowProps = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
};

type DockTarget = "left" | "right" | "top" | null;
type WindowLayoutMode = "normal" | "maximized" | "docked-left" | "docked-right";

const TASKBAR_HEIGHT = 56;
const DOCK_EDGE_THRESHOLD = 32;

const Window = ({ id, title, icon, children }: WindowProps) => {
  const windowData = useWindowsManagerStore((state) =>
    state.windows.find((win) => win.id === id)
  )!;
  const removeWindow = useWindowsManagerStore((state) => state.removeWindow);
  const minimizeWindow = useWindowsManagerStore((state) => state.closeWindow);
  const focusWindow = useWindowsManagerStore((state) => state.focusWindow);
  const updateWindowPosition = useWindowsManagerStore(
    (state) => state.updateWindowPosition
  );
  const updateWindowBounds = useWindowsManagerStore(
    (state) => state.updateWindowBounds
  );
  const [layoutMode, setLayoutMode] = useState<WindowLayoutMode>("normal");
  const [isClosing, setIsClosing] = useState(false);
  const [dockPreview, setDockPreview] = useState<DockTarget>(null);
  const minWidth = 320;
  const minHeight = 220;
  const previousBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
    null
  );

  const windowRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    dragging: false,
    pointerId: -1,
    pointerTarget: null as HTMLDivElement | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    maxX: Number.POSITIVE_INFINITY,
    maxY: Number.POSITIVE_INFINITY,
  });
  const resizeState = useRef({
    resizing: false,
    edgeX: "right" as "left" | "right",
    edgeY: "bottom" as "top" | "bottom",
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const handleFocus = () => focusWindow(id);
  const stop: React.MouseEventHandler = (event: MouseEvent) =>
    event.stopPropagation();

  const getDesktopBounds = useCallback(() => {
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    return {
      width: viewportWidth,
      height: Math.max(0, viewportHeight - TASKBAR_HEIGHT),
    };
  }, []);

  const getDockTarget = useCallback(
    (pointerX: number, pointerY: number): DockTarget => {
      const { width } = getDesktopBounds();
      if (pointerY <= DOCK_EDGE_THRESHOLD) return "top";
      if (pointerX <= DOCK_EDGE_THRESHOLD) return "left";
      if (pointerX >= width - DOCK_EDGE_THRESHOLD) return "right";
      return null;
    },
    [getDesktopBounds]
  );

  const applyDock = useCallback(
    (target: Exclude<DockTarget, null>) => {
      if (!windowData) return;
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      previousBoundsRef.current = {
        x: windowData.x,
        y: windowData.y,
        width: windowData.width,
        height: windowData.height,
      };

      if (target === "top") {
        updateWindowBounds(id, {
          x: 0,
          y: 0,
          width: Math.max(minWidth, viewportWidth),
          height: Math.max(minHeight, desktopHeight),
        });
        setLayoutMode("maximized");
        return;
      }

      const dockedWidth = Math.max(minWidth, Math.floor(viewportWidth / 2));
      updateWindowBounds(id, {
        x: target === "left" ? 0 : Math.max(0, viewportWidth - dockedWidth),
        y: 0,
        width: dockedWidth,
        height: Math.max(minHeight, desktopHeight),
      });
      setLayoutMode(target === "left" ? "docked-left" : "docked-right");
    },
    [getDesktopBounds, id, minHeight, minWidth, updateWindowBounds, windowData]
  );

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
      setDockPreview(getDockTarget(event.clientX, event.clientY));
    },
    [getDockTarget, id, updateWindowPosition]
  );

  const resetDragState = useCallback(() => {
    dragState.current.dragging = false;
    dragState.current.pointerId = -1;
    dragState.current.pointerTarget = null;
    setDockPreview(null);
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const dockTarget = getDockTarget(event.clientX, event.clientY);
    if (dragState.current.dragging && dockTarget) {
      applyDock(dockTarget);
    }
    if (
      dragState.current.pointerTarget &&
      dragState.current.pointerId >= 0 &&
      dragState.current.pointerTarget.hasPointerCapture(dragState.current.pointerId)
    ) {
      dragState.current.pointerTarget.releasePointerCapture(dragState.current.pointerId);
    }
    resetDragState();
  }, [applyDock, getDockTarget, resetDragState]);

  const handleDragPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    handlePointerMove(event.nativeEvent);
  };

  const handleDragPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    handlePointerUp(event.nativeEvent);
  };

  const handleDragPointerCancel: PointerEventHandler<HTMLDivElement> = () => {
    resetDragState();
  };

  const startDrag: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, [data-no-drag='true']")
    ) {
      return;
    }
    handleFocus();
    setDockPreview(null);
    event.preventDefault();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    let baseX = windowData.x;
    let baseY = windowData.y;
    let width = windowData.width;
    let height = windowData.height;

    if (layoutMode !== "normal") {
      const fallback = {
        x: Math.max(0, Math.floor((viewportWidth - minWidth) / 2)),
        y: 64,
        width: Math.max(minWidth, Math.floor(viewportWidth * 0.7)),
        height: Math.max(minHeight, Math.floor((viewportHeight - TASKBAR_HEIGHT) * 0.7)),
      };
      const restored = previousBoundsRef.current ?? fallback;
      width = restored.width;
      height = restored.height;
      const pointerRatioX =
        windowData.width > 0 ? (event.clientX - windowData.x) / windowData.width : 0.5;
      const clampedPointerRatioX = Math.min(Math.max(pointerRatioX, 0.15), 0.85);
      baseX = Math.round(event.clientX - width * clampedPointerRatioX);
      baseY = Math.round(event.clientY - Math.min(28, event.clientY - windowData.y));
      baseX = Math.min(Math.max(0, baseX), Math.max(0, viewportWidth - width));
      baseY = Math.min(
        Math.max(0, baseY),
        Math.max(0, viewportHeight - TASKBAR_HEIGHT - height)
      );
      updateWindowBounds(id, { x: baseX, y: baseY, width, height });
      setLayoutMode("normal");
    }

    dragState.current = {
      dragging: true,
      pointerId: event.pointerId,
      pointerTarget: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      originX: baseX,
      originY: baseY,
      maxX: Math.max(0, viewportWidth - width),
      maxY: Math.max(0, viewportHeight - TASKBAR_HEIGHT - height),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
      if (!resizeState.current.resizing || layoutMode !== "normal") return;
      event.preventDefault();
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;

      const deltaX = event.clientX - resizeState.current.startX;
      const deltaY = event.clientY - resizeState.current.startY;

      let newX = resizeState.current.startPosX;
      let newY = resizeState.current.startPosY;
      let newWidth =
        resizeState.current.edgeX === "right"
          ? resizeState.current.startWidth + deltaX
          : resizeState.current.startWidth - deltaX;
      let newHeight =
        resizeState.current.edgeY === "bottom"
          ? resizeState.current.startHeight + deltaY
          : resizeState.current.startHeight - deltaY;

      if (resizeState.current.edgeX === "left") {
        const maxLeftShift =
          resizeState.current.startPosX + resizeState.current.startWidth - minWidth;
        const clampedShift = Math.max(
          Math.min(deltaX, maxLeftShift),
          -resizeState.current.startPosX
        );
        newX = resizeState.current.startPosX + clampedShift;
        newWidth =
          resizeState.current.startWidth +
          (resizeState.current.startPosX - newX);
      } else {
        const maxWidth = viewportWidth - resizeState.current.startPosX;
        newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      }

      if (resizeState.current.edgeY === "top") {
        const maxTopShift =
          resizeState.current.startPosY + resizeState.current.startHeight - minHeight;
        const clampedShift = Math.max(
          Math.min(deltaY, maxTopShift),
          -resizeState.current.startPosY
        );
        newY = resizeState.current.startPosY + clampedShift;
        newHeight =
          resizeState.current.startHeight +
          (resizeState.current.startPosY - newY);
      } else {
        const maxHeight =
          viewportHeight - TASKBAR_HEIGHT - resizeState.current.startPosY;
        newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
      }

      updateWindowBounds(id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    },
    [id, layoutMode, minHeight, minWidth, updateWindowBounds]
  );

  const handleResizeUp = useCallback(() => {
    resizeState.current.resizing = false;
    window.removeEventListener("pointermove", handleResizeMove);
  }, [handleResizeMove]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeUp);
    },
    [handleResizeMove, handleResizeUp]
  );

  const startResize = (
    edgeX: "left" | "right",
    edgeY: "top" | "bottom"
  ): React.PointerEventHandler<HTMLDivElement> => (event) => {
    if (layoutMode !== "normal" || !windowData) return;
    event.stopPropagation();
    event.preventDefault();
    handleFocus();
    resizeState.current = {
      resizing: true,
      edgeX,
      edgeY,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: windowData.width,
      startHeight: windowData.height,
      startPosX: windowData.x,
      startPosY: windowData.y,
    };
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handleResizeUp, { once: true });
  };

  const applyMaximizeBounds = useCallback(() => {
    const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
    const nextWidth = Math.max(minWidth, viewportWidth);
    const nextHeight = Math.max(minHeight, desktopHeight);
    updateWindowBounds(id, {
      x: 0,
      y: 0,
      width: nextWidth,
      height: nextHeight,
    });
  }, [getDesktopBounds, id, minHeight, minWidth, updateWindowBounds]);

  const toggleMaximize = useCallback(() => {
    if (!windowData) return;
    if (layoutMode === "maximized" && previousBoundsRef.current) {
      const { x, y, width, height } = previousBoundsRef.current;
      updateWindowBounds(id, { x, y, width, height });
      setLayoutMode("normal");
      return;
    }
    previousBoundsRef.current = {
      x: windowData.x,
      y: windowData.y,
      width: windowData.width,
      height: windowData.height,
    };
    applyMaximizeBounds();
    setLayoutMode("maximized");
  }, [applyMaximizeBounds, id, layoutMode, updateWindowBounds, windowData]);

  useEffect(() => {
    if (layoutMode !== "maximized") return;
    const handleResize = () => applyMaximizeBounds();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyMaximizeBounds, layoutMode]);

  if (!windowData && !isClosing) return null;

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        if (isClosing) removeWindow(id);
      }}
    >
      {!isClosing && windowData ? (
        <>
          {dockPreview ? (
            <div
              className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
              style={(() => {
                const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
                if (dockPreview === "top") {
                  return { left: 0, top: 0, width: viewportWidth, height: desktopHeight };
                }
                const dockedWidth = Math.max(minWidth, Math.floor(viewportWidth / 2));
                return {
                  left: dockPreview === "left" ? 0 : Math.max(0, viewportWidth - dockedWidth),
                  top: 0,
                  width: dockedWidth,
                  height: desktopHeight,
                };
              })()}
            />
          ) : null}
          <motion.div
            key={id}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{
              layout: { duration: 0.25, ease: [0.22, 0.8, 0.36, 1] },
              duration: 0.18,
              ease: [0.22, 0.8, 0.36, 1],
            }}
            className="absolute flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
            style={{
              zIndex: windowData.zIndex,
              left: windowData.x,
              top: windowData.y,
              width: windowData.width,
              height: windowData.height,
            }}
            onMouseDown={handleFocus}
            ref={windowRef}
          >
          <div
            className="flex cursor-move items-center justify-between bg-muted px-3 py-2 text-sm font-semibold select-none"
            onPointerDown={startDrag}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerCancel}
            onLostPointerCapture={handleDragPointerCancel}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground">
                {(() => {
                  const IconComponent = windowData.icon ?? icon;
                  return <IconComponent className="h-4 w-4" />;
                })()}
              </span>
              <span className="truncate">{windowData.title || title}</span>
            </span>
            <div className="flex items-center gap-2" data-no-drag="true">
              <button
                type="button"
                data-no-drag="true"
                className="p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
                data-no-drag="true"
                className="p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                onClick={(event) => {
                  stop(event);
                  toggleMaximize();
                }}
                aria-label={layoutMode === "maximized" ? "Restore" : "Maximize"}
              >
                {layoutMode === "maximized" ? <Copy size={14} /> : <Square size={14} />}
              </button>
              <button
                type="button"
                data-no-drag="true"
                className="p-1 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
                onClick={(event) => {
                  stop(event);
                  if (isClosing) return;
                  setIsClosing(true);
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

          {!windowData.isMinimized && (
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          )}

          <div className="pointer-events-none absolute inset-0">
            <div
              className="pointer-events-auto absolute left-0 top-0 h-3 w-3 cursor-nwse-resize"
              onPointerDown={startResize("left", "top")}
            />
            <div
              className="pointer-events-auto absolute right-0 top-0 h-3 w-3 cursor-nesw-resize"
              onPointerDown={startResize("right", "top")}
            />
            <div
              className="pointer-events-auto absolute left-0 bottom-0 h-3 w-3 cursor-nesw-resize"
              onPointerDown={startResize("left", "bottom")}
            />
            <div
              className="pointer-events-auto absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
              onPointerDown={startResize("right", "bottom")}
            />
          </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default Window;
