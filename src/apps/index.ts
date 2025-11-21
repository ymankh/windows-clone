import { FilesApp } from "./files";
import { NotesApp } from "./notes";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";

export const desktopApps = [NotesApp, PhotosApp, FilesApp, TerminalApp];

export type { DesktopApp } from "./types";
