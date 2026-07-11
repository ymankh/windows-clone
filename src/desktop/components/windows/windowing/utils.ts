import { WindowLayoutModes, type WindowLayoutMode } from "@/desktop/stores/WindowsStore";
import {
  DOCK_EDGE_THRESHOLD,
  MAX_DOCK_SPLIT,
  MIN_DOCK_SPLIT,
  MIN_WINDOW_WIDTH,
  TASKBAR_HEIGHT,
} from "./constants";
import { DockTargets, type DockTarget } from "./types";

export const clampDockSplitRatio = (ratio: number) =>
  Math.min(Math.max(ratio, MIN_DOCK_SPLIT), MAX_DOCK_SPLIT);

export const getDesktopBounds = () => {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  return {
    width: viewportWidth,
    height: Math.max(0, viewportHeight - TASKBAR_HEIGHT),
  };
};

export const getDockTarget = (pointerX: number, pointerY: number): DockTarget => {
  const { width } = getDesktopBounds();

  if (pointerY <= DOCK_EDGE_THRESHOLD) return DockTargets.top;
  if (pointerX <= DOCK_EDGE_THRESHOLD) return DockTargets.left;
  if (pointerX >= width - DOCK_EDGE_THRESHOLD) return DockTargets.right;
  return null;
};

export const getLeftDockWidth = (
  viewportWidth: number,
  splitRatio: number,
  minWidth = MIN_WINDOW_WIDTH
) => {
  if (viewportWidth <= 0) return 0;
  const minimumLeft = Math.min(minWidth, viewportWidth);
  const maximumLeft = Math.max(minimumLeft, viewportWidth - minWidth);

  return Math.round(
    Math.min(
      Math.max(Math.round(viewportWidth * clampDockSplitRatio(splitRatio)), minimumLeft),
      maximumLeft
    )
  );
};

export const isDockedLayout = (layoutMode: WindowLayoutMode) =>
  layoutMode === WindowLayoutModes.dockedLeft ||
  layoutMode === WindowLayoutModes.dockedRight;
