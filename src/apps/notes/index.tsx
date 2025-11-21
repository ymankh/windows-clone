import { FileText } from "lucide-react";
import type { DesktopApp } from "../types";

const NotesContent = () => (
  <div className="space-y-2 text-sm leading-relaxed">
    <p>Welcome to your desktop mock. This is a sample Notes window.</p>
    <p>Click the top bar buttons to minimize, restore, or close.</p>
  </div>
);

export const NotesApp: DesktopApp = {
  id: "notes",
  title: "Notes",
  icon: FileText,
  Component: NotesContent,
  menubar: [
    {
      label: "File",
      items: [
        { label: "New Note", shortcut: "Ctrl+N" },
        { label: "Open...", shortcut: "Ctrl+O" },
        { type: "separator" },
        { label: "Save", shortcut: "Ctrl+S" },
        { label: "Save As..." },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z" },
        { label: "Redo", shortcut: "Ctrl+Y" },
        { type: "separator" },
        { label: "Find", shortcut: "Ctrl+F" },
      ],
    },
    {
      label: "View",
      items: [
        {
          type: "submenu",
          label: "Zoom",
          items: [
            { label: "Zoom In", shortcut: "Ctrl++" },
            { label: "Zoom Out", shortcut: "Ctrl+-" },
            { label: "Reset Zoom", shortcut: "Ctrl+0" },
          ],
        },
        { label: "Toggle Sidebar" },
      ],
    },
  ],
};

