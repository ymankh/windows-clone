import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import type {
  AgentSession,
  AgentSessionEvent,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { AGENT_PROTOCOL_VERSION, parseAgentClientEvent } from "../src/agent/protocol.ts";
import type {
  ActionError,
  AgentActionCall,
  AgentActionResult,
  AgentCapabilityManifest,
  AgentClientEvent,
  AgentServerEvent,
  CapabilityName,
  ConnectionStatus,
  JsonSchemaLike,
  PersistedChatMessage,
  PersistedAgentTraceRecord,
  PermissionMode,
  SerializableJsonValue,
} from "../src/agent/protocol.ts";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 31415;
const AGENT_PATH = "/pi-agent";
const SESSION_START_TIMEOUT_MS = 20_000;
const PROMPT_RESPONSE_TIMEOUT_MS = 90_000;


const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export type PiAgentBridgeOptions = {
  readonly host?: string;
  readonly port?: number;
  readonly path?: string;
  readonly cwd?: string;
  readonly server?: Server;
  readonly staticDir?: string;
  readonly log?: (message: string) => void;
};

export type PiAgentBridge = {
  readonly server: Server;
  readonly wsServer: WebSocketServer;
  readonly url: string;
  close: () => Promise<void>;
};

type PendingAction = {
  readonly resolve: (result: AgentActionResult) => void;
  readonly reject: (error: Error) => void;
  readonly abort: () => void;
};

type MessageRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is MessageRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const piAssistantMessageSchema = z
  .object({
    role: z.string().optional(),
    content: z.union([z.string(), z.array(z.unknown())]).optional(),
  })
  .passthrough();

const piTextContentPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .passthrough();

const piThinkingContentPartSchema = z
  .object({
    type: z.literal("thinking"),
    thinking: z.string(),
  })
  .passthrough();

const piTextDeltaEventSchema = z
  .object({
    type: z.literal("text_delta"),
    delta: z.string(),
  })
  .passthrough();

const piThinkingDeltaEventSchema = z
  .object({
    type: z.literal("thinking_delta"),
    delta: z.string(),
  })
  .passthrough();

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};


const createActionError = (
  code: string,
  message: string,
  details?: SerializableJsonValue
): ActionError => ({ code, message, details });

const safeJson = (value: unknown): SerializableJsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(safeJson);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, safeJson(nested)])
    );
  }

  return String(value);
};

const toDisplayList = (values: string[]) => {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0] ?? "";
  const head = values.slice(0, -1).join(", ");
  return `${head}, and ${values.at(-1)}`;
};

const summarizeActionResult = (
  capabilityName: CapabilityName,
  result: AgentActionResult
) => {
  if (!result.ok) return result.error.message;
  if (result.message) return result.message;

  const data = result.data;
  if (capabilityName === "windows.listApps" && isRecord(data) && Array.isArray(data.apps)) {
    const appNames = data.apps
      .map((app) => (isRecord(app) && typeof app.title === "string" ? app.title : undefined))
      .filter((title): title is string => Boolean(title));
    return appNames.length
      ? `I found ${appNames.length} desktop apps: ${toDisplayList(appNames)}.`
      : "I checked the desktop apps, but there were no apps to show.";
  }

  if (capabilityName === "files.search" && isRecord(data) && Array.isArray(data.results)) {
    const fileNames = data.results
      .map((file) => (isRecord(file) && typeof file.name === "string" ? file.name : undefined))
      .filter((name): name is string => Boolean(name));
    return fileNames.length
      ? `I found ${fileNames.length} matching file${fileNames.length === 1 ? "" : "s"}: ${toDisplayList(fileNames)}.`
      : "I searched the files, but did not find a matching item.";
  }

  if (capabilityName === "music.listQueue" && isRecord(data) && Array.isArray(data.tracks)) {
    const trackNames = data.tracks
      .map((track) => (isRecord(track) && typeof track.title === "string" ? track.title : undefined))
      .filter((title): title is string => Boolean(title));
    return trackNames.length
      ? `The Music queue has ${trackNames.length} track${trackNames.length === 1 ? "" : "s"}: ${toDisplayList(trackNames)}.`
      : "The Music queue is empty.";
  }

  if (capabilityName === "notes.readCurrent" && isRecord(data) && typeof data.text === "string") {
    return data.text.trim()
      ? `The current note says: ${data.text.trim()}`
      : "The current note is empty.";
  }

  return `Done — ${capabilityName} completed successfully.`;
};


const toPiToolName = (capabilityName: CapabilityName) =>
  capabilityName.replace(/[^A-Za-z0-9_-]/g, "__");


const normalizeInputSchema = (schema: JsonSchemaLike): ToolDefinition["parameters"] => {
  if (schema.type === "object") {
    return schema as ToolDefinition["parameters"];
  }

  return {
    type: "object",
    properties: {
      value: schema,
    },
    required: ["value"],
    additionalProperties: false,
  } as ToolDefinition["parameters"];
};

const getAssistantContent = (message: unknown) => {
  const parsed = piAssistantMessageSchema.safeParse(message);
  return parsed.success ? parsed.data.content : undefined;
};

const extractAssistantText = (message: unknown) => {
  const content = getAssistantContent(message);
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      const parsed = piTextContentPartSchema.safeParse(part);
      return parsed.success ? parsed.data.text : "";
    })
    .join("");
};

const extractAssistantReasoning = (message: unknown) => {
  const content = getAssistantContent(message);
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      const parsed = piThinkingContentPartSchema.safeParse(part);
      return parsed.success ? parsed.data.thinking : "";
    })
    .filter(Boolean)
    .join("\n\n");
};


const getMessageRole = (message: unknown) =>
  isRecord(message) && typeof message.role === "string" ? message.role : undefined;

const createAssistantMessage = (
  id: string,
  sessionId: string | undefined,
  message: unknown,
  status: PersistedChatMessage["status"],
  streamedText = "",
  streamedReasoning = ""
): PersistedChatMessage => {
  const reasoning = extractAssistantReasoning(message) || streamedReasoning;
  const text = extractAssistantText(message) || streamedText;
  return {
    id,
    role: "assistant",
    createdAt: new Date().toISOString(),
    text: text || (reasoning ? undefined : "Pi Agent finished without a visible response. Try asking again, or check the configured model/API key in Pi."),
    status,
    reasoning: reasoning || undefined,
    metadata: sessionId ? { sessionId } : undefined,
  };
};

const isCapabilityManifest = (value: unknown): value is AgentCapabilityManifest =>
  isRecord(value) &&
  typeof value.name === "string" &&
  value.name.includes(".") &&
  typeof value.appId === "string" &&
  typeof value.description === "string" &&
  (value.safety === "safe" ||
    value.safety === "needs-confirmation" ||
    value.safety === "destructive") &&
  (value.execution === "query" || value.execution === "visible-mutation") &&
  isRecord(value.inputSchema);

const isPermissionMode = (value: unknown): value is PermissionMode =>
  value === "confirm-all" || value === "auto-safe" || value === "auto-all";

const contentTypeByExtension = (path: string) => {
  switch (extname(path).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
};

const serveStatic = async (
  request: IncomingMessage,
  response: ServerResponse,
  staticDir: string
) => {
  if (!request.url) {
    response.writeHead(404, JSON_HEADERS).end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const url = new URL(request.url, "http://localhost");
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const candidate = normalize(resolve(staticDir, relativePath));
  const root = normalize(resolve(staticDir));

  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    response.writeHead(403, JSON_HEADERS).end(JSON.stringify({ error: "Forbidden" }));
    return;
  }

  const filePath = existsSync(candidate) ? candidate : join(root, "index.html");

  try {
    const body = await readFile(filePath);
    response
      .writeHead(200, { "content-type": contentTypeByExtension(filePath) })
      .end(body);
  } catch {
    response.writeHead(404, JSON_HEADERS).end(JSON.stringify({ error: "Not found" }));
  }
};

class PiAgentSocketConnection {
  private readonly ws: WebSocket;
  private readonly cwd: string;
  private readonly log: (message: string) => void;
  private capabilities = new Map<CapabilityName, AgentCapabilityManifest>();
  private permissionMode: PermissionMode = "auto-safe";
  private session: AgentSession | undefined;
  private unsubscribe: (() => void) | undefined;
  private toolsVersion = 0;
  private sessionToolsVersion = -1;
  private currentAssistantId: string | undefined;
  private currentAssistantText = "";
  private currentAssistantReasoning = "";
  private assistantMessageCompleted = false;
  private lastActionMessage: string | undefined;
  private pendingActions = new Map<string, PendingAction>();

  constructor(ws: WebSocket, cwd: string, log: (message: string) => void) {
    this.ws = ws;
    this.cwd = cwd;
    this.log = log;
    ws.on("message", (data) => {
      void this.handleRawMessage(data).catch((error) => {
        this.send({
          type: "assistant_message_error",
          error: createActionError("backend.message_error", toErrorMessage(error)),
        });
      });
    });

    ws.on("close", () => this.dispose());
    ws.on("error", () => this.dispose());
  }

  send(event: AgentServerEvent) {
    this.logEvent("output", event.type, event);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private sendConnectionStatus(status: ConnectionStatus, message?: string) {
    this.send({ type: "connection.status", status, message });
  }

  private sendTrace(
    title: string,
    detail?: string,
    status: PersistedAgentTraceRecord["status"] = "complete",
    data?: SerializableJsonValue
  ) {
    this.send({
      type: "agent_trace",
      trace: {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        title,
        detail,
        status,
        data,
      },
    });
  }

  private logEvent(direction: "input" | "output" | "session" | "raw", type: string, payload: unknown) {
    this.log(
      `[pi-agent:${direction}] ${type} ${JSON.stringify(safeJson(payload))}`
    );
  }

  private async handleRawMessage(data: WebSocket.RawData) {
    let parsed: unknown;
    const rawMessage = data.toString("utf8");
    this.logEvent("raw", "websocket.message", rawMessage);
    try {
      parsed = JSON.parse(rawMessage);
    } catch {
      this.send({
        type: "assistant_message_error",
        error: createActionError("protocol.invalid_json", "Message was not valid JSON"),
      });
      return;
    }

    let event: AgentClientEvent;
    try {
      event = parseAgentClientEvent(parsed);
    } catch (error) {
      this.logEvent("input", "protocol.invalid_event", {
        error: toErrorMessage(error),
        payload: parsed,
      });
      this.send({
        type: "assistant_message_error",
        error: createActionError("protocol.invalid_event", "Message did not match the Pi agent protocol"),
      });
      return;
    }

    this.logEvent("input", event.type, event);

    await this.handleClientEvent(event);
  }

  private async handleClientEvent(event: AgentClientEvent) {
    switch (event.type) {
      case "hello":
        this.acceptCapabilities(event.capabilities, event.permissionMode);
        this.send({
          type: "hello",
          protocolVersion: AGENT_PROTOCOL_VERSION,
          serverId: "pi-agent-bridge",
          sessionId: this.session?.sessionId,
          acceptedCapabilities: [...this.capabilities.keys()],
        });
        this.sendConnectionStatus("connected", "Pi Agent bridge connected");
        break;

      case "capabilities":
        this.acceptCapabilities(event.capabilities, event.permissionMode);
        this.send({
          type: "hello",
          protocolVersion: AGENT_PROTOCOL_VERSION,
          serverId: "pi-agent-bridge",
          sessionId: this.session?.sessionId,
          acceptedCapabilities: [...this.capabilities.keys()],
        });
        break;

      case "session.resume": {
        const session = await this.ensureSession(event.sessionId);
        this.send({
          type: "session.resumed",
          chatId: event.chatId,
          sessionId: session.sessionId,
        });
        break;
      }

      case "user_prompt":
        await this.handlePrompt(event.chatId, event.sessionId, event.prompt);
        break;

      case "action_result":
        this.resolveAction(event.result);
        break;

      case "action_status":
        this.send({ type: "action_status", status: event.status });
        break;

      case "cancel":
        await this.cancel(event.id, event.reason);
        break;

      case "connection.status":
        break;
    }
  }

  private acceptCapabilities(
    capabilities: readonly AgentCapabilityManifest[],
    permissionMode: PermissionMode
  ) {
    if (isPermissionMode(permissionMode)) {
      this.permissionMode = permissionMode;
    }

    const nextCapabilities = new Map<CapabilityName, AgentCapabilityManifest>();
    for (const capability of capabilities) {
      if (isCapabilityManifest(capability)) {
        nextCapabilities.set(capability.name, capability);
      }
    }

    this.capabilities = nextCapabilities;
    this.toolsVersion += 1;
  }


  private async handlePrompt(chatId: string, requestedSessionId: string | undefined, prompt: string) {
    this.assistantMessageCompleted = false;
    this.lastActionMessage = undefined;
    let session: AgentSession;
    try {
      session = await withTimeout(
        this.ensureSession(requestedSessionId),
        SESSION_START_TIMEOUT_MS,
        "Pi Agent session did not start in time. Check Pi model/API-key configuration and try again."
      );
      this.send({ type: "session.resumed", chatId, sessionId: session.sessionId });
    } catch (error) {
      this.send({
        type: "assistant_message_error",
        error: createActionError("pi.session_failed", toErrorMessage(error)),
      });
      return;
    }

    if (!session.model) {
      this.send({
        type: "assistant_message_error",
        error: createActionError(
          "pi.model_unavailable",
          "Pi Agent has no model configured. Configure a model/API key in Pi, then try again."
        ),
      });
      return;
    }

    try {
      await withTimeout(
        session.prompt(prompt, {
          source: "rpc",
          streamingBehavior: session.isStreaming ? "followUp" : undefined,
        }),
        PROMPT_RESPONSE_TIMEOUT_MS,
        "Pi Agent did not produce a response in time. Check the configured model/API key and try again."
      );
    } catch (error) {
      this.send({
        type: "assistant_message_error",
        id: this.currentAssistantId,
        error: createActionError("pi.prompt_failed", toErrorMessage(error)),
      });
    }
  }

  private async ensureSession(requestedSessionId: string | undefined) {
    if (
      this.session &&
      this.sessionToolsVersion === this.toolsVersion &&
      (!requestedSessionId || this.session.sessionId === requestedSessionId)
    ) {
      return this.session;
    }

    this.unsubscribe?.();
    this.session?.dispose();
    this.session = undefined;

    const sessionManager = await this.createSessionManager(requestedSessionId);
    const customTools = this.createCustomTools();
    const loader = new DefaultResourceLoader({
      cwd: this.cwd,
      agentDir: getAgentDir(),
      systemPromptOverride: () => this.buildSystemPrompt(),
    });
    await loader.reload();

    const { session } = await createAgentSession({
      cwd: this.cwd,
      sessionManager,
      resourceLoader: loader,
      customTools,
      tools: customTools.map((tool) => tool.name),
    });

    this.session = session;
    this.sessionToolsVersion = this.toolsVersion;
    this.unsubscribe = session.subscribe((event) => this.handleSessionEvent(event));
    return session;
  }

  private async createSessionManager(requestedSessionId: string | undefined) {
    if (!requestedSessionId) {
      return SessionManager.create(this.cwd);
    }

    const sessions = await SessionManager.list(this.cwd).catch(() => []);
    const existing = sessions.find((session) => session.id === requestedSessionId);
    if (existing) {
      return SessionManager.open(existing.path, undefined, this.cwd);
    }

    return SessionManager.create(this.cwd, undefined, { id: requestedSessionId });
  }

  private createCustomTools(): ToolDefinition[] {
    return [...this.capabilities.values()].map((capability) => {
      const toolName = toPiToolName(capability.name);

      return defineTool({
        name: toolName,
        label: capability.title ?? capability.name,
        description: `${capability.name}: ${capability.description}`,
        promptSnippet: `${capability.name} (${toolName}): ${capability.description}`,
        promptGuidelines: [
          `Use ${toolName} for the ${capability.name} app capability only.`,
          `This capability is ${capability.safety} and executes as ${capability.execution}.`,
        ],
        parameters: normalizeInputSchema(capability.inputSchema),
        executionMode: capability.execution === "query" ? "parallel" : "sequential",
        execute: async (toolCallId, params, signal) =>
          this.executeFrontendAction(toolCallId, capability, safeJson(params), signal),
      });
    });
  }

  private buildSystemPrompt() {
    const capabilities = [...this.capabilities.values()]
      .map(
        (capability) =>
          `- ${capability.name} (${capability.safety}, ${capability.execution}): ${capability.description}`
      )
      .join("\n");

    return [
      "You are the AI Assistant for an in-browser Windows-like desktop.",
      "Be conversational and cooperative, but perform desktop work by calling the provided app capability tools.",
      "All visible mutations are executed by the frontend. Never claim an action finished until the corresponding tool returns success.",
      "Prefer visible, step-by-step app actions over describing manual steps.",
      `The current permission mode is ${this.permissionMode}. Respect confirmation and safety results from the frontend.`,
      "Available app capabilities:",
      capabilities || "- No app capabilities are currently registered.",
    ].join("\n");
  }

  private async executeFrontendAction(
    toolCallId: string,
    capability: AgentCapabilityManifest,
    input: SerializableJsonValue,
    signal: AbortSignal | undefined
  ) {
    const call: AgentActionCall = {
      id: toolCallId,
      capability: capability.name,
      input,
      sessionId: this.session?.sessionId,
      messageId: this.currentAssistantId,
      createdAt: new Date().toISOString(),
    };

    const result = await new Promise<AgentActionResult>((resolve, reject) => {
      const abort = () => {
        this.pendingActions.delete(call.id);
        this.send({
          type: "action_status",
          status: {
            callId: call.id,
            capability: capability.name,
            status: "cancelled",
            timestamp: new Date().toISOString(),
            message: "Action cancelled by Pi Agent abort",
          },
        });
        reject(new Error("Action cancelled"));
      };

      if (signal?.aborted) {
        abort();
        return;
      }

      signal?.addEventListener("abort", abort, { once: true });
      this.pendingActions.set(call.id, {
        resolve,
        reject,
        abort: () => {
          signal?.removeEventListener("abort", abort);
          abort();
        },
      });

      this.send({ type: "action_call", call });
      this.send({
        type: "action_status",
        status: {
          callId: call.id,
          capability: capability.name,
          status: "queued",
          timestamp: new Date().toISOString(),
          message: "Waiting for frontend action executor",
        },
      });
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const text = summarizeActionResult(capability.name, result);
    this.lastActionMessage = text;
    return {
      content: [{ type: "text" as const, text }],
      details: {
        capability: capability.name,
        callId: call.id,
        result,
      },
    };
  }

  private resolveAction(result: AgentActionResult) {
    const pending = this.pendingActions.get(result.callId);
    if (!pending) {
      this.send({
        type: "action_error",
        callId: result.callId,
        error: createActionError("action.unknown_call", "No pending action matched this result"),
      });
      return;
    }

    this.pendingActions.delete(result.callId);
    pending.resolve(result);
  }

  private handleSessionEvent(event: AgentSessionEvent) {
    this.logEvent("session", event.type, event);

    switch (event.type) {
      case "message_start":
        if (getMessageRole(event.message) === "assistant") {
          this.currentAssistantId = randomUUID();
          this.currentAssistantText = "";
          this.currentAssistantReasoning = "";
          this.send({
            type: "assistant_message_start",
            id: this.currentAssistantId,
            sessionId: this.session?.sessionId,
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case "message_update": {
        const assistantEvent = event.assistantMessageEvent;
        const textDelta = piTextDeltaEventSchema.safeParse(assistantEvent);
        const reasoningDelta = piThinkingDeltaEventSchema.safeParse(assistantEvent);

        if (!textDelta.success && !reasoningDelta.success) {
          break;
        }

        if (!this.currentAssistantId) {
          this.currentAssistantId = randomUUID();
          this.currentAssistantText = "";
          this.currentAssistantReasoning = "";
          this.send({
            type: "assistant_message_start",
            id: this.currentAssistantId,
            sessionId: this.session?.sessionId,
            createdAt: new Date().toISOString(),
          });
        }

        if (reasoningDelta.success) {
          this.currentAssistantReasoning += reasoningDelta.data.delta;
          this.send({
            type: "assistant_reasoning_delta",
            id: this.currentAssistantId,
            delta: reasoningDelta.data.delta,
          });
          break;
        }

        if (textDelta.success) {
          this.currentAssistantText += textDelta.data.delta;
          this.send({
            type: "assistant_text_delta",
            id: this.currentAssistantId,
            delta: textDelta.data.delta,
          });
        }
        break;
      }

      case "message_end":
        if (getMessageRole(event.message) === "assistant" && this.currentAssistantId) {
          this.send({
            type: "assistant_message_done",
            message: createAssistantMessage(
              this.currentAssistantId,
              this.session?.sessionId,
              event.message,
              "complete",
              this.currentAssistantText,
              this.currentAssistantReasoning
            ),
          });
          this.assistantMessageCompleted = true;
          this.currentAssistantId = undefined;
          this.currentAssistantText = "";
          this.currentAssistantReasoning = "";
        }
        break;

      case "agent_end":
        if (!this.assistantMessageCompleted && this.lastActionMessage) {
          this.send({
            type: "assistant_message_done",
            message: {
              id: randomUUID(),
              role: "assistant",
              createdAt: new Date().toISOString(),
              text: this.lastActionMessage,
              status: "complete",
            },
          });
          this.assistantMessageCompleted = true;
        }
        this.sendTrace("Agent run completed", "Pi Agent finished this run.", "complete");
        this.sendConnectionStatus("connected", "Pi Agent idle");
        break;

      default:
        break;
    }
  }

  private async cancel(id: string, reason: string | undefined) {
    for (const pending of this.pendingActions.values()) {
      pending.abort();
    }
    this.pendingActions.clear();

    try {
      await this.session?.abort();
      this.send({ type: "cancelled", id, sessionId: this.session?.sessionId, reason });
    } catch (error) {
      this.send({
        type: "assistant_message_error",
        id,
        error: createActionError("pi.cancel_failed", toErrorMessage(error)),
      });
    }
  }

  private dispose() {
    this.unsubscribe?.();
    this.session?.dispose();
    for (const pending of this.pendingActions.values()) {
      pending.reject(new Error("WebSocket disconnected before action completed"));
    }
    this.pendingActions.clear();
  }
}

const getErrorCode = (error: unknown) =>
  isRecord(error) && typeof error.code === "string" ? error.code : undefined;

const getListeningPort = (server: Server, fallbackPort: number) => {
  const address = server.address();
  if (typeof address === "object" && address !== null) {
    return (address as AddressInfo).port;
  }

  return fallbackPort;
};

const listen = (server: Server, host: string, port: number) =>
  new Promise<number>((resolveListen, rejectListen) => {
    const cleanup = () => {
      server.off("error", onError);
    };
    const onError = (error: Error) => {
      cleanup();
      rejectListen(error);
    };

    server.once("error", onError);
    server.listen(port, host, () => {
      cleanup();
      resolveListen(getListeningPort(server, port));
    });
  });

export const startPiAgentBridge = async (
  options: PiAgentBridgeOptions = {}
): Promise<PiAgentBridge> => {
  const host = options.host ?? process.env.PI_AGENT_HOST ?? DEFAULT_HOST;
  const port = Number(options.port ?? process.env.PI_AGENT_PORT ?? DEFAULT_PORT);
  const path = options.path ?? AGENT_PATH;
  const cwd = options.cwd ?? process.cwd();
  const log = options.log ?? ((message) => console.log(message));

  const server =
    options.server ??
    createServer((request, response) => {
      if (options.staticDir) {
        void serveStatic(request, response, options.staticDir);
        return;
      }

      response.writeHead(200, JSON_HEADERS).end(JSON.stringify({ ok: true }));
    });

  const wsServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? host}`);
    if (url.pathname !== path) {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
    });
  });

  wsServer.on("connection", (ws) => {
    log("[pi-agent:connection] WebSocket client connected");
    new PiAgentSocketConnection(ws, cwd, log);
  });

  let listeningPort = port;
  if (!options.server) {
    try {
      listeningPort = await listen(server, host, port);
    } catch (error) {
      const canUseEphemeralPort =
        getErrorCode(error) === "EADDRINUSE" &&
        options.port === undefined &&
        process.env.PI_AGENT_PORT === undefined;
      if (!canUseEphemeralPort) {
        throw error;
      }

      log(`Pi Agent bridge port ${port} is in use; retrying on an available port.`);
      listeningPort = await listen(server, host, 0);
    }
  }

  const url = `ws://${host}:${listeningPort}${path}`;
  log(`Pi Agent bridge listening on ${url}`);

  return {
    server,
    wsServer,
    url,
    close: async () => {
      for (const client of wsServer.clients) {
        client.close();
      }
      await new Promise<void>((resolveClose) => wsServer.close(() => resolveClose()));
      if (!options.server) {
        await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
      }
    },
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bridge = await startPiAgentBridge();
  const shutdown = async () => {
    await bridge.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
