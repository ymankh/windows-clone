export const NotesEditorActions = {
  clear: "clear",
  undo: "undo",
  redo: "redo",
  bold: "bold",
  italic: "italic",
  underline: "underline",
} as const;

export type NotesEditorAction =
  (typeof NotesEditorActions)[keyof typeof NotesEditorActions];

export const NotesFileActions = {
  saveMd: "save-md",
  openMd: "open-md",
} as const;

export type NotesFileAction =
  (typeof NotesFileActions)[keyof typeof NotesFileActions];

export type NotesEditorCommandDetail = {
  action: NotesEditorAction;
  windowId?: string;
};

export type NotesFileCommandDetail = {
  action: NotesFileAction;
  payload?: File;
  windowId?: string;
};

export const LexicalNodeTypes = {
  root: "root",
  paragraph: "paragraph",
  text: "text",
} as const;

export const LexicalTextModes = {
  normal: "normal",
} as const;
