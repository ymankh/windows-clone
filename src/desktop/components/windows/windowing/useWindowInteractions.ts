import { useCallback, useEffect, useRef, useState } from "react";
import useWindowsManagerStore, {
  WindowLayoutModes,
  type WindowState,
} from "@/desktop/stores/WindowsStore";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TASKBAR_HEIGHT,
  DOCK_ANIMATION_DURATION_MS,
} from "./constants";
import {
  DockTargets,
  ResizeHorizontalEdges,
  type Bounds,
  type DockTarget,
  type ResizeHorizontalEdge,
  type ResizeVerticalEdge,
} from "./types";
import {
  clampDockSplitRatio,
  getDesktopBounds,
  getDockTarget,
  getLeftDockWidth,
} from "./utils";

type UseWindowInteractionsOptions = {
  id: string;
  windowData: WindowState;
};

type DragState = {
  dragging: boolean;
  pointerId: number;
  pointerTarget: HTMLDivElement | null;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  maxX: number;
  maxY: number;
};

type ResizeState = {
  resizing: boolean;
  edgeX: ResizeHorizontalEdge;
  edgeY: ResizeVerticalEdge;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startPosX: number;
  startPosY: number;
};

type ResizeMoveEvent = PointerEvent | MouseEvent;

const createIdleDragState = (): DragState => ({
  dragging: false,
  pointerId: -1,
  pointerTarget: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  maxX: Number.POSITIVE_INFINITY,
  maxY: Number.POSITIVE_INFINITY,
});

const createIdleResizeState = (): ResizeState => ({
  resizing: false,
  edgeX: null,
  edgeY: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startPosX: 0,
  startPosY: 0,
});

export const useWindowInteractions = ({
  id,
  windowData,
}: UseWindowInteractionsOptions) => {
  const focusWindow = useWindowsManagerStore((state) => state.focusWindow);
  const setWindowLayoutMode = useWindowsManagerStore(
    (state) => state.setWindowLayoutMode
  );
  const updateWindowPosition = useWindowsManagerStore(
    (state) => state.updateWindowPosition
  );
  const updateWindowBounds = useWindowsManagerStore(
    (state) => state.updateWindowBounds
  );
  const horizontalDockSplit = useWindowsManagerStore(
    (state) => state.horizontalDockSplit
  );
  const setHorizontalDockSplit = useWindowsManagerStore(
    (state) => state.setHorizontalDockSplit
  );

  const [dockPreview, setDockPreview] = useState<DockTarget>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDockAnimating, setIsDockAnimating] = useState(false);
  const dockAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousBoundsRef = useRef<Bounds | null>(null);
  const dragState = useRef<DragState>(createIdleDragState());
  const resizeState = useRef<ResizeState>(createIdleResizeState());
  const splitResizeActive = useRef(false);
  const layoutMode = windowData.layoutMode;

  const applyDock = useCallback(
    (target: Exclude<DockTarget, null>) => {
      if (dockAnimationTimer.current) clearTimeout(dockAnimationTimer.current);
      setIsDockAnimating(true);
      dockAnimationTimer.current = setTimeout(
        () => setIsDockAnimating(false),
        DOCK_ANIMATION_DURATION_MS
      );
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();

      if (target === DockTargets.top) {
        previousBoundsRef.current = {
          x: windowData.x,
          y: windowData.y,
          width: windowData.width,
          height: windowData.height,
        };
        updateWindowBounds(id, {
          x: 0,
          y: 0,
          width: Math.max(MIN_WINDOW_WIDTH, viewportWidth),
          height: Math.max(MIN_WINDOW_HEIGHT, desktopHeight),
        });
        setWindowLayoutMode(id, WindowLayoutModes.maximized);
        return;
      }

      const oppositeLayout =
        target === DockTargets.left
          ? WindowLayoutModes.dockedRight
          : WindowLayoutModes.dockedLeft;
      const oppositeWindow = useWindowsManagerStore
        .getState()
        .windows.find(
          (candidate) =>
            candidate.id !== id &&
            !candidate.isMinimized &&
            candidate.layoutMode === oppositeLayout
        );
      const dockSplit = oppositeWindow
        ? clampDockSplitRatio(
            target === DockTargets.left
              ? oppositeWindow.x / viewportWidth
              : (oppositeWindow.x + oppositeWindow.width) / viewportWidth
          )
        : 0.5;
      setHorizontalDockSplit(dockSplit);

      previousBoundsRef.current = {
        x: windowData.x,
        y: windowData.y,
        width: windowData.width,
        height: windowData.height,
      };
      const leftWidth = getLeftDockWidth(viewportWidth, dockSplit);
      const width =
        target === DockTargets.left ? leftWidth : Math.max(0, viewportWidth - leftWidth);

      updateWindowBounds(id, {
        x: target === DockTargets.left ? 0 : Math.max(0, viewportWidth - width),
        y: 0,
        width,
        height: Math.max(MIN_WINDOW_HEIGHT, desktopHeight),
      });
      setWindowLayoutMode(
        id,
        target === DockTargets.left
          ? WindowLayoutModes.dockedLeft
          : WindowLayoutModes.dockedRight
      );
    },
    [
      id,
      setHorizontalDockSplit,
      setWindowLayoutMode,
      updateWindowBounds,
      windowData,
    ]
  );

  const resetDragState = useCallback(() => {
    dragState.current = createIdleDragState();
    setDockPreview(null);
  }, []);

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
    [id, updateWindowPosition]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
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
    },
    [applyDock, resetDragState]
  );

  const startDrag: React.PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest("button, [data-no-drag='true']")
      ) {
        return;
      }

      if (dockAnimationTimer.current) {
        clearTimeout(dockAnimationTimer.current);
        dockAnimationTimer.current = null;
      }
      setIsDockAnimating(false);
      focusWindow(id);
      setDockPreview(null);
      event.preventDefault();

      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      let baseX = windowData.x;
      let baseY = windowData.y;
      let width = windowData.width;
      let height = windowData.height;

      // Dragging a snapped or maximized window first restores it to its last freeform bounds,
      // then continues the drag with the pointer anchored near the titlebar position.
      if (layoutMode !== WindowLayoutModes.normal) {
        const fallback = {
          x: Math.max(0, Math.floor((viewportWidth - MIN_WINDOW_WIDTH) / 2)),
          y: 64,
          width: Math.max(MIN_WINDOW_WIDTH, Math.floor(viewportWidth * 0.7)),
          height: Math.max(
            MIN_WINDOW_HEIGHT,
            Math.floor((viewportHeight - TASKBAR_HEIGHT) * 0.7)
          ),
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
        setWindowLayoutMode(id, WindowLayoutModes.normal);
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
    },
    [focusWindow, id, layoutMode, setWindowLayoutMode, updateWindowBounds, windowData]
  );

  const handleResizeMove = useCallback(
    (event: ResizeMoveEvent) => {
      if (!resizeState.current.resizing || layoutMode === WindowLayoutModes.maximized) {
        return;
      }

      event.preventDefault();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const deltaX = event.clientX - resizeState.current.startX;
      const deltaY = event.clientY - resizeState.current.startY;

      let newX = resizeState.current.startPosX;
      let newY = resizeState.current.startPosY;
      let newWidth =
        resizeState.current.edgeX === ResizeHorizontalEdges.right
          ? resizeState.current.startWidth + deltaX
          : resizeState.current.edgeX === ResizeHorizontalEdges.left
            ? resizeState.current.startWidth - deltaX
            : resizeState.current.startWidth;
      let newHeight =
        resizeState.current.edgeY === "bottom"
          ? resizeState.current.startHeight + deltaY
          : resizeState.current.edgeY === "top"
            ? resizeState.current.startHeight - deltaY
            : resizeState.current.startHeight;

      if (resizeState.current.edgeX === ResizeHorizontalEdges.left) {
        const maxLeftShift =
          resizeState.current.startPosX + resizeState.current.startWidth - MIN_WINDOW_WIDTH;
        const clampedShift = Math.max(
          Math.min(deltaX, maxLeftShift),
          -resizeState.current.startPosX
        );
        newX = resizeState.current.startPosX + clampedShift;
        newWidth = resizeState.current.startWidth + (resizeState.current.startPosX - newX);
      } else if (resizeState.current.edgeX === ResizeHorizontalEdges.right) {
        const maxWidth = viewportWidth - resizeState.current.startPosX;
        newWidth = Math.min(Math.max(newWidth, MIN_WINDOW_WIDTH), maxWidth);
      }

      if (resizeState.current.edgeY === "top") {
        const maxTopShift =
          resizeState.current.startPosY + resizeState.current.startHeight - MIN_WINDOW_HEIGHT;
        const clampedShift = Math.max(
          Math.min(deltaY, maxTopShift),
          -resizeState.current.startPosY
        );
        newY = resizeState.current.startPosY + clampedShift;
        newHeight = resizeState.current.startHeight + (resizeState.current.startPosY - newY);
      } else if (resizeState.current.edgeY === "bottom") {
        const maxHeight = viewportHeight - TASKBAR_HEIGHT - resizeState.current.startPosY;
        newHeight = Math.min(Math.max(newHeight, MIN_WINDOW_HEIGHT), maxHeight);
      }

      updateWindowBounds(id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    },
    [id, layoutMode, updateWindowBounds]
  );

  const handleResizeUp = useCallback(() => {
    resizeState.current.resizing = false;
    setIsResizing(false);
    window.removeEventListener("pointermove", handleResizeMove);
    window.removeEventListener("mousemove", handleResizeMove);
  }, [handleResizeMove]);

  const handleSplitResizeMove = useCallback(
    (event: ResizeMoveEvent) => {
      if (!splitResizeActive.current) return;
      event.preventDefault();
      const { width } = getDesktopBounds();
      if (width <= 0) return;
      setHorizontalDockSplit(clampDockSplitRatio(event.clientX / width));
    },
    [setHorizontalDockSplit]
  );

  const handleSplitResizeUp = useCallback(() => {
    splitResizeActive.current = false;
    setIsResizing(false);
    window.removeEventListener("pointermove", handleSplitResizeMove);
    window.removeEventListener("mousemove", handleSplitResizeMove);
  }, [handleSplitResizeMove]);

  const beginSplitResize = useCallback(() => {
    focusWindow(id);
    splitResizeActive.current = true;
    setIsResizing(true);
    window.addEventListener("pointermove", handleSplitResizeMove);
    window.addEventListener("mousemove", handleSplitResizeMove);
    window.addEventListener("pointerup", handleSplitResizeUp, { once: true });
    window.addEventListener("mouseup", handleSplitResizeUp, { once: true });
  }, [focusWindow, handleSplitResizeMove, handleSplitResizeUp, id]);

  const startSplitResize: React.PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginSplitResize();
    },
    [beginSplitResize]
  );

  const startSplitResizeMouse: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!splitResizeActive.current) beginSplitResize();
    },
    [beginSplitResize]
  );

  useEffect(
    () => () => {
      if (dockAnimationTimer.current) clearTimeout(dockAnimationTimer.current);
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeUp);
      window.removeEventListener("mouseup", handleResizeUp);
      window.removeEventListener("pointermove", handleSplitResizeMove);
      window.removeEventListener("mousemove", handleSplitResizeMove);
      window.removeEventListener("pointerup", handleSplitResizeUp);
      window.removeEventListener("mouseup", handleSplitResizeUp);
    },
    [handleResizeMove, handleResizeUp, handleSplitResizeMove, handleSplitResizeUp]
  );

  const beginResize = useCallback(
    (
      edgeX: ResizeHorizontalEdge,
      edgeY: ResizeVerticalEdge,
      clientX: number,
      clientY: number
    ) => {
      if (layoutMode === WindowLayoutModes.maximized || !windowData) {
        return;
      }

      focusWindow(id);
      setIsResizing(true);
      resizeState.current = {
        resizing: true,
        edgeX,
        edgeY,
        startX: clientX,
        startY: clientY,
        startWidth: windowData.width,
        startHeight: windowData.height,
        startPosX: windowData.x,
        startPosY: windowData.y,
      };
      window.addEventListener("pointermove", handleResizeMove);
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("pointerup", handleResizeUp, { once: true });
      window.addEventListener("mouseup", handleResizeUp, { once: true });
    },
    [focusWindow, handleResizeMove, handleResizeUp, id, layoutMode, windowData]
  );

  const startResize = useCallback(
    (edgeX: ResizeHorizontalEdge, edgeY: ResizeVerticalEdge) =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.preventDefault();
        beginResize(edgeX, edgeY, event.clientX, event.clientY);
      },
    [beginResize]
  );

  const startResizeMouse = useCallback(
    (edgeX: ResizeHorizontalEdge, edgeY: ResizeVerticalEdge) =>
      (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.preventDefault();
        beginResize(edgeX, edgeY, event.clientX, event.clientY);
      },
    [beginResize]
  );

  const toggleMaximize = useCallback(() => {
    if (
      layoutMode === WindowLayoutModes.maximized &&
      previousBoundsRef.current
    ) {
      updateWindowBounds(id, previousBoundsRef.current);
      setWindowLayoutMode(id, WindowLayoutModes.normal);
      return;
    }

    previousBoundsRef.current = {
      x: windowData.x,
      y: windowData.y,
      width: windowData.width,
      height: windowData.height,
    };

    const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
    updateWindowBounds(id, {
      x: 0,
      y: 0,
      width: Math.max(MIN_WINDOW_WIDTH, viewportWidth),
      height: Math.max(MIN_WINDOW_HEIGHT, desktopHeight),
    });
    setWindowLayoutMode(id, WindowLayoutModes.maximized);
  }, [id, layoutMode, setWindowLayoutMode, updateWindowBounds, windowData]);

  useEffect(() => {
    if (layoutMode !== WindowLayoutModes.maximized) return;

    const handleViewportResize = () => {
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      updateWindowBounds(id, {
        x: 0,
        y: 0,
        width: Math.max(MIN_WINDOW_WIDTH, viewportWidth),
        height: Math.max(MIN_WINDOW_HEIGHT, desktopHeight),
      });
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [id, layoutMode, updateWindowBounds]);

  useEffect(() => {
    if (
      layoutMode !== WindowLayoutModes.dockedLeft &&
      layoutMode !== WindowLayoutModes.dockedRight
    ) {
      return;
    }

    const applyDockedBounds = () => {
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      const leftWidth = getLeftDockWidth(viewportWidth, horizontalDockSplit);
      const isLeft = layoutMode === WindowLayoutModes.dockedLeft;
      updateWindowBounds(id, {
        x: isLeft ? 0 : leftWidth,
        y: 0,
        width: isLeft ? leftWidth : Math.max(0, viewportWidth - leftWidth),
        height: Math.max(MIN_WINDOW_HEIGHT, desktopHeight),
      });
    };

    applyDockedBounds();
    window.addEventListener("resize", applyDockedBounds);
    return () => window.removeEventListener("resize", applyDockedBounds);
  }, [horizontalDockSplit, id, layoutMode, updateWindowBounds]);

  return {
    dockPreview,
    isDockAnimating,
    isResizing,
    layoutMode,
    previousBoundsRef,
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
  };
};
