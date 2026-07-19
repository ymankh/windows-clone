import { expect, test, type Page } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

const readBounds = async (page: Page) => {
  const bounds = await getWindowByTitle(page, "Notes").boundingBox();
  if (!bounds) throw new Error("Notes window has no rendered bounds");
  return bounds;
};

const readStoredBounds = (page: Page) =>
  page.evaluate(() => {
    const windowState = window.__windowsManagerStore
      ?.getState()
      .windows.find((entry) => entry.title === "Notes");
    if (!windowState) throw new Error("Notes window has no stored bounds");
    return {
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
    };
  });

test("[window.keyboard.move-resize] moves and resizes the focused window with the keyboard", async ({
  page,
}) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");

  const dialog = getWindowByTitle(page, "Notes");
  await expect(dialog).toBeFocused();
  await expect
    .poll(async () => {
      const [rendered, stored] = await Promise.all([readBounds(page), readStoredBounds(page)]);
      return Math.max(
        Math.abs(rendered.x - stored.x),
        Math.abs(rendered.y - stored.y),
        Math.abs(rendered.width - stored.width),
        Math.abs(rendered.height - stored.height)
      );
    })
    .toBeLessThan(1);
  const initial = await readStoredBounds(page);

  await page.keyboard.press("Alt+Shift+ArrowRight");
  await expect.poll(async () => (await readStoredBounds(page)).x).toBe(initial.x + 50);

  const moved = await readStoredBounds(page);
  await page.keyboard.press("Control+Alt+ArrowRight");
  await page.keyboard.press("Control+Alt+ArrowDown");

  await expect.poll(async () => (await readStoredBounds(page)).width).toBe(moved.width + 10);
  await expect.poll(async () => (await readStoredBounds(page)).height).toBe(moved.height + 10);
  await expect(dialog).toBeFocused();
});
