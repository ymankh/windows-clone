import { useMemo, useState } from "react";
import {
  File,
  FileArchive,
  FileText,
  Folder as FolderIcon,
  Image as ImageIcon,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeView, type TreeDataItem } from "@/components/tree-view";
import { Split } from "@/components/ui/split";

type FolderItem = {
  name: string;
  type: "folder" | "file";
  meta?: string;
  icon?: typeof FolderIcon;
  targetId?: string;
};

const folderTree: TreeDataItem[] = [
  {
    id: "home",
    name: "Home",
    icon: FolderIcon,
    children: [
      {
        id: "documents",
        name: "Documents",
        icon: FolderIcon,
        children: [
          { id: "reports", name: "Reports", icon: FolderIcon },
          { id: "invoices", name: "Invoices", icon: FolderIcon },
        ],
      },
      {
        id: "media",
        name: "Media",
        icon: FolderIcon,
        children: [
          {
            id: "photos",
            name: "Photos",
            icon: FolderIcon,
            children: [
              { id: "vacation", name: "Vacation", icon: FolderIcon },
              { id: "headshots", name: "Headshots", icon: FolderIcon },
            ],
          },
          { id: "music", name: "Music", icon: FolderIcon },
        ],
      },
      { id: "downloads", name: "Downloads", icon: FolderIcon },
      { id: "archive", name: "Archive", icon: FolderIcon },
    ],
  },
];

const folderIndex = new Map<string, { name: string; parent?: string }>();

const indexTree = (nodes: TreeDataItem[], parentId?: string) => {
  nodes.forEach((node) => {
    folderIndex.set(node.id, { name: node.name, parent: parentId });
    if (node.children) indexTree(node.children, node.id);
  });
};

indexTree(folderTree);

const folderContents: Record<string, FolderItem[]> = {
  home: [
    { name: "Documents", type: "folder", targetId: "documents" },
    { name: "Media", type: "folder", targetId: "media" },
    { name: "Downloads", type: "folder", targetId: "downloads" },
    { name: "Archive", type: "folder", targetId: "archive" },
  ],
  documents: [
    { name: "Notes.md", type: "file", meta: "12 KB", icon: FileText },
    { name: "Project-Proposal.docx", type: "file", meta: "84 KB", icon: FileText },
    { name: "Budget.xlsx", type: "file", meta: "32 KB", icon: FileText },
  ],
  reports: [
    { name: "Q1-Report.pdf", type: "file", meta: "1.2 MB" },
    { name: "Q2-Report.pdf", type: "file", meta: "1.3 MB" },
  ],
  invoices: [
    { name: "Invoice-1043.pdf", type: "file", meta: "320 KB" },
    { name: "Invoice-1044.pdf", type: "file", meta: "310 KB" },
  ],
  media: [
    { name: "Photos", type: "folder", targetId: "photos" },
    { name: "Music", type: "folder", targetId: "music" },
  ],
  photos: [
    { name: "Vacation", type: "folder", targetId: "vacation" },
    { name: "Headshots", type: "folder", targetId: "headshots" },
    { name: "Wallpaper.png", type: "file", meta: "1.8 MB", icon: ImageIcon },
  ],
  vacation: [
    { name: "Beach.png", type: "file", meta: "2.1 MB", icon: ImageIcon },
    { name: "Mountains.png", type: "file", meta: "1.4 MB", icon: ImageIcon },
  ],
  headshots: [
    { name: "Profile.jpg", type: "file", meta: "720 KB", icon: ImageIcon },
  ],
  music: [
    { name: "Playlist.m3u", type: "file", meta: "4 KB", icon: Music },
    { name: "Demo.mp3", type: "file", meta: "8.2 MB", icon: Music },
  ],
  downloads: [
    { name: "release.zip", type: "file", meta: "24 MB", icon: FileArchive },
    { name: "setup.exe", type: "file", meta: "52 MB" },
  ],
  archive: [
    { name: "2019-backup.zip", type: "file", meta: "110 MB", icon: FileArchive },
    { name: "old-notes.txt", type: "file", meta: "8 KB", icon: FileText },
  ],
};

const getPath = (id: string) => {
  const parts: string[] = [];
  let current: string | undefined = id;
  while (current) {
    const meta = folderIndex.get(current);
    if (!meta) break;
    parts.unshift(meta.name);
    current = meta.parent;
  }
  return parts.length ? parts.join(" / ") : "Home";
};

const getIconForItem = (item: FolderItem) => {
  if (item.type === "folder") return FolderIcon;
  if (item.icon) return item.icon;
  return File;
};

const FilesComponent = () => {
  const [selection, setSelection] = useState<{ folderId: string; item: string | null }>({
    folderId: "documents",
    item: null,
  });

  const selectedFolderId = selection.folderId;
  const selectedItem = selection.item;

  const selectedFolder = useMemo(
    () => folderIndex.get(selectedFolderId)?.name ?? "Documents",
    [selectedFolderId]
  );

  const items = folderContents[selectedFolderId] ?? [];
  const path = getPath(selectedFolderId);

  const openFolder = (id: string | undefined) => {
    if (!id) return;
    if (folderIndex.has(id)) {
      setSelection({ folderId: id, item: null });
    }
  };

  const resolveFolderId = (item: FolderItem) => {
    if (item.targetId) return item.targetId;
    const match = Array.from(folderIndex.entries()).find(
      ([, meta]) => meta.name === item.name
    );
    return match?.[0];
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      <Split className="flex-1 min-h-0" initialLeft={260} minLeft={200} minRight={300}>
        <div className="flex h-full flex-col border-r border-border bg-muted/40">
          <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Folders
          </div>
          <div className="flex-1 overflow-auto">
            <TreeView
              data={folderTree}
              initialSelectedItemId={selectedFolderId}
              selectedItemId={selectedFolderId}
              onSelectChange={(item) => {
                if (!item) return;
                setSelection({ folderId: item.id, item: null });
              }}
              expandAll
              className="px-1"
            />
          </div>
        </div>

        <div className="flex h-full flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Current folder
              </div>
              <div className="text-sm font-semibold">{path}</div>
            </div>
            <div className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {selectedFolder}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                This folder is empty.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                {items.map((item) => {
                  const Icon = getIconForItem(item);
                  const isSelected = selectedItem === item.name;
                  return (
                    <div
                      key={item.name}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        isSelected && "border-primary bg-primary/10 ring-2 ring-primary/40"
                      )}
                      onClick={() =>
                        setSelection((prev) => ({
                          ...prev,
                          item: item.name,
                        }))
                      }
                      onDoubleClick={() =>
                        item.type === "folder" && openFolder(resolveFolderId(item))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelection((prev) => ({
                            ...prev,
                            item: item.name,
                          }));
                          if (item.type === "folder") {
                            openFolder(resolveFolderId(item));
                          }
                        }
                      }}
                    >
                      <div className="rounded-md bg-muted p-2 text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.meta ?? (item.type === "folder" ? "Folder" : "File")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
