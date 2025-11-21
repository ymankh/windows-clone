import { Folder } from "lucide-react";
import type { DesktopApp } from "../types";
import FilesComponent from "./Component";

export const FilesApp: DesktopApp = {
  id: "files",
  title: "Files",
  icon: Folder,
  Component: FilesComponent,
};
