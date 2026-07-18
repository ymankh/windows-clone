import { useCallback, useEffect, useRef, useState } from "react";
import useWindowsManagerStore, {
  WindowLayoutModes,
  type WindowState,
} from "@/desktop/stores/WindowsStore";
import { DOCK_ANIMATION_DURATION_MS } from "./constants";
import { DockTargets, type Bounds, type DockTarget } from "./types";
import {
  getDesktopBounds,
  getLeftDockWidth,
  getRenderedDockSplit,
} from "./utils";

type UseWindowDockingOptions = {
  id: string;
  windowData: WindowState;
  minWidth: number;
  minHeight: number;
};

export const useWindowDocking = ({
  id,
  windowData,
  minWidth,
  minHeight,
}: UseWindowDockingOptions) => {
  const setWindowLayoutMode = useWindowsManagerStore(
    (state) => state.setWindowLayoutMode
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
  const [isDockAnimating, setIsDockAnimating] = useState(false);
  const dockAnimationTimer = useRef<number | undefined>(undefined);
  const previousBoundsRef = useRef<Bounds | null>(null);
  const layoutMode = windowData.layoutMode;

  const startBoundsAnimation = useCallback(() => {
    clearTimeout(dockAnimationTimer.current);
    setIsDockAnimating(true);
    dockAnimationTimer.current = window.setTimeout(
      () => setIsDockAnimating(false),
      DOCK_ANIMATION_DURATION_MS
    );
  }, []);

  const cancelDockAnimation = useCallback(() => {
    clearTimeout(dockAnimationTimer.current);
    dockAnimationTimer.current = undefined;
    setIsDockAnimating(false);
  }, []);

  const applyDock = useCallback(
    (target: Exclude<DockTarget, null>) => {
      startBoundsAnimation();
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      previousBoundsRef.current = {
        x: windowData.x,
        y: windowData.y,
        width: windowData.width,
        height: windowData.height,
      };

      if (target === DockTargets.top) {
        updateWindowBounds(id, {
          x: 0,
          y: 0,
          width: Math.max(minWidth, viewportWidth),
          height: Math.max(minHeight, desktopHeight),
        });
        setWindowLayoutMode(id, WindowLayoutModes.maximized);
        return;
      }

      const dockSplit = getRenderedDockSplit(target, id, viewportWidth) ?? 0.5;
      setHorizontalDockSplit(dockSplit);
      const leftWidth = getLeftDockWidth(viewportWidth, dockSplit, minWidth);
      const width =
        target === DockTargets.left ? leftWidth : Math.max(0, viewportWidth - leftWidth);

      updateWindowBounds(id, {
        x: target === DockTargets.left ? 0 : Math.max(0, viewportWidth - width),
        y: 0,
        width,
        height: Math.max(minHeight, desktopHeight),
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
      minHeight,
      minWidth,
      setHorizontalDockSplit,
      setWindowLayoutMode,
      startBoundsAnimation,
      updateWindowBounds,
      windowData,
    ]
  );

  const toggleMaximize = useCallback(() => {
    startBoundsAnimation();
    if (layoutMode === WindowLayoutModes.maximized && previousBoundsRef.current) {
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
      width: Math.max(minWidth, viewportWidth),
      height: Math.max(minHeight, desktopHeight),
    });
    setWindowLayoutMode(id, WindowLayoutModes.maximized);
  }, [
    id,
    layoutMode,
    minHeight,
    minWidth,
    setWindowLayoutMode,
    startBoundsAnimation,
    updateWindowBounds,
    windowData,
  ]);

  useEffect(() => {
    if (layoutMode !== WindowLayoutModes.maximized) return;

    const handleViewportResize = () => {
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      updateWindowBounds(id, {
        x: 0,
        y: 0,
        width: Math.max(minWidth, viewportWidth),
        height: Math.max(minHeight, desktopHeight),
      });
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [id, layoutMode, minHeight, minWidth, updateWindowBounds]);

  useEffect(() => {
    if (
      layoutMode !== WindowLayoutModes.dockedLeft &&
      layoutMode !== WindowLayoutModes.dockedRight
    ) {
      return;
    }

    const applyDockedBounds = () => {
      const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
      const leftWidth = getLeftDockWidth(viewportWidth, horizontalDockSplit, minWidth);
      const isLeft = layoutMode === WindowLayoutModes.dockedLeft;
      updateWindowBounds(id, {
        x: isLeft ? 0 : leftWidth,
        y: 0,
        width: isLeft ? leftWidth : Math.max(0, viewportWidth - leftWidth),
        height: Math.max(minHeight, desktopHeight),
      });
    };

    applyDockedBounds();
    window.addEventListener("resize", applyDockedBounds);
    return () => window.removeEventListener("resize", applyDockedBounds);
  }, [horizontalDockSplit, id, layoutMode, minHeight, minWidth, updateWindowBounds]);

  useEffect(() => () => clearTimeout(dockAnimationTimer.current), []);

  return {
    applyDock,
    cancelDockAnimation,
    isDockAnimating,
    previousBoundsRef,
    toggleMaximize,
  };
};
