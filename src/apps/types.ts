import type { ComponentType, SVGProps } from "react";
import type { WindowMenu } from "../modules/desktop/stores/WindowsStore";

export type DesktopApp = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  Component: ComponentType;
  menubar?: WindowMenu[];
};
