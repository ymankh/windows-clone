import { WindowLayoutModes, type WindowState } from "@/desktop/stores/WindowsStore";
import { getDesktopBounds } from "./windowing/utils";

type WindowSplitDividerProps = {
  windowData: WindowState;
  windows: WindowState[];
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
};

const WindowSplitDivider = ({
  windowData,
  windows,
  onPointerDown,
  onMouseDown,
}: WindowSplitDividerProps) => {
  if (
    windowData.layoutMode !== WindowLayoutModes.dockedLeft &&
    windowData.layoutMode !== WindowLayoutModes.dockedRight
  ) {
    return null;
  }

  const rightPartner = windows.find(
    (candidate) =>
      candidate.id !== windowData.id &&
      !candidate.isMinimized &&
      candidate.layoutMode === WindowLayoutModes.dockedRight
  );

  if (windowData.layoutMode === WindowLayoutModes.dockedRight || !rightPartner) {
    return null;
  }

  const { height: desktopHeight } = getDesktopBounds();
  const dividerLeft =
    windowData.layoutMode === WindowLayoutModes.dockedLeft
      ? windowData.x + windowData.width
      : windowData.x;
  return (
    <div
      className="fixed top-0 z-[10000] h-full w-3 -translate-x-1/2 cursor-col-resize"
      style={{ left: dividerLeft, height: desktopHeight }}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      data-testid="window-split-divider"
      aria-hidden="true"
    />
  );
};

export default WindowSplitDivider;
