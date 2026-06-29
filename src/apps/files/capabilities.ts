import type {
  ActionExecutionResult,
  AgentCapabilityRegistration,
  SerializableJsonObject,
  SerializableJsonValue,
} from "@/agent/protocol";
import type { DesktopApp } from "@/apps/types";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import { createAppRegistry, openVirtualFile } from "./controller";
import {
  DEFAULT_FOLDER_ID,
  findVirtualFile,
  listVirtualFolder,
  searchVirtualFiles,
  type VirtualFolderListItem,
  type VirtualSearchResult,
} from "./data";

const filesSearchInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["query"],
  properties: {
    query: { type: "string", minLength: 1 },
    folderId: { type: "string", description: "Folder id or folder path to limit search." },
    includeFolders: { type: "boolean", default: true },
    limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
  },
} as const satisfies SerializableJsonObject;

const filesListFolderInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    folderId: { type: "string", description: "Folder id or folder path. Defaults to Documents." },
  },
} as const satisfies SerializableJsonObject;

const filesOpenFileInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    path: { type: "string", description: "Full virtual path, e.g. Home / Documents / Notes.md." },
    folderId: { type: "string", description: "Folder id or path containing the file." },
    name: { type: "string", description: "File name within folderId." },
    appId: { type: "string", description: "Optional app id to open with. Defaults to the first supporting app." },
  },
} as const satisfies SerializableJsonObject;

const filesSearchResultSchema = {
  type: "object",
  required: ["results"],
  properties: {
    results: { type: "array", items: { type: "object" } },
  },
} as const satisfies SerializableJsonObject;

const filesListFolderResultSchema = {
  type: "object",
  required: ["folderId", "name", "path", "items"],
  properties: {
    folderId: { type: "string" },
    name: { type: "string" },
    path: { type: "string" },
    items: { type: "array", items: { type: "object" } },
  },
} as const satisfies SerializableJsonObject;

const filesOpenFileResultSchema = {
  type: "object",
  required: ["windowId", "appId", "appTitle", "fileName", "fileType"],
  properties: {
    windowId: { type: "string" },
    appId: { type: "string" },
    appTitle: { type: "string" },
    fileName: { type: "string" },
    fileType: { type: "string" },
  },
} as const satisfies SerializableJsonObject;

type FilesSearchInput = SerializableJsonObject & {
  readonly query: string;
  readonly folderId: string | null;
  readonly includeFolders: boolean | null;
  readonly limit: number | null;
};

type FilesListFolderInput = SerializableJsonObject & {
  readonly folderId: string | null;
};

type FilesOpenFileInput = SerializableJsonObject & {
  readonly path: string | null;
  readonly folderId: string | null;
  readonly name: string | null;
  readonly appId: string | null;
};

type FilesSearchOutput = SerializableJsonObject & {
  readonly results: readonly SerializableJsonObject[];
};

type FilesListFolderOutput = SerializableJsonObject & {
  readonly folderId: string;
  readonly name: string;
  readonly path: string;
  readonly items: readonly SerializableJsonObject[];
};

type FilesOpenFileOutput = SerializableJsonObject & {
  readonly windowId: string;
  readonly appId: string;
  readonly appTitle: string;
  readonly fileName: string;
  readonly fileType: string;
};

const isRecord = (value: SerializableJsonValue): value is SerializableJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (record: SerializableJsonObject, key: string) => {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
};

const getBoolean = (record: SerializableJsonObject, key: string) => {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
};

const getNumber = (record: SerializableJsonObject, key: string) => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const actionError = (
  code: string,
  message: string
): ActionExecutionResult<SerializableJsonValue> => ({
  ok: false,
  error: { code, message },
});

const isSerializableJsonValue = (value: unknown): value is SerializableJsonValue => {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") return true;
  if (valueType === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isSerializableJsonValue);
  if (valueType !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(isSerializableJsonValue);
};

const parseFilesSearchInput = (input: SerializableJsonValue): FilesSearchInput => {
  if (!isRecord(input)) throw new Error("files.search input must be an object");
  const query = getString(input, "query")?.trim();
  if (!query) throw new Error("files.search requires a non-empty query");

  const limit = getNumber(input, "limit");
  return {
    query,
    folderId: getString(input, "folderId") ?? null,
    includeFolders: getBoolean(input, "includeFolders") ?? null,
    limit: limit === undefined ? null : Math.max(1, Math.min(50, Math.floor(limit))),
  };
};

const parseFilesListFolderInput = (input: SerializableJsonValue): FilesListFolderInput => {
  if (!isRecord(input)) throw new Error("files.listFolder input must be an object");
  return { folderId: getString(input, "folderId") ?? null };
};

const parseFilesOpenFileInput = (input: SerializableJsonValue): FilesOpenFileInput => {
  if (!isRecord(input)) throw new Error("files.openFile input must be an object");
  const parsed = {
    path: getString(input, "path") ?? null,
    folderId: getString(input, "folderId") ?? null,
    name: getString(input, "name") ?? null,
    appId: getString(input, "appId") ?? null,
  };
  if (!parsed.path && !parsed.name) {
    throw new Error("files.openFile requires either path or name");
  }
  return parsed;
};

const toSearchResult = (result: VirtualSearchResult): SerializableJsonObject => ({
  type: result.type,
  name: result.name,
  folderId: result.folderId,
  path: result.path,
  ...(result.type === "file"
    ? {
        folderPath: result.folderPath,
        fileType: result.fileType,
        meta: result.meta ?? null,
      }
    : {}),
});

const toFolderListItem = (item: VirtualFolderListItem): SerializableJsonObject => ({
  type: item.type,
  name: item.name,
  folderId: item.folderId,
  path: item.path,
  meta: item.meta ?? null,
  ...(item.type === "file"
    ? {
        fileType: item.fileType,
        data: isSerializableJsonValue(item.data) ? item.data : null,
      }
    : {}),
});

export const createFilesAgentCapabilities = (
  apps: readonly DesktopApp[]
): AgentCapabilityRegistration[] => {
  const appRegistry = createAppRegistry(apps);

  return [
    {
      name: "files.search",
      appId: "files",
      title: "Search virtual files",
      description: "Search the in-app virtual file system by file, folder, path, or file type.",
      safety: "safe",
      execution: "query",
      inputSchema: filesSearchInputSchema,
      resultSchema: filesSearchResultSchema,
      parseInput: parseFilesSearchInput,
      execute: ({ input }) => {
        const parsed = input as FilesSearchInput;
        const results = searchVirtualFiles({
          query: parsed.query,
          folderId: parsed.folderId ?? undefined,
          includeFolders: parsed.includeFolders ?? true,
          limit: parsed.limit ?? 20,
        }).map(toSearchResult);
        return { ok: true, data: { results } satisfies FilesSearchOutput };
      },
    },
    {
      name: "files.listFolder",
      appId: "files",
      title: "List virtual folder",
      description: "List the contents of a folder in the in-app virtual file system.",
      safety: "safe",
      execution: "query",
      inputSchema: filesListFolderInputSchema,
      resultSchema: filesListFolderResultSchema,
      parseInput: parseFilesListFolderInput,
      execute: ({ input }) => {
        const parsed = input as FilesListFolderInput;
        const folder = listVirtualFolder(parsed.folderId ?? DEFAULT_FOLDER_ID);
        if (!folder) return actionError("folder-not-found", "Virtual folder not found");
        return {
          ok: true,
          data: {
            folderId: folder.folderId,
            name: folder.name,
            path: folder.path,
            items: folder.items.map(toFolderListItem),
          } satisfies FilesListFolderOutput,
        };
      },
    },
    {
      name: "files.openFile",
      appId: "files",
      title: "Open virtual file",
      description: "Open a virtual file visibly with its default or requested desktop app.",
      safety: "safe",
      execution: "visible-mutation",
      inputSchema: filesOpenFileInputSchema,
      resultSchema: filesOpenFileResultSchema,
      parseInput: parseFilesOpenFileInput,
      execute: ({ input }) => {
        const parsed = input as FilesOpenFileInput;
        const request = {
          path: parsed.path ?? undefined,
          folderId: parsed.folderId ?? undefined,
          name: parsed.name ?? undefined,
          appId: parsed.appId ?? undefined,
        };
        const match = findVirtualFile(request);
        if (!match) return actionError("file-not-found", "Virtual file not found");

        const result = openVirtualFile({
          request,
          appRegistry,
          openWindow: useWindowsManagerStore.getState().openWindow,
        });
        if (!result.ok) return actionError("open-failed", result.error);

        const data: FilesOpenFileOutput = {
          windowId: result.windowId,
          appId: result.appId,
          appTitle: result.appTitle,
          fileName: result.fileName,
          fileType: result.fileType,
        };
        return { ok: true, data };
      },
    },
  ];
};
