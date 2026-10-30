import { expect, test, type Page } from "@playwright/test";
import { openDesktop } from "../helpers/desktop";
import { getWindowByTitle } from "../helpers/window";

const openPersonalization = async (page: Page) => {
  const desktopSurface = page.locator("div.flex.min-h-screen.w-full.flex-wrap");
  await desktopSurface.click({ button: "right", position: { x: 1000, y: 600 } });
  await page.getByRole("menuitem", { name: "Personalization" }).click();
  const dialog = getWindowByTitle(page, "Personalization");
  await expect(dialog).toBeVisible();
  return dialog;
};

test.beforeEach(async ({ page }) => {
  await openDesktop(page);
});

test("[desktop.context.personalization] opens Personalization from the desktop menu", async ({
  page,
}) => {
  await openPersonalization(page);
});

test("[personalization.theme.change] applies and persists a selected theme", async ({ page }) => {
  const dialog = await openPersonalization(page);
  const initialPrimary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary")
  );

  await dialog.getByRole("button", { name: /Linen Citrus/ }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--primary")
      )
    )
    .not.toBe(initialPrimary);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("desktop-theme") ?? "null")?.themeId)
    )
    .toBe("linen-citrus");
});

test("[personalization.background.change] applies and persists a selected background", async ({
  page,
}) => {
  const dialog = await openPersonalization(page);
  const backgroundButton = dialog.getByRole("button", { name: /Bedroom-Simplicity/ });

  await backgroundButton.click();

  await expect(backgroundButton).toContainText("Active");
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--desktop-background-image")
      )
    )
    .toContain("BlIhVfXbi9s");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("desktop-theme") ?? "null")?.backgroundUrl
      )
    )
    .toContain("BlIhVfXbi9s");
});
