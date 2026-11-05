import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const pythonCandidates = process.platform === 'win32'
  ? ['../backend/.venv/Scripts/python.exe', '../.venv/Scripts/python.exe']
  : ['../backend/.venv/bin/python', '../.venv/bin/python'];
const python = process.env.PYTHON ?? pythonCandidates
  .map((candidate) => path.resolve(candidate))
  .find((candidate) => existsSync(candidate)) ?? 'python3';

export default defineConfig({
  testDir: './e2e',
  outputDir: './tmp/playwright-results',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:14200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `${python} -m uvicorn integration_test_server:app --host 127.0.0.1 --port 18000`,
      cwd: '../backend',
      url: 'http://127.0.0.1:18000/docs',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        AUTH_TOKEN_SECRET: 'local-playwright-only-signing-secret',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/beli_frontend_integration',
      },
    },
    {
      command: 'node e2e/serve-built.mjs',
      url: 'http://127.0.0.1:14200/login',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
