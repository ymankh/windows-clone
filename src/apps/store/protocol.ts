import { z } from "zod";
import { FileTypes, type FileType } from "../fileTypes";

// Shared between the desktop (browser) and the store server (Node). Keep this
// file free of DOM and Node APIs.

/** Installed store apps are registered under this prefix to avoid clashing with built-in app ids. */
export const STORE_APP_ID_PREFIX = "store:";

export const toStoreAppId = (manifestId: string) => `${STORE_APP_ID_PREFIX}${manifestId}`;

export const isStoreAppId = (appId: string) => appId.startsWith(STORE_APP_ID_PREFIX);

const MAX_HTML_BYTES = 512_000;
const MAX_ICON_BYTES = 32_000;

export const storeAppManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Use lowercase letters, digits and dashes"),
  name: z.string().min(1).max(40),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning, e.g. 1.0.0"),
  author: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  category: z.string().min(1).max(30),
  /** File types this app can open from Files ("Open with"). */
  fileTypes: z.array(z.enum(FileTypes)).default([]),
  minSize: z
    .object({
      width: z.number().int().min(240).max(1600),
      height: z.number().int().min(180).max(1200),
    })
    .optional(),
});

export type StoreAppManifest = z.infer<typeof storeAppManifestSchema>;

export const storeCatalogEntrySchema = storeAppManifestSchema.extend({
  /** Path to the icon, relative to the store server. */
  iconUrl: z.string().min(1),
  installs: z.number().int().min(0),
  sizeBytes: z.number().int().min(0),
});

export type StoreCatalogEntry = z.infer<typeof storeCatalogEntrySchema>;

export const storeCatalogSchema = z.object({
  apps: z.array(storeCatalogEntrySchema),
});

/** Everything needed to run an app offline once it is installed. */
export const storeAppPackageSchema = z.object({
  manifest: storeAppManifestSchema,
  /** Self-contained HTML document (inline CSS/JS) with the desktop SDK injected. */
  html: z.string().min(1).max(MAX_HTML_BYTES),
  /** SVG markup. Rendered through <img>, so any scripts in it never run. */
  icon: z.string().min(1).max(MAX_ICON_BYTES),
});

export type StoreAppPackage = z.infer<typeof storeAppPackageSchema>;

// ---------------------------------------------------------------------------
// Desktop <-> app bridge (window.postMessage)
// ---------------------------------------------------------------------------

export const APP_MESSAGE_SOURCE = "desktop-app";
export const HOST_MESSAGE_SOURCE = "desktop-host";

export type ThemeModeName = "light" | "dark";

/**
 * The desktop theme values shared with store apps. Each one reaches the app
 * as a CSS variable of the same name (`--primary`, ...), which is what the
 * shared UI library (`server/sdk/desktop-ui.css`) is built on.
 */
export const THEME_TOKEN_NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "radius",
  "font-sans",
  "font-mono",
] as const;

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];
export type ThemeTokens = Partial<Record<ThemeTokenName, string>>;

/** A file handed to a store app, converted to a form any app can use. */
export type PortableFile = {
  name: string;
  type: FileType;
  /** Plain text (Markdown for notes). */
  text?: string;
  /** Absolute URL for binary files such as images or PDFs. */
  url?: string;
};

export type HostInitPayload = {
  windowId: string;
  file: PortableFile | null;
  /** Whatever the app last passed to saveState for this window, or null. */
  state: unknown;
  theme: ThemeModeName;
  /** The current desktop theme, so the app can match it. */
  tokens: ThemeTokens;
};

const appMessageBase = { source: z.literal(APP_MESSAGE_SOURCE) };

export const appToHostMessageSchema = z.discriminatedUnion("type", [
  z.object({ ...appMessageBase, type: z.literal("ready") }),
  z.object({ ...appMessageBase, type: z.literal("setTitle"), title: z.string().max(80) }),
  z.object({ ...appMessageBase, type: z.literal("saveState"), state: z.unknown() }),
  z.object({
    ...appMessageBase,
    type: z.literal("download"),
    name: z.string().min(1).max(120),
    content: z.string().max(5_000_000),
    mimeType: z.string().max(100).optional(),
  }),
]);

export type AppToHostMessage = z.infer<typeof appToHostMessageSchema>;
