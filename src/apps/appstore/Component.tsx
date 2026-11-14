import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { getAppById } from "../registry";
import { buildAppWindow } from "../windowBuilder";
import type { FileType } from "../fileTypes";
import { resolveStoreUrl } from "../store/config";
import useInstalledAppsStore, { type InstalledStoreApp } from "../store/installedAppsStore";
import { installStoreApp, uninstallStoreApp } from "../store/lifecycle";
import { toStoreAppId, type StoreCatalogEntry } from "../store/protocol";
import { fetchAppPackage, fetchCatalog, recordInstall, toUserMessage } from "./api";

const FILE_TYPE_LABELS: Record<FileType, string> = {
  notes: "Notes",
  pdf: "PDF",
  image: "Images",
  audio: "Audio",
  archive: "Archives",
  binary: "Files",
};

type CatalogState =
  | { status: "loading" }
  | { status: "ready"; apps: StoreCatalogEntry[] }
  | { status: "error"; message: string };

type StoreListing = {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  version: string;
  fileTypes: FileType[];
  iconSrc: string;
  installs?: number;
  catalogVersion?: string;
  installed?: InstalledStoreApp;
};

const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

// Installed apps stay listed (and usable) even when the store server is down.
const buildListings = (
  catalog: StoreCatalogEntry[],
  installed: InstalledStoreApp[]
): StoreListing[] => {
  const installedById = new Map(installed.map((app) => [app.manifest.id, app]));
  const listings: StoreListing[] = catalog.map((entry) => ({
    id: entry.id,
    name: entry.name,
    author: entry.author,
    description: entry.description,
    category: entry.category,
    version: entry.version,
    fileTypes: entry.fileTypes,
    iconSrc: resolveStoreUrl(entry.iconUrl),
    installs: entry.installs,
    catalogVersion: entry.version,
    installed: installedById.get(entry.id),
  }));
  const listed = new Set(catalog.map((entry) => entry.id));
  for (const app of installed) {
    if (listed.has(app.manifest.id)) continue;
    listings.push({
      ...app.manifest,
      iconSrc: svgDataUrl(app.icon),
      installed: app,
    });
  }
  return listings;
};

const AppStoreComponent = () => {
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Record<string, "installing" | "removing">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [installCounts, setInstallCounts] = useState<Record<string, number>>({});
  const installed = useInstalledAppsStore((state) => state.apps);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal)
      .then((apps) => setCatalog({ status: "ready", apps }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[App Store] Failed to load the catalog:", error);
        setCatalog({
          status: "error",
          message: toUserMessage(error, "catalog"),
        });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const retry = () => {
    setCatalog({ status: "loading" });
    setReloadKey((value) => value + 1);
  };

  const listings = useMemo(() => {
    const all = buildListings(catalog.status === "ready" ? catalog.apps : [], installed);
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((listing) =>
      [listing.name, listing.description, listing.category, listing.author]
        .some((field) => field.toLowerCase().includes(needle))
    );
  }, [catalog, installed, query]);

  const setAppError = (id: string, message: string | null) =>
    setErrors((current) => {
      const next = { ...current };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });

  const setAppBusy = (id: string, state: "installing" | "removing" | null) =>
    setBusy((current) => {
      const next = { ...current };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });

  const install = async (listing: StoreListing) => {
    setAppBusy(listing.id, "installing");
    setAppError(listing.id, null);
    try {
      const pkg = await fetchAppPackage(listing.id);
      if (!installStoreApp(pkg)) {
        setAppError(
          listing.id,
          "There isn't enough storage space to install this app. Try uninstalling apps you no longer use."
        );
        return;
      }
      const installs = await recordInstall(listing.id);
      if (installs !== null) {
        setInstallCounts((current) => ({ ...current, [listing.id]: installs }));
      }
    } catch (error) {
      console.error(`[App Store] Failed to install "${listing.id}":`, error);
      setAppError(
        listing.id,
        toUserMessage(error, "install")
      );
    } finally {
      setAppBusy(listing.id, null);
    }
  };

  const uninstall = (listing: StoreListing) => {
    setAppBusy(listing.id, "removing");
    uninstallStoreApp(listing.id);
    setAppBusy(listing.id, null);
  };

  const open = (listing: StoreListing) => {
    const app = getAppById(toStoreAppId(listing.id));
    if (app) openWindow(buildAppWindow(app));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card/90 p-3">
        <div>
          <h2 className="text-base font-semibold">App Store</h2>
          <p className="text-xs text-muted-foreground">
            {installed.length} installed
          </p>
        </div>
        <label className="ml-auto flex min-w-48 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 sm:max-w-72">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps"
            aria-label="Search apps"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {catalog.status === "loading" ? (
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            Loading the catalog…
          </p>
        ) : null}

        {catalog.status === "error" ? (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            <span className="text-destructive">
              {catalog.message}
              {installed.length ? " Your installed apps still work." : ""}
            </span>
            <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={retry}>
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : null}

        {listings.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {listings.map((listing) => {
              const state = busy[listing.id];
              const isInstalled = Boolean(listing.installed);
              const hasUpdate =
                isInstalled &&
                listing.catalogVersion !== undefined &&
                listing.catalogVersion !== listing.installed?.manifest.version;
              const installs = installCounts[listing.id] ?? listing.installs;
              const entry = catalog.status === "ready"
                ? catalog.apps.find((app) => app.id === listing.id)
                : undefined;

              return (
                <li
                  key={listing.id}
                  data-store-listing={listing.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <img src={listing.iconSrc} alt="" className="h-12 w-12 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{listing.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {listing.author} · {listing.category} · v
                        {listing.installed?.manifest.version ?? listing.version}
                      </p>
                    </div>
                    {isInstalled ? (
                      <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Installed
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">{listing.description}</p>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {listing.fileTypes.map((fileType) => (
                      <span key={fileType} className="rounded-md border border-border px-2 py-0.5">
                        Opens {FILE_TYPE_LABELS[fileType]}
                      </span>
                    ))}
                    {installs !== undefined ? (
                      <span className="rounded-md border border-border px-2 py-0.5">
                        <Download className="mr-1 inline h-3 w-3" />
                        {installs.toLocaleString()} installs
                      </span>
                    ) : null}
                    {entry ? (
                      <span className="rounded-md border border-border px-2 py-0.5">
                        {formatSize(entry.sizeBytes)}
                      </span>
                    ) : null}
                  </div>

                  {errors[listing.id] ? (
                    <p role="alert" className="text-xs text-destructive">
                      {errors[listing.id]}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2">
                    {!isInstalled ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(state) || catalog.status !== "ready"}
                        onClick={() => void install(listing)}
                        aria-label={`Install ${listing.name}`}
                      >
                        {state === "installing" ? "Installing…" : "Install"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => open(listing)}
                          aria-label={`Open ${listing.name}`}
                        >
                          Open
                        </Button>
                        {hasUpdate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={Boolean(state)}
                            onClick={() => void install(listing)}
                            aria-label={`Update ${listing.name}`}
                          >
                            {state === "installing" ? "Updating…" : `Update to v${listing.catalogVersion}`}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(state)}
                          onClick={() => uninstall(listing)}
                          aria-label={`Uninstall ${listing.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Uninstall
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : catalog.status === "ready" ? (
          <p className="text-sm text-muted-foreground">
            {query ? "No apps match your search." : "The store has no apps yet."}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default AppStoreComponent;
