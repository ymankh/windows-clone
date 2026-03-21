import { useEffect, useMemo, useState } from "react";
import type { AppWindowComponentProps } from "../types";
import type { SerializedEditorState } from "lexical";
import { Editor } from "shadcn-editor/editor";
import { FileTypes } from "../fileTypes";
import {
  LexicalNodeTypes,
  LexicalTextModes,
  NotesFileActions,
  type NotesFileCommandDetail,
} from "./constants";
import { notesFileDataSchema } from "./schema";

const STORAGE_KEY = "notes-app-content";

const toSerializedStateFromText = (text: string): SerializedEditorState =>
  ({
    root: {
      type: LexicalNodeTypes.root,
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: [
        {
          type: LexicalNodeTypes.paragraph,
          version: 1,
          format: "",
          indent: 0,
          direction: null,
          children: [
            {
              type: LexicalNodeTypes.text,
              version: 1,
              text,
              detail: 0,
              format: 0,
              mode: LexicalTextModes.normal,
              style: "",
            },
          ],
        },
      ],
    },
  } as unknown as SerializedEditorState);

const NotesComponent = ({ windowId = "notes", fileContext }: AppWindowComponentProps) => {
  const initialSerializedState = useMemo(() => {
    if (fileContext?.type === FileTypes.notes) {
      const parsed = notesFileDataSchema.safeParse(fileContext.data);
      if (parsed.success) {
        if (parsed.data.serialized && typeof parsed.data.serialized === "object") {
          return parsed.data.serialized as SerializedEditorState;
        }
        if (typeof parsed.data.text === "string") {
          return toSerializedStateFromText(parsed.data.text);
        }
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return undefined;
    try {
      return JSON.parse(saved) as SerializedEditorState;
    } catch {
      return undefined;
    }
  }, [fileContext]);

  const [serialized, setSerialized] = useState<SerializedEditorState | undefined>(
    initialSerializedState
  );

  useEffect(() => {
    if (!serialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }, [serialized]);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<NotesFileCommandDetail>).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.action === NotesFileActions.saveMd) {
        const content = localStorage.getItem(STORAGE_KEY) ?? "";
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "note.md";
        anchor.click();
        URL.revokeObjectURL(url);
      }

      if (detail.action === NotesFileActions.openMd) {
        const file = detail.payload;
        if (!file) return;
        file.text().then((text) => {
          try {
            const parsed = JSON.parse(text) as SerializedEditorState;
            setSerialized(parsed);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch {
            // ignore invalid content
          }
        });
      }
    };

    window.addEventListener("notes-file-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("notes-file-command", handleCommand as EventListener);
    };
  }, [windowId]);

  return (
    <div className="flex h-full w-full flex-col">
      <Editor
        editorSerializedState={serialized}
        onSerializedChange={setSerialized}
        className="flex-1 min-h-0"
      />
      <input
        type="file"
        accept=".md,application/json"
        className="hidden"
        id={`notes-md-input-${windowId}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          window.dispatchEvent(
            new CustomEvent("notes-file-command", {
              detail: {
                action: NotesFileActions.openMd,
                payload: file,
                windowId,
              },
            })
          );
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default NotesComponent;
