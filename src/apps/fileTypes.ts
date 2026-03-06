export const FILE_TYPES = ["notes", "pdf", "image", "audio", "archive", "binary"] as const;

export type FileType = (typeof FILE_TYPES)[number];
