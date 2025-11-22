import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type DesktopContextMenuProps = {
  children: ReactNode;
};

const DesktopContextMenu = ({ children }: DesktopContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => {}}>Refresh</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Sort by Name</ContextMenuItem>
        <ContextMenuItem>Sort by Type</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DesktopContextMenu;
