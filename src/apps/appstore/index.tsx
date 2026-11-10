import { Store } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "../types";

const AppStoreComponent = lazy(() => import("./Component"));

export const AppStoreApp: DesktopApp = {
  id: "app-store",
  title: "App Store",
  icon: Store,
  Component: AppStoreComponent,
  minSize: { width: 640, height: 440 },
};
