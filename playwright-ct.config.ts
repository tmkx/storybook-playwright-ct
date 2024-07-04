import { defineConfig } from './node_modules/storybook-playwright-ct/dist';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.stories.spec.{ts,tsx}',
  webServer: {
    command: 'pnpm storybook',
    url: 'http://localhost:6006/',
    reuseExistingServer: true,
    stdout: 'pipe',
  },
});
