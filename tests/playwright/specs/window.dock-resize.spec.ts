import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dockWindow, getWindowByTitle, waitForWindow } from "../helpers/window";

test("[window.dock-resize] resizes a real snapped pair with the shared divider", async ({
  page,
}) => {
  await openDesktop(page);
  await openDesktopApp(page, "Browser");
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await waitForWindow(page, "Browser");

  await dockWindow(page, "Notes", "left");
  await dockWindow(page, "Browser", "right");

  const notesWindow = getWindowByTitle(page, "Notes");
  const browserWindow = getWindowByTitle(page, "Browser");
  const divider = page.getByTestId("window-split-divider");
  await expect(divider).toBeVisible();

  const beforeLeft = await notesWindow.boundingBox();
  const beforeRight = await browserWindow.boundingBox();
  const dividerBox = await divider.boundingBox();
  expect(beforeLeft).not.toBeNull();
  expect(beforeRight).not.toBeNull();
  expect(dividerBox).not.toBeNull();

  const startX = (dividerBox?.x ?? 0) + (dividerBox?.width ?? 0) / 2;
  const startY = (dividerBox?.y ?? 0) + 80;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 140, startY, { steps: 16 });
  await page.mouse.up();

  await expect.poll(async () => (await notesWindow.boundingBox())?.width ?? 0).toBeGreaterThan(
    (beforeLeft?.width ?? 0) + 60
  );
  const afterLeft = await notesWindow.boundingBox();
  const afterRight = await browserWindow.boundingBox();
  expect((afterRight?.width ?? 0) - (beforeRight?.width ?? 0)).toBeLessThan(-60);
  expect(Math.abs((afterLeft?.x ?? 0) + (afterLeft?.width ?? 0) - (afterRight?.x ?? 0))).toBeLessThan(2);
});
