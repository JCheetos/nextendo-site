import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Two webServers:
  //   - mock-account: the in-memory Go-account mock on port 8080
  //     (scripts/mock-account-server.mjs).
  //   - next-dev:     the Next.js dev server on port 3000, started with
  //     NEXTENDO_ACCOUNT_BASE_URL pointing at the mock so the front-end's
  //     /api/* requests are proxied via next.config.ts → rewrites() to
  //     the mock. The browser still sees everything as same-origin
  //     (localhost:3000), so HttpOnly cookies set by the mock flow back
  //     to subsequent fetches.
  webServer: [
    {
      name: 'mock-account',
      command: 'node scripts/mock-account-server.mjs --port 8080',
      url: 'http://localhost:8080/api/site-config',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'next-dev',
      command: 'pnpm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXTENDO_ACCOUNT_BASE_URL: 'http://localhost:8080',
      },
    },
  ],
})
