import { Image } from "lucide-react";
import type { DesktopApp } from "../types";
import PhotosComponent from "./Component";

export const PhotosApp: DesktopApp = {
  id: "photos",
  title: "Photos",
  icon: Image,
  Component: PhotosComponent,
};
