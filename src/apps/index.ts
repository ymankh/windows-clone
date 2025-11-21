import { FilesApp } from "./FilesApp";
import { NotesApp } from "./NotesApp";
import { PhotosApp } from "./PhotosApp";
import { TerminalApp } from "./TerminalApp";

export const desktopApps = [NotesApp, PhotosApp, FilesApp, TerminalApp];

export type { DesktopApp } from "./types";
