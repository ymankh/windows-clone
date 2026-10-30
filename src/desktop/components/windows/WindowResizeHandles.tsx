import type { PointerEventHandler } from "react";
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
};

const WindowResizeHandles = ({
  startResize,
}: WindowResizeHandlesProps) => (
  <div className="pointer-events-none absolute inset-0">
    <div
      className="pointer-events-auto absolute inset-y-3 left-0 w-2 cursor-ew-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, null)}
      data-testid="window-resize-left"
    />
    <div
      className="pointer-events-auto absolute inset-y-3 right-0 w-2 cursor-ew-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, null)}
      data-testid="window-resize-right"
    />
    <div
      className="pointer-events-auto absolute inset-x-3 top-0 h-2 cursor-ns-resize"
      onPointerDown={startResize(null, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-0 h-2 cursor-ns-resize"
      onPointerDown={startResize(null, ResizeVerticalEdges.bottom)}
    />
    <div
      className="pointer-events-auto absolute left-0 top-0 h-3 w-3 cursor-nwse-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute right-0 top-0 h-3 w-3 cursor-nesw-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, ResizeVerticalEdges.top)}
    />
    <div
      className="pointer-events-auto absolute left-0 bottom-0 h-3 w-3 cursor-nesw-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.left, ResizeVerticalEdges.bottom)}
    />
    <div
      className="pointer-events-auto absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
      onPointerDown={startResize(ResizeHorizontalEdges.right, ResizeVerticalEdges.bottom)}
    />
  </div>
);

export default WindowResizeHandles;
