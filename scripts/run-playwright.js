const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPLICIT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const BASE_URL = EXPLICIT_BASE_URL || 'http://127.0.0.1:3100';
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
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs, child) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js production server exited early with code ${child.exitCode}`);
    }
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
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code ?? signal}`));
    });
  });
}

function startProductionServer(url) {
  const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  return spawn(process.execPath, [nextBin, 'start', '--hostname', url.hostname, '--port', url.port || '80'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, PORT: url.port || '80', HOSTNAME: url.hostname },
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    wait(5000),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

async function main() {
  const target = parseBaseURL(BASE_URL);
  if (EXPLICIT_BASE_URL) {
    if (!(await probe(BASE_URL))) {
      throw new Error(`No server responding at PLAYWRIGHT_BASE_URL ${BASE_URL}; refusing to start a server or fall back to another target`);
    }
    console.log(`[playwright-source] Using explicit target ${BASE_URL}`);
    await run(process.execPath, [
      path.join(ROOT, 'node_modules', 'playwright', 'cli.js'),
      'test',
      '--config=playwright.no-server.config.ts',
      ...args,
    ], { env: { PLAYWRIGHT_BASE_URL: BASE_URL } });
    return;
  }

  if (await probe(BASE_URL)) {
    throw new Error(`A server is already responding at the local target ${BASE_URL}; refusing to test an unknown or stale service`);
  }

  await run(process.execPath, [path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--webpack'], {
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  });
  await run(process.execPath, [path.join(ROOT, 'scripts', 'postbuild-css.js')]);

  const server = startProductionServer(target);
  try {
    await waitForServer(BASE_URL, 180000, server);
    console.log(`[playwright-source] Built and started local Next.js production server at ${BASE_URL}`);
    await run(process.execPath, [
      path.join(ROOT, 'node_modules', 'playwright', 'cli.js'),
      'test',
      '--config=playwright.no-server.config.ts',
      ...args,
    ], { env: { PLAYWRIGHT_BASE_URL: BASE_URL } });
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
