import { FileText } from "lucide-react";
import { z } from "zod";
import type { AgentCapabilityRegistration } from "@/agent/protocol";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { buildAppWindow } from "../windowBuilder";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import NotesComponent from "./Component";
import { NotesEditorActions, NotesFileActions } from "./constants";
import { notesFileDataSchema } from "./schema";
import useNotesStore from "./store";

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

const notesOpenInputSchema = z.object({
  title: z.string().optional(),
}).strict();

const notesWriteTextInputSchema = z.object({
  mode: z.enum(["replace", "append"]),
  text: z.string(),
  title: z.string().optional(),
}).strict();

const notesEmptyInputSchema = z.object({}).strict();

const openNotesWindow = (title?: string) => {
  const cleanedTitle = title?.trim();
  const windowId = NotesApp.id;
  useWindowsManagerStore.getState().openWindow(
    buildAppWindow(NotesApp, {
      windowId,
      title: cleanedTitle ? `${NotesApp.title} - ${cleanedTitle}` : NotesApp.title,
    })
  );
  return windowId;
};

const notesAgentCapabilities: AgentCapabilityRegistration[] = [
  {
    name: "notes.open",
    appId: "notes",
    title: "Open Notes",
    description: "Open or focus the Notes app.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Optional title to show in the Notes window." },
      },
      additionalProperties: false,
    },
    resultSchema: {
      type: "object",
      properties: { windowId: { type: "string" } },
      required: ["windowId"],
    },
    parseInput: (input) => notesOpenInputSchema.parse(input ?? {}),
    execute: ({ input }) => {
      const parsed = notesOpenInputSchema.parse(input);
      return { windowId: openNotesWindow(parsed.title) };
    },
  },
  {
    name: "notes.writeText",
    appId: "notes",
    title: "Write Notes Text",
    description: "Replace or append text in the current Notes document.",
    safety: "needs-confirmation",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["replace", "append"] },
        text: { type: "string" },
        title: { type: "string", description: "Optional title to show in the Notes window." },
      },
      required: ["mode", "text"],
      additionalProperties: false,
    },
    resultSchema: {
      type: "object",
      properties: {
        windowId: { type: "string" },
        text: { type: "string" },
      },
      required: ["windowId", "text"],
    },
    parseInput: (input) => notesWriteTextInputSchema.parse(input),
    execute: ({ input }) => {
      const parsed = notesWriteTextInputSchema.parse(input);
      const windowId = openNotesWindow(parsed.title);
      useNotesStore.getState().writeText(parsed);
      return { windowId, text: useNotesStore.getState().readText() };
    },
  },
  {
    name: "notes.readCurrent",
    appId: "notes",
    title: "Read Current Note",
    description: "Read the current Notes document text.",
    safety: "safe",
    execution: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    parseInput: (input) => notesEmptyInputSchema.parse(input ?? {}),
    execute: () => ({ text: useNotesStore.getState().readText() }),
  },
  {
    name: "notes.clear",
    appId: "notes",
    title: "Clear Notes",
    description: "Clear the current Notes document.",
    safety: "destructive",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: {
      type: "object",
      properties: {
        windowId: { type: "string" },
        text: { type: "string" },
      },
      required: ["windowId", "text"],
    },
    parseInput: (input) => notesEmptyInputSchema.parse(input ?? {}),
    execute: () => {
      const windowId = openNotesWindow();
      useNotesStore.getState().clear();
      return { windowId, text: "" };
    },
  },
];

export const NotesApp: DesktopApp = {
  id: "notes",
  title: "Notes",
  icon: FileText,
  Component: NotesComponent,
  createMenubar: createNotesMenubar,
  fileCapabilities: [{ fileType: FileTypes.notes, schema: notesFileDataSchema }],
  agentCapabilities: notesAgentCapabilities,
};
