import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dockWindow, getWindowByTitle, getWindowTitlebar, waitForWindow } from "../helpers/window";

test("[window.animation] animates minimize before hiding the window", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await page.waitForTimeout(250);

  const notesWindow = getWindowByTitle(page, "Notes");
  const before = await notesWindow.boundingBox();
  await notesWindow.getByRole("button", { name: "Minimize" }).click();
  await page.waitForTimeout(50);

  await expect(notesWindow).toHaveCount(1);
  const opacity = Number(await notesWindow.evaluate((element) => getComputedStyle(element).opacity));
  expect(opacity).toBeLessThan(1);
  const during = await notesWindow.boundingBox();
  expect(during?.width ?? 0).toBeLessThan(before?.width ?? 0);
  await expect(notesWindow).toBeHidden();
});

test("[window.animation] animates maximize and restore bounds", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await page.waitForTimeout(250);

  const notesWindow = getWindowByTitle(page, "Notes");
  const before = await notesWindow.boundingBox();
  await notesWindow.getByRole("button", { name: "Maximize" }).click();
  await page.waitForTimeout(60);
  const maximizing = await notesWindow.boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(maximizing?.width ?? 0).toBeGreaterThan(before?.width ?? 0);
  expect(maximizing?.width ?? 0).toBeLessThan(viewportWidth);

  await expect.poll(async () => (await notesWindow.boundingBox())?.width ?? 0).toBe(viewportWidth);
  await notesWindow.getByRole("button", { name: "Restore" }).click();
  await page.waitForTimeout(60);
  const restoring = await notesWindow.boundingBox();
  expect(restoring?.width ?? 0).toBeLessThan(viewportWidth);
  expect(restoring?.width ?? 0).toBeGreaterThan(before?.width ?? 0);
  await expect.poll(async () => (await notesWindow.boundingBox())?.width ?? 0).toBeCloseTo(
    before?.width ?? 0,
    0
  );
});

test("[window.animation] moves a restored docked window without snap easing", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
  await dockWindow(page, "Notes", "left");

  const titlebar = getWindowTitlebar(page, "Notes");
  const box = await titlebar.boundingBox();
  expect(box).not.toBeNull();
  const startX = (box?.x ?? 0) + 100;
  const startY = (box?.y ?? 0) + 16;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 220, startY + 100);

  const movedBounds = await getWindowByTitle(page, "Notes").boundingBox();
  expect(movedBounds?.x ?? 0).toBeGreaterThan(80);
  expect(movedBounds?.y ?? 0).toBeGreaterThan(40);
  await page.mouse.up();
});
