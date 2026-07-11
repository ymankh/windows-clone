import { createPortal } from "react-dom";
import useWindowsManagerStore, { WindowLayoutModes } from "@/desktop/stores/WindowsStore";
import { getDesktopBounds, getLeftDockWidth } from "./windowing/utils";
import { DockTargets, type DockTarget } from "./windowing/types";

type WindowDockPreviewProps = {
  windowId: string;
  dockPreview: DockTarget;
};

const WindowDockPreview = ({ windowId, dockPreview }: WindowDockPreviewProps) => {
  const windows = useWindowsManagerStore((state) => state.windows);
  if (!dockPreview) return null;
  if (typeof document === "undefined") return null;

  const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
  if (dockPreview === DockTargets.top) {
    return createPortal(
      <div
        data-testid="window-dock-preview"
        data-dock-target={dockPreview}
        className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
        style={{ left: 0, top: 0, width: viewportWidth, height: desktopHeight }}
      />,
      document.body
    );
  }

  const oppositeLayout =
    dockPreview === DockTargets.left
      ? WindowLayoutModes.dockedRight
      : WindowLayoutModes.dockedLeft;
  const oppositeWindow = windows.find(
    (candidate) =>
      candidate.id !== windowId &&
      !candidate.isMinimized &&
      candidate.layoutMode === oppositeLayout
  );
  const availableSplit = oppositeWindow
    ? dockPreview === DockTargets.left
      ? oppositeWindow.x / viewportWidth
      : (oppositeWindow.x + oppositeWindow.width) / viewportWidth
    : 0.5;
  const leftWidth = getLeftDockWidth(viewportWidth, availableSplit);
  const previewWidth =
    dockPreview === DockTargets.left ? leftWidth : Math.max(0, viewportWidth - leftWidth);

  return createPortal(
    <div
      data-testid="window-dock-preview"
      data-dock-target={dockPreview}
      className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
      style={{
        left: dockPreview === DockTargets.left ? 0 : Math.max(0, viewportWidth - previewWidth),
        top: 0,
        width: previewWidth,
        height: desktopHeight,
      }}
    />,
    document.body
  );
};

export default WindowDockPreview;
