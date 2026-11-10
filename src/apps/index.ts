export { PersonalizationApp, builtinDesktopApps, builtinWindowApps } from "./builtinApps";
export {
  getAppById,
  getAppsForFileType,
  getDesktopApps,
  useDesktopApps,
  useLauncherApps,
} from "./registry";
export {
  getDefaultAppForFileType,
  resolveDefaultApp,
  useFileAssociationsStore,
} from "./fileAssociations";

export type { DesktopApp } from "./types";
