import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

test.beforeEach(async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Files");
  await waitForWindow(page, "Files");
});

test("[files.open.notes] opens an associated note file", async ({ page }) => {
  await getWindowByTitle(page, "Files").getByRole("button", { name: /Notes\.md/ }).dblclick();
  await expect(getWindowByTitle(page, "Notes")).toBeVisible();
});

test("[files.open.fallback] reports an unsupported file type", async ({ page }) => {
  await getWindowByTitle(page, "Files")
    .getByRole("button", { name: /Project-Proposal\.docx/ })
    .dblclick();
  await expect(page.getByRole("alert")).toContainText("No installed app can open");
});
