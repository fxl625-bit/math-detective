/**
 * 应用版本信息 (v2.6.1 新增)
 * 
 * 用于版本检测、自动迁移、家长调试和缓存刷新。
 * NEXT_PUBLIC_ 前缀确保客户端可访问。
 */

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION || '2.7.5';

export const APP_BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME || '';

export const APP_COMMIT_SHA =
  process.env.NEXT_PUBLIC_COMMIT_SHA || '5002500';

/** localStorage 中记录上一次运行版本的键 */
export const LAST_VERSION_KEY = 'math-detective-app-version';

/**
 * 启动时在控制台输出版本信息，方便平板调试。
 */
export function logAppVersion() {
  if (typeof window === 'undefined') return;
  console.info('[Math Detective]', {
    version: APP_VERSION,
    buildTime: APP_BUILD_TIME,
    commit: APP_COMMIT_SHA,
    userAgent: navigator.userAgent.slice(0, 60),
    href: window.location.href,
  });
}

/**
 * 检查是否有 PWA Service Worker，并触发更新。
 */
export async function updateServiceWorkers() {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.update();
      }
    } catch (e) {
      console.warn('[Math Detective] SW update failed:', e);
    }
  }
}

/**
 * 清理旧缓存（Cache Storage + Service Worker），不删除学习数据。
 */
export async function clearOldCachesSafely() {
  if (typeof window === 'undefined') return;

  // 清理 Cache Storage
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.includes('math-detective') ||
              key.includes('workbox') ||
              key.includes('next')
          )
          .map((key) => caches.delete(key))
      );
    } catch (e) {
      console.warn('[Math Detective] Cache clear failed:', e);
    }
  }

  // 更新 Service Worker
  await updateServiceWorkers();
}

/**
 * 刷新到最新版本（清理缓存 + reload）
 */
export async function refreshToLatestVersion() {
  await clearOldCachesSafely();
  window.location.reload();
}

/**
 * 清除页面缓存并刷新（带版本参数避免浏览器缓存）
 */
export async function clearPageCacheAndRefresh() {
  await clearOldCachesSafely();
  const url = new URL(window.location.href);
  url.searchParams.set('v', APP_VERSION);
  url.searchParams.set('t', Date.now().toString());
  window.location.href = url.toString();
}
