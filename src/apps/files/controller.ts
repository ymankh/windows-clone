import type { DesktopApp } from "@/apps/types";
import { buildAppWindow } from "@/apps/windowBuilder";
import { toAppInstanceId } from "@/apps/windowing";
import type { OpenWindowPayload } from "@/desktop/stores/WindowsStore";
import { FileEntryTypes, type FileEntry, type FolderItem } from "./componsnts/types";
import { findVirtualFile } from "./data";

export type AppRegistry = ReadonlyMap<string, DesktopApp>;

export type OpenWindow = (window: OpenWindowPayload) => void;

export type OpenWithOptionData = {
  id: string;
  title: string;
  Icon: DesktopApp["icon"];
};

export type VirtualFileOpenRequest = {
  path?: string;
  folderId?: string;
  name?: string;
  appId?: string;
};

export type VirtualFileOpenResult =
  | {
      ok: true;
      windowId: string;
      appId: string;
      appTitle: string;
      fileName: string;
      fileType: FileEntry["fileType"];
    }
  | {
      ok: false;
      error: string;
    };

export const createAppRegistry = (apps: readonly DesktopApp[]) =>
  new Map(apps.map((app) => [app.id, app]));

export const resolveOpenWithOptions = (
  item: FolderItem,
  appRegistry: AppRegistry
): OpenWithOptionData[] => {
  if (item.type !== FileEntryTypes.file) return [];
  return Array.from(appRegistry.values())
    .filter((app) =>
      app.fileCapabilities?.some((capability) => capability.fileType === item.fileType)
    )
    .map((app) => ({
      id: app.id,
      title: app.title,
      Icon: app.icon,
    }));
};

export const createFileWindowId = (appId: string, fileName: string) => {
  if (appId === "music") return appId;
  return toAppInstanceId(
    appId,
    `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
};

export const openFileEntry = ({
  file,
  appId,
  appRegistry,
  openWindow,
}: {
  file: FileEntry;
  appId: string;
  appRegistry: AppRegistry;
  openWindow: OpenWindow;
}): VirtualFileOpenResult => {
  const app = appRegistry.get(appId);
  if (!app) return { ok: false, error: `Unknown app: ${appId}` };

  const supportsFile = app.fileCapabilities?.some(
    (capability) => capability.fileType === file.fileType
  );
  if (!supportsFile) {
    return { ok: false, error: `${app.title} cannot open ${file.fileType} files` };
  }

  const windowId = createFileWindowId(app.id, file.name);
  openWindow(
    buildAppWindow(app, {
      windowId,
      fileContext: {
        name: file.name,
        type: file.fileType,
        data: file.data,
      },
    })
  );

  return {
    ok: true,
    windowId,
    appId: app.id,
    appTitle: app.title,
    fileName: file.name,
    fileType: file.fileType,
  };
};

export const openVirtualFile = ({
  request,
  appRegistry,
  openWindow,
}: {
  request: VirtualFileOpenRequest;
  appRegistry: AppRegistry;
  openWindow: OpenWindow;
}): VirtualFileOpenResult => {
  const match = findVirtualFile(request);
  if (!match) return { ok: false, error: "Virtual file not found" };

  const defaultAppId = resolveOpenWithOptions(match.file, appRegistry)[0]?.id;
  const appId = request.appId ?? defaultAppId;
  if (!appId) return { ok: false, error: `No app can open ${match.file.fileType} files` };

  return openFileEntry({
    file: match.file,
    appId,
    appRegistry,
    openWindow,
  });
};
