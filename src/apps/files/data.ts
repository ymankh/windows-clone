import { FileText, Folder as FolderIcon, Image as ImageIcon, Music } from "lucide-react";
import type { TreeDataItem } from "@/components/tree-view";
import { FileTypes } from "@/apps/fileTypes";
import {
  FileEntryTypes,
  type FileEntry,
  type FolderItem,
} from "./componsnts/types";

export const DEFAULT_FOLDER_ID = "documents";

export const folderTree: TreeDataItem[] = [
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

type FolderMeta = { name: string; parent?: string };

const folderIndex = new Map<string, FolderMeta>();

const indexTree = (nodes: TreeDataItem[], parentId?: string) => {
  nodes.forEach((node) => {
    folderIndex.set(node.id, { name: node.name, parent: parentId });
    if (node.children) indexTree(node.children, node.id);
  });
};

indexTree(folderTree);

export const folderContents: Record<string, FolderItem[]> = {
  home: [
    { name: "Documents", type: FileEntryTypes.folder, targetId: "documents" },
    { name: "Media", type: FileEntryTypes.folder, targetId: "media" },
    { name: "Downloads", type: FileEntryTypes.folder, targetId: "downloads" },
    { name: "Archive", type: FileEntryTypes.folder, targetId: "archive" },
  ],
  documents: [
    {
      name: "Notes.md",
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      meta: "12 KB",
      icon: FileText,
      data: { text: "# Notes\n\nThis note came from Explorer file data." },
    },
    {
      name: "Project-Proposal.docx",
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      meta: "84 KB",
      icon: FileText,
      data: { text: "Project Proposal draft content." },
    },
    {
      name: "Budget.xlsx",
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      meta: "32 KB",
      icon: FileText,
      data: { text: "Budget summary in plain text format." },
    },
  ],
  reports: [
    {
      name: "Q1-Report.pdf",
      type: FileEntryTypes.file,
      fileType: FileTypes.pdf,
      meta: "1.2 MB",
      data: { url: "/pdfs/resume.pdf" },
    },
    {
      name: "Q2-Report.pdf",
      type: FileEntryTypes.file,
      fileType: FileTypes.pdf,
      meta: "1.3 MB",
      data: { url: "/pdfs/resume.pdf" },
    },
  ],
  invoices: [
    {
      name: "Invoice-1043.pdf",
      type: FileEntryTypes.file,
      fileType: FileTypes.pdf,
      meta: "320 KB",
      data: { url: "/pdfs/resume.pdf" },
    },
    {
      name: "Invoice-1044.pdf",
      type: FileEntryTypes.file,
      fileType: FileTypes.pdf,
      meta: "310 KB",
      data: { url: "/pdfs/resume.pdf" },
    },
  ],
  media: [
    { name: "Photos", type: FileEntryTypes.folder, targetId: "photos" },
    { name: "Music", type: FileEntryTypes.folder, targetId: "music" },
  ],
  photos: [
    { name: "Vacation", type: FileEntryTypes.folder, targetId: "vacation" },
    { name: "Headshots", type: FileEntryTypes.folder, targetId: "headshots" },
    {
      name: "Wallpaper.png",
      type: FileEntryTypes.file,
      fileType: FileTypes.image,
      meta: "1.8 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Wallpaper" },
    },
  ],
  vacation: [
    {
      name: "Beach.png",
      type: FileEntryTypes.file,
      fileType: FileTypes.image,
      meta: "2.1 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Beach" },
    },
    {
      name: "Mountains.png",
      type: FileEntryTypes.file,
      fileType: FileTypes.image,
      meta: "1.4 MB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Mountains" },
    },
  ],
  headshots: [
    {
      name: "Profile.jpg",
      type: FileEntryTypes.file,
      fileType: FileTypes.image,
      meta: "720 KB",
      icon: ImageIcon,
      data: { url: "/wallpaper.jpg", alt: "Profile" },
    },
  ],
  music: [
    {
      name: "Moavii - Foreign (freetouse.com).mp3",
      type: FileEntryTypes.file,
      fileType: FileTypes.audio,
      meta: "5.1 MB",
      icon: Music,
      data: {
        url: "/music/Moavii - Foreign (freetouse.com).mp3",
        title: "Foreign",
        artist: "Moavii",
      },
    },
    {
      name: "Demo.wav",
      type: FileEntryTypes.file,
      fileType: FileTypes.audio,
      meta: "273 KB",
      icon: Music,
      data: {
        url: "/audio/demo.wav",
        title: "Demo Track",
        artist: "Public Library",
      },
    },
  ],
  downloads: [],
  archive: [
    {
      name: "old-notes.txt",
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      meta: "8 KB",
      icon: FileText,
      data: { text: "Archived notes file content." },
    },
  ],
};

export type VirtualFileSearchResult = {
  type: "file";
  name: string;
  folderId: string;
  folderPath: string;
  path: string;
  fileType: FileEntry["fileType"];
  meta?: string;
};

export type VirtualFolderSearchResult = {
  type: "folder";
  name: string;
  folderId: string;
  path: string;
};

export type VirtualSearchResult = VirtualFileSearchResult | VirtualFolderSearchResult;

export type VirtualFolderListItem =
  | {
      type: "folder";
      name: string;
      folderId: string;
      path: string;
      meta?: string;
    }
  | {
      type: "file";
      name: string;
      folderId: string;
      path: string;
      fileType: FileEntry["fileType"];
      meta?: string;
      data: unknown;
    };

export const hasFolder = (folderId: string) => folderIndex.has(folderId);

export const getFolderName = (folderId: string) =>
  folderIndex.get(folderId)?.name ?? "Documents";

export const getFolderPath = (folderId: string) => {
  const parts: string[] = [];
  let current: string | undefined = folderId;
  while (current) {
    const meta = folderIndex.get(current);
    if (!meta) break;
    parts.unshift(meta.name);
    current = meta.parent;
  }
  return parts.length ? parts.join(" / ") : "Home";
};

export const getFolderContents = (folderId: string) => folderContents[folderId] ?? [];

export const resolveFolderId = (item: FolderItem) => {
  if (item.type !== FileEntryTypes.folder) return undefined;
  if (item.targetId) return item.targetId;
  const match = Array.from(folderIndex.entries()).find(
    ([, meta]) => meta.name === item.name
  );
  return match?.[0];
};

const normalize = (value: string) => value.trim().toLowerCase();

const folderPathMatches = (folderId: string, folderPath: string) =>
  normalize(getFolderPath(folderId).replace(/\s*\/\s*/g, "/")) ===
  normalize(folderPath.replace(/\s*\/\s*/g, "/"));

export const findFolderIdByPath = (folderPath: string) => {
  const normalized = normalize(folderPath);
  if (!normalized || normalized === "home") return "home";
  if (folderIndex.has(folderPath)) return folderPath;
  return Array.from(folderIndex.keys()).find((folderId) =>
    folderPathMatches(folderId, folderPath)
  );
};

export const getFolderListItem = (
  item: FolderItem,
  containingFolderId: string
): VirtualFolderListItem => {
  if (item.type === FileEntryTypes.folder) {
    const folderId = resolveFolderId(item) ?? containingFolderId;
    return {
      type: "folder",
      name: item.name,
      folderId,
      path: getFolderPath(folderId),
      meta: item.meta,
    };
  }

  return {
    type: "file",
    name: item.name,
    folderId: containingFolderId,
    path: `${getFolderPath(containingFolderId)} / ${item.name}`,
    fileType: item.fileType,
    meta: item.meta,
    data: item.data,
  };
};

export const listVirtualFolder = (folderIdOrPath = DEFAULT_FOLDER_ID) => {
  const folderId = findFolderIdByPath(folderIdOrPath) ?? folderIdOrPath;
  if (!hasFolder(folderId)) return undefined;

  return {
    folderId,
    name: getFolderName(folderId),
    path: getFolderPath(folderId),
    items: getFolderContents(folderId).map((item) => getFolderListItem(item, folderId)),
  };
};

export const findFolderItem = (folderId: string, name: string) => {
  const target = normalize(name);
  return getFolderContents(folderId).find((item) => normalize(item.name) === target);
};

export const findFileByPath = (filePath: string) => {
  const normalizedPath = filePath.replace(/\s*\/\s*/g, "/");
  const segments = normalizedPath.split("/").map((part) => part.trim()).filter(Boolean);
  const fileName = segments.at(-1);
  if (!fileName) return undefined;

  const folderPath = segments.slice(0, -1).join(" / ");
  const folderId = folderPath ? findFolderIdByPath(folderPath) : DEFAULT_FOLDER_ID;
  if (!folderId) return undefined;

  const item = findFolderItem(folderId, fileName);
  if (!item || item.type !== FileEntryTypes.file) return undefined;
  return { folderId, file: item };
};

export const searchVirtualFiles = ({
  query,
  folderId,
  includeFolders = true,
  limit = 20,
}: {
  query: string;
  folderId?: string;
  includeFolders?: boolean;
  limit?: number;
}) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const folderScope = folderId ? findFolderIdByPath(folderId) : undefined;
  const searchFolderIds = folderScope ? [folderScope] : Array.from(folderIndex.keys());
  const results: VirtualSearchResult[] = [];

  for (const currentFolderId of searchFolderIds) {
    if (includeFolders) {
      const folderName = getFolderName(currentFolderId);
      const folderPath = getFolderPath(currentFolderId);
      if (
        normalize(folderName).includes(normalizedQuery) ||
        normalize(folderPath).includes(normalizedQuery)
      ) {
        results.push({
          type: "folder",
          name: folderName,
          folderId: currentFolderId,
          path: folderPath,
        });
      }
    }

    for (const item of getFolderContents(currentFolderId)) {
      if (item.type !== FileEntryTypes.file) continue;
      const path = `${getFolderPath(currentFolderId)} / ${item.name}`;
      if (
        normalize(item.name).includes(normalizedQuery) ||
        normalize(path).includes(normalizedQuery) ||
        normalize(item.fileType).includes(normalizedQuery)
      ) {
        results.push({
          type: "file",
          name: item.name,
          folderId: currentFolderId,
          folderPath: getFolderPath(currentFolderId),
          path,
          fileType: item.fileType,
          meta: item.meta,
        });
      }
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
};

export const findVirtualFile = ({
  path,
  folderId = DEFAULT_FOLDER_ID,
  name,
}: {
  path?: string;
  folderId?: string;
  name?: string;
}) => {
  if (path) return findFileByPath(path);
  if (!name) return undefined;

  const resolvedFolderId = findFolderIdByPath(folderId) ?? folderId;
  if (!hasFolder(resolvedFolderId)) return undefined;
  const item = findFolderItem(resolvedFolderId, name);
  if (!item || item.type !== FileEntryTypes.file) return undefined;
  return { folderId: resolvedFolderId, file: item };
};
