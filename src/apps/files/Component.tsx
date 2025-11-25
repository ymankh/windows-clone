import { FileArchive, FileText, Folder as FolderIcon, Image as ImageIcon, Music } from "lucide-react";
import { type TreeDataItem } from "@/components/tree-view";
import { Split } from "@/components/ui/split";
import { FilesGrid } from "./componsnts/FilesGrid";
import { Header } from "./componsnts/Header";
import { Sidebar } from "./componsnts/Sidebar";
import { type FolderItem, type OpenWithOption, type Selection } from "./componsnts/types";
import { desktopApps, type DesktopApp } from "@/apps";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { useMemo, useState } from "react";

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
    { name: "Notes.md", type: "file", meta: "12 KB", icon: FileText, openWith: ["notes"] },
    { name: "Project-Proposal.docx", type: "file", meta: "84 KB", icon: FileText, openWith: ["notes"] },
    { name: "Budget.xlsx", type: "file", meta: "32 KB", icon: FileText, openWith: ["notes"] },
  ],
  reports: [
    { name: "Q1-Report.pdf", type: "file", meta: "1.2 MB", openWith: ["pdf"] },
    { name: "Q2-Report.pdf", type: "file", meta: "1.3 MB", openWith: ["pdf"] },
  ],
  invoices: [
    { name: "Invoice-1043.pdf", type: "file", meta: "320 KB", openWith: ["pdf"] },
    { name: "Invoice-1044.pdf", type: "file", meta: "310 KB", openWith: ["pdf"] },
  ],
  media: [
    { name: "Photos", type: "folder", targetId: "photos" },
    { name: "Music", type: "folder", targetId: "music" },
  ],
  photos: [
    { name: "Vacation", type: "folder", targetId: "vacation" },
    { name: "Headshots", type: "folder", targetId: "headshots" },
    { name: "Wallpaper.png", type: "file", meta: "1.8 MB", icon: ImageIcon, openWith: ["photos"] },
  ],
  vacation: [
    { name: "Beach.png", type: "file", meta: "2.1 MB", icon: ImageIcon, openWith: ["photos"] },
    { name: "Mountains.png", type: "file", meta: "1.4 MB", icon: ImageIcon, openWith: ["photos"] },
  ],
  headshots: [
    { name: "Profile.jpg", type: "file", meta: "720 KB", icon: ImageIcon, openWith: ["photos"] },
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

const getExtension = (name: string) => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
};

const extensionDefaults: Record<string, string> = {
  ".pdf": "pdf",
  ".png": "photos",
  ".jpg": "photos",
  ".jpeg": "photos",
  ".gif": "photos",
  ".md": "notes",
  ".txt": "notes",
};

const FilesComponent = () => {
  const [selection, setSelection] = useState<Selection>({
    folderId: "documents",
    item: null,
  });
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const appRegistry = useMemo(
    () => new Map(desktopApps.map((app) => [app.id, app])),
    []
  );

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

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] => {
    const preferredIds =
      item.openWith && item.openWith.length
        ? item.openWith
        : (() => {
            const ext = getExtension(item.name);
            const fallback = extensionDefaults[ext];
            return fallback ? [fallback] : [];
          })();

    return preferredIds
      .map((appId) => appRegistry.get(appId))
      .filter((app): app is DesktopApp => Boolean(app))
      .map((app) => ({
        id: app.id,
        title: app.title,
        Icon: app.icon,
      }));
  };

  const openApp = (appId: string) => {
    const app = appRegistry.get(appId);
    if (!app) return;
    openWindow({
      id: app.id,
      title: app.title,
      icon: app.icon,
      component: <app.Component />,
      menubar: app.menubar,
    });
  };

  const openFileWithDefault = (item: FolderItem) => {
    const defaultTarget = resolveOpenWithOptions(item)[0];
    if (defaultTarget) {
      openApp(defaultTarget.id);
    }
  };

  const handleOpen = (item: FolderItem) => {
    setSelection((prev) => ({ ...prev, item: item.name }));
    if (item.type === "folder") {
      handleItemOpen(item);
      return;
    }
    openFileWithDefault(item);
  };

  const handleOpenWith = (item: FolderItem, appId: string) => {
    setSelection((prev) => ({ ...prev, item: item.name }));
    openApp(appId);
  };

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
              onOpen={handleOpen}
              resolveOpenWith={resolveOpenWithOptions}
              onOpenWith={handleOpenWith}
            />
          </div>
        </div>
      </Split>
    </div>
  );
};

export default FilesComponent;
