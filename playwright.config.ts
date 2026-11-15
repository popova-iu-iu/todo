import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4174/', trace: 'off' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'], browserName: 'chromium', serviceWorkers: 'allow' } },
  ],
  webServer: { command: 'npx vite preview --port 4174 --strictPort', port: 4174, reuseExistingServer: true },
});
