import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './frontend/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node --import tsx frontend/e2e/start-api.ts',
      url: 'http://127.0.0.1:3101/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run dev:web -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 30_000,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
    },
  ],
});
