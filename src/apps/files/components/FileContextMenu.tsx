import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { type FolderItem, type OpenWithOption } from "./types";

type FileContextMenuProps = {
  item: FolderItem;
  openWithOptions: OpenWithOption[];
  onOpen: () => void;
  onOpenWith: (appId: string) => void;
  children: ReactNode;
};

export const FileContextMenu = ({
  item,
  openWithOptions,
  onOpen,
  onOpenWith,
  children,
}: FileContextMenuProps) => (
  <ContextMenu>
    <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onSelect={onOpen}>Open</ContextMenuItem>
      {item.type === "file" && openWithOptions.length ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger>Open with</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {openWithOptions.map(({ id, title, Icon }) => (
              <ContextMenuItem key={id} onSelect={() => onOpenWith(id)}>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <Icon className="h-4 w-4" />
                </span>
                {title}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}
    </ContextMenuContent>
  </ContextMenu>
);
