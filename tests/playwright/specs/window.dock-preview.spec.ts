import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dockWindow, getWindowByTitle, getWindowTitlebar, waitForWindow } from "../helpers/window";

test("[window.dock-preview] previews the available side of an existing split", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Browser");
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Browser");
  await waitForWindow(page, "Notes");
  await dockWindow(page, "Browser", "right");

  const browserWindow = getWindowByTitle(page, "Browser");
  const resizeHandle = browserWindow.getByTestId("window-resize-left");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  const resizeX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  const resizeY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
  await page.mouse.move(resizeX, resizeY);
  await page.mouse.down();
  await page.mouse.move(resizeX + 190, resizeY, { steps: 16 });
  await page.mouse.up();

  await expect.poll(async () => (await browserWindow.boundingBox())?.x ?? 0).toBeGreaterThan(700);

  await page.getByRole("button", { name: "Notes", exact: true }).last().click();
  const titlebar = getWindowTitlebar(page, "Notes");
  const box = await titlebar.boundingBox();
  expect(box).not.toBeNull();
  const startX = (box?.x ?? 0) + 80;
  const startY = (box?.y ?? 0) + 16;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(1, startY, { steps: 12 });

  const preview = page.getByTestId("window-dock-preview");
  await expect(preview).toHaveAttribute("data-dock-target", "left");
  const previewBox = await preview.boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(previewBox?.width ?? 0).toBeGreaterThan(viewportWidth * 0.6);
  const browserBounds = await browserWindow.boundingBox();
  expect(Math.abs((previewBox?.x ?? 0) + (previewBox?.width ?? 0) - (browserBounds?.x ?? 0)))
    .toBeLessThan(2);
  await page.mouse.up();
});

test("[window.dock-preview] resets a stale split for the first window in a new pair", async ({
  page,
}) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await page.evaluate(() => window.__windowsManagerStore?.getState().setHorizontalDockSplit(0.72));

  await dockWindow(page, "Notes", "left");

  const bounds = await getWindowByTitle(page, "Notes").boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(Math.abs((bounds?.width ?? 0) - viewportWidth / 2)).toBeLessThan(2);
  const split = await page.evaluate(
    () => window.__windowsManagerStore?.getState().horizontalDockSplit
  );
  expect(split).toBe(0.5);
});
