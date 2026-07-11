import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { dockWindow, getWindowByTitle, getWindowTitlebar, waitForWindow } from "../helpers/window";

test("[window.animation] animates minimize before hiding the window", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");

  const notesWindow = getWindowByTitle(page, "Notes");
  await notesWindow.getByRole("button", { name: "Minimize" }).click();
  await page.waitForTimeout(50);

  await expect(notesWindow).toHaveCount(1);
  const opacity = Number(await notesWindow.evaluate((element) => getComputedStyle(element).opacity));
  expect(opacity).toBeLessThan(1);
  await expect(notesWindow).toBeHidden();
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
