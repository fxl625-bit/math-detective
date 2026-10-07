'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import {
  changeParentPassword, getParentPasswordStatus, PARENT_PASSWORD_MAX_LENGTH, PARENT_PASSWORD_MIN_LENGTH, PARENT_PASSWORD_STORAGE_KEY,
  setupParentPassword, verifyParentPassword, type ParentPasswordStatus,
} from '@/lib/parentPassword';

type Props = {
  mode?: 'gate' | 'change';
  onSuccess?: () => void;
  onCancel?: () => void;
};

function getStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export default function ParentPasswordGate({ mode = 'gate', onSuccess, onCancel }: Props) {
  const [status, setStatus] = useState<ParentPasswordStatus>('unavailable');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const active = useRef(false);
  const pendingEpoch = useRef(0);
  const pathname = usePathname();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    active.current = true;
    const invalidatePending = () => { pendingEpoch.current += 1; };
    const invalidateWhenHidden = () => { if (document.hidden) invalidatePending(); };
    window.addEventListener('pagehide', invalidatePending);
    document.addEventListener('visibilitychange', invalidateWhenHidden);
    const refresh = () => {
      setNow(Date.now());
      const storage = getStorage();
      setStatus(storage ? getParentPasswordStatus(storage) : 'unavailable');
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => {
      active.current = false; invalidatePending(); window.clearInterval(timer);
      window.removeEventListener('pagehide', invalidatePending);
      document.removeEventListener('visibilitychange', invalidateWhenHidden);
    };
  }, []);
  useEffect(() => { pendingEpoch.current += 1; }, [pathname]);

  function clearMessage() { setMessage(''); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || busy) return;
    submitting.current = true;
    const submitEpoch = pendingEpoch.current;
    const submitPath = pathname;
    setBusy(true);
    setMessage('');
    try {
      const storage = getStorage();
      if (!storage) { setStatus('unavailable'); setMessage('浏览器密码存储不可用，家长区已锁定。'); return; }
      let result;
      if (mode === 'change') {
        result = await changeParentPassword(currentPassword, password, confirmation, storage);
      } else if (status === 'unconfigured') {
        result = await setupParentPassword(password, confirmation, storage);
      } else {
        result = await verifyParentPassword(password, storage);
      }
      if (!active.current || submitEpoch !== pendingEpoch.current || document.hidden || window.location.pathname !== submitPath) return;
      const refreshedStatus = getParentPasswordStatus(storage);
      setStatus(refreshedStatus);
      if (result === 'success') {
        if (refreshedStatus !== 'configured') {
          setStatus('unavailable'); setMessage('密码状态无法安全确认，家长区仍保持锁定。'); return;
        }
        setPassword(''); setConfirmation(''); setCurrentPassword('');
        if (mode === 'change') {
          setMessage('密码已更新，请使用新密码重新进入家长区。');
          onSuccess?.();
        } else onSuccess?.();
      } else if (result === 'wrong') {
        setMessage('密码不正确。'); setPassword('');
      } else if (result === 'locked') {
        setMessage('连续输错 5 次，家长区已锁定 60 秒。'); setPassword('');
      } else if (result === 'invalid') {
        setMessage(password.length < PARENT_PASSWORD_MIN_LENGTH || password.length > PARENT_PASSWORD_MAX_LENGTH
          ? `密码长度需为 ${PARENT_PASSWORD_MIN_LENGTH}–${PARENT_PASSWORD_MAX_LENGTH} 个字符。`
          : '两次输入的密码不一致。');
      } else if (result === 'unconfigured') {
        setStatus('unavailable'); setMessage('密码记录缺失或无效，家长区已锁定，无法自动重置。');
      } else {
        setStatus('unavailable'); setMessage('密码未能安全保存或读取，请检查浏览器存储后重试。');
      }
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  const isSetup = mode === 'gate' && status === 'unconfigured';
  const state = status;
  let lockRemaining = 0;
  if (state === 'locked') {
    const storage = getStorage();
    try {
      const raw = storage?.getItem(PARENT_PASSWORD_STORAGE_KEY);
      const record = raw ? JSON.parse(raw) as { lockedUntil?: number } : null;
      lockRemaining = Math.max(0, Math.ceil(((record?.lockedUntil || now) - now) / 1000));
    } catch { lockRemaining = 0; }
  }

  return <section className="mx-auto max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-5">
    <div className="flex items-center gap-2"><ShieldCheck className="text-blue-800" /><h2 className="font-extrabold text-blue-950">{mode === 'change' ? '修改家长密码' : '家长操作区'}</h2></div>
    <p className="mt-1 text-sm text-slate-700">{mode === 'change'
      ? '修改密码需要先验证当前密码，并确认新密码。'
      : isSetup ? '首次使用请设置家长密码。密码只保存在此浏览器中，刷新或离开页面后需要重新验证。'
        : '请输入家长密码。连续输错 5 次后将锁定 60 秒。'}</p>
    {state === 'unavailable' && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">密码记录无法安全读取。为保护家长区，不能重置或跳过密码。</p>}
    {mode === 'change' && state === 'unconfigured' && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">当前密码记录不可用，无法修改密码。</p>}
    {state === 'locked' && <p role="status" className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">已锁定{lockRemaining > 0 ? `，请等待 ${lockRemaining} 秒` : '，正在检查解锁时间'}。</p>}
    <form onSubmit={event => void submit(event)} className="mt-4 space-y-3">
      {mode === 'change' && <label className="block text-sm font-bold text-slate-800">当前密码<input aria-label="当前密码" type="password" autoComplete="current-password" maxLength={PARENT_PASSWORD_MAX_LENGTH} value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); clearMessage(); }} disabled={busy || state === 'unavailable' || state === 'locked'} required className="mt-1 min-h-12 w-full rounded-xl border border-blue-300 bg-white px-3 text-base" /></label>}
      <label className="block text-sm font-bold text-slate-800">{isSetup || mode === 'change' ? '新密码' : '家长密码'}<input aria-label={isSetup || mode === 'change' ? '新密码' : '家长密码'} type="password" autoComplete={isSetup || mode === 'change' ? 'new-password' : 'current-password'} minLength={PARENT_PASSWORD_MIN_LENGTH} maxLength={PARENT_PASSWORD_MAX_LENGTH} value={password} onChange={event => { setPassword(event.target.value); clearMessage(); }} disabled={busy || state === 'unavailable' || state === 'locked'} required className="mt-1 min-h-12 w-full rounded-xl border border-blue-300 bg-white px-3 text-base" /></label>
      {(isSetup || mode === 'change') && <label className="block text-sm font-bold text-slate-800">确认{mode === 'change' ? '新' : ''}密码<input aria-label={`确认${mode === 'change' ? '新' : ''}密码`} type="password" autoComplete="new-password" minLength={PARENT_PASSWORD_MIN_LENGTH} maxLength={PARENT_PASSWORD_MAX_LENGTH} value={confirmation} onChange={event => { setConfirmation(event.target.value); clearMessage(); }} disabled={busy || state === 'unavailable'} required className="mt-1 min-h-12 w-full rounded-xl border border-blue-300 bg-white px-3 text-base" /></label>}
      {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
      <div className="flex gap-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white font-bold">取消</button>}
        <button type="submit" disabled={busy || state === 'unavailable' || state === 'locked' || (mode === 'gate' && !isSetup && state !== 'configured') || (mode === 'change' && state !== 'configured')} className="min-h-11 flex-1 rounded-xl bg-blue-800 px-4 font-bold text-white disabled:bg-slate-300">{busy ? '正在验证…' : mode === 'change' ? '保存新密码' : isSetup ? '设置密码并继续' : '验证并继续'}</button>
      </div>
    </form>
  </section>;
}
