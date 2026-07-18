import { useEffect, useMemo, useState } from "react";
import type { AppWindowComponentProps } from "../types";
import type { SerializedEditorState } from "lexical";
import { Editor } from "shadcn-editor/editor";
import { FileTypes } from "../fileTypes";
import {
  NotesFileActions,
  type NotesFileCommandDetail,
} from "./constants";
import { notesFileDataSchema } from "./schema";
import {
  parseNotesFile,
  serializedStateToMarkdown,
  textToSerializedState,
} from "./serialization";
import { loadPersistedNote, persistNote } from "./persistence";


const NotesComponent = ({ windowId = "notes", fileContext }: AppWindowComponentProps) => {
  const initialSerializedState = useMemo(() => {
    if (fileContext?.type === FileTypes.notes) {
      const parsed = notesFileDataSchema.safeParse(fileContext.data);
      if (parsed.success) {
        if (parsed.data.serialized) {
          return parsed.data.serialized;
        }
        if (typeof parsed.data.text === "string") {
          return textToSerializedState(parsed.data.text);
        }
      }
    }

    return loadPersistedNote(windowId);
  }, [fileContext, windowId]);

  const [serialized, setSerialized] = useState<SerializedEditorState | undefined>(
    initialSerializedState
  );
  const [editorRevision, setEditorRevision] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleSerializedChange = (next: SerializedEditorState) => {
    setSerialized(next);
    if (persistNote(windowId, next)) {
      setFileError(null);
    } else {
      setFileError("This note could not be saved in browser storage.");
    }
  };

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<NotesFileCommandDetail>).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.action === NotesFileActions.saveMd) {
        if (!serialized) return;
        const content = serializedStateToMarkdown(serialized);
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${fileContext?.name.replace(/\.[^.]+$/, "") || "note"}.md`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }

      if (detail.action === NotesFileActions.openMd) {
        const file = detail.payload;
        if (!file) return;
        void file.text().then((text) => {
          try {
            const parsed = parseNotesFile(file.name, text);
            setSerialized(parsed);
            setEditorRevision((value) => value + 1);
            setFileError(null);
          } catch (error) {
            setFileError(error instanceof Error ? error.message : "The note could not be opened.");
          }
        });
      }
    };

    window.addEventListener("notes-file-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("notes-file-command", handleCommand as EventListener);
    };
  }, [fileContext?.name, serialized, windowId]);

  return (
    <div className="flex h-full w-full flex-col">
      <Editor
        key={editorRevision}
        windowId={windowId}
        editorSerializedState={serialized}
        onSerializedChange={handleSerializedChange}
        className="flex-1 min-h-0"
      />
      {fileError ? (
        <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {fileError}
        </p>
      ) : null}
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
