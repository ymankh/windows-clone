import { lazy, useMemo, type SVGProps } from "react";
import { z } from "zod";
import type { AppWindowComponentProps, DesktopApp } from "./types";
import type { FileType } from "./fileTypes";
import { builtinDesktopApps, builtinWindowApps, PersonalizationApp } from "./builtinApps";
import useInstalledAppsStore, { type InstalledStoreApp } from "./store/installedAppsStore";
import { toStoreAppId } from "./store/protocol";

const StoreAppFrame = lazy(() => import("./store/StoreAppFrame"));

// File data for store apps is converted by the host (see portableFile.ts), so
// the window builder only needs to let it through.
const passthroughSchema = z.unknown();

const builtinById = new Map(builtinWindowApps.map((app) => [app.id, app]));

const createSvgIcon = (svgMarkup: string) => {
  // Rendering SVG through <img> means scripts inside it can never run.
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  const StoreAppIcon = ({ className }: SVGProps<SVGSVGElement>) => (
    <img src={src} alt="" aria-hidden="true" draggable={false} className={className} />
  );
  return StoreAppIcon;
};

// DesktopApp objects must keep a stable identity (their Component is used as a
// React component type), so they are cached per install.
const storeAppCache = new Map<string, { installedAt: number; app: DesktopApp }>();

const toDesktopApp = (installed: InstalledStoreApp): DesktopApp => {
  const { manifest } = installed;
  const id = toStoreAppId(manifest.id);
  const cached = storeAppCache.get(id);
  if (cached?.installedAt === installed.installedAt) return cached.app;

  const StoreAppComponent = (props: AppWindowComponentProps) => (
    <StoreAppFrame appId={id} {...props} />
  );

  const app: DesktopApp = {
    id,
    title: manifest.name,
    icon: createSvgIcon(installed.icon),
    Component: StoreAppComponent,
    minSize: manifest.minSize,
    fileCapabilities: manifest.fileTypes.map((fileType) => ({
      fileType,
      schema: passthroughSchema,
    })),
    source: "store",
    version: manifest.version,
  };
  storeAppCache.set(id, { installedAt: installed.installedAt, app });
  return app;
};

const getInstalledDesktopApps = () =>
  useInstalledAppsStore.getState().apps.map(toDesktopApp);

/** All apps with a desktop icon: built-in apps followed by installed store apps. */
export const getDesktopApps = () => [...builtinDesktopApps, ...getInstalledDesktopApps()];

export const getAppById = (appId: string) => {
  const builtin = builtinById.get(appId);
  if (builtin) return builtin;
  const installed = useInstalledAppsStore
    .getState()
    .apps.find((app) => toStoreAppId(app.manifest.id) === appId);
  return installed ? toDesktopApp(installed) : undefined;
};

/** Every installed app that can open the given file type, built-in apps first. */
export const getAppsForFileType = (fileType: FileType) =>
  getDesktopApps().filter((app) =>
    app.fileCapabilities?.some((capability) => capability.fileType === fileType)
  );

export const useDesktopApps = () => {
  const installed = useInstalledAppsStore((state) => state.apps);
  return useMemo(
    () => [...builtinDesktopApps, ...installed.map(toDesktopApp)],
    [installed]
  );
};

/** Apps listed in the Start menu. */
export const useLauncherApps = () => {
  const desktopApps = useDesktopApps();
  return useMemo(() => [...desktopApps, PersonalizationApp], [desktopApps]);
};
