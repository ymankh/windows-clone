import type { MouseEventHandler, PointerEventHandler } from "react";
import {
  ResizeHorizontalEdges,
  ResizeVerticalEdges,
  type ResizeHorizontalEdge,
  type ResizeVerticalEdge,
} from "./windowing/types";

type WindowResizeHandlesProps = {
  startResize: (
    edgeX: ResizeHorizontalEdge,
    edgeY: ResizeVerticalEdge
  ) => PointerEventHandler<HTMLDivElement>;
  startResizeMouse: (
    edgeX: ResizeHorizontalEdge,
    edgeY: ResizeVerticalEdge
  ) => MouseEventHandler<HTMLDivElement>;
};

const WindowResizeHandles = ({
  startResize,
  startResizeMouse,
}: WindowResizeHandlesProps) => (
  <div className="pointer-events-none absolute inset-0">
    <div
      className="pointer-events-auto absolute inset-y-3 left-0 w-2 cursor-ew-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, null)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.left, null)}
      data-testid="window-resize-left"
    />
    <div
      className="pointer-events-auto absolute inset-y-3 right-0 w-2 cursor-ew-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, null)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.right, null)}
      data-testid="window-resize-right"
    />
    <div
      className="pointer-events-auto absolute inset-x-3 top-0 h-2 cursor-ns-resize"
      onPointerDown={startResize(null, ResizeVerticalEdges.top)}
      onMouseDown={startResizeMouse(null, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-0 h-2 cursor-ns-resize"
      onPointerDown={startResize(null, ResizeVerticalEdges.bottom)}
      onMouseDown={startResizeMouse(null, ResizeVerticalEdges.bottom)}
    />
    <div
      className="pointer-events-auto absolute left-0 top-0 h-3 w-3 cursor-nwse-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, ResizeVerticalEdges.top)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.left, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute right-0 top-0 h-3 w-3 cursor-nesw-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, ResizeVerticalEdges.top)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.right, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute left-0 bottom-0 h-3 w-3 cursor-nesw-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, ResizeVerticalEdges.bottom)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.left, ResizeVerticalEdges.bottom)}
    />
    <div
      className="pointer-events-auto absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, ResizeVerticalEdges.bottom)}
      onMouseDown={startResizeMouse(ResizeHorizontalEdges.right, ResizeVerticalEdges.bottom)}
    />
  </div>
);

export default WindowResizeHandles;
