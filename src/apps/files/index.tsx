import { Folder } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "../types";

const FilesComponent = lazy(() => import("./Component"));

export const FilesApp: DesktopApp = {
  id: "files",
  title: "Files",
  icon: Folder,
  Component: FilesComponent,
  minSize: { width: 560, height: 360 },
};
