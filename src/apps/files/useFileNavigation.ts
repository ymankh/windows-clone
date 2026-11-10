import { useState } from "react";
import {
  getAppById,
  resolveDefaultApp,
  useDesktopApps,
  useFileAssociationsStore,
} from "@/apps";
import { buildAppWindow } from "@/apps/windowBuilder";
import { toAppInstanceId } from "@/apps/windowing";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import type {
  FileEntry,
  FolderItem,
  OpenWithOption,
  Selection,
} from "./components/types";
import { folderContents, folderIndex, getFolderPath } from "./filesystemData";

export const useFileNavigation = () => {
  const [selection, setSelection] = useState<Selection>({
    folderId: "documents",
    item: null,
  });
  const [openError, setOpenError] = useState<string | null>(null);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  // Subscribing keeps "Open with" and default handling current when apps are
  // installed or uninstalled, or the user picks a new default.
  const apps = useDesktopApps();
  const fileDefaults = useFileAssociationsStore((state) => state.defaults);
  const setDefaultApp = useFileAssociationsStore((state) => state.setDefaultApp);
  const selectedFolderId = selection.folderId;

  const openFolder = (id: string | undefined) => {
    if (!id || !folderIndex.has(id)) return;
    setSelection({ folderId: id, item: null });
    setOpenError(null);
  };

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] => {
    if (item.type !== "file") return [];
    const defaultApp = resolveDefaultApp(apps, fileDefaults, item.fileType);
    return apps
      .filter((app) =>
        app.fileCapabilities?.some((capability) => capability.fileType === item.fileType)
      )
      .map((app) => ({
        id: app.id,
        title: app.title,
        Icon: app.icon,
        isDefault: app.id === defaultApp?.id,
      }));
  };

  const openApp = (appId: string, file: FileEntry) => {
    const app = getAppById(appId);
    if (!app) return;
    const windowId =
      app.id === "music"
        ? app.id
        : toAppInstanceId(app.id, `${selectedFolderId}-${file.name}`);
    openWindow(
      buildAppWindow(app, {
        windowId,
        fileContext: { name: file.name, type: file.fileType, data: file.data },
      })
    );
    setOpenError(null);
  };

  const openItem = (item: FolderItem) => {
    setSelection((current) => ({ ...current, item: item.name }));
    if (item.type === "folder") {
      openFolder(item.targetId);
      return;
    }
    const defaultApp = resolveDefaultApp(apps, fileDefaults, item.fileType);
    if (defaultApp) openApp(defaultApp.id, item);
    else setOpenError(`No installed app can open ${item.name}.`);
  };

  return {
    items: folderContents[selectedFolderId] ?? [],
    openError,
    openFolder,
    openItem,
    openWith: (item: FolderItem, appId: string) =>
      item.type === "file" && openApp(appId, item),
    setDefaultApp: (item: FolderItem, appId: string) => {
      if (item.type === "file") setDefaultApp(item.fileType, appId);
    },
    path: getFolderPath(selectedFolderId),
    resolveOpenWithOptions,
    selectedFolder: folderIndex.get(selectedFolderId)?.name ?? "Documents",
    selectedFolderId,
    selectedItem: selection.item,
    selectItem: (item: string) =>
      setSelection((current) => ({ ...current, item })),
  };
};
