import { defineConfig } from "@playwright/test";

// E2E smoke suite — locks the demo-critical behaviors so future changes
// can't silently break them. Runs against a dedicated dev server on :3100
// (never fights a dev server already running on :3000) using the system
// Chrome channel — no browser download needed.

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
