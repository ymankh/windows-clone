import { useRef } from "react";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
import { FileContextMenu } from "./FileContextMenu";
import { type FolderItem, type OpenWithOption } from "./types";

type FileCardProps = {
  item: FolderItem;
  selected: boolean;
  onSelect: () => void;
  onOpenFolder: () => void;
  onOpen: () => void;
  openWithOptions: OpenWithOption[];
  onOpenWith: (appId: string) => void;
  onSetDefault: (appId: string) => void;
};

export const FileCard = ({
  item,
  selected,
  onSelect,
  onOpenFolder,
  onOpen,
  openWithOptions,
  onOpenWith,
  onSetDefault,
}: FileCardProps) => {
  const lastPointerType = useRef("mouse");
  const open = () => {
    if (item.type === "folder") onOpenFolder();
    else onOpen();
  };

  return (
  <FileContextMenu
    item={item}
    openWithOptions={openWithOptions}
    onOpen={onOpen}
    onOpenWith={onOpenWith}
    onSetDefault={onSetDefault}
  >
    <button
      type="button"
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        selected && "border-primary bg-primary/10 ring-2 ring-primary/40"
      )}
      onPointerDown={(event) => {
        lastPointerType.current = event.pointerType;
      }}
      onClick={() => {
        onSelect();
        // Touch has no double-click, so a tap opens the item directly.
        if (lastPointerType.current === "touch") open();
      }}
      onDoubleClick={open}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        // Enter opens the item; without this it would only select it.
        event.preventDefault();
        onSelect();
        open();
      }}
    >
      <FileIcon item={item} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {item.meta ?? (item.type === "folder" ? "Folder" : "File")}
        </div>
      </div>
    </button>
  </FileContextMenu>
  );
};
