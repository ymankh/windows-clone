export const MusicCommandTypes = {
  toggle: "toggle",
  next: "next",
  previous: "previous",
} as const;

export type MusicCommandType =
  (typeof MusicCommandTypes)[keyof typeof MusicCommandTypes];

export type MusicCommandDetail = {
  type?: MusicCommandType;
  windowId?: string;
};
