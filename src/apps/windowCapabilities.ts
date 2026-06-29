import type {
  ActionExecutionResult,
  AgentCapabilityRegistration,
  SerializableJsonObject,
  SerializableJsonValue,
} from "@/agent/protocol";
import useWindowsManagerStore, { type Window } from "@/desktop/stores/WindowsStore";
import type { DesktopApp } from "./types";
import { buildAppWindow } from "./windowBuilder";

const emptyInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const satisfies SerializableJsonObject;

const windowsOpenAppInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["appId"],
  properties: {
    appId: { type: "string" },
    windowId: { type: "string", description: "Optional explicit window id." },
  },
} as const satisfies SerializableJsonObject;

const windowIdInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["windowId"],
  properties: {
    windowId: { type: "string" },
  },
} as const satisfies SerializableJsonObject;

const windowsListAppsResultSchema = {
  type: "object",
  required: ["apps"],
  properties: {
    apps: { type: "array", items: { type: "object" } },
  },
} as const satisfies SerializableJsonObject;

const windowsListOpenResultSchema = {
  type: "object",
  required: ["windows"],
  properties: {
    windows: { type: "array", items: { type: "object" } },
  },
} as const satisfies SerializableJsonObject;

const windowActionResultSchema = {
  type: "object",
  required: ["windowId"],
  properties: {
    windowId: { type: "string" },
    appId: { type: "string" },
    title: { type: "string" },
  },
} as const satisfies SerializableJsonObject;

type EmptyInput = SerializableJsonObject;

type WindowsOpenAppInput = SerializableJsonObject & {
  readonly appId: string;
  readonly windowId: string | null;
};

type WindowIdInput = SerializableJsonObject & {
  readonly windowId: string;
};

type WindowsListAppsOutput = SerializableJsonObject & {
  readonly apps: readonly SerializableJsonObject[];
};

type WindowsListOpenOutput = SerializableJsonObject & {
  readonly windows: readonly SerializableJsonObject[];
};

type WindowActionOutput = SerializableJsonObject & {
  readonly windowId: string;
  readonly appId: string | null;
  readonly title: string | null;
};

const isRecord = (value: SerializableJsonValue): value is SerializableJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (record: SerializableJsonObject, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const actionError = (
  code: string,
  message: string
): ActionExecutionResult<SerializableJsonValue> => ({
  ok: false,
  error: { code, message },
});

const parseEmptyInput = (input: SerializableJsonValue): EmptyInput => {
  if (!isRecord(input)) throw new Error("Input must be an object");
  return input;
};

const parseWindowsOpenAppInput = (input: SerializableJsonValue): WindowsOpenAppInput => {
  if (!isRecord(input)) throw new Error("windows.openApp input must be an object");
  const appId = getString(input, "appId");
  if (!appId) throw new Error("windows.openApp requires appId");
  return { appId, windowId: getString(input, "windowId") ?? null };
};

const parseWindowIdInput = (input: SerializableJsonValue): WindowIdInput => {
  if (!isRecord(input)) throw new Error("Window input must be an object");
  const windowId = getString(input, "windowId");
  if (!windowId) throw new Error("windowId is required");
  return { windowId };
};

const getWindowAppId = (window: Window, apps: readonly DesktopApp[]) => {
  const exactMatch = apps.find((app) => app.id === window.id);
  if (exactMatch) return exactMatch.id;
  return apps.find((app) => window.id.startsWith(`${app.id}:`))?.id;
};

const getWindowSummary = (window: Window, apps: readonly DesktopApp[]): SerializableJsonObject => ({
  id: window.id,
  appId: getWindowAppId(window, apps) ?? null,
  title: window.title,
  isMinimized: window.isMinimized,
  zIndex: window.zIndex,
  bounds: {
    x: window.x,
    y: window.y,
    width: window.width,
    height: window.height,
  },
});

export const createWindowsAgentCapabilities = (
  apps: readonly DesktopApp[]
): AgentCapabilityRegistration[] => [
  {
    name: "windows.listApps",
    appId: "windows",
    title: "List desktop apps",
    description: "List apps available on the in-browser desktop.",
    safety: "safe",
    execution: "query",
    inputSchema: emptyInputSchema,
    resultSchema: windowsListAppsResultSchema,
    parseInput: parseEmptyInput,
    execute: () => {
      const data: WindowsListAppsOutput = {
        apps: apps.map((app) => ({
          id: app.id,
          title: app.title,
          canOpenFileTypes: app.fileCapabilities?.map(({ fileType }) => fileType) ?? [],
        })),
      };
      return { ok: true, data };
    },
  },
  {
    name: "windows.listOpen",
    appId: "windows",
    title: "List open windows",
    description: "List currently open desktop windows and their visible state.",
    safety: "safe",
    execution: "query",
    inputSchema: emptyInputSchema,
    resultSchema: windowsListOpenResultSchema,
    parseInput: parseEmptyInput,
    execute: () => {
      const data: WindowsListOpenOutput = {
        windows: useWindowsManagerStore
          .getState()
          .windows.map((window) => getWindowSummary(window, apps)),
      };
      return { ok: true, data };
    },
  },
  {
    name: "windows.openApp",
    appId: "windows",
    title: "Open app window",
    description: "Open or focus an app window visibly on the desktop.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: windowsOpenAppInputSchema,
    resultSchema: windowActionResultSchema,
    parseInput: parseWindowsOpenAppInput,
    execute: ({ input }) => {
      const parsed = input as WindowsOpenAppInput;
      const app = apps.find(({ id }) => id === parsed.appId);
      if (!app) return actionError("app-not-found", `Unknown app: ${parsed.appId}`);
      const windowId = parsed.windowId ?? app.id;
      useWindowsManagerStore.getState().openWindow(buildAppWindow(app, { windowId }));
      const data: WindowActionOutput = {
        windowId,
        appId: app.id,
        title: app.title,
      };
      return { ok: true, data };
    },
  },
  {
    name: "windows.focusWindow",
    appId: "windows",
    title: "Focus window",
    description: "Bring an open desktop window to the front and restore it if minimized.",
    safety: "safe",
    execution: "visible-mutation",
    inputSchema: windowIdInputSchema,
    resultSchema: windowActionResultSchema,
    parseInput: parseWindowIdInput,
    execute: ({ input }) => {
      const parsed = input as WindowIdInput;
      const store = useWindowsManagerStore.getState();
      const window = store.windows.find(({ id }) => id === parsed.windowId);
      if (!window) return actionError("window-not-found", "Window not found");
      store.focusWindow(parsed.windowId);
      const data: WindowActionOutput = {
        windowId: window.id,
        appId: getWindowAppId(window, apps) ?? null,
        title: window.title,
      };
      return { ok: true, data };
    },
  },
  {
    name: "windows.closeWindow",
    appId: "windows",
    title: "Close window",
    description: "Close an open desktop window.",
    safety: "needs-confirmation",
    execution: "visible-mutation",
    inputSchema: windowIdInputSchema,
    resultSchema: windowActionResultSchema,
    parseInput: parseWindowIdInput,
    execute: ({ input }) => {
      const parsed = input as WindowIdInput;
      const store = useWindowsManagerStore.getState();
      const window = store.windows.find(({ id }) => id === parsed.windowId);
      if (!window) return actionError("window-not-found", "Window not found");
      const data: WindowActionOutput = {
        windowId: window.id,
        appId: getWindowAppId(window, apps) ?? null,
        title: window.title,
      };
      store.removeWindow(parsed.windowId);
      return { ok: true, data };
    },
  },
];
