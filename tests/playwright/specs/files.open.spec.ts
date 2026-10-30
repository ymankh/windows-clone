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

test("[files.open.pdf] routes PDF file data to the PDF viewer", async ({ page }) => {
  const files = getWindowByTitle(page, "Files");
  await files.getByText("Reports", { exact: true }).click();
  await files.getByRole("button", { name: /Q1-Report\.pdf/ }).dblclick();

  const pdfViewer = getWindowByTitle(page, "PDF Viewer");
  await expect(pdfViewer).toBeVisible();
  const renderedPage = pdfViewer.locator("canvas").first();
  await expect(renderedPage).toBeVisible();
  await expect.poll(() => renderedPage.evaluate((canvas) => canvas.width)).toBeGreaterThan(100);
  await expect.poll(() => renderedPage.evaluate((canvas) => canvas.height)).toBeGreaterThan(100);
});

test("[files.open.image] routes image file data to Photos", async ({ page }) => {
  const files = getWindowByTitle(page, "Files");
  await files.getByText("Photos", { exact: true }).click();
  await files.getByRole("button", { name: /Wallpaper\.png/ }).dblclick();

  const photos = getWindowByTitle(page, "Photos");
  await expect(photos).toBeVisible();
  const image = photos.getByRole("img", { name: "Wallpaper" });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", "/wallpaper.jpg");
});

test("[files.open.fallback] reports an unsupported file type", async ({ page }) => {
  await getWindowByTitle(page, "Files")
    .getByRole("button", { name: /Project-Proposal\.docx/ })
    .dblclick();
  await expect(page.getByRole("alert")).toContainText("No installed app can open");
});
