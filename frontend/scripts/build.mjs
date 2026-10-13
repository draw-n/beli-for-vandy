import { spawnSync } from 'node:child_process';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:8000';

if (!/^https?:\/\//.test(apiBaseUrl)) {
  console.error('API_BASE_URL must be an absolute HTTP(S) URL.');
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'ng.cmd' : 'ng',
  ['build', '--define', `API_BASE_URL=${JSON.stringify(apiBaseUrl)}`],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
