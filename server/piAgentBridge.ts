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
import { AGENT_PROTOCOL_VERSION } from "../src/agent/protocol.ts";
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
  PermissionMode,
  SerializableJsonValue,
} from "../src/agent/protocol.ts";

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 31415;
const AGENT_PATH = "/pi-agent";

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

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

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

const extractAssistantText = (message: unknown) => {
  if (!isRecord(message) || !Array.isArray(message.content)) return "";

  return message.content
    .filter((part): part is { type: "text"; text: string } =>
      isRecord(part) && part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");
};

const getMessageRole = (message: unknown) =>
  isRecord(message) && typeof message.role === "string" ? message.role : undefined;

const createAssistantMessage = (
  id: string,
  sessionId: string | undefined,
  message: unknown,
  status: PersistedChatMessage["status"]
): PersistedChatMessage => ({
  id,
  role: "assistant",
  createdAt: new Date().toISOString(),
  text: extractAssistantText(message),
  status,
  metadata: sessionId ? { sessionId } : undefined,
});

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

const isClientEvent = (value: unknown): value is AgentClientEvent =>
  isRecord(value) && typeof value.type === "string";

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
  private capabilities = new Map<CapabilityName, AgentCapabilityManifest>();
  private permissionMode: PermissionMode = "auto-safe";
  private session: AgentSession | undefined;
  private unsubscribe: (() => void) | undefined;
  private toolsVersion = 0;
  private sessionToolsVersion = -1;
  private currentAssistantId: string | undefined;
  private pendingActions = new Map<string, PendingAction>();

  constructor(ws: WebSocket, cwd: string) {
    this.ws = ws;
    this.cwd = cwd;

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
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private sendConnectionStatus(status: ConnectionStatus, message?: string) {
    this.send({ type: "connection.status", status, message });
  }

  private async handleRawMessage(data: WebSocket.RawData) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString("utf8"));
    } catch {
      this.send({
        type: "assistant_message_error",
        error: createActionError("protocol.invalid_json", "Message was not valid JSON"),
      });
      return;
    }

    if (!isClientEvent(parsed)) {
      this.send({
        type: "assistant_message_error",
        error: createActionError("protocol.invalid_event", "Message did not match the Pi agent protocol"),
      });
      return;
    }

    await this.handleClientEvent(parsed);
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
    const session = await this.ensureSession(requestedSessionId);
    this.send({ type: "session.resumed", chatId, sessionId: session.sessionId });

    try {
      await session.prompt(prompt, {
        source: "rpc",
        streamingBehavior: session.isStreaming ? "followUp" : undefined,
      });
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
    return [...this.capabilities.values()].map((capability) =>
      defineTool({
        name: capability.name,
        label: capability.title ?? capability.name,
        description: capability.description,
        promptSnippet: `${capability.name}: ${capability.description}`,
        promptGuidelines: [
          `Use ${capability.name} only for ${capability.description}`,
          `This capability is ${capability.safety} and executes as ${capability.execution}.`,
        ],
        parameters: normalizeInputSchema(capability.inputSchema),
        executionMode: capability.execution === "query" ? "parallel" : "sequential",
        execute: async (toolCallId, params, signal) =>
          this.executeFrontendAction(toolCallId, capability, safeJson(params), signal),
      })
    );
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

    const text = result.message ?? `Action ${capability.name} completed.`;
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
    switch (event.type) {
      case "message_start":
        if (getMessageRole(event.message) === "assistant") {
          this.currentAssistantId = randomUUID();
          this.send({
            type: "assistant_message_start",
            id: this.currentAssistantId,
            sessionId: this.session?.sessionId,
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case "message_update":
        if (event.assistantMessageEvent.type === "text_delta") {
          if (!this.currentAssistantId) {
            this.currentAssistantId = randomUUID();
            this.send({
              type: "assistant_message_start",
              id: this.currentAssistantId,
              sessionId: this.session?.sessionId,
              createdAt: new Date().toISOString(),
            });
          }
          this.send({
            type: "assistant_text_delta",
            id: this.currentAssistantId,
            delta: event.assistantMessageEvent.delta,
          });
        }
        break;

      case "message_end":
        if (getMessageRole(event.message) === "assistant" && this.currentAssistantId) {
          this.send({
            type: "assistant_message_done",
            message: createAssistantMessage(
              this.currentAssistantId,
              this.session?.sessionId,
              event.message,
              "complete"
            ),
          });
          this.currentAssistantId = undefined;
        }
        break;

      case "agent_end":
        this.sendConnectionStatus("connected", "Pi Agent idle");
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
    new PiAgentSocketConnection(ws, cwd);
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
