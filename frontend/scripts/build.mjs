import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const apiBaseUrl = process.env.API_BASE_URL ?? '/api';

if (!/^https?:\/\//.test(apiBaseUrl) && !/^\/[^/]/.test(apiBaseUrl)) {
  console.error('API_BASE_URL must be an absolute HTTP(S) URL or a root-relative URL.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const ngScript = require.resolve('@angular/cli/bin/ng.js');

const result = spawnSync(
  process.execPath,
  [ngScript, 'build', '--define', `API_BASE_URL=${JSON.stringify(apiBaseUrl)}`],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
