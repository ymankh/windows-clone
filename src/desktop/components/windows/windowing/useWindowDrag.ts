import { useCallback, useEffect, useRef, useState } from "react";
import useWindowsManagerStore, {
  WindowLayoutModes,
  type WindowState,
} from "@/desktop/stores/WindowsStore";
import { TASKBAR_HEIGHT } from "./constants";
import type { Bounds, DockTarget } from "./types";
import { getDockTarget } from "./utils";

type BoundsRef = { current: Bounds | null };

type UseWindowDragOptions = {
  id: string;
  windowData: WindowState;
  minWidth: number;
  minHeight: number;
  previousBoundsRef: BoundsRef;
  applyDock: (target: Exclude<DockTarget, null>) => void;
  cancelDockAnimation: () => void;
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

export const useWindowDrag = ({
  id,
  windowData,
  minWidth,
  minHeight,
  previousBoundsRef,
  applyDock,
  cancelDockAnimation,
}: UseWindowDragOptions) => {
  const activateWindow = useWindowsManagerStore((state) => state.activateWindow);
  const setWindowLayoutMode = useWindowsManagerStore(
    (state) => state.setWindowLayoutMode
  );
  const updateWindowPosition = useWindowsManagerStore(
    (state) => state.updateWindowPosition
  );
  const updateWindowBounds = useWindowsManagerStore(
    (state) => state.updateWindowBounds
  );
  const [dockPreview, setDockPreview] = useState<DockTarget>(null);
  const dockTargetRef = useRef<DockTarget>(null);
  const dragState = useRef<DragState>(createIdleDragState());
  const listenersAbort = useRef<AbortController | undefined>(undefined);
  const layoutMode = windowData.layoutMode;

  const resetDragState = useCallback(() => {
    dragState.current = createIdleDragState();
    dockTargetRef.current = null;
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
      const target = getDockTarget(event.clientX, event.clientY);
      dockTargetRef.current = target;
      setDockPreview(target);
    },
    [id, updateWindowPosition]
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent) => {
      listenersAbort.current?.abort();
      listenersAbort.current = undefined;
      const dockTarget = dockTargetRef.current ?? getDockTarget(event.clientX, event.clientY);
      if (event.type !== "pointercancel" && dragState.current.dragging && dockTarget) {
        applyDock(dockTarget);
      }

      const { pointerTarget, pointerId } = dragState.current;
      if (pointerTarget && pointerId >= 0 && pointerTarget.hasPointerCapture(pointerId)) {
        pointerTarget.releasePointerCapture(pointerId);
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

      cancelDockAnimation();
      activateWindow(id);
      setDockPreview(null);
      event.preventDefault();

      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      let baseX = windowData.x;
      let baseY = windowData.y;
      let width = windowData.width;
      let height = windowData.height;

      if (layoutMode !== WindowLayoutModes.normal) {
        const fallback = {
          x: Math.max(0, Math.floor((viewportWidth - minWidth) / 2)),
          y: 64,
          width: Math.max(minWidth, Math.floor(viewportWidth * 0.7)),
          height: Math.max(
            minHeight,
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
      listenersAbort.current?.abort();
      const controller = new AbortController();
      listenersAbort.current = controller;
      const listenerOptions = { signal: controller.signal };
      const endListenerOptions = { once: true, signal: controller.signal };
      window.addEventListener("pointermove", handlePointerMove, listenerOptions);
      window.addEventListener("pointerup", handlePointerEnd, endListenerOptions);
      window.addEventListener("pointercancel", handlePointerEnd, endListenerOptions);
    },
    [
      activateWindow,
      cancelDockAnimation,
      handlePointerEnd,
      handlePointerMove,
      id,
      layoutMode,
      minHeight,
      minWidth,
      previousBoundsRef,
      setWindowLayoutMode,
      updateWindowBounds,
      windowData,
    ]
  );

  useEffect(() => () => listenersAbort.current?.abort(), []);

  return { dockPreview, startDrag };
};
