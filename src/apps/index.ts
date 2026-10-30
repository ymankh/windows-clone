import { Palette } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "./types";
import type { FileType } from "./fileTypes";
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

export const desktopApps = [
  BrowserApp,
  NotesApp,
  MusicApp,
  PhotosApp,
  FilesApp,
  TerminalApp,
  PdfApp,
];

export const windowApps = [...desktopApps, PersonalizationApp];

const appsById = new Map(windowApps.map((app) => [app.id, app]));

export const getAppById = (appId: string) => appsById.get(appId);

export const getAppForFileType = (fileType: FileType) =>
  desktopApps.find((app) =>
    app.fileCapabilities?.some((capability) => capability.fileType === fileType)
  );

export type { DesktopApp } from "./types";
