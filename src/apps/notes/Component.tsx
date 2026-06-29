import { useEffect } from "react";
import type { SerializedEditorState } from "lexical";
import { Editor } from "shadcn-editor/editor";
import type { AppWindowComponentProps } from "../types";
import { NotesFileActions, type NotesFileCommandDetail } from "./constants";
import useNotesStore from "./store";

const NotesComponent = ({ windowId = "notes", fileContext }: AppWindowComponentProps) => {
  const serialized = useNotesStore((state) => state.serialized);
  const revision = useNotesStore((state) => state.revision);
  const hydrate = useNotesStore((state) => state.hydrate);
  const setFromEditor = useNotesStore((state) => state.setFromEditor);
  const setSerialized = useNotesStore((state) => state.setSerialized);

  useEffect(() => {
    hydrate(fileContext);
  }, [fileContext, hydrate]);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<NotesFileCommandDetail>).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.action === NotesFileActions.saveMd) {
        const content = JSON.stringify(useNotesStore.getState().serialized ?? {});
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
  }, [setSerialized, windowId]);

  return (
    <div className="flex h-full w-full flex-col">
      <Editor
        key={revision}
        editorSerializedState={serialized}
        onSerializedChange={setFromEditor}
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
