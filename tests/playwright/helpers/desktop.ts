import { expect, type Locator, type Page } from "@playwright/test";

export const openDesktop = async (page: Page) => {
  await page.goto("/", { waitUntil: "networkidle" });
};

export const getDesktopIcon = (page: Page, appName: string): Locator =>
  page.getByRole("button", { name: appName }).first();

export const openDesktopApp = async (page: Page, appName: string) => {
  const icon = getDesktopIcon(page, appName);
  await expect(icon).toBeVisible();
  await icon.dblclick();
};
