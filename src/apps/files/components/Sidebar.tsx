import { TreeView, type TreeDataItem } from "@/components/tree-view";

type SidebarProps = {
  tree: TreeDataItem[];
  selectedFolderId: string;
  onFolderSelect: (id: string) => void;
};

export const Sidebar = ({ tree, selectedFolderId, onFolderSelect }: SidebarProps) => (
  <div className="flex h-full flex-col border-r border-border bg-muted/40">
    <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
      Folders
    </div>
    <div className="flex-1 overflow-auto">
      <TreeView
        data={tree}
        initialSelectedItemId={selectedFolderId}
        selectedItemId={selectedFolderId}
        onSelectChange={(item) => item && onFolderSelect(item.id)}
        expandAll
        className="px-1"
      />
    </div>
  </div>
);
