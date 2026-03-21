export const FileTypes = {
  notes: "notes",
  pdf: "pdf",
  image: "image",
  audio: "audio",
  archive: "archive",
  binary: "binary",
} as const;

export type FileType = (typeof FileTypes)[keyof typeof FileTypes];

export const FILE_TYPES = Object.values(FileTypes) as FileType[];
