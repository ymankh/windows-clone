import { createElement } from "react";
import { File, Folder as FolderIcon } from "lucide-react";
import { type FolderItem } from "./types";

const renderIcon = (item: FolderItem) => {
  if (item.type === "folder") {
    return <FolderIcon className="h-5 w-5" />;
  }

  if (item.icon) {
    return createElement(item.icon, { className: "h-5 w-5" });
  }

  return <File className="h-5 w-5" />;
};

export const FileIcon = ({ item }: { item: FolderItem }) => {
  return (
    <div className="rounded-md bg-muted p-2 text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
      {renderIcon(item)}
    </div>
  );
};
