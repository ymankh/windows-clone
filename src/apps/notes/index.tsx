import { FileText } from "lucide-react";
import type { DesktopApp } from "../types";
import NotesComponent from "./Component";

export const NotesApp: DesktopApp = {
  id: "notes",
  title: "Notes",
  icon: FileText,
  Component: NotesComponent,
  menubar: [
    {
      label: "File",
      items: [
        {
          label: "New Note",
          shortcut: "Ctrl+N",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "clear" } })
            ),
        },
        {
          label: "Open (md/json)",
          onSelect: () => {
            document.getElementById("notes-md-input")?.click();
          },
        },
        {
          label: "Save as Markdown",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-file-command", { detail: { action: "save-md" } })
            ),
        },
      ],
    },
    {
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "undo" } })
            ),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "redo" } })
            ),
        },
      ],
    },
    {
      label: "Format",
      items: [
        {
          label: "Bold",
          shortcut: "Ctrl+B",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "bold" } })
            ),
        },
        {
          label: "Italic",
          shortcut: "Ctrl+I",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "italic" } })
            ),
        },
        {
          label: "Underline",
          shortcut: "Ctrl+U",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", { detail: { action: "underline" } })
            ),
        },
      ],
    },
  ],
};
