import { FileText } from "lucide-react";
import type { DesktopApp } from "../types";
import NotesComponent from "./Component";
import { notesFileDataSchema } from "./schema";

const createNotesMenubar = (windowId: string) => {
  const inputId = `notes-md-input-${windowId}`;

  return [
    {
      label: "File",
      items: [
        {
          label: "New Note",
          shortcut: "Ctrl+N",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: "clear", windowId },
              })
            ),
        },
        {
          label: "Open (md/json)",
          onSelect: () => {
            document.getElementById(inputId)?.click();
          },
        },
        {
          label: "Save as Markdown",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-file-command", {
                detail: { action: "save-md", windowId },
              })
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
              new CustomEvent("notes-editor-command", {
                detail: { action: "undo", windowId },
              })
            ),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: "redo", windowId },
              })
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
              new CustomEvent("notes-editor-command", {
                detail: { action: "bold", windowId },
              })
            ),
        },
        {
          label: "Italic",
          shortcut: "Ctrl+I",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: "italic", windowId },
              })
            ),
        },
        {
          label: "Underline",
          shortcut: "Ctrl+U",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: "underline", windowId },
              })
            ),
        },
      ],
    },
  ];
};

export const NotesApp: DesktopApp = {
  id: "notes",
  title: "Notes",
  icon: FileText,
  Component: NotesComponent,
  createMenubar: createNotesMenubar,
  fileCapabilities: [{ fileType: "notes", schema: notesFileDataSchema }],
};
