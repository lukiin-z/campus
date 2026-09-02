import { defineConfig, devices } from '@playwright/test';

/**
 * Um único teste E2E: o fluxo "abrir feed → abrir evento → inscrever-se → ver
 * confirmação". A justificativa de ser só um está em docs/11-plano-de-testes.md.
 *
 * O Playwright sobe o preview do build de produção, não o dev server: é o
 * artefato que vai para o GitHub Pages que precisa funcionar.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // O alvo é mobile: 390x844 é o viewport de referência do projeto.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
