import type { ComponentType, SVGProps } from "react";
import type { WindowMenu } from "../desktop/stores/WindowsStore";
import type { FileType } from "./fileTypes";
import type { ZodType } from "zod";

export type AppWindowComponentProps = {
  windowId?: string;
  fileContext?: {
    name: string;
    type: FileType;
    data: unknown;
  };
};

export type AppFileCapability = {
  fileType: FileType;
  schema: ZodType;
};

export type DesktopApp = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  Component: ComponentType<AppWindowComponentProps>;
  createMenubar?: (windowId: string) => WindowMenu[];
  fileCapabilities?: AppFileCapability[];
  menubar?: WindowMenu[];
};
