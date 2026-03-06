import { FileArchive, FileText, Folder as FolderIcon, Image as ImageIcon, Music } from "lucide-react";
import { type TreeDataItem } from "@/components/tree-view";
import { Split } from "@/components/ui/split";
import { FilesGrid } from "./componsnts/FilesGrid";
import { Header } from "./componsnts/Header";
import { Sidebar } from "./componsnts/Sidebar";
import { type FileEntry, type FolderItem, type OpenWithOption, type Selection } from "./componsnts/types";
import { desktopApps } from "@/apps";
import { buildAppWindow } from "@/apps/windowBuilder";
import { toAppInstanceId } from "@/apps/windowing";
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
    {
      name: "Notes.md",
      type: "file",
      fileType: "notes",
      meta: "12 KB",
      icon: FileText,
      data: { text: "# Notes\n\nThis note came from Explorer file data." },
    },
    {
      name: "Project-Proposal.docx",
      type: "file",
      fileType: "notes",
      meta: "84 KB",
      icon: FileText,
      data: { text: "Project Proposal draft content." },
    },
    {
      name: "Budget.xlsx",
      type: "file",
      fileType: "notes",
      meta: "32 KB",
      icon: FileText,
      data: { text: "Budget summary in plain text format." },
    },
  ],
  reports: [
    {
      name: "Q1-Report.pdf",
      type: "file",
      fileType: "pdf",
      meta: "1.2 MB",
      data: { url: "/pdfs/resume.pdf" },
    },
    {
      name: "Q2-Report.pdf",
      type: "file",
      fileType: "pdf",
      meta: "1.3 MB",
      data: { url: "/pdfs/resume.pdf" },
    },
  ],
  invoices: [
    {
      name: "Invoice-1043.pdf",
      type: "file",
      fileType: "pdf",
      meta: "320 KB",
      data: { url: "/pdfs/resume.pdf" },
    },
    {
      name: "Invoice-1044.pdf",
      type: "file",
      fileType: "pdf",
      meta: "310 KB",
      data: { url: "/pdfs/resume.pdf" },
    },
  ],
  media: [
    { name: "Photos", type: "folder", targetId: "photos" },
    { name: "Music", type: "folder", targetId: "music" },
  ],
  photos: [
    { name: "Vacation", type: "folder", targetId: "vacation" },
    { name: "Headshots", type: "folder", targetId: "headshots" },
    {
      name: "Wallpaper.png",
      type: "file",
      fileType: "image",
      meta: "1.8 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Wallpaper" },
    },
  ],
  vacation: [
    {
      name: "Beach.png",
      type: "file",
      fileType: "image",
      meta: "2.1 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Beach" },
    },
    {
      name: "Mountains.png",
      type: "file",
      fileType: "image",
      meta: "1.4 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Mountains" },
    },
  ],
  headshots: [
    {
      name: "Profile.jpg",
      type: "file",
      fileType: "image",
      meta: "720 KB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Profile" },
    },
  ],
  music: [
    {
      name: "Playlist.m3u",
      type: "file",
      fileType: "audio",
      meta: "4 KB",
      icon: Music,
      data: { url: "/audio/demo.mp3", title: "Playlist" },
    },
    {
      name: "Demo.mp3",
      type: "file",
      fileType: "audio",
      meta: "8.2 MB",
      icon: Music,
      data: { url: "/audio/demo.mp3", title: "Demo" },
    },
  ],
  downloads: [
    {
      name: "release.zip",
      type: "file",
      fileType: "archive",
      meta: "24 MB",
      icon: FileArchive,
      data: { entries: ["README.md", "dist/app.exe"] },
    },
    {
      name: "setup.exe",
      type: "file",
      fileType: "binary",
      meta: "52 MB",
      data: { bytes: 52 * 1024 * 1024 },
    },
  ],
  archive: [
    {
      name: "2019-backup.zip",
      type: "file",
      fileType: "archive",
      meta: "110 MB",
      icon: FileArchive,
      data: { entries: ["old-notes.txt", "photos/"] },
    },
    {
      name: "old-notes.txt",
      type: "file",
      fileType: "notes",
      meta: "8 KB",
      icon: FileText,
      data: { text: "Archived notes file content." },
    },
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
    if (item.type !== "folder") return undefined;
    if (item.targetId) return item.targetId;
    const match = Array.from(folderIndex.entries()).find(
      ([, meta]) => meta.name === item.name
    );
    return match?.[0];
  };

  const handleItemOpen = (item: FolderItem) =>
    item.type === "folder" && openFolder(resolveFolderId(item));

  const resolveOpenWithOptions = (item: FolderItem): OpenWithOption[] => {
    if (item.type !== "file") return [];
    return Array.from(appRegistry.values())
      .filter((app) =>
        app.fileCapabilities?.some((capability) => capability.fileType === item.fileType)
      )
      .map((app) => ({
        id: app.id,
        title: app.title,
        Icon: app.icon,
      }));
  };

  const openApp = (appId: string, file: FileEntry) => {
    const app = appRegistry.get(appId);
    if (!app) return;
    const windowId = toAppInstanceId(
      app.id,
      `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    openWindow(
      buildAppWindow(app, {
        windowId,
        fileContext: {
          name: file.name,
          type: file.fileType,
          data: file.data,
        },
      })
    );
  };

  const openFileWithDefault = (item: FolderItem) => {
    if (item.type !== "file") return;
    const defaultTarget = resolveOpenWithOptions(item)[0];
    if (defaultTarget) {
      openApp(defaultTarget.id, item);
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
    if (item.type !== "file") return;
    openApp(appId, item);
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
