import { expect, type Locator, type Page } from "@playwright/test";

export const getWindowByTitle = (page: Page, title: string): Locator =>
  page.getByRole("dialog", { name: title, exact: true });

export const getWindowTitlebar = (page: Page, title: string): Locator =>
  page.locator("div.cursor-move").filter({ hasText: title }).first();

export const waitForWindow = async (page: Page, title: string) => {
  await expect(getWindowTitlebar(page, title)).toBeVisible();
};

const activateWindowIfNeeded = async (page: Page, title: string) => {
  const activeTitle = await page.evaluate(() => {
    const windows = window.__windowsManagerStore?.getState().windows ?? [];
    return windows
      .filter((entry) => !entry.isMinimized)
      .sort((left, right) => right.zIndex - left.zIndex)[0]?.title;
  });
  if (activeTitle === title) return;
  await page.locator("div.fixed.bottom-0").getByRole("button", { name: title }).click();
};

export const dragWindowBy = async (
  page: Page,
  title: string,
  delta: { x: number; y: number }
) => {
  await activateWindowIfNeeded(page, title);
  const titlebar = getWindowTitlebar(page, title);
  if (!(await titlebar.isVisible())) {
    await page.getByRole("button", { name: title, exact: true }).last().click();
  }
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

export const dockWindow = async (
  page: Page,
  title: string,
  side: "left" | "right"
) => {
  await activateWindowIfNeeded(page, title);
  const titlebar = getWindowTitlebar(page, title);
  if (!(await titlebar.isVisible())) {
    await page.getByRole("button", { name: title, exact: true }).last().click();
  }
  await expect(titlebar).toBeVisible();
  const box = await titlebar.boundingBox();
  if (!box) throw new Error(`Missing titlebar bounding box for "${title}"`);

  const startX = box.x + Math.min(120, Math.max(32, box.width / 2));
  const startY = box.y + Math.min(16, Math.max(10, box.height / 2));
  const targetX = side === "left" ? 1 : (await page.evaluate(() => window.innerWidth)) - 1;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, startY, { steps: 16 });
  await page.waitForTimeout(75);
  await page.mouse.up();
  await expect
    .poll(() => getWindowByTitle(page, title).getAttribute("data-window-layout-mode"))
    .not.toBe("normal");
  await expect
    .poll(async () => {
      const [renderedBounds, storedBounds] = await Promise.all([
        getWindowByTitle(page, title).boundingBox(),
        page.evaluate((windowTitle) => {
          const entry = window.__windowsManagerStore
            ?.getState()
            .windows.find((candidate) => candidate.title === windowTitle);
          return entry
            ? { x: entry.x, y: entry.y, width: entry.width, height: entry.height }
            : null;
        }, title),
      ]);
      if (!renderedBounds || !storedBounds) return Number.POSITIVE_INFINITY;
      return Math.max(
        Math.abs(renderedBounds.x - storedBounds.x),
        Math.abs(renderedBounds.y - storedBounds.y),
        Math.abs(renderedBounds.width - storedBounds.width),
        Math.abs(renderedBounds.height - storedBounds.height)
      );
    })
    .toBeLessThan(2);
};
