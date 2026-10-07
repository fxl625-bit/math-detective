/* Math Detective offline shell. Cache names are versioned and app scoped. */
const CACHE_NAME = 'math-detective-shell-v1';
const CACHE_PREFIX = 'math-detective-shell-';
const CORE_DOCUMENTS = ['/', '/play', '/parent-report'];
const OFFLINE_DOCUMENT = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线学习</title><body style="font-family:system-ui,sans-serif;padding:2rem;color:#243047"><h1>当前页面尚未缓存</h1><p>请联网打开首页或学习页，并在家长页选择“准备离线学习”。已缓存的课程仍可继续。</p><a href="/">返回首页</a></body></html>';

self.addEventListener('install', () => {
  // Do not skipWaiting: an update should wait until the active course is safe.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function ownedStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return false;
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|webp|svg|ico)$/i.test(url.pathname);
}

function referencedAssets(html, base) {
  const found = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(match[1], base);
      if (ownedStaticAsset(url)) found.add(url.href);
    } catch { /* Ignore malformed or external references. */ }
  }
  return found;
}

function cssReferencedAssets(css, base) {
  const found = new Set();
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) continue;
    try {
      const url = new URL(raw, base);
      if (ownedStaticAsset(url)) found.add(url.href);
    } catch { /* Ignore malformed or external references. */ }
  }
  return found;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Cache full document navigations only. RSC, data, API and other Next requests stay network-only.
  if (request.mode === 'navigate' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_next/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic' && (response.headers.get('content-type') || '').includes('text/html')) {
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(url.pathname);
        if (cached) return cached;
        return new Response(OFFLINE_DOCUMENT, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  if (ownedStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PREPARE_OFFLINE') return;
  const source = event.source;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const documents = await Promise.all(CORE_DOCUMENTS.map(async (path) => {
        const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
        if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error(`页面不可缓存：${path}`);
        const html = await response.clone().text();
        await cache.put(path, response);
        return { path, html };
      }));
      const pending = new Set(documents.flatMap(({ path, html }) => [...referencedAssets(html, new URL(path, self.location.origin))]));
      const visited = new Set();
      while (pending.size) {
        const batch = [...pending].filter((asset) => !visited.has(asset));
        if (!batch.length) break;
        batch.forEach((asset) => visited.add(asset));
        const fetched = await Promise.all(batch.map(async (asset) => {
          const response = await fetch(asset, { credentials: 'same-origin' });
          if (!response.ok || response.type !== 'basic') throw new Error(`静态资源不可缓存：${asset}`);
          await cache.put(asset, response.clone());
          const contentType = response.headers.get('content-type') || '';
          return contentType.includes('text/css') ? { asset, css: await response.text() } : null;
        }));
        for (const item of fetched) {
          if (!item) continue;
          for (const asset of cssReferencedAssets(item.css, item.asset)) if (!visited.has(asset)) pending.add(asset);
        }
      }
      source?.postMessage({ type: 'OFFLINE_PREPARE_DONE', message: `首页、学习页、家长页及 ${visited.size} 项同源脚本/样式/字体资源已缓存。` });
    } catch {
      source?.postMessage({ type: 'OFFLINE_PREPARE_FAILED', message: '部分核心页面无法缓存。请联网访问首页、学习页后重试。' });
    }
  })());
});
