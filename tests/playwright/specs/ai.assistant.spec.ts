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
