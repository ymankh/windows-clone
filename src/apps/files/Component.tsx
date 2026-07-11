import { useMemo, useState } from "react";
import { Split } from "@/components/ui/split";
import { desktopApps } from "@/apps";
import { buildAppWindow } from "@/apps/windowBuilder";
import { toAppInstanceId } from "@/apps/windowing";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { FilesGrid } from "./components/FilesGrid";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import {
  type FileEntry,
  type FolderItem,
  type OpenWithOption,
  type Selection,
} from "./components/types";
import {
  folderContents,
  folderIndex,
  folderTree,
  getFolderPath,
} from "./filesystemData";

const appRegistry = new Map(desktopApps.map((app) => [app.id, app]));
const fileAssociations = new Map(
  desktopApps.flatMap((app) =>
    (app.fileCapabilities ?? []).map((capability) => [capability.fileType, app] as const)
  )
);

const FilesComponent = () => {
  const [selection, setSelection] = useState<Selection>({
    folderId: "documents",
    item: null,
  });
  const [openError, setOpenError] = useState<string | null>(null);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const selectedFolderId = selection.folderId;

  const selectedFolder = useMemo(
    () => folderIndex.get(selectedFolderId)?.name ?? "Documents",
    [selectedFolderId]
  );
  const items = folderContents[selectedFolderId] ?? [];

  const openFolder = (id: string | undefined) => {
    if (!id || !folderIndex.has(id)) return;
    setSelection({ folderId: id, item: null });
    setOpenError(null);
  };

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] => {
    if (item.type !== "file") return [];
    const app = fileAssociations.get(item.fileType);
    return app ? [{ id: app.id, title: app.title, Icon: app.icon }] : [];
  };

  const openApp = (appId: string, file: FileEntry) => {
    const app = appRegistry.get(appId);
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

  const handleOpen = (item: FolderItem) => {
    setSelection((current) => ({ ...current, item: item.name }));
    if (item.type === "folder") {
      openFolder(item.targetId);
      return;
    }
    const defaultApp = resolveOpenWithOptions(item)[0];
    if (defaultApp) openApp(defaultApp.id, item);
    else setOpenError(`No installed app can open ${item.name}.`);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      <Split className="min-h-0 flex-1" initialLeft={260} minLeft={200} minRight={300}>
        <Sidebar
          tree={folderTree}
          selectedFolderId={selectedFolderId}
          onFolderSelect={openFolder}
        />
        <div className="flex h-full flex-col bg-background">
          <Header path={getFolderPath(selectedFolderId)} label={selectedFolder} />
          {openError ? (
            <p role="alert" className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {openError}
            </p>
          ) : null}
          <div className="flex-1 overflow-auto p-4">
            <FilesGrid
              items={items}
              selectedItem={selection.item}
              onSelect={(item) => setSelection((current) => ({ ...current, item }))}
              onOpenFolder={(item) => item.type === "folder" && openFolder(item.targetId)}
              onOpen={handleOpen}
              resolveOpenWith={resolveOpenWithOptions}
              onOpenWith={(item, appId) => item.type === "file" && openApp(appId, item)}
            />
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
