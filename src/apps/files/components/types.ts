import type { ComponentType, SVGProps } from "react";
import { Folder as FolderIcon } from "lucide-react";
import type { FileType } from "@/apps/fileTypes";

export const FileEntryTypes = {
  folder: "folder",
  file: "file",
} as const;

type BaseItem = {
  name: string;
  meta?: string;
  icon?: typeof FolderIcon;
};

export type FolderEntry = BaseItem & {
  type: typeof FileEntryTypes.folder;
  targetId?: string;
};

export type FileEntry = BaseItem & {
  type: typeof FileEntryTypes.file;
  fileType: FileType;
  data: unknown;
};

export type FolderItem = FolderEntry | FileEntry;

export type Selection = { folderId: string; item: string | null };

export type OpenWithOption = {
  id: string;
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};
