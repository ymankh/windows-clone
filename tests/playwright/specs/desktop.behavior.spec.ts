import { expect, test, type Page } from "@playwright/test";
import { openDesktop } from "../helpers/desktop";
import { getWindowByTitle } from "../helpers/window";

const desktopIcons = (page: Page) => page.locator("button[data-desktop-icon-id]");

const readIconPositions = (page: Page) =>
  desktopIcons(page).evaluateAll((icons) =>
    Object.fromEntries(
      icons.map((icon) => {
        const element = icon as HTMLElement;
        return [
          element.dataset.desktopIconId ?? "",
          { left: Number.parseFloat(element.style.left), top: Number.parseFloat(element.style.top) },
        ];
      })
    )
  );

const expectIconsInsideDesktop = async (page: Page) => {
  const icons = desktopIcons(page);
  await expect(icons).toHaveCount(7);
  const [boxes, taskbarBox] = await Promise.all([
    icons.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      })
    ),
    page.locator("div.fixed.bottom-0").boundingBox(),
  ]);
  expect(taskbarBox).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width);
    expect(box.y + box.height).toBeLessThanOrEqual(taskbarBox!.y);
  }

  const occupiedCells = boxes.map(({ x, y }) => `${Math.round(x)},${Math.round(y)}`);
  expect(new Set(occupiedCells).size).toBe(occupiedCells.length);
};

const openPersonalization = async (page: Page) => {
  const desktopSurface = page.locator("div.flex.min-h-screen.w-full.flex-wrap");
  await desktopSurface.click({ button: "right", position: { x: 1000, y: 600 } });
  await page.getByRole("menuitem", { name: "Personalization" }).click();
  await expect(getWindowByTitle(page, "Personalization")).toBeVisible();
};

test("[desktop.icon.open] opens the selected application", async ({ page }) => {
  await openDesktop(page);

  const notesIcon = page.getByRole("button", { name: "Notes", exact: true }).first();
  await expect(notesIcon).toBeVisible();
  await notesIcon.dispatchEvent("dblclick");

  await expect(getWindowByTitle(page, "Notes")).toBeVisible();
});

test("[desktop.icon.layout] places icons deterministically in unique usable bounds", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.removeItem("desktop-icon-positions"));
  await openDesktop(page);
  await expectIconsInsideDesktop(page);
  const initialPositions = await readIconPositions(page);

  await page.reload({ waitUntil: "domcontentloaded" });

  await expectIconsInsideDesktop(page);
  await expect.poll(() => readIconPositions(page)).toEqual(initialPositions);
});

test("[desktop.icon.drag.group] clamps selected icons as one group", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("desktop-icon-positions"));
  await openDesktop(page);

  const icons = desktopIcons(page);
  const first = icons.nth(0);
  const second = icons.nth(1);
  const firstBox = await first.boundingBox();
  expect(firstBox).not.toBeNull();

  await first.click();
  await second.click({ modifiers: ["Shift"] });
  const before = await readIconPositions(page);
  const firstId = await first.getAttribute("data-desktop-icon-id");
  const secondId = await second.getAttribute("data-desktop-icon-id");
  expect(firstId).not.toBeNull();
  expect(secondId).not.toBeNull();

  await page.mouse.move(
    firstBox!.x + firstBox!.width / 2,
    firstBox!.y + firstBox!.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(2_000, 1_400, { steps: 5 });

  const preview = await readIconPositions(page);
  expect(preview[secondId!].left - preview[firstId!].left).toBe(
    before[secondId!].left - before[firstId!].left
  );
  expect(preview[secondId!].top - preview[firstId!].top).toBe(
    before[secondId!].top - before[firstId!].top
  );
  await expectIconsInsideDesktop(page);

  await page.mouse.up();
  const persisted = await readIconPositions(page);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("desktop-icon-positions") ?? "{}")
  );

  expect(persisted[secondId!].left - persisted[firstId!].left).toBe(
    before[secondId!].left - before[firstId!].left
  );
  expect(persisted[secondId!].top - persisted[firstId!].top).toBe(
    before[secondId!].top - before[firstId!].top
  );
  expect(stored[firstId!]).toEqual({
    x: persisted[firstId!].left,
    y: persisted[firstId!].top,
  });
  expect(stored[secondId!]).toEqual({
    x: persisted[secondId!].left,
    y: persisted[secondId!].top,
  });
});

test("[persistence.malformed] recovers from malformed persisted desktop values", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("desktop-icon-positions", "{not-json");
    localStorage.setItem("desktop-theme", "{not-json");
    localStorage.setItem("desktop-custom-backgrounds", "{not-json");
  });

  await openDesktop(page);
  await expectIconsInsideDesktop(page);
  await openPersonalization(page);

  const personalization = getWindowByTitle(page, "Personalization");
  await expect(personalization.getByRole("button", { name: /Soft Nebula/ })).toContainText(
    "Active"
  );
  await expect(personalization.getByText("Custom image")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--desktop-background-image")
      )
    )
    .toContain("images.unsplash.com/photo-1500530855697-b586d89ba3ee");
  expect(pageErrors).toEqual([]);
});
