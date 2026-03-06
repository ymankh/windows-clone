import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dragWindowBy, getWindowByTitle, waitForWindow } from "../helpers/window";

test("[window.drag] drags a window from the title bar", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");

  const window = getWindowByTitle(page, "Notes");
  const before = await window.boundingBox();

  expect(before).not.toBeNull();

  await dragWindowBy(page, "Notes", { x: 180, y: 120 });
  await page.waitForTimeout(250);

  const after = await window.boundingBox();

  expect(after).not.toBeNull();

  const movedX = Math.abs((after?.x ?? 0) - (before?.x ?? 0));
  const movedY = Math.abs((after?.y ?? 0) - (before?.y ?? 0));

  expect(Math.max(movedX, movedY)).toBeGreaterThan(10);
});
