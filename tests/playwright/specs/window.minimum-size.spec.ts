import { expect, test } from "@playwright/test";
import { openDesktop, openDesktopApp } from "../helpers/desktop";

const appMinimums = {
  browser: { title: "Browser", width: 480, height: 320 },
  notes: { title: "Notes", width: 360, height: 280 },
  music: { title: "Music", width: 420, height: 300 },
  photos: { title: "Photos", width: 400, height: 300 },
  files: { title: "Files", width: 560, height: 360 },
  terminal: { title: "Terminal", width: 420, height: 280 },
  pdf: { title: "PDF Viewer", width: 480, height: 360 },
} as const;

test("[window.minimum-size] clamps every app above zero-sized bounds", async ({ page }) => {
  await openDesktop(page);
  for (const app of Object.values(appMinimums)) {
    await openDesktopApp(page, app.title);
  }

  const bounds = await page.evaluate(() => {
    const store = window.__windowsManagerStore;
    if (!store) throw new Error("Missing dev window store");
    for (const windowState of store.getState().windows) {
      store.getState().updateWindowBounds(windowState.id, { width: 0, height: 0 });
    }
    return Object.fromEntries(
      store.getState().windows.map((windowState) => [
        windowState.id,
        {
          width: windowState.width,
          height: windowState.height,
          minWidth: windowState.minWidth,
          minHeight: windowState.minHeight,
        },
      ])
    );
  });

  for (const [id, minimum] of Object.entries(appMinimums)) {
    expect(bounds[id]).toEqual({
      width: minimum.width,
      height: minimum.height,
      minWidth: minimum.width,
      minHeight: minimum.height,
    });
  }
});
