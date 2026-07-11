import { WindowLayoutModes, type WindowState } from "@/desktop/stores/WindowsStore";
import { getDesktopBounds } from "./windowing/utils";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";

type WindowSplitDividerProps = {
  windowData: WindowState;
  windows: WindowState[];
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
};

const WindowSplitDivider = ({
  windowData,
  windows,
  onPointerDown,
}: WindowSplitDividerProps) => {
  const horizontalDockSplit = useWindowsManagerStore((state) => state.horizontalDockSplit);
  const setHorizontalDockSplit = useWindowsManagerStore((state) => state.setHorizontalDockSplit);
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
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setHorizontalDockSplit(horizontalDockSplit + direction * 0.02);
      }}
      data-testid="window-split-divider"
      role="separator"
      aria-label="Resize docked windows"
      aria-orientation="vertical"
      aria-valuemin={20}
      aria-valuemax={80}
      aria-valuenow={Math.round(horizontalDockSplit * 100)}
      tabIndex={0}
    />
  );
};

export default WindowSplitDivider;
