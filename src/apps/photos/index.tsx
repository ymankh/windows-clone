import { Image } from "lucide-react";
import type { DesktopApp } from "../types";
import PhotosComponent from "./Component";

export const PhotosApp: DesktopApp = {
  id: "photos",
  title: "Photos",
  icon: Image,
  Component: PhotosComponent,
  menubar: [
    {
      label: "View",
      items: [
        {
          label: "Start Slideshow",
          shortcut: "Space",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("photos-command", { detail: { type: "play" } })
            ),
        },
        {
          label: "Pause Slideshow",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("photos-command", { detail: { type: "pause" } })
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
              new CustomEvent("photos-command", { detail: { type: "reset" } })
            ),
        },
        {
          label: "Shuffle Focus",
          onSelect: () =>
            window.dispatchEvent(
              new CustomEvent("photos-command", { detail: { type: "shuffle" } })
            ),
        },
      ],
    },
  ],
};
