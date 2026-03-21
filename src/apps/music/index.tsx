import { Music4 } from "lucide-react";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import MusicComponent from "./Component";
import { MusicCommandTypes } from "./constants";
import { audioFileDataSchema } from "./schema";

const createMusicMenubar = (windowId: string) => [
  {
    label: "Playback",
    items: [
      {
        label: "Play / Pause",
        shortcut: "Space",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("music-command", {
              detail: { type: MusicCommandTypes.toggle, windowId },
            })
          ),
      },
      {
        label: "Previous Track",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("music-command", {
              detail: { type: MusicCommandTypes.previous, windowId },
            })
          ),
      },
      {
        label: "Next Track",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("music-command", {
              detail: { type: MusicCommandTypes.next, windowId },
            })
          ),
      },
    ],
  },
];

export const MusicApp: DesktopApp = {
  id: "music",
  title: "Music",
  icon: Music4,
  Component: MusicComponent,
  createMenubar: createMusicMenubar,
  fileCapabilities: [{ fileType: FileTypes.audio, schema: audioFileDataSchema }],
};
