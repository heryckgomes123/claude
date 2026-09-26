import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgres://intelra:intelra@localhost:5432/intelra_lab_e2e'
// Chromium pré-instalado no ambiente (use o do Playwright localmente se preferir).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || (process.env.CI ? undefined : '/opt/pw-browsers/chromium')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DB,
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e-00',
      APP_URL: `http://localhost:${PORT}`,
      SIGNUP_DEFAULT_PLAN: '',
    },
  },
})
