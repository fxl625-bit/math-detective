const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;
const args = process.argv.slice(2);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probe(url)) return;
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...options.env },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`));
    });
  });
}

async function main() {
  const server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--port', PORT],
    {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    }
  );

  try {
    await waitForServer(BASE_URL, 180000);
    await run(process.execPath, [
      'node_modules/playwright/cli.js',
      'test',
      '--config=playwright.no-server.config.ts',
      ...args,
    ], {
      env: { PLAYWRIGHT_BASE_URL: BASE_URL },
    });
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM');
      await wait(500);
      if (!server.killed) server.kill('SIGKILL');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
