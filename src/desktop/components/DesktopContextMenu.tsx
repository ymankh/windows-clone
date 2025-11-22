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
  onSort?: () => void;
};

const DesktopContextMenu = ({ children, onSort }: DesktopContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => {}}>Refresh</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onSort}>Sort by Name</ContextMenuItem>
        <ContextMenuItem onSelect={onSort}>Sort by Type</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DesktopContextMenu;
