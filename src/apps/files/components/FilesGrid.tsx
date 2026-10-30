import { FileCard } from "./FileCard";
import { type FolderItem, type OpenWithOption } from "./types";

type FilesGridProps = {
  items: FolderItem[];
  selectedItem: string | null;
  onSelect: (name: string) => void;
  onOpenFolder: (item: FolderItem) => void;
  onOpen: (item: FolderItem) => void;
  resolveOpenWith: (item: FolderItem) => OpenWithOption[];
  onOpenWith: (item: FolderItem, appId: string) => void;
};

export const FilesGrid = ({
  items,
  selectedItem,
  onSelect,
  onOpenFolder,
  onOpen,
  resolveOpenWith,
  onOpenWith,
}: FilesGridProps) => {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">This folder is empty.</div>;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {items.map((item) => (
        <FileCard
          key={item.name}
          item={item}
          selected={selectedItem === item.name}
          onSelect={() => onSelect(item.name)}
          onOpenFolder={() => onOpenFolder(item)}
          onOpen={() => onOpen(item)}
          openWithOptions={resolveOpenWith(item)}
          onOpenWith={(appId) => onOpenWith(item, appId)}
        />
      ))}
    </div>
  );
};
