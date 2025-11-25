import { Folder as FolderIcon } from "lucide-react";

export type FolderItem = {
  name: string;
  type: "folder" | "file";
  meta?: string;
  icon?: typeof FolderIcon;
  targetId?: string;
};

export type Selection = { folderId: string; item: string | null };
