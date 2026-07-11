import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { getDesktopBounds, getLeftDockWidth, getRenderedDockSplit } from "./windowing/utils";
import { DockTargets, type DockTarget } from "./windowing/types";

type WindowDockPreviewProps = {
  windowId: string;
  dockPreview: DockTarget;
};

const WindowDockPreview = ({ windowId, dockPreview }: WindowDockPreviewProps) => {
  if (!dockPreview) return null;
  if (typeof document === "undefined") return null;

  const { width: viewportWidth, height: desktopHeight } = getDesktopBounds();
  if (dockPreview === DockTargets.top) {
    return createPortal(
      <motion.div
        data-testid="window-dock-preview"
        data-dock-target={dockPreview}
        className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        style={{ left: 0, top: 0, width: viewportWidth, height: desktopHeight }}
      />,
      document.body
    );
  }

  const availableSplit =
    getRenderedDockSplit(dockPreview, windowId, viewportWidth) ?? 0.5;
  const leftWidth = getLeftDockWidth(viewportWidth, availableSplit);
  const previewWidth =
    dockPreview === DockTargets.left ? leftWidth : Math.max(0, viewportWidth - leftWidth);

  return createPortal(
    <motion.div
      data-testid="window-dock-preview"
      data-dock-target={dockPreview}
      className="pointer-events-none fixed z-[9998] border border-primary/70 bg-primary/15"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
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
