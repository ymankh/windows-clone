import { Music4 } from "lucide-react";
import { z } from "zod";
import type { AgentCapabilityRegistration, JsonSchemaLike } from "@/agent/protocol";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { buildAppWindow } from "../windowBuilder";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import MusicComponent from "./Component";
import { MusicCommandTypes } from "./constants";
import { audioFileDataSchema } from "./schema";
import useMusicStore from "./store";

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

const musicPlayFileInputSchema = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  artist: z.string().optional(),
}).strict();

const musicEmptyInputSchema = z.object({}).strict();

const openMusicWindow = () => {
  const windowId = MusicApp.id;
  useWindowsManagerStore.getState().openWindow(buildAppWindow(MusicApp, { windowId }));
  return windowId;
};

const getMusicQueueSnapshot = () => {
  const { tracks, activeTrackId, isPlaying } = useMusicStore.getState();
  return {
    tracks: tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      src: track.src,
      active: track.id === activeTrackId,
    })),
    activeTrackId,
    isPlaying,
  };
};

const titleFromUrl = (url: string) => {
  const fallback = "Opened audio file";
  const tail = url.split(/[\\/]/).pop()?.split("?")[0]?.split("#")[0];
  return tail ? decodeURIComponent(tail) : fallback;
};

const musicQueueResultSchema = {
  type: "object",
  properties: {
    tracks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          artist: { type: "string" },
          src: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["id", "title", "artist", "src", "active"],
      },
    },
    activeTrackId: { type: ["string", "null"] },
    isPlaying: { type: "boolean" },
  },
  required: ["tracks", "activeTrackId", "isPlaying"],
} as const satisfies JsonSchemaLike;

const musicAgentCapabilities: AgentCapabilityRegistration[] = [
  {
    name: "music.playFile",
    appId: "music",
    title: "Play Music File",
    description: "Queue an audio file in Music and select it for playback.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Audio file URL or data URL." },
        title: { type: "string" },
        artist: { type: "string" },
      },
      required: ["url"],
      additionalProperties: false,
    },
    resultSchema: {
      type: "object",
      properties: {
        windowId: { type: "string" },
        trackId: { type: "string" },
        queue: musicQueueResultSchema,
      },
      required: ["windowId", "trackId", "queue"],
    },
    parseInput: (input) => musicPlayFileInputSchema.parse(input),
    execute: ({ input }) => {
      const parsed = musicPlayFileInputSchema.parse(input);
      const windowId = openMusicWindow();
      const trackId = useMusicStore.getState().addTrack({
        src: parsed.url,
        title: parsed.title ?? titleFromUrl(parsed.url),
        artist: parsed.artist ?? "Opened by AI Assistant",
      });
      return { windowId, trackId, queue: getMusicQueueSnapshot() };
    },
  },
  {
    name: "music.playPause",
    appId: "music",
    title: "Toggle Music Playback",
    description: "Toggle play or pause for the selected Music track.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: musicQueueResultSchema,
    parseInput: (input) => musicEmptyInputSchema.parse(input ?? {}),
    execute: () => {
      openMusicWindow();
      useMusicStore.getState().togglePlayback();
      return getMusicQueueSnapshot();
    },
  },
  {
    name: "music.next",
    appId: "music",
    title: "Next Music Track",
    description: "Select the next queued Music track.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: musicQueueResultSchema,
    parseInput: (input) => musicEmptyInputSchema.parse(input ?? {}),
    execute: () => {
      openMusicWindow();
      useMusicStore.getState().playNext();
      return getMusicQueueSnapshot();
    },
  },
  {
    name: "music.previous",
    appId: "music",
    title: "Previous Music Track",
    description: "Select the previous queued Music track.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: musicQueueResultSchema,
    parseInput: (input) => musicEmptyInputSchema.parse(input ?? {}),
    execute: () => {
      openMusicWindow();
      useMusicStore.getState().playPrevious();
      return getMusicQueueSnapshot();
    },
  },
  {
    name: "music.listQueue",
    appId: "music",
    title: "List Music Queue",
    description: "List queued Music tracks and playback state.",
    safety: "safe",
    execution: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    resultSchema: musicQueueResultSchema,
    parseInput: (input) => musicEmptyInputSchema.parse(input ?? {}),
    execute: () => getMusicQueueSnapshot(),
  },
];

export const MusicApp: DesktopApp = {
  id: "music",
  title: "Music",
  icon: Music4,
  Component: MusicComponent,
  createMenubar: createMusicMenubar,
  fileCapabilities: [{ fileType: FileTypes.audio, schema: audioFileDataSchema }],
  agentCapabilities: musicAgentCapabilities,
};
