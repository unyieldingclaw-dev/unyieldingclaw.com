import { devices } from '@playwright/test';
import guidepupPlaywright from '@guidepup/playwright';

const { withGuidepup } = guidepupPlaywright;

export default withGuidepup({
  testDir: './tests/screen-reader',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 15 * 1000 },
  retries: 1,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: process.env.NVDA_BASE_URL || 'http://127.0.0.1:4321',
    ...devices['Desktop Chrome'],
  },
});
