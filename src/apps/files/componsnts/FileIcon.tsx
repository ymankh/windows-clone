import { File, Folder as FolderIcon } from "lucide-react";
import { type FolderItem } from "./types";

export const getIconForItem = (item: FolderItem) => {
  if (item.type === "folder") return FolderIcon;
  if (item.icon) return item.icon;
  return File;
};

export const FileIcon = ({ item }: { item: FolderItem }) => {
  const Icon = getIconForItem(item);
  return (
    <div className="rounded-md bg-muted p-2 text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
      <Icon className="h-5 w-5" />
    </div>
  );
};
