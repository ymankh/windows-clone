import { createElement } from "react";
import type { AppWindowComponentProps, DesktopApp } from "./types";
import type { WindowMenu } from "@/desktop/stores/WindowsStore";
import type { FileType } from "./fileTypes";

export type BuildAppWindowOptions = {
  windowId?: string;
  title?: string;
  menubar?: WindowMenu[];
  fileContext?: {
    name: string;
    type: FileType;
    data: unknown;
  };
};

const validateFileContext = (
  app: DesktopApp,
  fileContext: BuildAppWindowOptions["fileContext"]
) => {
  if (!fileContext) return undefined;
  const capability = app.fileCapabilities?.find(
    ({ fileType }) => fileType === fileContext.type
  );
  if (!capability) return undefined;
  const parsed = capability.schema.safeParse(fileContext.data);
  if (!parsed.success) return undefined;
  return {
    ...fileContext,
    data: parsed.data,
  };
};

export const buildAppWindow = (
  app: DesktopApp,
  options: BuildAppWindowOptions = {}
) => {
  const windowId = options.windowId ?? app.id;
  const validatedFileContext = validateFileContext(app, options.fileContext);

  return {
    id: windowId,
    title: options.title ?? app.title,
    icon: app.icon,
    contentComponent: (props: AppWindowComponentProps) =>
      createElement(app.Component, props),
    contentProps: { windowId, fileContext: validatedFileContext },
    minWidth: app.minSize?.width,
    minHeight: app.minSize?.height,
    menubar: options.menubar ?? app.createMenubar?.(windowId) ?? app.menubar,
  };
};
