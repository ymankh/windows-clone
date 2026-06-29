import { Split } from "@/components/ui/split";
import { desktopApps } from "@/apps";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { useMemo, useState } from "react";
import { FilesGrid } from "./componsnts/FilesGrid";
import { Header } from "./componsnts/Header";
import { Sidebar } from "./componsnts/Sidebar";
import {
  FileEntryTypes,
  type FolderItem,
  type OpenWithOption,
  type Selection,
} from "./componsnts/types";
import {
  DEFAULT_FOLDER_ID,
  folderTree,
  getFolderContents,
  getFolderName,
  getFolderPath,
  hasFolder,
  resolveFolderId,
} from "./data";
import {
  createAppRegistry,
  openFileEntry,
  resolveOpenWithOptions as getOpenWithOptions,
} from "./controller";

const FilesComponent = () => {
  const [selection, setSelection] = useState<Selection>({
    folderId: DEFAULT_FOLDER_ID,
    item: null,
  });
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const appRegistry = useMemo(
    () => createAppRegistry(desktopApps),
    []
  );

  const selectedFolderId = selection.folderId;
  const selectedItem = selection.item;

  const selectedFolder = useMemo(
    () => getFolderName(selectedFolderId),
    [selectedFolderId]
  );

  const items = getFolderContents(selectedFolderId);
  const path = getFolderPath(selectedFolderId);

  const openFolder = (id: string | undefined) => {
    if (!id) return;
    if (hasFolder(id)) {
      setSelection({ folderId: id, item: null });
    }
  };

  const handleItemOpen = (item: FolderItem) =>
    item.type === "folder" && openFolder(resolveFolderId(item));

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] =>
    getOpenWithOptions(item, appRegistry);

  const openApp = (appId: string, item: FolderItem) => {
    if (item.type !== FileEntryTypes.file) return;
    openFileEntry({
      file: item,
      appId,
      appRegistry,
      openWindow,
    });
  };

  const openFileWithDefault = (item: FolderItem) => {
    if (item.type !== "file") return;
    const defaultTarget = resolveOpenWithOptions(item)[0];
    if (defaultTarget) {
      openApp(defaultTarget.id, item);
    }
  };

  const handleOpen = (item: FolderItem) => {
    setSelection((prev) => ({ ...prev, item: item.name }));
    if (item.type === "folder") {
      handleItemOpen(item);
      return;
    }
    openFileWithDefault(item);
  };

  const handleOpenWith = (item: FolderItem, appId: string) => {
    setSelection((prev) => ({ ...prev, item: item.name }));
    if (item.type !== "file") return;
    openApp(appId, item);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      <Split className="flex-1 min-h-0" initialLeft={260} minLeft={200} minRight={300}>
        <Sidebar
          tree={folderTree}
          selectedFolderId={selectedFolderId}
          onFolderSelect={(folderId) => setSelection({ folderId, item: null })}
        />

        <div className="flex h-full flex-col bg-background">
          <Header path={path} label={selectedFolder} />

          <div className="flex-1 overflow-auto p-4">
            <FilesGrid
              items={items}
              selectedItem={selectedItem}
              onSelect={(itemName) =>
                setSelection((prev) => ({
                  ...prev,
                  item: itemName,
                }))
              }
              onOpenFolder={handleItemOpen}
              onOpen={handleOpen}
              resolveOpenWith={resolveOpenWithOptions}
              onOpenWith={handleOpenWith}
            />
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
