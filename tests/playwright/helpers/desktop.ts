import { expect, type Locator, type Page } from "@playwright/test";

export const openDesktop = async (page: Page) => {
  page.on("pageerror", (error) => console.error(`[browser page error] ${error.message}`));
  await page.goto("/", { waitUntil: "domcontentloaded" });
};

export const getDesktopIcon = (page: Page, appName: string): Locator =>
  page.getByRole("button", { name: appName }).first();

export const openDesktopApp = async (page: Page, appName: string) => {
  const icon = getDesktopIcon(page, appName);
  await expect(icon).toBeVisible();
  // Desktop icons use pointer capture for dragging, which makes Playwright's
  // physical dblclick gesture unreliable. Dispatch the activation event directly.
  await icon.dispatchEvent("dblclick");
};
