import { Split } from "@/components/ui/split";
import { FilesGrid } from "./components/FilesGrid";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { folderTree } from "./filesystemData";
import { useFileNavigation } from "./useFileNavigation";

const FilesComponent = () => {
  const {
    items,
    openError,
    openFolder,
    openItem,
    openWith,
    path,
    resolveOpenWithOptions,
    selectedFolder,
    selectedFolderId,
    selectedItem,
    selectItem,
  } = useFileNavigation();

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      <Split className="min-h-0 flex-1" initialLeft={260} minLeft={200} minRight={300}>
        <Sidebar
          tree={folderTree}
          selectedFolderId={selectedFolderId}
          onFolderSelect={openFolder}
        />
        <div className="flex h-full flex-col bg-background">
          <Header path={path} label={selectedFolder} />
          {openError ? (
            <p role="alert" className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {openError}
            </p>
          ) : null}
          <div className="flex-1 overflow-auto p-4">
            <FilesGrid
              items={items}
              selectedItem={selectedItem}
              onSelect={selectItem}
              onOpenFolder={(item) => item.type === "folder" && openFolder(item.targetId)}
              onOpen={openItem}
              resolveOpenWith={resolveOpenWithOptions}
              onOpenWith={openWith}
            />
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
