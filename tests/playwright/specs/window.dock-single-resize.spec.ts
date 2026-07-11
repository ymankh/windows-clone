import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dockWindow, getWindowByTitle, waitForWindow } from "../helpers/window";

test("[window.dock-single-resize] resizes one actually snapped window", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await dockWindow(page, "Notes", "left");

  const notesWindow = getWindowByTitle(page, "Notes");
  const resizeHandle = notesWindow.getByTestId("window-resize-right");
  await expect(resizeHandle).toBeVisible();
  await expect(page.getByTestId("window-split-divider")).toHaveCount(0);

  const before = await notesWindow.boundingBox();
  const handleBox = await resizeHandle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBox).not.toBeNull();

  const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 140, startY, { steps: 16 });
  await page.mouse.up();

  await expect.poll(async () => (await notesWindow.boundingBox())?.width ?? 0).toBeGreaterThan(
    (before?.width ?? 0) + 60
  );
});
