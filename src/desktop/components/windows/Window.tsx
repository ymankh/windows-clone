import type { MouseEvent } from "react";
import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { getAppById } from "@/apps";
import useWindowsManagerStore, {
  WindowLayoutModes,
} from "../../stores/WindowsStore";
import WindowDockPreview from "./WindowDockPreview";
import WindowHeader from "./WindowHeader";
import WindowMenubar from "./WindowMenubar";
import WindowResizeHandles from "./WindowResizeHandles";
import WindowSplitDivider from "./WindowSplitDivider";
import { useWindowInteractions } from "./windowing/useWindowInteractions";
import type { WindowProps } from "./windowing/types";
import { getDesktopBounds } from "./windowing/utils";

const Window = ({ id }: WindowProps) => {
  const windowData = useWindowsManagerStore((state) =>
    state.windows.find((win) => win.id === id)
  );
  const closeWindow = useWindowsManagerStore((state) => state.closeWindow);
  const minimizeWindow = useWindowsManagerStore((state) => state.minimizeWindow);
  const activateWindow = useWindowsManagerStore((state) => state.activateWindow);
  const windows = useWindowsManagerStore((state) => state.windows);
  const [isClosing, setIsClosing] = useState(false);
  const titleId = useId();
  const instructionsId = useId();
  const windowRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const resolvedWindowData = windowData ?? {
    id,
    title: "",
    appId: "",
    fileContext: undefined,
    isMinimized: false,
    zIndex: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    minWidth: 320,
    minHeight: 220,
    layoutMode: WindowLayoutModes.normal,
  };
  const app = getAppById(resolvedWindowData.appId);
  const menubar = useMemo(
    () => app?.createMenubar?.(id) ?? app?.menubar,
    [app, id]
  );

  const {
    dockPreview,
    isDockAnimating,
    isResizing,
    layoutMode,
    startDrag,
    startResize,
    toggleMaximize,
    startSplitResize,
  } = useWindowInteractions({
    id,
    windowData: resolvedWindowData,
  });

  const stop: React.MouseEventHandler = (event: MouseEvent) => event.stopPropagation();
  const animatedLeft = useMotionValue(resolvedWindowData.x);
  const animatedTop = useMotionValue(resolvedWindowData.y);
  const animatedWidth = useMotionValue(resolvedWindowData.width);
  const animatedHeight = useMotionValue(resolvedWindowData.height);

  useEffect(() => {
    const values = [
      [animatedLeft, resolvedWindowData.x],
      [animatedTop, resolvedWindowData.y],
      [animatedWidth, resolvedWindowData.width],
      [animatedHeight, resolvedWindowData.height],
    ] as const;

    if (!isDockAnimating || reduceMotion) {
      values.forEach(([value, target]) => value.set(target));
      return;
    }

    const controls = values.map(([value, target]) =>
      animate(value, target, { duration: 0.22, ease: [0.22, 0.8, 0.36, 1] })
    );
    return () => controls.forEach((control) => control.stop());
  }, [
    animatedHeight,
    animatedLeft,
    animatedTop,
    animatedWidth,
    isDockAnimating,
    reduceMotion,
    resolvedWindowData.height,
    resolvedWindowData.width,
    resolvedWindowData.x,
    resolvedWindowData.y,
  ]);

  useEffect(() => {
    if (!windowData?.isMinimized) windowRef.current?.focus();
  }, [windowData?.isMinimized]);

  if (!windowData || !app) return null;
  const IconComponent = app.icon;
  const ContentComponent = app.Component;

  return (
    <>
      {!isClosing && !windowData.isMinimized ? (
        <>
          <WindowDockPreview windowId={id} dockPreview={dockPreview} />
          {isResizing ? (
            <div
              className="fixed inset-0 z-[10001] cursor-ew-resize"
            />
          ) : null}
          <WindowSplitDivider
            windowData={windowData}
            windows={windows}
            onPointerDown={startSplitResize}
          />
        </>
      ) : null}
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          if (isClosing) closeWindow(id);
        }}
      >
        {!isClosing && !windowData.isMinimized ? (
          <motion.div
            ref={windowRef}
            key={id}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.75, y: 40 }}
            transition={{
              duration: reduceMotion ? 0 : 0.18,
              ease: [0.22, 0.8, 0.36, 1],
            }}
            className="absolute flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
            data-window-id={id}
            data-window-layout-mode={layoutMode}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={instructionsId}
            tabIndex={-1}
            style={{
              zIndex: windowData.zIndex,
              left: animatedLeft,
              top: animatedTop,
              width: animatedWidth,
              height: animatedHeight,
            }}
            onPointerDown={() => activateWindow(id)}
            onKeyDown={(event) => {
              if (!event.altKey || event.target !== event.currentTarget) return;
              const step = event.shiftKey ? 50 : 10;
              const directions: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const direction = directions[event.key];
              if (!direction) return;
              event.preventDefault();
              const desktop = getDesktopBounds();

              if (event.ctrlKey) {
                const maxWidth = Math.max(0, desktop.width - windowData.x);
                const maxHeight = Math.max(0, desktop.height - windowData.y);
                const minWidth = Math.min(windowData.minWidth, maxWidth);
                const minHeight = Math.min(windowData.minHeight, maxHeight);
                useWindowsManagerStore.getState().updateWindowBounds(id, {
                  width: Math.min(
                    maxWidth,
                    Math.max(minWidth, windowData.width + direction[0])
                  ),
                  height: Math.min(
                    maxHeight,
                    Math.max(minHeight, windowData.height + direction[1])
                  ),
                });
                return;
              }

              const maxX = Math.max(0, desktop.width - windowData.width);
              const maxY = Math.max(0, desktop.height - windowData.height);
              const store = useWindowsManagerStore.getState();
              if (layoutMode !== WindowLayoutModes.normal) {
                store.setWindowLayoutMode(id, WindowLayoutModes.normal);
              }
              store.updateWindowPosition(
                id,
                Math.min(maxX, Math.max(0, windowData.x + direction[0])),
                Math.min(maxY, Math.max(0, windowData.y + direction[1]))
              );
            }}
          >
            <p id={instructionsId} className="sr-only">
              Hold Alt and use the arrow keys to move this window. Hold Control and Alt to resize it. Hold Shift for larger steps.
            </p>
            <WindowHeader
              icon={IconComponent}
              title={windowData.title}
              titleId={titleId}
              layoutMode={layoutMode}
              onDragPointerDown={startDrag}
              onMinimize={(event) => {
                stop(event);
                minimizeWindow(id);
              }}
              onToggleMaximize={(event) => {
                stop(event);
                toggleMaximize();
              }}
              onClose={(event) => {
                stop(event);
                if (isClosing) return;
                setIsClosing(true);
              }}
            />

            {menubar ? <WindowMenubar menu={menubar} /> : null}

            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense
                fallback={
                  <div role="status" className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading {windowData.title}…
                  </div>
                }
              >
                <ContentComponent windowId={id} fileContext={windowData.fileContext} />
              </Suspense>
            </div>
            <WindowResizeHandles
              startResize={startResize}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default Window;
