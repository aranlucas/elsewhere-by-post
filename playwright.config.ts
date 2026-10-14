import { defineConfig } from "@playwright/test";

const port = 4187;

// Browser tests drive the production build through `vite preview`, which serves
// it from the Workers runtime with the same headers and service worker that ship.
// `pnpm test:e2e` builds first.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: process.env.CI !== undefined,
  workers: 1,
  timeout: 45000,
  reporter: [["list"], ["json", { outputFile: "evidence/browser-results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.PLAY_BROWSER_CHANNEL ?? "chrome",
    headless: true,
    viewport: { width: 1280, height: 1000 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 30000,
  },
});
