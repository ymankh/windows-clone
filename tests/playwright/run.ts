import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getImplementedTests, getTestById, testRegistry } from "./registry";

const args = process.argv.slice(2);
const port = Number(process.env.APP_PORT ?? "4175");
const host = process.env.APP_HOST ?? "127.0.0.1";
const baseURL = process.env.APP_URL ?? `http://${host}:${port}`;
const playwrightCli = fileURLToPath(
  new URL("../../node_modules/@playwright/test/cli.js", import.meta.url)
);
const viteCli = fileURLToPath(
  new URL("../../node_modules/vite/bin/vite.js", import.meta.url)
);

const getArgValue = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const hasFlag = (flag: string) => args.includes(flag);

const requestedTestId =
  getArgValue("--test") ??
  args.find((arg) => !arg.startsWith("--"));

const printUsage = () => {
  console.log("Usage:");
  console.log("  npm run test:e2e -- --list");
  console.log("  npm run test:e2e -- --test window.drag");
  console.log("  npm run test:e2e -- window.drag");
  console.log("  npm run test:e2e -- --all");
};

const printRegistry = () => {
  for (const testCase of testRegistry) {
    console.log(
      `${testCase.id} [${testCase.status}] - ${testCase.feature}: ${testCase.title}`
    );
  }
};

if (hasFlag("--list")) {
  printRegistry();
  process.exit(0);
}

if (!requestedTestId) {
  if (!hasFlag("--all")) {
    printUsage();
    process.exit(1);
  }
}

const requestedTest = requestedTestId ? getTestById(requestedTestId) : undefined;

if (requestedTestId && !requestedTest) {
  console.error(`Unknown test "${requestedTestId}".`);
  console.error("");
  printRegistry();
  process.exit(1);
}

if (requestedTest && (requestedTest.status !== "implemented" || !requestedTest.spec)) {
  console.error(`Test "${requestedTestId}" is listed but not implemented yet.`);
  console.error(`Details: ${requestedTest.details}`);
  console.error("");
  console.error("Implemented tests:");
  for (const testCase of getImplementedTests()) {
    console.error(`- ${testCase.id}`);
  }
  process.exit(1);
}

const waitForServer = async () => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
};

let server: ChildProcess | undefined;

try {
  if (!process.env.APP_URL) {
    server = spawn(process.execPath, [viteCli, "--host", host, "--port", String(port)], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForServer();
  }

  const testArgs = [playwrightCli, "test"];
  if (requestedTest?.spec) testArgs.push(requestedTest.spec);
  testArgs.push("--config", "playwright.config.ts");

  const result = spawnSync(process.execPath, testArgs, {
    stdio: "inherit",
    env: { ...process.env, APP_URL: baseURL },
  });

  process.exitCode = result.status ?? 1;
} finally {
  server?.kill();
}
