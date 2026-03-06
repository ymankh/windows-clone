import { defineConfig } from "@playwright/test";

const port = Number(process.env.APP_PORT ?? "4175");
const host = process.env.APP_HOST ?? "127.0.0.1";
const baseURL = process.env.APP_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/playwright/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.APP_URL
    ? undefined
    : {
        command: `npm run dev -- --host ${host} --port ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
