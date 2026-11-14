// Runs the Vite dev server and the App Store backend together (`npm run dev`).
// Extra arguments are passed on to Vite: `npm run dev -- --port 5000`.
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fromRoot = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// The CLIs are started with node directly (no shell, no .cmd shims) so this
// behaves the same on Windows, macOS and Linux.
const start = (name, args, stdin = "inherit") => {
  const child = spawn(process.execPath, args, { stdio: [stdin, "inherit", "inherit"] });
  child.on("error", (error) => console.error(`[dev] Failed to start ${name}:`, error));
  return child;
};

const stop = (child) => {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  if (process.platform === "win32") {
    // `tsx watch` runs the server in a grandchild; /T stops the whole tree.
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
};

// Only Vite gets the keyboard. If both processes read the same input, Vite
// hangs on startup on Windows whenever the input is not a real terminal.
const store = start(
  "the App Store backend",
  [fromRoot("node_modules/tsx/dist/cli.mjs"), "watch", fromRoot("server/index.ts")],
  "ignore"
);
const web = start("Vite", [fromRoot("node_modules/vite/bin/vite.js"), ...process.argv.slice(2)]);

let shuttingDown = false;
const shutdown = (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  stop(store);
  stop(web);
  process.exit(code);
};

// The desktop is usable without the store, so keep Vite running if it stops.
store.on("exit", (code) => {
  if (shuttingDown) return;
  console.error(
    `[dev] The App Store backend stopped (exit code ${code}). The desktop keeps running; ` +
      'the App Store will be unavailable. Run "npm run store:dev" to start it again.'
  );
});

web.on("exit", (code) => shutdown(code ?? 0));

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutdown(0));
}
