import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  timeout: 45000, reporter: [['list'], ['json', { outputFile: 'evidence/browser-results.json' }]],
  use: { baseURL: process.env.PLAY_DIST ? 'http://127.0.0.1:4187' : 'http://127.0.0.1:4177', channel: process.env.PLAY_BROWSER_CHANNEL || 'chrome', headless: true, viewport: { width: 1280, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: `node scripts/server.mjs${process.env.PLAY_DIST ? ' --dist' : ''}`, env: { PORT: process.env.PLAY_DIST ? '4187' : '4177' }, url: process.env.PLAY_DIST ? 'http://127.0.0.1:4187' : 'http://127.0.0.1:4177', reuseExistingServer: !process.env.CI, timeout: 10000 },
});
