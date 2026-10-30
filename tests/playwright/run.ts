import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getImplementedTests, getTestById, testRegistry } from "./registry";

const args = process.argv.slice(2);
const playwrightCli = fileURLToPath(
  new URL("../../node_modules/@playwright/test/cli.js", import.meta.url)
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

const testArgs = [playwrightCli, "test"];
if (requestedTest?.spec) testArgs.push(requestedTest.spec);
testArgs.push("--config", "playwright.config.ts");

const result = spawnSync(process.execPath, testArgs, {
  stdio: "inherit",
  env: process.env,
});

process.exitCode = result.status ?? 1;
