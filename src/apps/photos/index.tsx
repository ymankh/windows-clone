import { Image } from "lucide-react";
import type { DesktopApp } from "../types";

const PhotosContent = () => (
  <div className="text-sm">
    <p>A placeholder Photos app preview.</p>
  </div>
);

export const PhotosApp: DesktopApp = {
  id: "photos",
  title: "Photos",
  icon: Image,
  Component: PhotosContent,
};

