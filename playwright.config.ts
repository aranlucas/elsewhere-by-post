import { defineConfig } from "@playwright/test";

const port = 4187;

// Browser tests drive the production build through `vite preview`, which serves
// it from the Workers runtime with the same headers and service worker that ship.
// `npm run test:browser` builds first.
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
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
  webServer: {
    command: `vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 30000,
  },
});
