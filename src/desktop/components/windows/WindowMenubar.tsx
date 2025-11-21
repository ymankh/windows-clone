import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import type { WindowMenu, WindowMenuItem } from "../../stores/WindowsStore";

const renderMenuItems = (items: WindowMenuItem[]) =>
  items.map((item, index) => {
    if (item.type === "separator") {
      return <MenubarSeparator key={`separator-${index}`} />;
    }

    if (item.type === "submenu") {
      return (
        <MenubarSub key={`${item.label}-${index}`}>
          <MenubarSubTrigger disabled={item.disabled}>{item.label}</MenubarSubTrigger>
          <MenubarSubContent>{renderMenuItems(item.items)}</MenubarSubContent>
        </MenubarSub>
      );
    }

    return (
      <MenubarItem
        key={`${item.label}-${index}`}
        disabled={item.disabled}
        onSelect={item.onSelect}
      >
        {item.label}
        {item.shortcut ? (
          <span className="ml-auto text-xs tracking-widest text-muted-foreground">
            {item.shortcut}
          </span>
        ) : null}
      </MenubarItem>
    );
  });

const WindowMenubar = ({ menu }: { menu: WindowMenu[] }) => {
  if (!menu.length) return null;

  return (
    <div className="border-b border-border bg-card">
      <Menubar className="rounded-none border-0 shadow-none">
        {menu.map((group, index) => (
          <MenubarMenu key={`${group.label}-${index}`}>
            <MenubarTrigger>{group.label}</MenubarTrigger>
            <MenubarContent>{renderMenuItems(group.items)}</MenubarContent>
          </MenubarMenu>
        ))}
      </Menubar>
    </div>
  );
};

export default WindowMenubar;
