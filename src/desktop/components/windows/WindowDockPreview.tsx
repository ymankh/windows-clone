import { createPortal } from "react-dom";
import { getDesktopBounds, getLeftDockWidth } from "./windowing/utils";
import { DockTargets, type DockTarget } from "./windowing/types";

type WindowDockPreviewProps = {
  dockPreview: DockTarget;
};

const WindowDockPreview = ({ dockPreview }: WindowDockPreviewProps) => {
  if (!dockPreview) return null;
  if (typeof document === "undefined") return null;

  const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
  if (dockPreview === DockTargets.top) {
    return createPortal(
      <div
        className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
        style={{ left: 0, top: 0, width: viewportWidth, height: desktopHeight }}
      />,
      document.body
    );
  }

  const leftWidth = getLeftDockWidth(viewportWidth, 0.5);
  const previewWidth =
    dockPreview === DockTargets.left ? leftWidth : Math.max(0, viewportWidth - leftWidth);

  return createPortal(
    <div
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
