import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_nnrclupgfuaimcrrlydo",
  // Node 22 at least: Modal's JavaScript SDK needs it.
  runtime: "node-22",
  logLevel: "log",
  // Every task waits on an API (Meta Model API, Modal, Supabase): none processes media locally.
  machine: "micro",
  // The whole lesson must finish well within this; each task sets a tighter limit.
  maxDuration: 1200,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
});
