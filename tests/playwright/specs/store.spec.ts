import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { routeStoreRequest } from "../../../server/app";
import { loadCatalog } from "../../../server/catalog";
import { createInstallStats } from "../../../server/stats";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../server");
const catalog = loadCatalog(path.join(serverDir, "apps"), path.join(serverDir, "sdk", "desktop-sdk.js"));

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

test("[store.offline] explains how to start the store server when it is unreachable", async ({
  page,
}) => {
  await page.unroute(`${STORE_URL}/**`);
  await page.route(`${STORE_URL}/**`, (route) => route.abort());
  await openDesktopApp(page, "App Store");
  await waitForWindow(page, "App Store");

  await expect(getWindowByTitle(page, "App Store").getByRole("alert")).toContainText(
    "npm run store:server"
  );
});
