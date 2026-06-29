import { expect, test } from "@playwright/test";
import {
  ActionReplayQueue,
  createActionReplayQueue,
  executeAppAction,
  validateCapabilityManifest,
  validateCapabilityRegistration,
} from "../../../src/agent/actionExecutor";
import {
  DEFAULT_PERMISSION_MODE,
  shouldAutoRunCapability,
  toCapabilityManifestEnvelope,
  type AgentActionCall,
  type AgentCapabilityRegistration,
  type CapabilityName,
  type SerializableJsonValue,
} from "../../../src/agent/protocol";

const now = () => "2026-06-28T00:00:00.000Z";

const makeCall = (
  capability: CapabilityName,
  input: SerializableJsonValue = {},
  id = capability
): AgentActionCall => ({
  id,
  capability,
  input,
  createdAt: now(),
});

const makeCapability = (
  overrides: Partial<AgentCapabilityRegistration> = {}
): AgentCapabilityRegistration => ({
  name: "test.action",
  appId: "test",
  title: "Test Action",
  description: "A deterministic test capability.",
  safety: "safe",
  execution: "query",
  inputSchema: { type: "object", additionalProperties: false },
  execute: () => ({ ok: true, data: { done: true } }),
  ...overrides,
});

test.describe("agent protocol capability validation", () => {
  test("accepts only serializable, app-scoped capability manifests", () => {
    const manifest = {
      name: "notes.writeText",
      appId: "notes",
      description: "Write visible note text.",
      safety: "safe",
      execution: "visible-mutation",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    };

    expect(validateCapabilityManifest(manifest)).toBe(true);
    expect(validateCapabilityManifest({ ...manifest, name: "writeText" })).toBe(false);
    expect(validateCapabilityManifest({ ...manifest, safety: "trusted" })).toBe(false);
    expect(validateCapabilityManifest({ ...manifest, execution: "mutation" })).toBe(false);
    expect(validateCapabilityManifest({ ...manifest, inputSchema: "zod-only" })).toBe(false);
  });

  test("requires registrations to include executable frontend behavior", () => {
    const capability = makeCapability();

    expect(validateCapabilityRegistration(capability)).toBe(true);
    expect(validateCapabilityRegistration({ ...capability, execute: undefined })).toBe(false);
    expect(validateCapabilityRegistration({ ...capability, parseInput: "nope" })).toBe(false);
  });

  test("publishes manifests without leaking executor functions", () => {
    const capability = makeCapability({
      name: "notes.readCurrent",
      parseInput: () => ({}),
      validateInput: (input): input is SerializableJsonValue => typeof input === "object",
      execute: () => ({ text: "hello" }),
    });

    const envelope = toCapabilityManifestEnvelope([capability]);

    expect(envelope.protocolVersion).toBe(1);
    expect(envelope.capabilities).toHaveLength(1);
    expect(envelope.capabilities[0]).toEqual({
      name: "notes.readCurrent",
      appId: "test",
      title: "Test Action",
      description: "A deterministic test capability.",
      safety: "safe",
      execution: "query",
      inputSchema: { type: "object", additionalProperties: false },
      resultSchema: undefined,
    });
    expect("execute" in envelope.capabilities[0]).toBe(false);
    expect("parseInput" in envelope.capabilities[0]).toBe(false);
    expect("validateInput" in envelope.capabilities[0]).toBe(false);
  });

  test("keeps auto-run permission policy explicit", () => {
    expect(DEFAULT_PERMISSION_MODE).toBe("auto-safe");
    expect(shouldAutoRunCapability({ safety: "safe" }, "auto-safe")).toBe(true);
    expect(shouldAutoRunCapability({ safety: "needs-confirmation" }, "auto-safe")).toBe(false);
    expect(shouldAutoRunCapability({ safety: "destructive" }, "auto-safe")).toBe(false);
    expect(shouldAutoRunCapability({ safety: "destructive" }, "auto-all")).toBe(true);
    expect(shouldAutoRunCapability({ safety: "safe" }, "confirm-all")).toBe(false);
  });
});

test.describe("action replay queue", () => {
  test("serializes visible mutations while allowing query capabilities to run concurrently", async () => {
    const order: string[] = [];
    let releaseFirstMutation: (() => void) | undefined;

    const firstMutation = makeCapability({
      name: "app.firstMutation",
      execution: "visible-mutation",
      execute: async () => {
        order.push("first:start");
        await new Promise<void>((resolve) => {
          releaseFirstMutation = resolve;
        });
        order.push("first:end");
        return { name: "first" };
      },
    });
    const secondMutation = makeCapability({
      name: "app.secondMutation",
      execution: "visible-mutation",
      execute: () => {
        order.push("second");
        return { name: "second" };
      },
    });
    const query = makeCapability({
      name: "app.query",
      execution: "query",
      execute: () => {
        order.push("query");
        return { name: "query" };
      },
    });
    const queue = createActionReplayQueue([firstMutation, secondMutation, query], { now });

    const first = executeAppAction(queue, makeCall("app.firstMutation", {}, "first"));
    await expect.poll(() => order).toEqual(["first:start"]);

    const second = executeAppAction(queue, makeCall("app.secondMutation", {}, "second"));
    const queryResult = await executeAppAction(queue, makeCall("app.query", {}, "query"));

    expect(queryResult.ok).toBe(true);
    expect(order).toEqual(["first:start", "query"]);

    releaseFirstMutation?.();
    await expect(first).resolves.toMatchObject({ ok: true, callId: "first" });
    await expect(second).resolves.toMatchObject({ ok: true, callId: "second" });
    expect(order).toEqual(["first:start", "query", "first:end", "second"]);
  });

  test("rejects invalid action input before executing the capability", async () => {
    let executed = false;
    const queue = new ActionReplayQueue(
      [
        makeCapability({
          name: "notes.writeText",
          parseInput: (input) => {
            if (
              typeof input !== "object" ||
              input === null ||
              !("text" in input) ||
              typeof input.text !== "string"
            ) {
              throw new Error("text is required");
            }
            return input as SerializableJsonValue;
          },
          execute: () => {
            executed = true;
            return { ok: true };
          },
        }),
      ],
      { now }
    );

    const result = await queue.executeAction(makeCall("notes.writeText", { text: 42 }));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_input", message: "text is required" },
      callId: "notes.writeText",
    });
    expect(executed).toBe(false);
  });

  test("requires confirmation for non-safe actions unless permission mode allows them", async () => {
    const statuses: string[] = [];
    const capability = makeCapability({
      name: "windows.closeWindow",
      safety: "needs-confirmation",
      execution: "visible-mutation",
      execute: () => ({ closed: true }),
    });
    const deniedQueue = createActionReplayQueue([capability], {
      now,
      onStatus: (status) => statuses.push(status.status),
    });

    const denied = await deniedQueue.executeAction(makeCall("windows.closeWindow"));

    expect(denied).toMatchObject({ ok: false, error: { code: "permission_denied" } });
    expect(statuses).toEqual(["queued", "waiting-confirmation", "failed"]);

    const allowedQueue = createActionReplayQueue([capability], {
      now,
      permissionMode: "auto-all",
    });
    await expect(allowedQueue.executeAction(makeCall("windows.closeWindow"))).resolves.toMatchObject({
      ok: true,
      data: { closed: true },
    });
  });
});
