export const BrowserCommandTypes = {
  back: "back",
  forward: "forward",
  reload: "reload",
  home: "home",
} as const;

export type BrowserCommandType =
  (typeof BrowserCommandTypes)[keyof typeof BrowserCommandTypes];

export type BrowserCommandDetail = {
  type?: BrowserCommandType;
  windowId?: string;
};
