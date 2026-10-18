import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(currentDirectory, '..');
const require = createRequire(import.meta.url);
const browserOutput = path.join(frontendDirectory, 'dist/beli-for-vandy-frontend/browser');
if (process.env.PLAYWRIGHT_REUSE_BUILD !== '1') {
  const angularCli = require.resolve('@angular/cli/bin/ng.js');
  const apiUrl = 'http://127.0.0.1:18000';
  const build = spawnSync(
    process.execPath,
    ['--max-old-space-size=4096', angularCli, 'build', '--configuration', 'development', '--define', `API_BASE_URL=${JSON.stringify(apiUrl)}`],
    { cwd: frontendDirectory, stdio: 'inherit' },
  );

  if (build.status !== 0) process.exit(build.status ?? 1);
} else if (!existsSync(path.join(browserOutput, 'index.html'))) {
  console.error('PLAYWRIGHT_REUSE_BUILD=1 requires an existing Angular browser build.');
  process.exit(1);
}

const express = require('express');
const app = express();
app.use(express.static(browserOutput));
app.use((_request, response) => response.sendFile(path.join(browserOutput, 'index.html')));
app.listen(14200, '127.0.0.1');
