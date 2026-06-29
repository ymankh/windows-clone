import { resolve } from "node:path";
import { startPiAgentBridge } from "./piAgentBridge.ts";

await startPiAgentBridge({
  host: process.env.PI_AGENT_HOST ?? "0.0.0.0",
  staticDir: resolve(process.cwd(), "dist"),
});
