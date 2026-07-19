import type { ComponentType, ReactNode, SVGProps } from "react";

export type WindowProps = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
};

export const DockTargets = {
  left: "left",
  right: "right",
  top: "top",
} as const;

export type DockTarget = ((typeof DockTargets)[keyof typeof DockTargets]) | null;

export const ResizeHorizontalEdges = {
  left: "left",
  right: "right",
} as const;

export type ResizeHorizontalEdge =
  ((typeof ResizeHorizontalEdges)[keyof typeof ResizeHorizontalEdges]) | null;

export const ResizeVerticalEdges = {
  top: "top",
  bottom: "bottom",
} as const;

export type ResizeVerticalEdge =
  ((typeof ResizeVerticalEdges)[keyof typeof ResizeVerticalEdges]) | null;

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
