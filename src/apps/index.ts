import { FilesApp } from "./files";
import { MusicApp } from "./music";
import { NotesApp } from "./notes";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";
import { PdfApp } from "./pdf";

export const desktopApps = [
  NotesApp,
  MusicApp,
  PhotosApp,
  FilesApp,
  TerminalApp,
  PdfApp,
];

export type { DesktopApp } from "./types";
