import { Image } from "lucide-react";
import type { DesktopApp } from "../types";
import PhotosComponent from "./Component";
import { imageFileDataSchema } from "./schema";

const createPhotosMenubar = (windowId: string) => [
  {
    label: "View",
    items: [
      {
        label: "Start Slideshow",
        shortcut: "Space",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", { detail: { type: "play", windowId } })
          ),
      },
      {
        label: "Pause Slideshow",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", { detail: { type: "pause", windowId } })
          ),
      },
    ],
  },
  {
    label: "Organize",
    items: [
      {
        label: "Reset Filters",
        shortcut: "Ctrl+R",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", { detail: { type: "reset", windowId } })
          ),
      },
      {
        label: "Shuffle Focus",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", { detail: { type: "shuffle", windowId } })
          ),
      },
    ],
  },
];

export const PhotosApp: DesktopApp = {
  id: "photos",
  title: "Photos",
  icon: Image,
  Component: PhotosComponent,
  createMenubar: createPhotosMenubar,
  fileCapabilities: [{ fileType: "image", schema: imageFileDataSchema }],
};
