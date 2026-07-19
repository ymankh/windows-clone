import type { WindowState } from "@/desktop/stores/WindowsStore";
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } from "./constants";
import { useWindowDocking } from "./useWindowDocking";
import { useWindowDrag } from "./useWindowDrag";
import { useWindowResize } from "./useWindowResize";

type UseWindowInteractionsOptions = {
  id: string;
  windowData: WindowState;
};

export const useWindowInteractions = ({
  id,
  windowData,
}: UseWindowInteractionsOptions) => {
  const minWidth = Math.max(MIN_WINDOW_WIDTH, windowData.minWidth);
  const minHeight = Math.max(MIN_WINDOW_HEIGHT, windowData.minHeight);
  const docking = useWindowDocking({ id, windowData, minWidth, minHeight });
  const drag = useWindowDrag({
    id,
    windowData,
    minWidth,
    minHeight,
    previousBoundsRef: docking.previousBoundsRef,
    applyDock: docking.applyDock,
    cancelDockAnimation: docking.cancelDockAnimation,
  });
  const resize = useWindowResize({ id, windowData, minWidth, minHeight });

  return {
    dockPreview: drag.dockPreview,
    isDockAnimating: docking.isDockAnimating,
    isResizing: resize.isResizing,
    layoutMode: windowData.layoutMode,
    startDrag: drag.startDrag,
    startResize: resize.startResize,
    startSplitResize: resize.startSplitResize,
    toggleMaximize: docking.toggleMaximize,
  };
};
