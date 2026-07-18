import { useState } from "react";
import { getAppById, getAppForFileType } from "@/apps";
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
  const selectedFolderId = selection.folderId;

  const openFolder = (id: string | undefined) => {
    if (!id || !folderIndex.has(id)) return;
    setSelection({ folderId: id, item: null });
    setOpenError(null);
  };

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] => {
    if (item.type !== "file") return [];
    const app = getAppForFileType(item.fileType);
    return app ? [{ id: app.id, title: app.title, Icon: app.icon }] : [];
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
    const defaultApp = getAppForFileType(item.fileType);
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
    path: getFolderPath(selectedFolderId),
    resolveOpenWithOptions,
    selectedFolder: folderIndex.get(selectedFolderId)?.name ?? "Documents",
    selectedFolderId,
    selectedItem: selection.item,
    selectItem: (item: string) =>
      setSelection((current) => ({ ...current, item })),
  };
};
