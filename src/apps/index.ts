import { AIAssistantApp } from "./ai-assistant";
import { BrowserApp } from "./browser";
import { FilesApp } from "./files";
import { MusicApp } from "./music";
import { NotesApp } from "./notes";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";
import { PdfApp } from "./pdf";

export const desktopApps = [
  BrowserApp,
  NotesApp,
  MusicApp,
  PhotosApp,
  FilesApp,
  TerminalApp,
  PdfApp,
  AIAssistantApp,
];

export type { DesktopApp } from "./types";
