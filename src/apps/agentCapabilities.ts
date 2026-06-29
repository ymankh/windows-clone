import { BrowserApp } from "./browser";
import { FilesApp } from "./files";
import { MusicApp } from "./music";
import { NotesApp } from "./notes";
import { PdfApp } from "./pdf";
import { PhotosApp } from "./photos";
import { TerminalApp } from "./terminal";
import type { AgentCapabilityRegistration } from "@/agent/protocol";
import { createFilesAgentCapabilities } from "./files/capabilities";
import { createWindowsAgentCapabilities } from "./windowCapabilities";
import type { DesktopApp } from "./types";

const agentCapableApps: readonly DesktopApp[] = [
  BrowserApp,
  NotesApp,
  MusicApp,
  PhotosApp,
  FilesApp,
  TerminalApp,
  PdfApp,
];

export const getDesktopAgentCapabilities = (): AgentCapabilityRegistration[] => [
  ...agentCapableApps.flatMap((app) => app.agentCapabilities ?? []),
  ...createFilesAgentCapabilities(agentCapableApps),
  ...createWindowsAgentCapabilities(agentCapableApps),
];
