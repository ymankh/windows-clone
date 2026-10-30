import { useCallback, useEffect, useRef, useState } from "react";
import useWindowsManagerStore, {
  WindowLayoutModes,
  type WindowState,
} from "@/desktop/stores/WindowsStore";
import { TASKBAR_HEIGHT } from "./constants";
import {
  ResizeHorizontalEdges,
  type ResizeHorizontalEdge,
  type ResizeVerticalEdge,
} from "./types";
import { clampDockSplitRatio, getDesktopBounds } from "./utils";

type UseWindowResizeOptions = {
  id: string;
  windowData: WindowState;
  minWidth: number;
  minHeight: number;
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

export const useWindowResize = ({
  id,
  windowData,
  minWidth,
  minHeight,
}: UseWindowResizeOptions) => {
  const activateWindow = useWindowsManagerStore((state) => state.activateWindow);
  const updateWindowBounds = useWindowsManagerStore(
    (state) => state.updateWindowBounds
  );
  const setHorizontalDockSplit = useWindowsManagerStore(
    (state) => state.setHorizontalDockSplit
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeState = useRef<ResizeState>(createIdleResizeState());
  const splitResizeActive = useRef(false);
  const resizeListenersAbort = useRef<AbortController | undefined>(undefined);
  const splitResizeListenersAbort = useRef<AbortController | undefined>(undefined);
  const layoutMode = windowData.layoutMode;

  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
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
          resizeState.current.startPosX + resizeState.current.startWidth - minWidth;
        const clampedShift = Math.max(
          Math.min(deltaX, maxLeftShift),
          -resizeState.current.startPosX
        );
        newX = resizeState.current.startPosX + clampedShift;
        newWidth = resizeState.current.startWidth + (resizeState.current.startPosX - newX);
      } else if (resizeState.current.edgeX === ResizeHorizontalEdges.right) {
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
        newHeight = resizeState.current.startHeight + (resizeState.current.startPosY - newY);
      } else if (resizeState.current.edgeY === "bottom") {
        const maxHeight = viewportHeight - TASKBAR_HEIGHT - resizeState.current.startPosY;
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

  const handleResizeEnd = useCallback(() => {
    resizeState.current.resizing = false;
    setIsResizing(false);
    resizeListenersAbort.current?.abort();
    resizeListenersAbort.current = undefined;
  }, []);

  const handleSplitResizeMove = useCallback(
    (event: PointerEvent) => {
      if (!splitResizeActive.current) return;
      event.preventDefault();
      const { width } = getDesktopBounds();
      if (width <= 0) return;
      setHorizontalDockSplit(clampDockSplitRatio(event.clientX / width));
    },
    [setHorizontalDockSplit]
  );

  const handleSplitResizeEnd = useCallback(() => {
    splitResizeActive.current = false;
    setIsResizing(false);
    splitResizeListenersAbort.current?.abort();
    splitResizeListenersAbort.current = undefined;
  }, []);

  const startSplitResize: React.PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      activateWindow(id);
      splitResizeActive.current = true;
      setIsResizing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      splitResizeListenersAbort.current?.abort();
      const controller = new AbortController();
      splitResizeListenersAbort.current = controller;
      const listenerOptions = { signal: controller.signal };
      const endListenerOptions = { once: true, signal: controller.signal };
      window.addEventListener("pointermove", handleSplitResizeMove, listenerOptions);
      window.addEventListener("pointerup", handleSplitResizeEnd, endListenerOptions);
      window.addEventListener("pointercancel", handleSplitResizeEnd, endListenerOptions);
    },
    [activateWindow, handleSplitResizeEnd, handleSplitResizeMove, id]
  );

  const startResize = useCallback(
    (edgeX: ResizeHorizontalEdge, edgeY: ResizeVerticalEdge) =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || layoutMode === WindowLayoutModes.maximized) return;
        event.stopPropagation();
        event.preventDefault();
        activateWindow(id);
        setIsResizing(true);
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
        event.currentTarget.setPointerCapture(event.pointerId);
        resizeListenersAbort.current?.abort();
        const controller = new AbortController();
        resizeListenersAbort.current = controller;
        const listenerOptions = { signal: controller.signal };
        const endListenerOptions = { once: true, signal: controller.signal };
        window.addEventListener("pointermove", handleResizeMove, listenerOptions);
        window.addEventListener("pointerup", handleResizeEnd, endListenerOptions);
        window.addEventListener("pointercancel", handleResizeEnd, endListenerOptions);
      },
    [activateWindow, handleResizeEnd, handleResizeMove, id, layoutMode, windowData]
  );

  useEffect(
    () => () => {
      resizeListenersAbort.current?.abort();
      splitResizeListenersAbort.current?.abort();
    },
    []
  );

  return { isResizing, startResize, startSplitResize };
};
