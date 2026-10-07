'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { getParentPasswordStatus, PARENT_PASSWORD_STORAGE_KEY } from '@/lib/parentPassword';

const SESSION_MS = 5 * 60 * 1000;
let expiresAt = 0;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
let browserEventsInstalled = false;
let observedPathname: string | null = null;

function notify() { listeners.forEach(listener => listener()); }
function clearTimer() { if (expiryTimer) clearTimeout(expiryTimer); expiryTimer = undefined; }
function expireIfNeeded() {
  if (expiresAt > 0) isParentAccessGranted();
}
function installBrowserEvents() {
  if (browserEventsInstalled || typeof window === 'undefined') return;
  browserEventsInstalled = true;
  window.addEventListener('pagehide', clearParentAccess);
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === PARENT_PASSWORD_STORAGE_KEY) clearParentAccess();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearParentAccess(); });
}

export function grantParentAccess(): void {
  clearTimer();
  expiresAt = Date.now() + SESSION_MS;
  expiryTimer = setTimeout(clearParentAccess, SESSION_MS);
  notify();
}

export function clearParentAccess(): void {
  const changed = expiresAt !== 0;
  expiresAt = 0;
  clearTimer();
  if (changed) notify();
}

export function isParentAccessGranted(): boolean {
  if (expiresAt > 0 && expiresAt <= Date.now()) {
    clearParentAccess();
    return false;
  }
  if (expiresAt <= Date.now()) return false;
  try {
    if (getParentPasswordStatus(window.localStorage) !== 'configured') {
      clearParentAccess();
      return false;
    }
    return true;
  } catch {
    clearParentAccess();
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  installBrowserEvents();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearParentAccess();
  };
}

function getSnapshot(): boolean {
  return expiresAt > Date.now();
}

export function useParentAccess(): boolean {
  const pathname = usePathname();
  useEffect(() => {
    const interval = setInterval(expireIfNeeded, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (observedPathname === null) observedPathname = pathname;
    else if (observedPathname !== pathname) {
      observedPathname = pathname;
      clearParentAccess();
    }
  }, [pathname]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
