import type { ComponentType, SVGProps } from "react";
import { Folder as FolderIcon } from "lucide-react";

export type FolderItem = {
  name: string;
  type: "folder" | "file";
  meta?: string;
  icon?: typeof FolderIcon;
  targetId?: string;
  openWith?: string[];
};

export type Selection = { folderId: string; item: string | null };

export type OpenWithOption = {
  id: string;
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};
