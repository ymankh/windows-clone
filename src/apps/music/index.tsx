import { Music4 } from "lucide-react";
import type { DesktopApp } from "../types";
import MusicComponent from "./Component";
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
              detail: { type: "toggle", windowId },
            })
          ),
      },
      {
        label: "Previous Track",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("music-command", {
              detail: { type: "previous", windowId },
            })
          ),
      },
      {
        label: "Next Track",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("music-command", {
              detail: { type: "next", windowId },
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
  fileCapabilities: [{ fileType: "audio", schema: audioFileDataSchema }],
};
