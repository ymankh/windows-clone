import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";
import { getWindowByTitle, waitForWindow } from "../helpers/window";

test.beforeEach(async ({ page }) => {
  await openDesktop(page);
  await openDesktopApp(page, "Notes");
  await waitForWindow(page, "Notes");
});

test("[notes.file.open] opens a regular Markdown file", async ({ page }) => {
  await page.locator('input[id="notes-md-input-notes"]').setInputFiles({
    name: "example.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Imported note\n\nPlain Markdown content"),
  });

  await expect(getWindowByTitle(page, "Notes").getByText("# Imported note")).toBeVisible();
  await expect(getWindowByTitle(page, "Notes").getByText("Plain Markdown content")).toBeVisible();
});

test("[notes.file.save-markdown] downloads text instead of Lexical JSON", async ({ page }) => {
  const editor = getWindowByTitle(page, "Notes").locator('[contenteditable="true"]');
  await editor.click();
  await page.keyboard.type("Download me");

  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("notes-file-command", {
        detail: { action: "save-md", windowId: "notes" },
      })
    );
  });
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));

  expect(Buffer.concat(chunks).toString("utf8")).toBe("Download me");
  expect(download.suggestedFilename()).toBe("note.md");
});
