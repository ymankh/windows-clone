import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

test("[taskbar.window.toggle] minimizes and restores the active window", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");

  const dialog = getWindowByTitle(page, "Notes");
  const taskbarButton = page.locator("div.fixed.bottom-0").getByRole("button", { name: "Notes" });
  await taskbarButton.click();
  await expect(dialog).toBeHidden();
  await taskbarButton.click();
  await expect(dialog).toBeVisible();
});

test("[window.close] removes the window and its taskbar entry", async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  const dialog = getWindowByTitle(page, "Notes");
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(
    page.locator("div.fixed.bottom-0").getByRole("button", { name: "Notes" })
  ).toHaveCount(0);
});
