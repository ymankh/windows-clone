import type { MouseEvent } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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

const Window = ({ id, title, icon, children }: WindowProps) => {
  const windowData = useWindowsManagerStore((state) =>
    state.windows.find((win) => win.id === id)
  );
  const removeWindow = useWindowsManagerStore((state) => state.removeWindow);
  const minimizeWindow = useWindowsManagerStore((state) => state.closeWindow);
  const focusWindow = useWindowsManagerStore((state) => state.focusWindow);
  const windows = useWindowsManagerStore((state) => state.windows);
  const [isClosing, setIsClosing] = useState(false);
  const resolvedWindowData = windowData ?? {
    id,
    title,
    isMinimized: false,
    zIndex: 0,
    icon,
    component: children,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    layoutMode: WindowLayoutModes.normal,
    menubar: undefined,
  };

  const {
    dockPreview,
    isResizing,
    layoutMode,
    startDrag,
    startResize,
    startResizeMouse,
    toggleMaximize,
    resetDragState,
    handleResizeMove,
    handleResizeUp,
    handlePointerMove,
    handlePointerUp,
    handleSplitResizeMove,
    handleSplitResizeUp,
    startSplitResize,
    startSplitResizeMouse,
  } = useWindowInteractions({
    id,
    windowData: resolvedWindowData,
  });

  const stop: React.MouseEventHandler = (event: MouseEvent) => event.stopPropagation();
  if (!windowData && !isClosing) return null;
  if (!windowData) return null;

  const IconComponent = windowData.icon ?? icon;

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        if (isClosing) removeWindow(id);
      }}
    >
      {!isClosing && !windowData.isMinimized ? (
        <>
          <WindowDockPreview windowId={id} dockPreview={dockPreview} />
          {isResizing ? (
            <div
              className="fixed inset-0 z-[10001] cursor-ew-resize"
              onPointerMove={(event) => {
                handleResizeMove(event.nativeEvent);
                handleSplitResizeMove(event.nativeEvent);
              }}
              onMouseMove={(event) => {
                handleResizeMove(event.nativeEvent);
                handleSplitResizeMove(event.nativeEvent);
              }}
              onPointerUp={() => {
                handleResizeUp();
                handleSplitResizeUp();
              }}
              onMouseUp={() => {
                handleResizeUp();
                handleSplitResizeUp();
              }}
            />
          ) : null}
          <motion.div
            key={id}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{
              duration: 0.18,
              ease: [0.22, 0.8, 0.36, 1],
            }}
            className="absolute flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
            data-window-id={id}
            style={{
              zIndex: windowData.zIndex,
              left: windowData.x,
              top: windowData.y,
              width: windowData.width,
              height: windowData.height,
            }}
            onMouseDown={() => focusWindow(id)}
          >
            <WindowHeader
              icon={IconComponent}
              title={windowData.title || title}
              layoutMode={layoutMode}
              onDragPointerDown={startDrag}
              onDragPointerMove={(event) => handlePointerMove(event.nativeEvent)}
              onDragPointerUp={(event) => handlePointerUp(event.nativeEvent)}
              onDragPointerCancel={resetDragState}
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

            {windowData.menubar ? <WindowMenubar menu={windowData.menubar} /> : null}

            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
            <WindowResizeHandles
              startResize={startResize}
              startResizeMouse={startResizeMouse}
            />
          </motion.div>
          <WindowSplitDivider
            windowData={windowData}
            windows={windows}
            onPointerDown={startSplitResize}
            onMouseDown={startSplitResizeMouse}
          />
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default Window;
