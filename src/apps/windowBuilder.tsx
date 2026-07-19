import type { DesktopApp } from "./types";
import type { FileType } from "./fileTypes";

export type BuildAppWindowOptions = {
  windowId?: string;
  title?: string;
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
    appId: app.id,
    fileContext: validatedFileContext,
    minWidth: app.minSize?.width,
    minHeight: app.minSize?.height,
  };
};
