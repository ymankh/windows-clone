import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { useHiddenIconsStore } from "@/desktop/helpers/hiddenIcons";
import { forgetIconPosition } from "@/desktop/helpers/iconPositioning";
import { useFileAssociationsStore } from "../fileAssociations";
import useInstalledAppsStore from "./installedAppsStore";
import { toStoreAppId, type StoreAppPackage } from "./protocol";
import { clearStoreAppState } from "./storeAppState";

/** Installs (or updates) an app. Returns false if browser storage is full. */
export const installStoreApp = (pkg: StoreAppPackage) => {
  const installed = useInstalledAppsStore.getState().install(pkg);
  // A previously removed icon should reappear when the app is (re)installed.
  if (installed) useHiddenIconsStore.getState().unhide(toStoreAppId(pkg.manifest.id));
  return installed;
};

/**
 * Removes an app and everything it left behind: open windows, its desktop
 * icon position, file-type defaults pointing at it, and its saved data.
 */
export const uninstallStoreApp = (manifestId: string) => {
  const appId = toStoreAppId(manifestId);
  useWindowsManagerStore.getState().closeWindowsForApp(appId);
  useFileAssociationsStore.getState().forgetApp(appId);
  useHiddenIconsStore.getState().unhide(appId);
  forgetIconPosition(appId);
  clearStoreAppState(appId);
  useInstalledAppsStore.getState().remove(manifestId);
};
