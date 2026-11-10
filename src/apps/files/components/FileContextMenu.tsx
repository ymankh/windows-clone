import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
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
  onSetDefault: (appId: string) => void;
  children: ReactNode;
};

const AppIcon = ({ Icon }: { Icon: OpenWithOption["Icon"] }) => (
  <span className="inline-flex h-4 w-4 items-center justify-center">
    <Icon className="h-4 w-4" />
  </span>
);

export const FileContextMenu = ({
  item,
  openWithOptions,
  onOpen,
  onOpenWith,
  onSetDefault,
  children,
}: FileContextMenuProps) => {
  const defaultOption = openWithOptions.find((option) => option.isDefault);
  const extension = item.name.includes(".")
    ? item.name.slice(item.name.lastIndexOf(".")).toLowerCase()
    : "files like this";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onOpen}>
          Open
          {item.type === "file" && defaultOption ? (
            <span className="ml-auto pl-4 text-xs text-muted-foreground">
              {defaultOption.title}
            </span>
          ) : null}
        </ContextMenuItem>
        {item.type === "file" && openWithOptions.length ? (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Open with</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {openWithOptions.map(({ id, title, Icon, isDefault }) => (
                  <ContextMenuItem key={id} onSelect={() => onOpenWith(id)}>
                    <AppIcon Icon={Icon} />
                    {title}
                    {isDefault ? (
                      <span className="ml-auto pl-4 text-xs text-muted-foreground">Default</span>
                    ) : null}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Default app for {extension}</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuRadioGroup
                  value={defaultOption?.id}
                  onValueChange={onSetDefault}
                >
                  {openWithOptions.map(({ id, title, Icon }) => (
                    <ContextMenuRadioItem key={id} value={id}>
                      <AppIcon Icon={Icon} />
                      {title}
                    </ContextMenuRadioItem>
                  ))}
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
