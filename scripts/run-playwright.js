const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPLICIT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const DEFAULT_PORT = process.env.PORT || '3000';
const BASE_URL = EXPLICIT_BASE_URL || `http://localhost:${DEFAULT_PORT}`;
const args = process.argv.slice(2);

function parseBaseURL(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`PLAYWRIGHT_BASE_URL must be a valid http(s) URL: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('PLAYWRIGHT_BASE_URL must use http(s) and must not contain credentials');
  }
  return url;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probe(url) {
  const target = new URL(url);
  const client = target.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = client.get(target, (res) => {
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
  const target = parseBaseURL(BASE_URL);
  if (EXPLICIT_BASE_URL) {
    if (!(await probe(BASE_URL))) {
      throw new Error(`No server responding at PLAYWRIGHT_BASE_URL ${BASE_URL}; refusing to start a server or fall back to another port`);
    }
    console.log(`[playwright-source] Using explicit target ${target.origin}`);
    await run(process.execPath, [
      'node_modules/playwright/cli.js',
      'test',
      '--config=playwright.no-server.config.ts',
      ...args,
    ], {
      env: { PLAYWRIGHT_BASE_URL: BASE_URL },
    });
    return;
  }

  const PORT = target.port || DEFAULT_PORT;
  if (await probe(BASE_URL)) {
    throw new Error(`A server is already responding at the default target ${BASE_URL}; set PLAYWRIGHT_BASE_URL to opt into it explicitly`);
  }
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
    console.log(`[playwright-source] Started local Next dev server at ${target.origin}`);
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
