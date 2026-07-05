import { expect, test, type Page } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { waitForWindow } from "../helpers/window";

const CHAT_SESSIONS_KEY = "pi-agent.chat-sessions.v1";
const ACTIVE_CHAT_KEY = "pi-agent.active-chat-id.v1";

type PersistedChatSummary = {
  key: string;
  chatCount: number;
  hasTranscript: boolean;
  hasActions: boolean;
  hasPermissionMode: boolean;
};

const readPersistedChatSummaries = async (page: Page) =>
  page.evaluate((key) => {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return [
      {
        key,
        chatCount: parsed.length,
        hasTranscript: parsed.every((chat) => Array.isArray(chat?.messages)),
        hasActions: parsed.every((chat) => Array.isArray(chat?.actions)),
        hasPermissionMode: parsed.every((chat) => typeof chat?.permissionMode === "string"),
      },
    ] satisfies PersistedChatSummary[];
  }, CHAT_SESSIONS_KEY);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});


test("[ai.assistant.disconnected] shows disconnected state and blocks sending without Pi backend", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "AI Assistant");
  await waitForWindow(page, "AI Assistant");

  await expect(page.getByTestId("ai-assistant-app")).toBeVisible();
  await expect(page.getByTestId("ai-connection-status")).toContainText(
    /connecting|reconnecting|disconnected|offline|unreachable|error/i
  );

  await expect(page.getByTestId("ai-prompt")).toBeDisabled();
  await expect(page.getByTestId("ai-send")).toBeDisabled();
});

test("[ai.assistant.persistence] persists multiple local chats and resumes them after reload", async ({ page }) => {
  await page.addInitScript(
    ({ activeChatKey, chatSessionsKey }) => {
      const createdAt = "2026-06-28T00:00:00.000Z";
      localStorage.setItem(
        chatSessionsKey,
        JSON.stringify([
          {
            id: "chat-seeded-1",
            title: "Seeded planning chat",
            createdAt,
            updatedAt: createdAt,
            piSessionId: "pi-seeded-1",
            permissionMode: "auto-safe",
            messages: [
              {
                id: "message-seeded-1",
                role: "user",
                createdAt,
                text: "Remember the first seeded chat",
                status: "complete",
              },
            ],
            actions: [],
          },
          {
            id: "chat-seeded-2",
            title: "Seeded actions chat",
            createdAt,
            updatedAt: createdAt,
            piSessionId: "pi-seeded-2",
            permissionMode: "auto-all",
            messages: [
              {
                id: "message-seeded-2",
                role: "assistant",
                createdAt,
                text: "Second seeded answer",
                status: "complete",
              },
            ],
            actions: [
              {
                call: {
                  id: "call-seeded-1",
                  capability: "notes.readCurrent",
                  input: {},
                  createdAt,
                },
                status: "completed",
                createdAt,
                updatedAt: createdAt,
              },
            ],
          },
        ])
      );
      localStorage.setItem(activeChatKey, "chat-seeded-2");
    },
    { activeChatKey: ACTIVE_CHAT_KEY, chatSessionsKey: CHAT_SESSIONS_KEY }
  );
  await openDesktop(page);
  await openDesktopApp(page, "AI Assistant");
  await waitForWindow(page, "AI Assistant");

  const chatList = page.getByTestId("ai-chat-list");

  await expect(chatList).toBeVisible();
  await expect(chatList.getByRole("button", { name: /^Seeded planning chat\b/ })).toBeVisible();
  await expect(chatList.getByRole("button", { name: /^Seeded actions chat\b/ })).toBeVisible();
  await expect(page.getByText("Second seeded answer")).toBeVisible();

  const persistedBeforeReload = await readPersistedChatSummaries(page);
  expect(persistedBeforeReload).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        chatCount: 2,
        hasTranscript: true,
        hasActions: true,
        hasPermissionMode: true,
      }),
    ])
  );

  await page.reload({ waitUntil: "networkidle" });
  await openDesktopApp(page, "AI Assistant");
  await waitForWindow(page, "AI Assistant");

  await expect(chatList.getByRole("button", { name: /^Seeded planning chat\b/ })).toBeVisible();
  await expect(chatList.getByRole("button", { name: /^Seeded actions chat\b/ })).toBeVisible();
  await expect(page.getByText("Second seeded answer")).toBeVisible();
});

test("[ai.assistant.trace-raw-data-hidden] shows assistant text without exposing raw trace payloads", async ({ page }) => {
  await page.addInitScript(
    ({ activeChatKey, chatSessionsKey }) => {
      const createdAt = "2026-06-28T00:00:00.000Z";
      const traceAt = "2026-06-28T00:00:01.000Z";
      const assistantAt = "2026-06-28T00:00:02.000Z";

      localStorage.setItem(
        chatSessionsKey,
        JSON.stringify([
          {
            id: "chat-raw-trace",
            title: "Seeded raw trace chat",
            createdAt,
            updatedAt: assistantAt,
            piSessionId: "pi-raw-trace",
            permissionMode: "auto-safe",
            messages: [
              {
                id: "message-raw-trace-user",
                role: "user",
                createdAt,
                text: "Summarize the visible desktop state.",
                status: "complete",
              },
              {
                id: "message-raw-trace-assistant",
                role: "assistant",
                createdAt: assistantAt,
                reasoning:
                  "I read the parsed Pi Agent event stream and kept only the user-facing answer.",
                text: "The Pi Agent found two open windows and is ready for the next step.",
                status: "complete",
              },
            ],
            actions: [],
            traces: [
              {
                id: "trace-raw-protocol",
                createdAt: traceAt,
                title: "Pi Agent protocol event",
                detail: "Raw protocol payload was captured for console diagnostics.",
                status: "complete",
                data: {
                  type: "message_update",
                  assistantMessageEvent: {
                    type: "toolcall",
                    text_delta: "RAW_TEXT_DELTA_SHOULD_NOT_RENDER",
                    thinking_delta: "RAW_THINKING_DELTA_SHOULD_NOT_RENDER",
                    toolcall: {
                      id: "tool-call-hidden",
                      name: "windows.listApps",
                      arguments: {
                        query: "RAW_TOOL_ARGUMENT_SHOULD_NOT_RENDER",
                      },
                    },
                    content: [
                      {
                        type: "thinking",
                        text: "RAW_CONTENT_THINKING_SHOULD_NOT_RENDER",
                      },
                    ],
                  },
                  rawProtocolEnvelope: {
                    internalControlToken: "RAW_PROTOCOL_CONTROL_TOKEN",
                    nested: {
                      jsonKeySentinel: "RAW_JSON_KEY_SENTINEL",
                    },
                  },
                },
              },
            ],
          },
        ])
      );
      localStorage.setItem(activeChatKey, "chat-raw-trace");
    },
    { activeChatKey: ACTIVE_CHAT_KEY, chatSessionsKey: CHAT_SESSIONS_KEY }
  );

  await openDesktop(page);
  await openDesktopApp(page, "AI Assistant");
  await waitForWindow(page, "AI Assistant");

  const messageList = page.getByTestId("ai-message-list");

  await expect(messageList).toBeVisible();
  await expect(
    messageList.getByText("The Pi Agent found two open windows and is ready for the next step.")
  ).toBeVisible();
  await expect(
    messageList.getByText(
      "I read the parsed Pi Agent event stream and kept only the user-facing answer."
    )
  ).toBeVisible();
  await expect(messageList).not.toContainText("RAW_PROTOCOL_CONTROL_TOKEN");
  await expect(messageList).not.toContainText("RAW_TEXT_DELTA_SHOULD_NOT_RENDER");
  await expect(messageList).not.toContainText("text_delta");
  await expect(messageList).not.toContainText("assistantMessageEvent");
  await expect(messageList).not.toContainText("rawProtocolEnvelope");
});
