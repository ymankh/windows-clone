import { FileText } from "lucide-react";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import NotesComponent from "./Component";
import { NotesEditorActions, NotesFileActions } from "./constants";
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
                detail: { action: NotesEditorActions.clear, windowId },
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
                detail: { action: NotesFileActions.saveMd, windowId },
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
                detail: { action: NotesEditorActions.undo, windowId },
              })
            ),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: NotesEditorActions.redo, windowId },
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
                detail: { action: NotesEditorActions.bold, windowId },
              })
            ),
        },
        {
          label: "Italic",
          shortcut: "Ctrl+I",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: NotesEditorActions.italic, windowId },
              })
            ),
        },
        {
          label: "Underline",
          shortcut: "Ctrl+U",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("notes-editor-command", {
                detail: { action: NotesEditorActions.underline, windowId },
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
  fileCapabilities: [{ fileType: FileTypes.notes, schema: notesFileDataSchema }],
};
