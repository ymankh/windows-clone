import { z } from "zod";

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
  readonly reasoning?: string;
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

export type PersistedAgentTraceRecord = {
  readonly id: string;
  readonly createdAt: string;
  readonly title: string;
  readonly detail?: string;
  readonly status?: "pending" | "active" | "complete" | "error";
  readonly data?: SerializableJsonValue;
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
  readonly traces?: readonly PersistedAgentTraceRecord[];
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
      readonly type: "assistant_reasoning_delta";
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
      readonly type: "agent_trace";
      readonly trace: PersistedAgentTraceRecord;
    }
  | {
      readonly type: "connection.status";
      readonly status: ConnectionStatus;
      readonly message?: string;
    };
export type AgentProtocolClientEvent = AgentClientEvent;

export type AgentProtocolServerEvent = AgentServerEvent;


export const serializableJsonValueSchema: z.ZodType<SerializableJsonValue> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(serializableJsonValueSchema),
      z.record(z.string(), serializableJsonValueSchema),
    ])
  );

export const serializableJsonObjectSchema = z.record(
  z.string(),
  serializableJsonValueSchema
) satisfies z.ZodType<SerializableJsonObject>;

export const jsonSchemaLikeSchema = serializableJsonObjectSchema;

export const permissionModeSchema = z.enum(PERMISSION_MODES);
export const capabilitySafetySchema = z.enum(CAPABILITY_SAFETY_LEVELS);
export const capabilityExecutionModeSchema = z.enum(CAPABILITY_EXECUTION_MODES);
export const actionStatusKindSchema = z.enum(ACTION_STATUS_KINDS);

export const capabilityNameSchema = z
  .string()
  .refine((value): value is CapabilityName => value.includes("."), {
    message: "Capability names must be app-qualified, e.g. notes.readCurrent",
  });

export const agentCapabilityManifestSchema = z.object({
  name: capabilityNameSchema,
  appId: z.string(),
  title: z.string().optional(),
  description: z.string(),
  safety: capabilitySafetySchema,
  execution: capabilityExecutionModeSchema,
  inputSchema: jsonSchemaLikeSchema,
  resultSchema: jsonSchemaLikeSchema.optional(),
});

export const actionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  details: serializableJsonValueSchema.optional(),
});

export const agentActionCallSchema = z.object({
  id: z.string(),
  capability: capabilityNameSchema,
  input: serializableJsonValueSchema,
  sessionId: z.string().optional(),
  messageId: z.string().optional(),
  createdAt: z.string(),
});

const actionExecutionSuccessSchema = z.object({
  ok: z.literal(true),
  data: serializableJsonValueSchema.optional(),
  message: z.string().optional(),
});

const actionExecutionFailureSchema = z.object({
  ok: z.literal(false),
  error: actionErrorSchema,
});

export const agentActionResultSchema = z
  .discriminatedUnion("ok", [
    actionExecutionSuccessSchema,
    actionExecutionFailureSchema,
  ])
  .and(
    z.object({
      callId: z.string(),
      capability: capabilityNameSchema,
      sessionId: z.string().optional(),
      completedAt: z.string(),
    })
  );

export const actionStatusEventSchema = z.object({
  callId: z.string(),
  capability: capabilityNameSchema,
  status: actionStatusKindSchema,
  timestamp: z.string(),
  message: z.string().optional(),
  error: actionErrorSchema.optional(),
});

export const persistedChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant", "tool"]),
  createdAt: z.string(),
  text: z.string().optional(),
  status: z.enum(["streaming", "complete", "error", "cancelled"]).optional(),
  reasoning: z.string().optional(),
  actionCallId: z.string().optional(),
  metadata: serializableJsonObjectSchema.optional(),
});

export const persistedActionRecordSchema = z.object({
  call: agentActionCallSchema,
  result: agentActionResultSchema.optional(),
  status: actionStatusKindSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const persistedAgentTraceRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  status: z.enum(["pending", "active", "complete", "error"]).optional(),
  data: serializableJsonValueSchema.optional(),
});

export const persistedChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  piSessionId: z.string().optional(),
  permissionMode: permissionModeSchema,
  messages: z.array(persistedChatMessageSchema),
  actions: z.array(persistedActionRecordSchema),
  traces: z.array(persistedAgentTraceRecordSchema).optional(),
  metadata: serializableJsonObjectSchema.optional(),
});

export const agentClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    protocolVersion: z.literal(AGENT_PROTOCOL_VERSION),
    clientId: z.string(),
    permissionMode: permissionModeSchema,
    capabilities: z.array(agentCapabilityManifestSchema),
  }),
  z.object({
    type: z.literal("capabilities"),
    protocolVersion: z.literal(AGENT_PROTOCOL_VERSION),
    permissionMode: permissionModeSchema,
    capabilities: z.array(agentCapabilityManifestSchema),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal("session.resume"),
    chatId: z.string(),
    sessionId: z.string().optional(),
    transcript: z.array(persistedChatMessageSchema).optional(),
  }),
  z.object({
    type: z.literal("user_prompt"),
    id: z.string(),
    chatId: z.string(),
    sessionId: z.string().optional(),
    prompt: z.string(),
    createdAt: z.string(),
  }),
  z.object({
    type: z.literal("action_status"),
    status: actionStatusEventSchema,
  }),
  z.object({
    type: z.literal("action_result"),
    result: agentActionResultSchema,
  }),
  z.object({
    type: z.literal("cancel"),
    id: z.string(),
    sessionId: z.string().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("connection.status"),
    status: z.enum([
      "connecting",
      "connected",
      "disconnected",
      "reconnecting",
      "error",
    ]),
    message: z.string().optional(),
  }),
]);

export const agentServerEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    protocolVersion: z.literal(AGENT_PROTOCOL_VERSION),
    serverId: z.string().optional(),
    sessionId: z.string().optional(),
    acceptedCapabilities: z.array(capabilityNameSchema).optional(),
  }),
  z.object({
    type: z.literal("session.resumed"),
    chatId: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("assistant_message_start"),
    id: z.string(),
    sessionId: z.string().optional(),
    createdAt: z.string(),
  }),
  z.object({
    type: z.literal("assistant_text_delta"),
    id: z.string(),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("assistant_reasoning_delta"),
    id: z.string(),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("assistant_message_done"),
    message: persistedChatMessageSchema,
  }),
  z.object({
    type: z.literal("assistant_message_error"),
    id: z.string().optional(),
    error: actionErrorSchema,
  }),
  z.object({
    type: z.literal("action_call"),
    call: agentActionCallSchema,
  }),
  z.object({
    type: z.literal("action_status"),
    status: actionStatusEventSchema,
  }),
  z.object({
    type: z.literal("action_error"),
    callId: z.string().optional(),
    error: actionErrorSchema,
  }),
  z.object({
    type: z.literal("cancelled"),
    id: z.string(),
    sessionId: z.string().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("agent_trace"),
    trace: persistedAgentTraceRecordSchema,
  }),
  z.object({
    type: z.literal("connection.status"),
    status: z.enum([
      "connecting",
      "connected",
      "disconnected",
      "reconnecting",
      "error",
    ]),
    message: z.string().optional(),
  }),
]);

export const parseAgentClientEvent = (value: unknown): AgentClientEvent =>
  agentClientEventSchema.parse(value) as AgentClientEvent;

export const parseAgentServerEvent = (value: unknown): AgentServerEvent =>
  agentServerEventSchema.parse(value) as AgentServerEvent;

export const parsePersistedChatMessage = (
  value: unknown
): PersistedChatMessage => persistedChatMessageSchema.parse(value);

export const parsePersistedActionRecord = (
  value: unknown
): PersistedActionRecord => persistedActionRecordSchema.parse(value);

export const parsePersistedAgentTraceRecord = (
  value: unknown
): PersistedAgentTraceRecord => persistedAgentTraceRecordSchema.parse(value);

export const parsePersistedChatSession = (
  value: unknown
): PersistedChatSession => persistedChatSessionSchema.parse(value);

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
