import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MenuItemVariants } from "@/components/ui/menuItemVariants";

type DesktopIconMenuProps = {
  onOpen: () => void;
  onDelete: () => void;
  children: ReactNode;
};

const DesktopIconMenu = ({ onOpen, onDelete, children }: DesktopIconMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onOpen}>Open</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant={MenuItemVariants.destructive}
          onSelect={onDelete}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DesktopIconMenu;
