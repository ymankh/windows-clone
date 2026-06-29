import type { SerializedEditorState } from "lexical";
import { create } from "zustand";
import { FileTypes } from "../fileTypes";
import type { AppWindowComponentProps } from "../types";
import { LexicalNodeTypes, LexicalTextModes } from "./constants";
import { notesFileDataSchema } from "./schema";

const STORAGE_KEY = "notes-app-content";

type LexicalSerializedNode = {
  type?: string;
  text?: string;
  children?: LexicalSerializedNode[];
};

export const toSerializedStateFromText = (text: string): SerializedEditorState =>
  ({
    root: {
      type: LexicalNodeTypes.root,
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: text.split(/\r?\n/).map((line) => ({
        type: LexicalNodeTypes.paragraph,
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: line
          ? [
              {
                type: LexicalNodeTypes.text,
                version: 1,
                text: line,
                detail: 0,
                format: 0,
                mode: LexicalTextModes.normal,
                style: "",
              },
            ]
          : [],
      })),
    },
  } as unknown as SerializedEditorState);

const extractNodeText = (node: LexicalSerializedNode): string => {
  if (typeof node.text === "string") return node.text;
  if (!node.children?.length) return "";

  if (node.type === LexicalNodeTypes.root) {
    return node.children.map(extractNodeText).join("\n");
  }

  return node.children.map(extractNodeText).join("");
};

export const textFromSerializedState = (serialized: SerializedEditorState | undefined) => {
  if (!serialized) return "";
  return extractNodeText(serialized.root as unknown as LexicalSerializedNode);
};

const readSavedSerialized = () => {
  if (typeof localStorage === "undefined") return undefined;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return undefined;

  try {
    return JSON.parse(saved) as SerializedEditorState;
  } catch {
    return undefined;
  }
};

const persistSerialized = (serialized: SerializedEditorState | undefined) => {
  if (typeof localStorage === "undefined" || !serialized) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
};

export const serializedFromNotesFileContext = (
  fileContext: AppWindowComponentProps["fileContext"]
) => {
  if (fileContext?.type !== FileTypes.notes) return undefined;

  const parsed = notesFileDataSchema.safeParse(fileContext.data);
  if (!parsed.success) return undefined;

  if (parsed.data.serialized && typeof parsed.data.serialized === "object") {
    return parsed.data.serialized as SerializedEditorState;
  }

  if (typeof parsed.data.text === "string") {
    return toSerializedStateFromText(parsed.data.text);
  }

  return undefined;
};

type NotesStore = {
  serialized: SerializedEditorState | undefined;
  revision: number;
  hydrate: (fileContext?: AppWindowComponentProps["fileContext"]) => void;
  setFromEditor: (serialized: SerializedEditorState) => void;
  setSerialized: (serialized: SerializedEditorState | undefined) => void;
  writeText: (options: { mode: "replace" | "append"; text: string }) => void;
  readText: () => string;
  clear: () => void;
};

const useNotesStore = create<NotesStore>((set, get) => ({
  serialized: undefined,
  revision: 0,
  hydrate: (fileContext) => {
    const serialized = serializedFromNotesFileContext(fileContext) ?? readSavedSerialized();
    if (!serialized) return;

    set((state) => ({
      serialized,
      revision: state.revision + 1,
    }));
    persistSerialized(serialized);
  },
  setFromEditor: (serialized) => {
    set({ serialized });
    persistSerialized(serialized);
  },
  setSerialized: (serialized) => {
    set((state) => ({
      serialized,
      revision: state.revision + 1,
    }));
    persistSerialized(serialized);
  },
  writeText: ({ mode, text }) => {
    const currentText = mode === "append" ? get().readText() : "";
    const serialized = toSerializedStateFromText(`${currentText}${text}`);
    get().setSerialized(serialized);
  },
  readText: () => textFromSerializedState(get().serialized),
  clear: () => {
    get().setSerialized(toSerializedStateFromText(""));
  },
}));

export default useNotesStore;
