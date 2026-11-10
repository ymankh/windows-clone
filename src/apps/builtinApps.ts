import { Palette } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "./types";
import { AppStoreApp } from "./appstore";
import { BrowserApp } from "./browser";
import { FilesApp } from "./files";
import { MusicApp } from "./music";
import { NotesApp } from "./notes";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";
import { PdfApp } from "./pdf";

const PersonalizationComponent = lazy(
  () => import("../desktop/modules/personalization/components/PersonalizationWindow")
);

export const PersonalizationApp: DesktopApp = {
  id: "personalization",
  title: "Personalization",
  icon: Palette,
  Component: PersonalizationComponent,
  minSize: { width: 640, height: 420 },
};

/** Apps that ship with the desktop and always appear on it. */
export const builtinDesktopApps: DesktopApp[] = [
  BrowserApp,
  NotesApp,
  MusicApp,
  PhotosApp,
  FilesApp,
  TerminalApp,
  PdfApp,
  AppStoreApp,
];

/** Built-in apps that can open a window, including ones without a desktop icon. */
export const builtinWindowApps: DesktopApp[] = [...builtinDesktopApps, PersonalizationApp];
