import { Image } from "lucide-react";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import PhotosComponent from "./Component";
import { PhotosCommandTypes } from "./constants";
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
            new CustomEvent("photos-command", {
              detail: { type: PhotosCommandTypes.play, windowId },
            })
          ),
      },
      {
        label: "Pause Slideshow",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", {
              detail: { type: PhotosCommandTypes.pause, windowId },
            })
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
            new CustomEvent("photos-command", {
              detail: { type: PhotosCommandTypes.reset, windowId },
            })
          ),
      },
      {
        label: "Shuffle Focus",
        onSelect: () =>
          window.dispatchEvent(
            new CustomEvent("photos-command", {
              detail: { type: PhotosCommandTypes.shuffle, windowId },
            })
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
  fileCapabilities: [{ fileType: FileTypes.image, schema: imageFileDataSchema }],
};
