import { FilesApp } from "./files";
import { NotesApp } from "./notes";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";
import { PdfApp } from "./pdf";

export const desktopApps = [NotesApp, PhotosApp, FilesApp, TerminalApp, PdfApp];

export type { DesktopApp } from "./types";
