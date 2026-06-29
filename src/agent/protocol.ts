export const AGENT_PROTOCOL_VERSION = 1;

export const CAPABILITY_SAFETY_LEVELS = [
  "safe",
  "needs-confirmation",
  "destructive",
] as const;

export type CapabilitySafety = (typeof CAPABILITY_SAFETY_LEVELS)[number];

export const PERMISSION_MODES = [
  "confirm-all",
  "auto-safe",
  "auto-all",
] as const;

export type PermissionMode = (typeof PERMISSION_MODES)[number];

export const DEFAULT_PERMISSION_MODE: PermissionMode = "auto-safe";

export const CAPABILITY_EXECUTION_MODES = ["query", "visible-mutation"] as const;

export type CapabilityExecutionMode = (typeof CAPABILITY_EXECUTION_MODES)[number];

export type CapabilityName = `${string}.${string}`;

export type SerializableJsonPrimitive = string | number | boolean | null;

export type SerializableJsonValue =
  | SerializableJsonPrimitive
  | SerializableJsonObject
  | SerializableJsonArray;

export type SerializableJsonObject = {
  readonly [key: string]: SerializableJsonValue;
};

export type SerializableJsonArray = readonly SerializableJsonValue[];

export type JsonSchemaLike = SerializableJsonObject;

export type AgentCapabilityManifest = {
  readonly name: CapabilityName;
  readonly appId: string;
  readonly title?: string;
  readonly description: string;
  readonly safety: CapabilitySafety;
  readonly execution: CapabilityExecutionMode;
  readonly inputSchema: JsonSchemaLike;
  readonly resultSchema?: JsonSchemaLike;
};

export type ActionError = {
  readonly code: string;
  readonly message: string;
  readonly retryable?: boolean;
  readonly details?: SerializableJsonValue;
};

export type ActionExecutionSuccess<
  TResult extends SerializableJsonValue = SerializableJsonValue,
> = {
  readonly ok: true;
  readonly data?: TResult;
  readonly message?: string;
};

export type ActionExecutionFailure = {
  readonly ok: false;
  readonly error: ActionError;
};

export type ActionExecutionResult<
  TResult extends SerializableJsonValue = SerializableJsonValue,
> = ActionExecutionSuccess<TResult> | ActionExecutionFailure;

export type AgentActionCall<
  TInput extends SerializableJsonValue = SerializableJsonValue,
> = {
  readonly id: string;
  readonly capability: CapabilityName;
  readonly input: TInput;
  readonly sessionId?: string;
  readonly messageId?: string;
  readonly createdAt: string;
};

export type AgentActionResult<
  TResult extends SerializableJsonValue = SerializableJsonValue,
> = ActionExecutionResult<TResult> & {
  readonly callId: string;
  readonly capability: CapabilityName;
  readonly sessionId?: string;
  readonly completedAt: string;
};

export const ACTION_STATUS_KINDS = [
  "queued",
  "waiting-confirmation",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AgentActionStatusKind = (typeof ACTION_STATUS_KINDS)[number];

export type AgentActionStatusEvent = {
  readonly callId: string;
  readonly capability: CapabilityName;
  readonly status: AgentActionStatusKind;
  readonly timestamp: string;
  readonly message?: string;
  readonly error?: ActionError;
};

export type AgentCapabilityExecutionContext<
  TInput extends SerializableJsonValue = SerializableJsonValue,
> = {
  readonly call: AgentActionCall<TInput>;
  readonly input: TInput;
  readonly permissionMode: PermissionMode;
  readonly signal?: AbortSignal;
  readonly recordStatus: (
    status: AgentActionStatusKind,
    message?: string
  ) => void;
};

export type AgentCapabilityExecutor<
  TInput extends SerializableJsonValue = SerializableJsonValue,
  TResult extends SerializableJsonValue = SerializableJsonValue,
> = (
  context: AgentCapabilityExecutionContext<TInput>
) => Promise<ActionExecutionResult<TResult> | TResult | void> | ActionExecutionResult<TResult> | TResult | void;

export type AgentCapabilityRegistration<
  TInput extends SerializableJsonValue = SerializableJsonValue,
  TResult extends SerializableJsonValue = SerializableJsonValue,
> = AgentCapabilityManifest & {
  readonly parseInput?: (input: SerializableJsonValue) => TInput;
  readonly validateInput?: (input: SerializableJsonValue) => input is TInput;
  execute(
    context: AgentCapabilityExecutionContext<TInput>
  ): Promise<ActionExecutionResult<TResult> | TResult | void> | ActionExecutionResult<TResult> | TResult | void;
};

export type CapabilityManifestEnvelope = {
  readonly protocolVersion: typeof AGENT_PROTOCOL_VERSION;
  readonly capabilities: readonly AgentCapabilityManifest[];
};

export type AgentChatRole = "system" | "user" | "assistant" | "tool";

export type PersistedChatMessage = {
  readonly id: string;
  readonly role: AgentChatRole;
  readonly createdAt: string;
  readonly text?: string;
  readonly status?: "streaming" | "complete" | "error" | "cancelled";
  readonly actionCallId?: string;
  readonly metadata?: SerializableJsonObject;
};

export type PersistedActionRecord = {
  readonly call: AgentActionCall;
  readonly result?: AgentActionResult;
  readonly status: AgentActionStatusKind;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PersistedChatSession = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly piSessionId?: string;
  readonly permissionMode: PermissionMode;
  readonly messages: readonly PersistedChatMessage[];
  readonly actions: readonly PersistedActionRecord[];
  readonly metadata?: SerializableJsonObject;
};

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

export type AgentClientEvent =
  | {
      readonly type: "hello";
      readonly protocolVersion: typeof AGENT_PROTOCOL_VERSION;
      readonly clientId: string;
      readonly permissionMode: PermissionMode;
      readonly capabilities: readonly AgentCapabilityManifest[];
    }
  | {
      readonly type: "capabilities";
      readonly protocolVersion: typeof AGENT_PROTOCOL_VERSION;
      readonly permissionMode: PermissionMode;
      readonly capabilities: readonly AgentCapabilityManifest[];
      readonly sessionId?: string;
    }
  | {
      readonly type: "session.resume";
      readonly chatId: string;
      readonly sessionId?: string;
      readonly transcript?: readonly PersistedChatMessage[];
    }
  | {
      readonly type: "user_prompt";
      readonly id: string;
      readonly chatId: string;
      readonly sessionId?: string;
      readonly prompt: string;
      readonly createdAt: string;
    }
  | {
      readonly type: "action_status";
      readonly status: AgentActionStatusEvent;
    }
  | {
      readonly type: "action_result";
      readonly result: AgentActionResult;
    }
  | {
      readonly type: "cancel";
      readonly id: string;
      readonly sessionId?: string;
      readonly reason?: string;
    }
  | {
      readonly type: "connection.status";
      readonly status: ConnectionStatus;
      readonly message?: string;
    };

export type AgentServerEvent =
  | {
      readonly type: "hello";
      readonly protocolVersion: typeof AGENT_PROTOCOL_VERSION;
      readonly serverId?: string;
      readonly sessionId?: string;
      readonly acceptedCapabilities?: readonly CapabilityName[];
    }
  | {
      readonly type: "session.resumed";
      readonly chatId: string;
      readonly sessionId: string;
    }
  | {
      readonly type: "assistant_message_start";
      readonly id: string;
      readonly sessionId?: string;
      readonly createdAt: string;
    }
  | {
      readonly type: "assistant_text_delta";
      readonly id: string;
      readonly delta: string;
    }
  | {
      readonly type: "assistant_message_done";
      readonly message: PersistedChatMessage;
    }
  | {
      readonly type: "assistant_message_error";
      readonly id?: string;
      readonly error: ActionError;
    }
  | {
      readonly type: "action_call";
      readonly call: AgentActionCall;
    }
  | {
      readonly type: "action_status";
      readonly status: AgentActionStatusEvent;
    }
  | {
      readonly type: "action_error";
      readonly callId?: string;
      readonly error: ActionError;
    }
  | {
      readonly type: "cancelled";
      readonly id: string;
      readonly sessionId?: string;
      readonly reason?: string;
    }
  | {
      readonly type: "connection.status";
      readonly status: ConnectionStatus;
      readonly message?: string;
    };
export type AgentProtocolClientEvent = AgentClientEvent;

export type AgentProtocolServerEvent = AgentServerEvent;


export const toCapabilityManifest = ({
  name,
  appId,
  title,
  description,
  safety,
  execution,
  inputSchema,
  resultSchema,
}: AgentCapabilityRegistration): AgentCapabilityManifest => ({
  name,
  appId,
  title,
  description,
  safety,
  execution,
  inputSchema,
  resultSchema,
});

export const toCapabilityManifestEnvelope = (
  capabilities: readonly AgentCapabilityRegistration[]
): CapabilityManifestEnvelope => ({
  protocolVersion: AGENT_PROTOCOL_VERSION,
  capabilities: capabilities.map(toCapabilityManifest),
});

export const isPermissionMode = (value: string): value is PermissionMode =>
  PERMISSION_MODES.includes(value as PermissionMode);

export const shouldAutoRunCapability = (
  capability: Pick<AgentCapabilityManifest, "safety">,
  permissionMode: PermissionMode
) =>
  permissionMode === "auto-all" ||
  (permissionMode === "auto-safe" && capability.safety === "safe");
