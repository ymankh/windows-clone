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
  onOpenPersonalization?: () => void;
  hiddenIconCount?: number;
  onRestoreIcons?: () => void;
};

const DesktopContextMenu = ({
  children,
  onSort,
  onOpenPersonalization,
  hiddenIconCount = 0,
  onRestoreIcons,
}: DesktopContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => {}}>Refresh</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onSort}>Sort by Name</ContextMenuItem>
        <ContextMenuItem onSelect={onSort}>Sort by Type</ContextMenuItem>
        {hiddenIconCount > 0 ? (
          <ContextMenuItem onSelect={() => onRestoreIcons?.()}>
            Restore removed icons ({hiddenIconCount})
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onOpenPersonalization?.()}>
          Personalization
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DesktopContextMenu;
