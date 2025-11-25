import { FileCard } from "./FileCard";
import { type FolderItem } from "./types";

type FilesGridProps = {
  items: FolderItem[];
  selectedItem: string | null;
  onSelect: (name: string) => void;
  onOpenFolder: (item: FolderItem) => void;
};

export const FilesGrid = ({ items, selectedItem, onSelect, onOpenFolder }: FilesGridProps) => {
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
        />
      ))}
    </div>
  );
};
