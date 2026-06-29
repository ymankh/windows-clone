import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CircleStop, Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import {
  Agent,
  AgentContent,
  AgentHeader,
} from "@/components/ai-elements/agent";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActionReplayQueue, type ActionReplayQueue } from "@/agent/actionExecutor";
import {
  AGENT_PROTOCOL_VERSION,
  DEFAULT_PERMISSION_MODE,
  isPermissionMode,
} from "@/agent/protocol";
import { getDesktopAgentCapabilities } from "../agentCapabilities";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type {
  AgentActionCall,
  AgentActionResult,
  AgentActionStatusEvent,
  AgentActionStatusKind,
  AgentCapabilityManifest,
  AgentProtocolClientEvent,
  AgentProtocolServerEvent,
  CapabilityName,
  ConnectionStatus,
  PersistedActionRecord,
  PersistedChatMessage,
  PersistedChatSession,
  PermissionMode,
  SerializableJsonValue,
} from "@/agent/protocol";

const WS_URL =
  import.meta.env.VITE_PI_AGENT_WS_URL ?? "ws://localhost:31415/pi-agent";
const STORAGE_KEY = "pi-agent.chat-sessions.v1";
const ACTIVE_CHAT_KEY = "pi-agent.active-chat-id.v1";
const CLIENT_ID_KEY = "pi-agent.client-id.v1";
const RECONNECT_DELAY_MS = 2000;

const permissionModeLabels: Record<PermissionMode, string> = {
  "confirm-all": "Confirm all",
  "auto-safe": "Auto safe",
  "auto-all": "Auto all",
};

const statusLabels: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Disconnected",
  reconnecting: "Reconnecting",
  error: "Connection error",
};

const actionStateToToolState = (status: AgentActionStatusKind) => {
  switch (status) {
    case "queued":
      return "input-streaming";
    case "waiting-confirmation":
      return "approval-requested";
    case "running":
      return "input-available";
    case "completed":
      return "output-available";
    case "cancelled":
      return "output-denied";
    case "failed":
      return "output-error";
  }
};

const now = () => new Date().toISOString();

const makeId = (prefix: string) => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const createEmptyChat = (): PersistedChatSession => {
  const createdAt = now();

  return {
    id: makeId("chat"),
    title: "New chat",
    createdAt,
    updatedAt: createdAt,
    permissionMode: DEFAULT_PERMISSION_MODE,
    messages: [],
    actions: [],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeMessage = (value: unknown): PersistedChatMessage | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (
    value.role !== "system" &&
    value.role !== "user" &&
    value.role !== "assistant" &&
    value.role !== "tool"
  ) {
    return null;
  }

  return {
    id: value.id,
    role: value.role,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now(),
    text: typeof value.text === "string" ? value.text : undefined,
    status:
      value.status === "streaming" ||
      value.status === "complete" ||
      value.status === "error" ||
      value.status === "cancelled"
        ? value.status
        : undefined,
    actionCallId:
      typeof value.actionCallId === "string" ? value.actionCallId : undefined,
    metadata: isRecord(value.metadata)
      ? (value.metadata as PersistedChatMessage["metadata"])
      : undefined,
  };
};

const sanitizeAction = (value: unknown): PersistedActionRecord | null => {
  if (!isRecord(value) || !isRecord(value.call)) return null;
  const call = value.call;

  if (
    typeof call.id !== "string" ||
    typeof call.capability !== "string" ||
    !call.capability.includes(".")
  ) {
    return null;
  }

  const status =
    value.status === "queued" ||
    value.status === "waiting-confirmation" ||
    value.status === "running" ||
    value.status === "completed" ||
    value.status === "failed" ||
    value.status === "cancelled"
      ? value.status
      : "queued";

  return {
    call: {
      id: call.id,
      capability: call.capability as CapabilityName,
      input: (call.input ?? null) as SerializableJsonValue,
      sessionId: typeof call.sessionId === "string" ? call.sessionId : undefined,
      messageId: typeof call.messageId === "string" ? call.messageId : undefined,
      createdAt: typeof call.createdAt === "string" ? call.createdAt : now(),
    },
    result: isRecord(value.result)
      ? (value.result as PersistedActionRecord["result"])
      : undefined,
    status,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now(),
  };
};

const sanitizeChat = (value: unknown): PersistedChatSession | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  const permissionMode =
    typeof value.permissionMode === "string" && isPermissionMode(value.permissionMode)
      ? value.permissionMode
      : DEFAULT_PERMISSION_MODE;

  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : "New chat",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now(),
    piSessionId:
      typeof value.piSessionId === "string" ? value.piSessionId : undefined,
    permissionMode,
    messages: Array.isArray(value.messages)
      ? value.messages.map(sanitizeMessage).filter((message) => message !== null)
      : [],
    actions: Array.isArray(value.actions)
      ? value.actions.map(sanitizeAction).filter((action) => action !== null)
      : [],
  };
};

const loadPersistedChats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const chats = Array.isArray(parsed)
      ? parsed.map(sanitizeChat).filter((chat) => chat !== null)
      : [];

    if (chats.length > 0) {
      const storedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY);
      const activeChatId =
        storedActiveId && chats.some((chat) => chat.id === storedActiveId)
          ? storedActiveId
          : chats[0]?.id;
      return { chats, activeChatId };
    }
  } catch {
    // Ignore corrupt persistence and start a clean local transcript.
  }

  const chat = createEmptyChat();
  return { chats: [chat], activeChatId: chat.id };
};

const getClientId = () => {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = makeId("client");
    localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return makeId("client");
  }
};

const titleFromPrompt = (prompt: string) => {
  const firstLine = prompt.trim().split(/\r?\n/u)[0] ?? "New chat";
  return firstLine.length > 42 ? `${firstLine.slice(0, 39)}…` : firstLine;
};

const formatTimestamp = (timestamp: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));

const upsertMessage = (
  messages: readonly PersistedChatMessage[],
  message: PersistedChatMessage
) => {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) return [...messages, message];

  return messages.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...message } : item
  );
};

const appendAssistantDelta = (
  messages: readonly PersistedChatMessage[],
  id: string,
  delta: string
) => {
  const existing = messages.find((message) => message.id === id);
  if (!existing) {
    return [
      ...messages,
      {
        id,
        role: "assistant" as const,
        createdAt: now(),
        text: delta,
        status: "streaming" as const,
      },
    ];
  }

  return messages.map((message) =>
    message.id === id
      ? {
          ...message,
          text: `${message.text ?? ""}${delta}`,
          status: "streaming" as const,
        }
      : message
  );
};

const upsertActionCall = (
  actions: readonly PersistedActionRecord[],
  call: AgentActionCall,
  status: AgentActionStatusKind
) => {
  const updatedAt = now();
  const existing = actions.find((action) => action.call.id === call.id);

  if (!existing) {
    return [
      ...actions,
      {
        call,
        status,
        createdAt: call.createdAt,
        updatedAt,
      },
    ];
  }

  return actions.map((action) =>
    action.call.id === call.id ? { ...action, call, status, updatedAt } : action
  );
};

const upsertActionStatus = (
  actions: readonly PersistedActionRecord[],
  status: AgentActionStatusEvent
) => {
  const existing = actions.find((action) => action.call.id === status.callId);
  const updatedAt = status.timestamp;

  if (!existing) {
    return [
      ...actions,
      {
        call: {
          id: status.callId,
          capability: status.capability,
          input: null,
          createdAt: status.timestamp,
        },
        status: status.status,
        createdAt: status.timestamp,
        updatedAt,
      },
    ];
  }

  return actions.map((action) =>
    action.call.id === status.callId
      ? { ...action, status: status.status, updatedAt }
      : action
  );
};

const upsertActionResult = (
  actions: readonly PersistedActionRecord[],
  result: AgentActionResult
) => {
  const existing = actions.find((action) => action.call.id === result.callId);
  const status: AgentActionStatusKind = result.ok ? "completed" : "failed";

  if (!existing) {
    return [
      ...actions,
      {
        call: {
          id: result.callId,
          capability: result.capability,
          input: null,
          sessionId: result.sessionId,
          createdAt: result.completedAt,
        },
        result,
        status,
        createdAt: result.completedAt,
        updatedAt: result.completedAt,
      },
    ];
  }

  return actions.map((action) =>
    action.call.id === result.callId
      ? { ...action, result, status, updatedAt: result.completedAt }
      : action
  );
};

type TimelineItem =
  | { kind: "message"; id: string; createdAt: string; message: PersistedChatMessage }
  | { kind: "action"; id: string; createdAt: string; action: PersistedActionRecord };

const AI_ASSISTANT_SYSTEM_TEXT =
  "Pi Agent can use registered desktop capabilities to inspect and operate this Windows clone. Visible mutating actions run through the replay queue.";

const AIAssistantComponent = () => {
  const initialState = useMemo(() => loadPersistedChats(), []);
  const [chats, setChats] = useState<readonly PersistedChatSession[]>(
    initialState.chats
  );
  const [activeChatId, setActiveChatId] = useState<string | undefined>(
    initialState.activeChatId
  );
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [connectionMessage, setConnectionMessage] = useState<string>(
    `Connecting to ${WS_URL}`
  );
  const [isRunning, setIsRunning] = useState(false);
  const [serverId, setServerId] = useState<string | undefined>();
  const [acceptedCapabilities, setAcceptedCapabilities] = useState<
    readonly CapabilityName[] | undefined
  >();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const clientIdRef = useRef<string>(getClientId());
  const chatsRef = useRef(chats);
  const activeChatIdRef = useRef(activeChatId);
  const permissionModeRef = useRef<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const confirmationsRef = useRef(new Map<string, (approved: boolean) => void>());
  const actionControllersRef = useRef(new Map<string, AbortController>());
  const queueRef = useRef<ActionReplayQueue | null>(null);

  const capabilities = useMemo(() => getDesktopAgentCapabilities(), []);
  const capabilityManifestByName = useMemo(() => {
    const entries = capabilities.map(
      (capability) => [capability.name, capability] as const
    );
    return new Map<CapabilityName, AgentCapabilityManifest>(entries);
  }, [capabilities]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId, chats]
  );

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = activeChat?.id;
    permissionModeRef.current = activeChat?.permissionMode ?? DEFAULT_PERMISSION_MODE;
  }, [activeChat?.id, activeChat?.permissionMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
      if (activeChat?.id) {
        localStorage.setItem(ACTIVE_CHAT_KEY, activeChat.id);
      }
    } catch {
      // Local persistence is best-effort; the live in-memory transcript remains usable.
    }
  }, [activeChat?.id, chats]);

  const updateChat = useCallback(
    (
      chatId: string | undefined,
      updater: (chat: PersistedChatSession) => PersistedChatSession
    ) => {
      if (!chatId) return;
      setChats((currentChats) =>
        currentChats.map((chat) => (chat.id === chatId ? updater(chat) : chat))
      );
    },
    []
  );

  const sendEvent = useCallback((event: AgentProtocolClientEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(event));
    return true;
  }, []);

  const sendCapabilities = useCallback(
    (chat: PersistedChatSession | undefined) => {
      if (!chat) return;
      sendEvent({
        type: "capabilities",
        protocolVersion: AGENT_PROTOCOL_VERSION,
        permissionMode: chat.permissionMode,
        capabilities: capabilities.map((capability) => ({
          name: capability.name,
          appId: capability.appId,
          title: capability.title,
          description: capability.description,
          safety: capability.safety,
          execution: capability.execution,
          inputSchema: capability.inputSchema,
          resultSchema: capability.resultSchema,
        })),
        sessionId: chat.piSessionId,
      });
    },
    [capabilities, sendEvent]
  );

  const sendResume = useCallback(
    (chat: PersistedChatSession | undefined) => {
      if (!chat) return;
      sendEvent({
        type: "session.resume",
        chatId: chat.id,
        sessionId: chat.piSessionId,
        transcript: chat.messages,
      });
    },
    [sendEvent]
  );

  const getPermissionMode = useCallback(() => permissionModeRef.current, []);

  const confirmAction = useCallback(
    ({ call }: { call: AgentActionCall }) =>
      new Promise<boolean>((resolve) => {
        confirmationsRef.current.set(call.id, resolve);
      }),
    []
  );

  const handleQueueStatus = useCallback(
    (status: AgentActionStatusEvent) => {
      sendEvent({ type: "action_status", status });
      updateChat(activeChatIdRef.current, (chat) => ({
        ...chat,
        updatedAt: status.timestamp,
        actions: upsertActionStatus(chat.actions, status),
      }));
    },
    [sendEvent, updateChat]
  );

  useEffect(() => {
    queueRef.current = createActionReplayQueue(capabilities, {
      getPermissionMode,
      confirmAction,
      onStatus: handleQueueStatus,
    });
  }, [capabilities, confirmAction, getPermissionMode, handleQueueStatus]);

  const handleActionCall = useCallback(
    (call: AgentActionCall) => {
      const chatId = activeChatIdRef.current;
      const controller = new AbortController();
      actionControllersRef.current.set(call.id, controller);
      setIsRunning(true);
      updateChat(chatId, (chat) => ({
        ...chat,
        updatedAt: now(),
        actions: upsertActionCall(chat.actions, call, "queued"),
      }));

      const queue = queueRef.current;
      if (!queue) {
        const timestamp = now();
        const result: AgentActionResult = {
          ok: false,
          callId: call.id,
          capability: call.capability,
          completedAt: timestamp,
          error: {
            code: "queue-unavailable",
            message: "Action queue is not ready.",
          },
        };
        updateChat(chatId, (chat) => ({
          ...chat,
          updatedAt: timestamp,
          actions: upsertActionResult(chat.actions, result),
        }));
        sendEvent({ type: "action_result", result });
        actionControllersRef.current.delete(call.id);
        setIsRunning(actionControllersRef.current.size > 0);
        return;
      }

      void queue.executeAction(call, {
          signal: controller.signal,
          permissionMode: permissionModeRef.current,
        })
        .then((result) => {
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: result.completedAt,
            actions: upsertActionResult(chat.actions, result),
          }));
          sendEvent({ type: "action_result", result });
        })
        .finally(() => {
          actionControllersRef.current.delete(call.id);
          setIsRunning(actionControllersRef.current.size > 0);
        });
    },
    [sendEvent, updateChat]
  );

  const handleServerEvent = useCallback(
    (event: AgentProtocolServerEvent) => {
      const chatId = activeChatIdRef.current;

      switch (event.type) {
        case "hello": {
          setServerId(event.serverId);
          setAcceptedCapabilities(event.acceptedCapabilities);
          if (event.sessionId) {
            updateChat(chatId, (chat) => ({
              ...chat,
              piSessionId: event.sessionId,
              updatedAt: now(),
            }));
          }
          return;
        }
        case "session.resumed": {
          updateChat(event.chatId, (chat) => ({
            ...chat,
            piSessionId: event.sessionId,
            updatedAt: now(),
          }));
          return;
        }
        case "assistant_message_start": {
          setIsRunning(true);
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: event.createdAt,
            messages: upsertMessage(chat.messages, {
              id: event.id,
              role: "assistant",
              createdAt: event.createdAt,
              text: "",
              status: "streaming",
            }),
          }));
          return;
        }
        case "assistant_text_delta": {
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: now(),
            messages: appendAssistantDelta(chat.messages, event.id, event.delta),
          }));
          return;
        }
        case "assistant_message_done": {
          setIsRunning(actionControllersRef.current.size > 0);
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: event.message.createdAt,
            messages: upsertMessage(chat.messages, {
              ...event.message,
              status: "complete",
            }),
          }));
          return;
        }
        case "assistant_message_error": {
          setIsRunning(false);
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: now(),
            messages: upsertMessage(chat.messages, {
              id: event.id ?? makeId("assistant-error"),
              role: "assistant",
              createdAt: now(),
              text: event.error.message,
              status: "error",
            }),
          }));
          return;
        }
        case "action_call": {
          handleActionCall(event.call);
          return;
        }
        case "action_status": {
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: event.status.timestamp,
            actions: upsertActionStatus(chat.actions, event.status),
          }));
          return;
        }
        case "action_error": {
          const timestamp = now();
          if (event.callId) {
            const callId = event.callId;
            updateChat(chatId, (chat) => ({
              ...chat,
              updatedAt: timestamp,
              actions: upsertActionStatus(chat.actions, {
                callId,
                capability: "agent.error" as CapabilityName,
                status: "failed",
                timestamp,
                message: event.error.message,
                error: event.error,
              }),
            }));
          }
          return;
        }
        case "cancelled": {
          setIsRunning(false);
          updateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: now(),
            messages: chat.messages.map((message) =>
              message.status === "streaming"
                ? { ...message, status: "cancelled" as const }
                : message
            ),
            actions: chat.actions.map((action) =>
              action.status === "queued" ||
              action.status === "running" ||
              action.status === "waiting-confirmation"
                ? { ...action, status: "cancelled" as const, updatedAt: now() }
                : action
            ),
          }));
          return;
        }
        case "connection.status": {
          setConnectionStatus(event.status);
          setConnectionMessage(event.message ?? statusLabels[event.status]);
          return;
        }
      }
    },
    [handleActionCall, updateChat]
  );

  useEffect(() => {
    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== undefined) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
    };

    const scheduleReconnect = () => {
      clearReconnectTimer();
      if (disposed) return;
      setConnectionStatus("reconnecting");
      setConnectionMessage(`Reconnecting to ${WS_URL}`);
      reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (disposed) return;
      setConnectionStatus((status) =>
        status === "disconnected" || status === "error" ? "reconnecting" : "connecting"
      );
      let socket: WebSocket;
      try {
        socket = new WebSocket(WS_URL);
      } catch {
        setConnectionStatus("error");
        setConnectionMessage(`Unable to initialize WebSocket at ${WS_URL}`);
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (disposed) return;
        const currentChat = chatsRef.current.find(
          (chat) => chat.id === activeChatIdRef.current
        );
        setConnectionStatus("connected");
        setConnectionMessage("Connected to Pi Agent backend");
        sendEvent({
          type: "hello",
          protocolVersion: AGENT_PROTOCOL_VERSION,
          clientId: clientIdRef.current,
          permissionMode: currentChat?.permissionMode ?? DEFAULT_PERMISSION_MODE,
          capabilities: capabilities.map((capability) => ({
            name: capability.name,
            appId: capability.appId,
            title: capability.title,
            description: capability.description,
            safety: capability.safety,
            execution: capability.execution,
            inputSchema: capability.inputSchema,
            resultSchema: capability.resultSchema,
          })),
        });
        sendCapabilities(currentChat);
        sendResume(currentChat);
      });

      socket.addEventListener("message", (messageEvent) => {
        try {
          const parsed = JSON.parse(String(messageEvent.data)) as AgentProtocolServerEvent;
          handleServerEvent(parsed);
        } catch {
          setConnectionStatus("error");
          setConnectionMessage("Received an invalid Pi Agent protocol message");
        }
      });

      socket.addEventListener("error", () => {
        if (disposed) return;
        setConnectionStatus("error");
        setConnectionMessage(`Unable to reach Pi Agent backend at ${WS_URL}`);
      });

      socket.addEventListener("close", () => {
        if (disposed) return;
        setConnectionStatus("disconnected");
        setConnectionMessage(`Pi Agent backend is disconnected at ${WS_URL}`);
        scheduleReconnect();
      });
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      if (!socket) return;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener("open", () => socket.close(), { once: true });
        return;
      }
      socket.close();
    };
  }, [capabilities, handleServerEvent, sendCapabilities, sendEvent, sendResume]);

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    sendCapabilities(activeChat);
    sendResume(activeChat);
  }, [activeChat, connectionStatus, sendCapabilities, sendResume]);

  const createChat = useCallback(() => {
    const chat = createEmptyChat();
    setChats((currentChats) => [chat, ...currentChats]);
    setActiveChatId(chat.id);
  }, []);

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((currentChats) => {
        const remaining = currentChats.filter((chat) => chat.id !== chatId);
        if (remaining.length > 0) {
          if (chatId === activeChatIdRef.current) {
            setActiveChatId(remaining[0]?.id);
          }
          return remaining;
        }

        const replacement = createEmptyChat();
        setActiveChatId(replacement.id);
        return [replacement];
      });
    },
    []
  );

  const changePermissionMode = useCallback(
    (value: string) => {
      if (!activeChat || !isPermissionMode(value)) return;
      updateChat(activeChat.id, (chat) => ({
        ...chat,
        permissionMode: value,
        updatedAt: now(),
      }));
    },
    [activeChat, updateChat]
  );

  const submitPrompt = useCallback(
    async (message: PromptInputMessage) => {
      const prompt = message.text.trim();
      if (!activeChat || !prompt || connectionStatus !== "connected" || isRunning) {
        return;
      }

      const createdAt = now();
      const userMessage: PersistedChatMessage = {
        id: makeId("user"),
        role: "user",
        createdAt,
        text: prompt,
        status: "complete",
      };

      updateChat(activeChat.id, (chat) => ({
        ...chat,
        title: chat.messages.length === 0 ? titleFromPrompt(prompt) : chat.title,
        updatedAt: createdAt,
        messages: [...chat.messages, userMessage],
      }));
      setIsRunning(true);

      sendEvent({
        type: "user_prompt",
        id: userMessage.id,
        chatId: activeChat.id,
        sessionId: activeChat.piSessionId,
        prompt,
        createdAt,
      });
    },
    [activeChat, connectionStatus, isRunning, sendEvent, updateChat]
  );

  const cancelRun = useCallback(() => {
    if (!activeChat || !isRunning) return;
    const cancelledAt = now();

    for (const controller of actionControllersRef.current.values()) {
      controller.abort();
    }
    for (const resolve of confirmationsRef.current.values()) {
      resolve(false);
    }
    confirmationsRef.current.clear();

    sendEvent({
      type: "cancel",
      id: makeId("cancel"),
      sessionId: activeChat.piSessionId,
      reason: "User cancelled the current assistant run",
    });

    updateChat(activeChat.id, (chat) => ({
      ...chat,
      updatedAt: cancelledAt,
      messages: chat.messages.map((message) =>
        message.status === "streaming"
          ? { ...message, status: "cancelled" as const }
          : message
      ),
      actions: chat.actions.map((action) =>
        action.status === "queued" ||
        action.status === "running" ||
        action.status === "waiting-confirmation"
          ? { ...action, status: "cancelled" as const, updatedAt: cancelledAt }
          : action
      ),
    }));
    setIsRunning(false);
  }, [activeChat, isRunning, sendEvent, updateChat]);

  const resolveConfirmation = useCallback((callId: string, approved: boolean) => {
    const resolve = confirmationsRef.current.get(callId);
    if (!resolve) return;
    confirmationsRef.current.delete(callId);
    resolve(approved);
  }, []);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!activeChat) return [];

    return [
      ...activeChat.messages.map((message) => ({
        kind: "message" as const,
        id: message.id,
        createdAt: message.createdAt,
        message,
      })),
      ...activeChat.actions.map((action) => ({
        kind: "action" as const,
        id: action.call.id,
        createdAt: action.createdAt,
        action,
      })),
    ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }, [activeChat]);

  const sendDisabled = connectionStatus !== "connected" || isRunning;
  const acceptedCapabilityCount = acceptedCapabilities?.length ?? capabilities.length;

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
      data-testid="ai-assistant-app"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-base">AI Assistant</h1>
            <p className="truncate text-muted-foreground text-xs">
              Pi Agent desktop actions and chat
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="gap-1.5"
            data-testid="ai-connection-status"
            variant={connectionStatus === "connected" ? "secondary" : "destructive"}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {statusLabels[connectionStatus]}
          </Badge>
          <Select
            onValueChange={changePermissionMode}
            value={activeChat?.permissionMode ?? DEFAULT_PERMISSION_MODE}
          >
            <SelectTrigger
              aria-label="Permission mode"
              className="h-8"
              data-testid="ai-permission-mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirm-all">Confirm all</SelectItem>
              <SelectItem value="auto-safe">Auto safe</SelectItem>
              <SelectItem value="auto-all">Auto all</SelectItem>
            </SelectContent>
          </Select>
          <Button
            data-testid="ai-cancel"
            disabled={!isRunning}
            onClick={cancelRun}
            size="sm"
            type="button"
            variant="outline"
          >
            <CircleStop className="size-4" />
            Cancel
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex min-h-48 w-full shrink-0 flex-col border-b md:min-h-0 md:w-72 md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-2 p-3">
            <div>
              <h2 className="font-medium text-sm">Chats</h2>
              <p className="text-muted-foreground text-xs">
                {chats.length} saved conversation{chats.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              aria-label="New chat"
              data-testid="ai-new-chat"
              onClick={createChat}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <Separator />
          <ScrollArea className="min-h-0 flex-1" data-testid="ai-chat-list">
            <div className="space-y-1 p-2">
              {chats.map((chat) => (
                <div className="group flex items-center gap-1" key={chat.id}>
                  <button
                    className={
                      chat.id === activeChat?.id
                        ? "min-w-0 flex-1 rounded-md bg-secondary px-3 py-2 text-left text-secondary-foreground"
                        : "min-w-0 flex-1 rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                    }
                    onClick={() => setActiveChatId(chat.id)}
                    type="button"
                  >
                    <div className="truncate font-medium text-sm">{chat.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <span>{formatTimestamp(chat.updatedAt)}</span>
                      <span>{chat.messages.length} messages</span>
                    </div>
                  </button>
                  <Button
                    aria-label={`Delete ${chat.title}`}
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => deleteChat(chat.id)}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b p-3">
            <Agent>
              <AgentHeader name="Pi Agent" model={serverId} />
              <AgentContent>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground text-xs">Backend</div>
                    <div className="truncate" title={connectionMessage}>
                      {connectionMessage}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Capabilities</div>
                    <div>{acceptedCapabilityCount} registered</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Permissions</div>
                    <div>
                      {permissionModeLabels[
                        activeChat?.permissionMode ?? DEFAULT_PERMISSION_MODE
                      ]}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {AI_ASSISTANT_SYSTEM_TEXT}
                </p>
              </AgentContent>
            </Agent>
          </div>

          <Conversation className="min-h-0" data-testid="ai-message-list">
            <ConversationContent>
              {timeline.length === 0 ? (
                <ConversationEmptyState
                  description="Create a request once the Pi Agent backend is connected. History remains browsable while disconnected."
                  icon={<Bot className="size-10" />}
                  title="Ask Pi Agent to help with the desktop"
                />
              ) : (
                timeline.map((item) => {
                  if (item.kind === "message") {
                    const message = item.message;
                    const from = message.role === "user" ? "user" : "assistant";

                    return (
                      <Message from={from} key={item.id}>
                        <MessageContent>
                          <MessageResponse>{message.text ?? ""}</MessageResponse>
                          {message.status && message.status !== "complete" ? (
                            <Badge className="w-fit" variant="outline">
                              {message.status}
                            </Badge>
                          ) : null}
                        </MessageContent>
                      </Message>
                    );
                  }

                  const action = item.action;
                  const toolState = actionStateToToolState(action.status);
                  const manifest = capabilityManifestByName.get(action.call.capability);
                  const resultOutput = action.result?.ok
                    ? (action.result.data ?? action.result.message ?? "Completed")
                    : undefined;
                  const errorText =
                    action.result && !action.result.ok
                      ? action.result.error.message
                      : action.status === "cancelled"
                        ? "Cancelled"
                        : undefined;

                  return (
                    <Tool defaultOpen={action.status !== "completed"} key={item.id}>
                      <ToolHeader
                        state={toolState}
                        title={manifest?.title ?? action.call.capability}
                        toolName={action.call.capability}
                        type="dynamic-tool"
                      />
                      <ToolContent>
                        {action.status === "waiting-confirmation" ? (
                          <Confirmation
                            approval={{ id: action.call.id }}
                            state={toolState}
                          >
                            <ConfirmationTitle>
                              {manifest?.description ?? action.call.capability}
                            </ConfirmationTitle>
                            <ConfirmationRequest>
                              <p className="text-muted-foreground text-sm">
                                This action needs confirmation before Pi Agent can run it.
                              </p>
                            </ConfirmationRequest>
                            <ConfirmationActions>
                              <ConfirmationAction
                                onClick={() => resolveConfirmation(action.call.id, false)}
                                variant="outline"
                              >
                                Deny
                              </ConfirmationAction>
                              <ConfirmationAction
                                onClick={() => resolveConfirmation(action.call.id, true)}
                              >
                                Approve
                              </ConfirmationAction>
                            </ConfirmationActions>
                          </Confirmation>
                        ) : null}
                        {action.result &&
                        !action.result.ok &&
                        action.result.error.code === "permission_denied" ? (
                          <Confirmation
                            approval={{ id: action.call.id, approved: false }}
                            state="output-denied"
                          >
                            <ConfirmationTitle>
                              {manifest?.description ?? action.call.capability}
                            </ConfirmationTitle>
                            <ConfirmationRejected>Denied</ConfirmationRejected>
                          </Confirmation>
                        ) : null}
                        <ToolInput input={action.call.input} />
                        <ToolOutput errorText={errorText} output={resultOutput} />
                      </ToolContent>
                    </Tool>
                  );
                })
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t p-3">
            <PromptInput className="mx-auto max-w-3xl" onSubmit={submitPrompt}>
              <PromptInputBody>
                <PromptInputTextarea
                  data-testid="ai-prompt"
                  disabled={sendDisabled}
                  placeholder={
                    connectionStatus === "connected"
                      ? "Ask Pi Agent to inspect or operate the desktop…"
                      : "Pi Agent backend is disconnected"
                  }
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <span className="text-muted-foreground text-xs">
                    {connectionStatus === "connected"
                      ? isRunning
                        ? "Assistant is running. Cancel to stop the current run."
                        : "Enter sends your prompt to the Pi Agent backend."
                      : "Sending is disabled until the backend reconnects."}
                  </span>
                </PromptInputTools>
                <PromptInputSubmit
                  data-testid="ai-send"
                  disabled={sendDisabled}
                  status="ready"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIAssistantComponent;
