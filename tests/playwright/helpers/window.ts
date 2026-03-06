import { expect, type Locator, type Page } from "@playwright/test";

export const getWindowByTitle = (page: Page, title: string): Locator =>
  page.locator("div.absolute").filter({ has: page.getByText(title, { exact: true }) }).first();

export const getWindowTitlebar = (page: Page, title: string): Locator =>
  page.locator("div.cursor-move").filter({ hasText: title }).first();

export const waitForWindow = async (page: Page, title: string) => {
  await expect(getWindowTitlebar(page, title)).toBeVisible();
};

export const dragWindowBy = async (
  page: Page,
  title: string,
  delta: { x: number; y: number }
) => {
  const titlebar = getWindowTitlebar(page, title);
  await expect(titlebar).toBeVisible();

  const box = await titlebar.boundingBox();
  if (!box) {
    throw new Error(`Missing titlebar bounding box for "${title}"`);
  }

  const startX = box.x + Math.min(120, Math.max(32, box.width / 2));
  const startY = box.y + Math.min(16, Math.max(10, box.height / 2));

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 12 });
  await page.mouse.up();
};
