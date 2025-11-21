import { useEffect, useMemo, useState } from "react";
import type { SerializedEditorState } from "lexical";
import { Editor } from "shadcn-editor/editor";

const STORAGE_KEY = "notes-app-content";

const NotesComponent = () => {
  const initialSerializedState = useMemo(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return undefined;
    try {
      return JSON.parse(saved) as SerializedEditorState;
    } catch {
      return undefined;
    }
  }, []);

  const [serialized, setSerialized] = useState<SerializedEditorState | undefined>(
    initialSerializedState
  );

  useEffect(() => {
    if (!serialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }, [serialized]);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string; payload?: File }>).detail;
      if (!detail) return;

      if (detail.action === "save-md") {
        const content = localStorage.getItem(STORAGE_KEY) ?? "";
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "note.md";
        anchor.click();
        URL.revokeObjectURL(url);
      }

      if (detail.action === "open-md") {
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
  }, []);

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
        id="notes-md-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          window.dispatchEvent(
            new CustomEvent("notes-file-command", {
              detail: { action: "open-md", payload: file },
            })
          );
          event.target.value = "";
        }}
      />
    </div>
  );
};

export default NotesComponent;
