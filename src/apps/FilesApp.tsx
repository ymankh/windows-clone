import { Folder } from "lucide-react";
import type { DesktopApp } from "./types";

const FilesContent = () => (
  <div className="text-sm">
    <ul className="list-disc space-y-1 pl-4">
      <li>Documents</li>
      <li>Downloads</li>
      <li>Pictures</li>
    </ul>
  </div>
);

export const FilesApp: DesktopApp = {
  id: "files",
  title: "Files",
  icon: Folder,
  Component: FilesContent,
};

