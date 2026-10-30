import { FileText, Folder as FolderIcon, Image as ImageIcon, Music } from "lucide-react";
import type { TreeDataItem } from "@/components/tree-view";
import { FileTypes } from "@/apps/fileTypes";
import { FileEntryTypes, type FolderItem } from "./components/types";

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

export const folderIndex = new Map<string, { name: string; parent?: string }>();

const indexTree = (nodes: TreeDataItem[], parentId?: string) => {
  nodes.forEach((node) => {
    folderIndex.set(node.id, { name: node.name, parent: parentId });
    if (node.children) indexTree(node.children, node.id);
  });
};
indexTree(folderTree);

const folder = (name: string, targetId: string): FolderItem => ({
  name,
  targetId,
  type: FileEntryTypes.folder,
});

const pdf = (name: string, meta: string): FolderItem => ({
  name,
  meta,
  type: FileEntryTypes.file,
  fileType: FileTypes.pdf,
  data: { url: "/pdfs/resume.pdf" },
});

const image = (name: string, meta: string): FolderItem => ({
  name,
  meta,
  icon: ImageIcon,
  type: FileEntryTypes.file,
  fileType: FileTypes.image,
  data: { url: "/wallpaper.jpg", alt: name.replace(/\.[^.]+$/, "") },
});

export const folderContents: Record<string, FolderItem[]> = {
  home: [
    folder("Documents", "documents"),
    folder("Media", "media"),
    folder("Downloads", "downloads"),
    folder("Archive", "archive"),
  ],
  documents: [
    {
      name: "Notes.md",
      meta: "12 KB",
      icon: FileText,
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      data: { text: "# Notes\n\nThis note came from Explorer file data." },
    },
    {
      name: "Project-Proposal.docx",
      meta: "84 KB",
      icon: FileText,
      type: FileEntryTypes.file,
      fileType: FileTypes.binary,
      data: {},
    },
    {
      name: "Budget.xlsx",
      meta: "32 KB",
      icon: FileText,
      type: FileEntryTypes.file,
      fileType: FileTypes.binary,
      data: {},
    },
  ],
  reports: [pdf("Q1-Report.pdf", "1.2 MB"), pdf("Q2-Report.pdf", "1.3 MB")],
  invoices: [pdf("Invoice-1043.pdf", "320 KB"), pdf("Invoice-1044.pdf", "310 KB")],
  media: [folder("Photos", "photos"), folder("Music", "music")],
  photos: [
    folder("Vacation", "vacation"),
    folder("Headshots", "headshots"),
    image("Wallpaper.png", "1.8 MB"),
  ],
  vacation: [image("Beach.png", "2.1 MB"), image("Mountains.png", "1.4 MB")],
  headshots: [image("Profile.jpg", "720 KB")],
  music: [
    {
      name: "Moavii - Foreign (freetouse.com).mp3",
      meta: "5.1 MB",
      icon: Music,
      type: FileEntryTypes.file,
      fileType: FileTypes.audio,
      data: {
        url: "/music/Moavii - Foreign (freetouse.com).mp3",
        title: "Foreign",
        artist: "Moavii",
      },
    },
    {
      name: "Demo.wav",
      meta: "273 KB",
      icon: Music,
      type: FileEntryTypes.file,
      fileType: FileTypes.audio,
      data: { url: "/audio/demo.wav", title: "Demo Track", artist: "Public Library" },
    },
  ],
  downloads: [],
  archive: [
    {
      name: "old-notes.txt",
      meta: "8 KB",
      icon: FileText,
      type: FileEntryTypes.file,
      fileType: FileTypes.notes,
      data: { text: "Archived notes file content." },
    },
  ],
};

export const getFolderPath = (id: string) => {
  const parts: string[] = [];
  let current: string | undefined = id;
  while (current) {
    const metadata = folderIndex.get(current);
    if (!metadata) break;
    parts.unshift(metadata.name);
    current = metadata.parent;
  }
  return parts.length ? parts.join(" / ") : "Home";
};
