import { spawn } from "node:child_process";
import { startPiAgentBridge } from "./piAgentBridge.ts";

const bridge = await startPiAgentBridge();

const vite = spawn("vite", [], {
  env: {
    ...process.env,
    VITE_PI_AGENT_WS_URL: bridge.url,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

const shutdown = async (signal: NodeJS.Signals) => {
  vite.kill(signal);
  await bridge.close();
  process.exit(0);
};

vite.on("exit", async (code) => {
  await bridge.close();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
