'use client';

import { useEffect, useRef, useState } from 'react';

type WorkerMessage = { type?: string; message?: string };

export default function OfflineSupport({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [waitingUpdate, setWaitingUpdate] = useState(false);
  const preparationTimer = useRef<number | null>(null);
  const preparationPending = useRef(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const secure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure || !('serviceWorker' in navigator)) {
      setNotice('此浏览器或连接环境不支持离线缓存；联网使用仍可继续。');
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }

    let active = true;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(async (registration) => {
      if (!active) return;
      setReady(true);
      setWaitingUpdate(!!registration.waiting);
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 4000);
          navigator.serviceWorker.addEventListener('controllerchange', () => { window.clearTimeout(timer); resolve(); }, { once: true });
        });
      }
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) setWaitingUpdate(true);
        });
      });
      void registration.update().catch(() => undefined);
    }).catch(() => {
      if (active) setNotice('离线支持无法启动。请联网使用，学习数据仍保存在本机。');
    });

    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data?.type === 'OFFLINE_PREPARE_DONE') {
        preparationPending.current = false;
        if (preparationTimer.current !== null) window.clearTimeout(preparationTimer.current);
        setBusy(false);
        setNotice(event.data.message || '离线准备完成。');
      } else if (event.data?.type === 'OFFLINE_PREPARE_FAILED') {
        preparationPending.current = false;
        if (preparationTimer.current !== null) window.clearTimeout(preparationTimer.current);
        setBusy(false);
        setNotice(event.data.message || '离线准备失败，请联网后重试。');
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      active = false;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  async function prepareOffline() {
    setNotice('');
    setBusy(true);
    preparationPending.current = true;
    try {
      const registration = await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller || registration.active;
      if (!worker) throw new Error('Service Worker 尚未就绪，请稍后重试。');
      worker.postMessage({ type: 'PREPARE_OFFLINE' });
      preparationTimer.current = window.setTimeout(() => {
        if (!preparationPending.current) return;
        preparationPending.current = false;
        setBusy(false);
        setNotice('离线准备超时，请联网检查页面资源后重试。');
      }, 30000);
    } catch (cause) {
      preparationPending.current = false;
      if (preparationTimer.current !== null) window.clearTimeout(preparationTimer.current);
      setBusy(false);
      setNotice(cause instanceof Error ? cause.message : '离线准备失败，请联网后重试。');
    }
  }

  if (compact) {
    return (
      <aside aria-label="离线状态" className="mx-auto flex w-full max-w-6xl justify-end px-4 py-1 text-xs font-semibold text-stone-700">
        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
        {online ? '联网中' : '离线'}{!ready && !notice ? ' · 检查缓存' : ''}
        {notice && <span className="ml-1 font-normal">· {notice}</span>}
        {waitingUpdate && <span className="ml-1 font-normal">· 有更新，完成本课后关闭全部页面再打开</span>}
      </aside>
    );
  }

  return (
    <section aria-label="离线学习支持" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800">离线学习：{online ? '当前联网' : '当前离线'}</p>
          <p className="mt-1 text-sm text-slate-600">联网时准备首页、学习页与已访问的静态资源；首次访问或未缓存页面仍需网络。</p>
        </div>
        <button type="button" disabled={!ready || busy || !online} onClick={() => void prepareOffline()} className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? '正在准备…' : '准备离线学习'}</button>
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-slate-700">{notice}</p>}
      {waitingUpdate && <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">有可用更新。请先完成当前课程，再关闭本应用所有页面并重新打开，以应用更新。</p>}
      {!ready && !notice && <p className="mt-2 text-xs text-slate-500">正在检查离线支持…</p>}
    </section>
  );
}
