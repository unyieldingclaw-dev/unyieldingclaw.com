import { devices } from '@playwright/test';
import guidepupPlaywright from '@guidepup/playwright';

const { screenReaderConfig } = guidepupPlaywright;

export default {
  ...screenReaderConfig,
  testDir: './tests/screen-reader',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 15 * 1000 },
  retries: 1,
  workers: 1,
  reporter: [['line']],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.NVDA_BASE_URL || 'http://127.0.0.1:4321',
        headless: false,
      },
    },
  ],
};
