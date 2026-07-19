import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

test("[pdf.open] renders the sample PDF", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "PDF Viewer");
  await waitForWindow(page, "PDF Viewer");

  const canvas = getWindowByTitle(page, "PDF Viewer").locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((element) => element.width)).toBeGreaterThan(100);
  await expect.poll(() => canvas.evaluate((element) => element.height)).toBeGreaterThan(100);
});
