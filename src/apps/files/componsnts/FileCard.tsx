import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
import { type FolderItem } from "./types";

type FileCardProps = {
  item: FolderItem;
  selected: boolean;
  onSelect: () => void;
  onOpenFolder: () => void;
};

export const FileCard = ({ item, selected, onSelect, onOpenFolder }: FileCardProps) => (
  <div
    role="button"
    tabIndex={0}
    className={cn(
      "group flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      selected && "border-primary bg-primary/10 ring-2 ring-primary/40"
    )}
    onClick={onSelect}
    onDoubleClick={() => item.type === "folder" && onOpenFolder()}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
        if (item.type === "folder") onOpenFolder();
      }
    }}
  >
    <FileIcon item={item} />
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold">{item.name}</div>
      <div className="text-xs text-muted-foreground">
        {item.meta ?? (item.type === "folder" ? "Folder" : "File")}
      </div>
    </div>
  </div>
);
