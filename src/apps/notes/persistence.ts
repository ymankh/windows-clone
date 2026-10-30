import type { SerializedEditorState } from "lexical";
import { serializedEditorStateSchema } from "./schema";

const STORAGE_PREFIX = "notes-app-content";

export const loadPersistedNote = (windowId: string): SerializedEditorState | undefined => {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}:${windowId}`);
    if (!saved) return undefined;
    const parsed = serializedEditorStateSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

export const persistNote = (windowId: string, state: SerializedEditorState) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${windowId}`, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
