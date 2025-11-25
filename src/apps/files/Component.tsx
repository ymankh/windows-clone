import { useMemo, useState } from "react";
import { FileArchive, FileText, Folder as FolderIcon, Image as ImageIcon, Music } from "lucide-react";
import { type TreeDataItem } from "@/components/tree-view";
import { Split } from "@/components/ui/split";
import { FilesGrid } from "./componsnts/FilesGrid";
import { Header } from "./componsnts/Header";
import { Sidebar } from "./componsnts/Sidebar";
import { type FolderItem, type Selection } from "./componsnts/types";

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

const FilesComponent = () => {
  const [selection, setSelection] = useState<Selection>({
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

  const handleItemOpen = (item: FolderItem) =>
    item.type === "folder" && openFolder(resolveFolderId(item));

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      <Split className="flex-1 min-h-0" initialLeft={260} minLeft={200} minRight={300}>
        <Sidebar
          tree={folderTree}
          selectedFolderId={selectedFolderId}
          onFolderSelect={(folderId) => setSelection({ folderId, item: null })}
        />

        <div className="flex h-full flex-col bg-background">
          <Header path={path} label={selectedFolder} />

          <div className="flex-1 overflow-auto p-4">
            <FilesGrid
              items={items}
              selectedItem={selectedItem}
              onSelect={(itemName) =>
                setSelection((prev) => ({
                  ...prev,
                  item: itemName,
                }))
              }
              onOpenFolder={handleItemOpen}
            />
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
