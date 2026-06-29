import {
  CAPABILITY_EXECUTION_MODES,
  CAPABILITY_SAFETY_LEVELS,
  DEFAULT_PERMISSION_MODE,
  PERMISSION_MODES,
  shouldAutoRunCapability,
  toCapabilityManifest,
} from "./protocol";
import type {
  ActionError,
  ActionExecutionResult,
  AgentActionCall,
  AgentActionResult,
  AgentActionStatusEvent,
  AgentActionStatusKind,
  AgentCapabilityManifest,
  AgentCapabilityRegistration,
  CapabilityName,
  PermissionMode,
  SerializableJsonValue,
} from "./protocol";

export type PermissionRequest = {
  readonly call: AgentActionCall;
  readonly capability: AgentCapabilityManifest;
  readonly permissionMode: PermissionMode;
};

export type ActionReplayQueueOptions = {
  readonly permissionMode?: PermissionMode;
  readonly getPermissionMode?: () => PermissionMode;
  readonly confirmAction?: (
    request: PermissionRequest
  ) => boolean | Promise<boolean>;
  readonly onStatus?: (status: AgentActionStatusEvent) => void;
  readonly now?: () => string;
};

export type ExecuteAppActionOptions = {
  readonly signal?: AbortSignal;
  readonly permissionMode?: PermissionMode;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = <Key extends string>(
  record: Record<string, unknown>,
  key: Key
): record is Record<string, unknown> & Record<Key, string> =>
  typeof record[key] === "string";

const hasSerializableSchema = (record: Record<string, unknown>, key: string) =>
  isRecord(record[key]);

export const validateCapabilityManifest = (
  value: unknown
): value is AgentCapabilityManifest => {
  if (!isRecord(value)) return false;

  return (
    hasString(value, "name") &&
    value.name.includes(".") &&
    hasString(value, "appId") &&
    hasString(value, "description") &&
    CAPABILITY_SAFETY_LEVELS.includes(
      value.safety as (typeof CAPABILITY_SAFETY_LEVELS)[number]
    ) &&
    CAPABILITY_EXECUTION_MODES.includes(
      value.execution as (typeof CAPABILITY_EXECUTION_MODES)[number]
    ) &&
    hasSerializableSchema(value, "inputSchema") &&
    (value.title === undefined || typeof value.title === "string") &&
    (value.resultSchema === undefined || isRecord(value.resultSchema))
  );
};

export const validateCapabilityRegistration = (
  value: unknown
): value is AgentCapabilityRegistration => {
  if (!validateCapabilityManifest(value)) return false;

  const registration = value as AgentCapabilityManifest & {
    readonly execute?: unknown;
    readonly parseInput?: unknown;
    readonly validateInput?: unknown;
  };

  return (
    typeof registration.execute === "function" &&
    (registration.parseInput === undefined ||
      typeof registration.parseInput === "function") &&
    (registration.validateInput === undefined ||
      typeof registration.validateInput === "function")
  );
};

export const isActionExecutionResult = (
  value: unknown
): value is ActionExecutionResult =>
  isRecord(value) &&
  typeof value.ok === "boolean" &&
  (value.ok === true ||
    (isRecord(value.error) &&
      typeof value.error.code === "string" &&
      typeof value.error.message === "string"));

const createActionError = (
  code: string,
  message: string,
  details?: SerializableJsonValue
): ActionError => ({ code, message, details });

const normalizeExecutionResult = (
  value: ActionExecutionResult | SerializableJsonValue | void
): ActionExecutionResult => {
  if (isActionExecutionResult(value)) return value;
  if (value === undefined) return { ok: true };
  return { ok: true, data: value };
};

export class ActionReplayQueue {
  private capabilities = new Map<CapabilityName, AgentCapabilityRegistration>();
  private readonly options: ActionReplayQueueOptions;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(
    capabilities: readonly AgentCapabilityRegistration[] = [],
    options: ActionReplayQueueOptions = {}
  ) {
    this.options = options;
    this.replaceCapabilities(capabilities);
  }

  replaceCapabilities(capabilities: readonly AgentCapabilityRegistration[]) {
    const next = new Map<CapabilityName, AgentCapabilityRegistration>();

    for (const capability of capabilities) {
      if (!validateCapabilityRegistration(capability)) {
        throw new Error("Invalid agent capability");
      }

      next.set(capability.name, capability);
    }

    this.capabilities = next;
  }

  addCapability(capability: AgentCapabilityRegistration) {
    if (!validateCapabilityRegistration(capability)) {
      throw new Error("Invalid agent capability");
    }

    this.capabilities.set(capability.name, capability);
  }

  getCapability(name: CapabilityName) {
    return this.capabilities.get(name);
  }

  getCapabilities() {
    return Array.from(this.capabilities.values());
  }

  getCapabilityManifests() {
    return this.getCapabilities().map(toCapabilityManifest);
  }

  executeAction(
    call: AgentActionCall,
    options: ExecuteAppActionOptions = {}
  ): Promise<AgentActionResult> {
    const capability = this.capabilities.get(call.capability);

    if (!capability) {
      return Promise.resolve(
        this.toActionResult(call, {
          ok: false,
          error: createActionError(
            "capability_not_found",
            `No registered capability named ${call.capability}`
          ),
        })
      );
    }

    if (capability.execution === "query") {
      return this.executeRegisteredCapability(capability, call, options);
    }

    this.emitStatus(call, "queued");

    const scheduled = this.mutationTail.then(
      () => this.executeRegisteredCapability(capability, call, options),
      () => this.executeRegisteredCapability(capability, call, options)
    );

    this.mutationTail = scheduled.then(
      () => undefined,
      () => undefined
    );

    return scheduled;
  }

  private async executeRegisteredCapability(
    capability: AgentCapabilityRegistration,
    call: AgentActionCall,
    options: ExecuteAppActionOptions
  ): Promise<AgentActionResult> {
    const permissionMode = this.resolvePermissionMode(options.permissionMode);

    if (options.signal?.aborted) {
      const result = this.toActionResult(call, {
        ok: false,
        error: createActionError("cancelled", "Action was cancelled before it ran"),
      });
      this.emitStatus(call, "cancelled", result.error.message);
      return result;
    }

    const permission = await this.requestPermissionIfNeeded(
      capability,
      call,
      permissionMode
    );

    if (!permission.ok) {
      const result = this.toActionResult(call, permission);
      this.emitStatus(call, "failed", permission.error.message, permission.error);
      return result;
    }

    let input: SerializableJsonValue;

    try {
      input = capability.parseInput
        ? capability.parseInput(call.input)
        : call.input;
    } catch (error) {
      const result = this.toActionResult(call, {
        ok: false,
        error: createActionError(
          "invalid_input",
          error instanceof Error ? error.message : "Capability input is invalid"
        ),
      });
      this.emitStatus(call, "failed", result.error.message, result.error);
      return result;
    }

    if (capability.validateInput && !capability.validateInput(input)) {
      const result = this.toActionResult(call, {
        ok: false,
        error: createActionError("invalid_input", "Capability input is invalid"),
      });
      this.emitStatus(call, "failed", result.error.message, result.error);
      return result;
    }

    if (options.signal?.aborted) {
      const result = this.toActionResult(call, {
        ok: false,
        error: createActionError("cancelled", "Action was cancelled before it ran"),
      });
      this.emitStatus(call, "cancelled", result.error.message);
      return result;
    }

    this.emitStatus(call, "running");

    try {
      const result = normalizeExecutionResult(
        await capability.execute({
          call: { ...call, input },
          input,
          permissionMode,
          signal: options.signal,
          recordStatus: (status, message) => this.emitStatus(call, status, message),
        })
      );
      const actionResult = this.toActionResult(call, result);

      this.emitStatus(
        call,
        actionResult.ok ? "completed" : "failed",
        actionResult.ok ? actionResult.message : actionResult.error.message,
        actionResult.ok ? undefined : actionResult.error
      );

      return actionResult;
    } catch (error) {
      const result = this.toActionResult(call, {
        ok: false,
        error: createActionError(
          "execution_error",
          error instanceof Error ? error.message : "Capability execution failed"
        ),
      });
      this.emitStatus(call, "failed", result.error.message, result.error);
      return result;
    }
  }

  private async requestPermissionIfNeeded(
    capability: AgentCapabilityRegistration,
    call: AgentActionCall,
    permissionMode: PermissionMode
  ): Promise<ActionExecutionResult> {
    if (shouldAutoRunCapability(capability, permissionMode)) return { ok: true };

    this.emitStatus(call, "waiting-confirmation");

    const confirmed =
      (await this.options.confirmAction?.({
        call,
        capability: toCapabilityManifest(capability),
        permissionMode,
      })) ?? false;

    if (confirmed) return { ok: true };

    return {
      ok: false,
      error: createActionError(
        "permission_denied",
        `Permission denied for ${capability.name}`
      ),
    };
  }

  private resolvePermissionMode(override?: PermissionMode) {
    const permissionMode =
      override ??
      this.options.getPermissionMode?.() ??
      this.options.permissionMode ??
      DEFAULT_PERMISSION_MODE;

    return PERMISSION_MODES.includes(permissionMode) ? permissionMode : DEFAULT_PERMISSION_MODE;
  }

  private emitStatus(
    call: AgentActionCall,
    status: AgentActionStatusKind,
    message?: string,
    error?: ActionError
  ) {
    this.options.onStatus?.({
      callId: call.id,
      capability: call.capability,
      status,
      timestamp: this.now(),
      message,
      error,
    });
  }

  private toActionResult<TResult extends ActionExecutionResult>(
    call: AgentActionCall,
    result: TResult
  ): TResult & Pick<AgentActionResult, "callId" | "capability" | "sessionId" | "completedAt"> {
    return {
      ...result,
      callId: call.id,
      capability: call.capability,
      sessionId: call.sessionId,
      completedAt: this.now(),
    };
  }

  private now() {
    return this.options.now?.() ?? new Date().toISOString();
  }
}

export const createActionReplayQueue = (
  capabilities: readonly AgentCapabilityRegistration[] = [],
  options: ActionReplayQueueOptions = {}
) => new ActionReplayQueue(capabilities, options);

export const executeAppAction = (
  queue: ActionReplayQueue,
  call: AgentActionCall,
  options: ExecuteAppActionOptions = {}
) => queue.executeAction(call, options);
