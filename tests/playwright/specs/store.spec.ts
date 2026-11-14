import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { routeStoreRequest } from "../../../server/app";
import { loadCatalog } from "../../../server/catalog";
import { createInstallStats } from "../../../server/stats";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../server");
const catalog = loadCatalog(path.join(serverDir, "apps"), path.join(serverDir, "sdk"));

const STORE_URL = "http://127.0.0.1:4000";

// Answers store requests with the real server routing, without opening a socket.
const serveStore = async (page: Page) => {
  const stats = createInstallStats(null);
  await page.route(`${STORE_URL}/**`, async (route) => {
    const request = route.request();
    const response = routeStoreRequest(
      { catalog, stats },
      request.method(),
      new URL(request.url()).pathname
    );
    await route.fulfill({
      status: response.status,
      headers: { ...response.headers, "Access-Control-Allow-Origin": "*" },
      body: response.body,
    });
  });
};

const storeListing = (page: Page, appId: string) =>
  getWindowByTitle(page, "App Store").locator(`[data-store-listing="${appId}"]`);

const markdownPadWindow = (page: Page) => page.getByRole("dialog", { name: /Markdown Pad/ });

const notesFile = (page: Page) =>
  getWindowByTitle(page, "Files").getByRole("button", { name: /Notes\.md/ });

const installMarkdownPad = async (page: Page) => {
  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");
  const listing = storeListing(page, "markdown-pad");
  await listing.getByRole("button", { name: "Install Markdown Pad" }).click();
  await expect(listing.getByRole("button", { name: "Open Markdown Pad" })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await serveStore(page);
  await openDesktop(page);
});

test("[store.install] installs an app from the store and runs it", async ({ page }) => {
  await installMarkdownPad(page);

  await expect(page.locator('[data-desktop-icon-id="store:markdown-pad"]')).toBeVisible();
  await expect(storeListing(page, "markdown-pad")).toContainText("1 installs");

  await storeListing(page, "markdown-pad").getByRole("button", { name: "Open Markdown Pad" }).click();
  const editor = page.frameLocator('iframe[data-store-app="markdown-pad"]').locator("#editor");
  await editor.fill("# Hello from the store");
  await expect(
    page.frameLocator('iframe[data-store-app="markdown-pad"]').locator("#preview h1")
  ).toHaveText("Hello from the store");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("store-app-state:store:markdown-pad:store:markdown-pad")
      )
    )
    .toBe(JSON.stringify({ text: "# Hello from the store" }));

  // Installed apps survive a reload and keep working with the store offline.
  await page.unroute(`${STORE_URL}/**`);
  await page.route(`${STORE_URL}/**`, (route) => route.abort());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-desktop-icon-id="store:markdown-pad"]').dispatchEvent("dblclick");
  await expect(markdownPadWindow(page)).toBeVisible();
  await expect(
    page.frameLocator('iframe[data-store-app="markdown-pad"]').locator("#editor")
  ).toHaveValue("# Hello from the store");
});

test("[store.open-with] opens a notes file with an installed app and changes the default", async ({
  page,
}) => {
  await installMarkdownPad(page);
  await openDesktopApp(page, "Files");
  await waitForWindow(page, "Files");

  // Open with -> Markdown Pad
  await notesFile(page).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Open with" }).click();
  await page.getByRole("menuitem", { name: /Markdown Pad/ }).click();

  await expect(page.getByRole("dialog", { name: "Notes.md - Markdown Pad" })).toBeVisible();
  await expect(
    page.frameLocator('iframe[data-store-app="markdown-pad"]').locator("#editor")
  ).toHaveValue(/This note came from Explorer file data\./);
  await page.getByRole("dialog", { name: "Notes.md - Markdown Pad" })
    .getByRole("button", { name: "Close" })
    .click();
  await expect(markdownPadWindow(page)).toHaveCount(0);

  // Make Markdown Pad the default for .md files; double-click now uses it.
  await notesFile(page).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Default app for .md" }).click();
  await page.getByRole("menuitemradio", { name: /Markdown Pad/ }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("desktop-file-defaults")))
    .toBe(JSON.stringify({ notes: "store:markdown-pad" }));

  await notesFile(page).dblclick();
  await expect(markdownPadWindow(page)).toBeVisible();
  await expect(getWindowByTitle(page, "Notes")).toHaveCount(0);
});

test("[store.uninstall] removes the app, its icon and its file default", async ({ page }) => {
  await installMarkdownPad(page);
  await page.evaluate(() =>
    localStorage.setItem("desktop-file-defaults", JSON.stringify({ notes: "store:markdown-pad" }))
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");

  await storeListing(page, "markdown-pad").getByRole("button", { name: "Uninstall Markdown Pad" }).click();

  await expect(page.locator('[data-desktop-icon-id="store:markdown-pad"]')).toHaveCount(0);
  await expect(
    storeListing(page, "markdown-pad").getByRole("button", { name: "Install Markdown Pad" })
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("desktop-file-defaults"))).toBe("{}");

  // With the default gone, notes open in the built-in Notes app again.
  await openDesktopApp(page, "Files");
  await waitForWindow(page, "Files");
  await notesFile(page).dblclick();
  await expect(page.getByRole("dialog", { name: "Notes" })).toBeVisible();
});

test("[store.offline] shows a plain-language message when the store server is unreachable", async ({
  page,
}) => {
  await page.unroute(`${STORE_URL}/**`);
  await page.route(`${STORE_URL}/**`, (route) => route.abort());
  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");

  const alert = getWindowByTitle(page, "App Store").getByRole("alert");
  await expect(alert).toContainText("The App Store is unavailable right now.");
  // Technical details belong in the console, not in front of the user.
  await expect(alert).not.toContainText("127.0.0.1");
  await expect(alert).not.toContainText(
    "npm run store:server"
  );
});

// ---------------------------------------------------------------------------
// Shared UI library and theming
// ---------------------------------------------------------------------------

const appFrame = (page: Page, appId: string) =>
  page.frameLocator(`iframe[data-store-app="${appId}"]`);

const appWindow = (page: Page, appId: string) =>
  page.getByRole("dialog").filter({ has: page.locator(`iframe[data-store-app="${appId}"]`) });

const installApp = async (page: Page, appId: string, name: string) => {
  const listing = storeListing(page, appId);
  await listing.getByRole("button", { name: `Install ${name}` }).click();
  await expect(listing.getByRole("button", { name: `Open ${name}` })).toBeVisible();
};

const openInstalledApp = async (page: Page, appId: string) => {
  await page.locator(`[data-desktop-icon-id="store:${appId}"]`).dispatchEvent("dblclick");
  await expect(appWindow(page, appId)).toBeVisible();
};

const hostToken = (page: Page, name: string) =>
  page.evaluate(
    (token) => getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim(),
    name
  );

const appToken = (frame: FrameLocator, name: string) =>
  frame.locator("html").evaluate((root, token) => root.style.getPropertyValue(`--${token}`), name);

test("[store.ui-theme] store apps follow the desktop theme", async ({ page }) => {
  // Personalization first, while the desktop is still uncovered.
  await page
    .locator("div.flex.min-h-screen.w-full.flex-wrap")
    .click({ button: "right", position: { x: 1000, y: 600 } });
  await page.getByRole("menuitem", { name: "Personalization" }).click();
  const personalization = getWindowByTitle(page, "Personalization");
  await expect(personalization).toBeVisible();

  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");
  await installApp(page, "task-board", "Task Board");
  await openInstalledApp(page, "task-board");
  const frame = appFrame(page, "task-board");

  const initialPrimary = await hostToken(page, "primary");
  expect(initialPrimary).not.toBe("");
  await expect.poll(() => appToken(frame, "primary")).toBe(initialPrimary);
  await expect.poll(() => appToken(frame, "border")).toBe(await hostToken(page, "border"));

  // The shared button really is painted with the desktop's primary colour.
  const paint = (color: string) =>
    page.evaluate((value) => {
      const probe = document.createElement("div");
      probe.style.color = value;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    }, color);
  const addButton = frame.getByRole("button", { name: "Add task" });
  await expect(addButton).toHaveCSS("background-color", await paint(initialPrimary));

  // Switching the desktop theme re-themes the running app.
  await page.locator("div.fixed.bottom-0").getByRole("button", { name: "Personalization" }).click();
  await personalization.getByRole("button", { name: /Linen Citrus/ }).click();
  await expect.poll(() => hostToken(page, "primary")).not.toBe(initialPrimary);
  const nextPrimary = await hostToken(page, "primary");
  await expect.poll(() => appToken(frame, "primary")).toBe(nextPrimary);
  await expect(addButton).toHaveCSS("background-color", await paint(nextPrimary));
});

// One real interaction per app. A new store app needs an entry here.
const appChecks: Record<string, (frame: FrameLocator) => Promise<void>> = {
  calculator: async (frame) => {
    await frame.getByRole("button", { name: "7", exact: true }).click();
    await frame.getByRole("button", { name: "Add" }).click();
    await frame.getByRole("button", { name: "5", exact: true }).click();
    await frame.getByRole("button", { name: "Equals" }).click();
    await expect(frame.locator("#value")).toHaveText("12");
  },
  "focus-timer": async (frame) => {
    await frame.getByRole("button", { name: "Start" }).click();
    await expect(frame.getByRole("button", { name: "Pause" })).toBeVisible();
  },
  "habit-garden": async (frame) => {
    await expect(frame.getByText("Your garden is empty")).toBeVisible();
    await frame.getByLabel("New habit").fill("Stretch");
    await frame.getByRole("button", { name: "Plant" }).click();
    await frame.getByRole("button", { name: "Water today" }).click();
    await expect(frame.getByText("1 day streak")).toBeVisible();
    await expect(frame.getByText("1 of 1 watered today")).toBeVisible();
  },
  "markdown-pad": async (frame) => {
    await frame.locator("#editor").fill("# Checked");
    await expect(frame.locator("#preview h1")).toHaveText("Checked");
  },
  "memory-match": async (frame) => {
    await frame.getByRole("button", { name: "Card 1, face down" }).click();
    await expect(frame.getByRole("button", { name: /^Card 1: / })).toBeVisible();
  },
  "palette-lab": async (frame) => {
    await expect(frame.locator("#swatches > *")).toHaveCount(5);
    await frame.getByRole("button", { name: "Keep", exact: true }).click();
    await expect(frame.getByText("Palette kept")).toBeVisible();
    await expect(frame.locator("#kept li")).toHaveCount(1);
  },
  "photo-filters": async (frame) => {
    await frame.getByRole("button", { name: "Warm" }).click();
    await expect(frame.getByRole("button", { name: "Warm" })).toHaveAttribute("aria-pressed", "true");
    await expect(frame.locator("#sample")).toHaveCSS("filter", /sepia\(0\.35\)/);
  },
  "pixel-studio": async (frame) => {
    const firstCell = frame.locator(".cell").first();
    await firstCell.click();
    await expect(firstCell).toHaveAttribute("style", /background/);
    // Clearing asks first, using the shared confirmation dialog.
    await frame.getByRole("button", { name: "Clear" }).click();
    await frame.getByRole("dialog").getByRole("button", { name: "Clear" }).click();
    await expect(firstCell).not.toHaveAttribute("style", /background: rgb/);
  },
  "task-board": async (frame) => {
    await frame.getByLabel("New task").fill("Ship it");
    await frame.getByRole("button", { name: "Add task" }).click();
    await frame.getByRole("button", { name: "Move “Ship it” forward" }).click();
    await expect(frame.getByRole("region", { name: "Doing" })).toContainText("Ship it");
  },
  "text-insights": async (frame) => {
    await frame.getByLabel("Text to look at").fill("One two three. Four five");
    await expect(frame.locator("#words")).toHaveText("5");
    await expect(frame.locator("#sentences")).toHaveText("2");
  },
};

test("[store.apps.smoke] every store app installs, starts themed and works", async ({ page }) => {
  test.setTimeout(120_000);
  expect(Object.keys(appChecks).sort()).toEqual([...catalog.keys()].sort());

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");
  for (const app of catalog.values()) {
    await installApp(page, app.manifest.id, app.manifest.name);
  }

  for (const app of catalog.values()) {
    const appId = app.manifest.id;
    await test.step(app.manifest.name, async () => {
      await openInstalledApp(page, appId);
      const frame = appFrame(page, appId);
      // The app received the desktop theme, and uses the shared UI library.
      await expect(frame.locator("html")).toHaveAttribute("data-theme", /light|dark/);
      await expect.poll(() => appToken(frame, "primary")).not.toBe("");
      expect(app.html).toContain(".ui-button");

      await appChecks[appId](frame);

      await appWindow(page, appId).getByRole("button", { name: "Close" }).click();
      await expect(appWindow(page, appId)).toHaveCount(0);
    });
  }

  expect(pageErrors).toEqual([]);
});
