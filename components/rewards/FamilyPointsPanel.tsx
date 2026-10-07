'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, Gift, History, Plus, ShieldCheck } from 'lucide-react';
import type { GameState, ParentReward, PointCategory } from '@/lib/types';
import { addParentPoints, getPointsBalance, getPointsLedger, requestReward, resolveRedemption, type ParentPointsInput } from '@/lib/familyPoints';
import DetectiveMascot from '@/components/DetectiveMascot';
import ClaimCelebration from './ClaimCelebration';
import { isParentAccessGranted } from '@/hooks/useParentAccess';

type Props = {
  state: GameState;
  getState: () => GameState;
  commitGameState: (next: GameState) => boolean;
  rewards: ParentReward[];
  parentAuthed: boolean;
};

const categories: { value: PointCategory; label: string }[] = [
  { value: 'chores', label: '家务' }, { value: 'school', label: '学校表扬' },
  { value: 'homework', label: '作业 A+' }, { value: 'other', label: '其他' },
];
const entryNames: Record<string, string> = {
  checkin: '每日签到', perfect_lesson: '核心日课首答全对', parent_grant: '家长记分',
  mistake_review: '错题订正', redemption: '兑换申请', redemption_refund: '取消退款',
};

function actionId(prefix: string) {
  const secureUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  return `${prefix}:${secureUuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export default function FamilyPointsPanel({ state, getState, commitGameState, rewards, parentAuthed }: Props) {
  const [category, setCategory] = useState<PointCategory>('chores');
  const [amount, setAmount] = useState('0.5');
  const [note, setNote] = useState('');
  const [parentActionId, setParentActionId] = useState<string | null>(null);
  const [requestIntent, setRequestIntent] = useState<{ rewardName: string; actionId: string } | null>(null);
  const [confirmReward, setConfirmReward] = useState<ParentReward | null>(null);
  const [confirmFocusId, setConfirmFocusId] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const requestButtons = useRef(new Map<string, HTMLButtonElement>());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState('');
  const [celebration, setCelebration] = useState('');
  const balance = getPointsBalance(state);
  const ledger = useMemo(() => [...getPointsLedger(state)].reverse(), [state.pointsWallet]);
  const redemptions = useMemo(() => [...(state.pointsWallet?.redemptions || [])].reverse(), [state.pointsWallet]);
  const amountValue = Number(amount);
  const amountValid = /^\d+(?:\.5)?$/.test(amount) && amountValue > 0 && amountValue <= 1000;

  useEffect(() => {
    if (!confirmReward) return;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('button:not([disabled])');
    first?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmReward(null);
        requestAnimationFrame(() => requestButtons.current.get(confirmFocusId)?.focus());
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmReward, confirmFocusId]);

  function closeConfirm() {
    const id = confirmFocusId;
    setConfirmReward(null);
    requestAnimationFrame(() => requestButtons.current.get(id)?.focus());
  }

  function saveTransaction(result: { state: GameState; ok: boolean; message: string; pointsDelta: number }, successMessage?: string) {
    if (!result.ok) { setMessage(result.message); return false; }
    if (!commitGameState(result.state)) { setMessage('保存没有成功。请保持本次内容不变，再试一次。'); return false; }
    setMessage(successMessage || result.message);
    return true;
  }

  function grantPoints() {
    if (!parentAuthed || !isParentAccessGranted() || busyRef.current || !amountValid) return;
    busyRef.current = true;
    setBusy(true);
    const id = parentActionId || actionId('parent-points');
    setParentActionId(id);
    const input: ParentPointsInput = { actionId: id, amount: amountValue, category, note: note.trim() };
    const result = addParentPoints(getState(), input);
    if (saveTransaction(result)) {
      setParentActionId(null); setAmount('0.5'); setNote('');
    }
    busyRef.current = false;
    setBusy(false);
  }

  function makeRequest() {
    if (!confirmReward || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const intent = requestIntent?.rewardName === confirmReward.name
      ? requestIntent : { rewardName: confirmReward.name, actionId: actionId('reward-request') };
    setRequestIntent(intent);
    const result = requestReward(getState(), { actionId: intent.actionId, rewardName: intent.rewardName });
    if (saveTransaction(result)) {
      setCelebration(`已申请兑换“${intent.rewardName}”`);
      setRequestIntent(null); closeConfirm();
    }
    busyRef.current = false;
    setBusy(false);
  }

  function resolve(id: string, status: 'confirmed' | 'cancelled') {
    if (!parentAuthed || !isParentAccessGranted() || busyRef.current) return;
    if (status === 'cancelled' && !window.confirm('确认取消这条待处理申请？取消后会退回 15 积分。')) return;
    if (!isParentAccessGranted()) return;
    busyRef.current = true;
    setBusy(true);
    const result = resolveRedemption(getState(), { id, status });
    saveTransaction(result);
    busyRef.current = false;
    setBusy(false);
  }

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-4 shadow-sm sm:p-6">
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">家庭积分</p>
          <div data-testid="points-balance" className="mt-1 flex items-baseline gap-2 text-4xl font-black text-amber-950 sm:text-5xl"><Coins size={35} />{balance}<span className="text-base font-bold">积分</span></div>
          <p className="mt-2 text-sm text-slate-700">下一次家庭奖励：15 积分。积分只用于家庭奖励申请，不购买装扮。</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-amber-200" role="progressbar" aria-label="距离下一次奖励的积分进度" aria-valuenow={Math.min(15, balance)} aria-valuemin={0} aria-valuemax={15}><div className="h-full rounded-full bg-amber-600 transition-[width]" style={{ width: `${Math.min(100, balance / 15 * 100)}%` }} /></div>
          <p className="mt-1 text-xs font-semibold text-amber-950">{balance >= 15 ? '已达到申请条件' : `还差 ${(15 - balance).toFixed(1).replace(/\.0$/, '')} 积分`}</p>
        </div>
        <div className="mx-auto w-full max-w-[190px] sm:max-w-none"><DetectiveMascot mood="happy" size="lg" showMessage={false} /></div>
      </div>
      {celebration && <ClaimCelebration kind="reward" title={celebration} onClose={() => setCelebration('')} />}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-slate-900"><Gift size={19} />家庭奖励申请</h2>
      <p className="mt-1 text-sm text-slate-600">每次申请固定扣 15 积分；家长线下兑现后确认。申请待处理时可以取消并退款。</p>
      {rewards.filter(reward => reward.enabled).length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{rewards.filter(reward => reward.enabled).map(reward => <div key={reward.id} data-testid={`reward-card-${reward.id}`} className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="text-2xl" aria-hidden="true">{reward.icon}</span><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{reward.name}</p>{reward.description && <p className="mt-0.5 text-xs text-slate-600">{reward.description}</p>}<p className="mt-1 text-xs font-bold text-amber-800">申请成本：15 积分</p></div><button ref={node => { if (node) requestButtons.current.set(reward.id, node); }} type="button" disabled={balance < 15 || busy} onClick={event => { setConfirmFocusId(reward.id); setConfirmReward(reward); event.currentTarget.blur(); }} className="min-h-11 shrink-0 rounded-xl bg-amber-700 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">申请</button></div>)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">当前没有启用中的家庭奖励，请家长在“家长”分区添加。</p>}
      {redemptions.length > 0 && <div className="mt-4 space-y-2"><h3 className="font-bold text-slate-800">申请状态</h3>{redemptions.map(row => <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"><span className="min-w-0 flex-1 font-semibold text-slate-900">{row.rewardName}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === 'pending' ? 'bg-amber-100 text-amber-900' : row.status === 'confirmed' ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'}`}>{row.status === 'pending' ? '等待家长兑现' : row.status === 'confirmed' ? '已确认兑现' : '已取消并退款'}</span><span className="text-xs text-slate-600">−15 积分</span>{parentAuthed && row.status === 'pending' && <span className="flex w-full gap-2 sm:w-auto"><button type="button" disabled={busy} onClick={() => resolve(row.id, 'confirmed')} className="min-h-11 flex-1 rounded-lg bg-green-700 px-3 text-sm font-bold text-white sm:flex-none">确认已兑现</button><button type="button" disabled={busy} onClick={() => resolve(row.id, 'cancelled')} className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-800 sm:flex-none">取消并退款</button></span>}</div>)}</div>}
    </section>

    {parentAuthed && <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-blue-950"><ShieldCheck size={19} />家长记分</h2>
      <p className="mt-1 text-sm text-slate-700">按实际发生的家务、学校表扬或作业表现记录。分值须为 0.5 的倍数，单次最多 1000 分。</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">类别<select value={category} onChange={event => setCategory(event.target.value as PointCategory)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-800">实际积分<input aria-label="实际积分" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" placeholder="例如 1 或 0.5" /></label>
        <label className="text-sm font-bold text-slate-800 sm:col-span-2">备注（说明实际奖励）<input value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" placeholder="例如：主动整理书桌" /></label>
      </div>
      <button type="button" data-testid="grant-parent-points" disabled={!amountValid || busy} onClick={grantPoints} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-800 px-4 font-bold text-white disabled:bg-slate-300"><Plus size={17} />记入 {amountValid ? amountValue : 0} 积分</button>
    </section>}

    {(state.rewardRedemptions || []).length > 0 && <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h2 className="font-extrabold text-slate-800">旧版星星兑换历史</h2>
      <p className="mt-1 text-xs text-slate-600">这些记录按旧版星星规则保存，只供查阅，不会换算为新积分或触发退款。</p>
      <ul className="mt-2 divide-y divide-slate-200">{[...(state.rewardRedemptions || [])].reverse().map(row => <li key={row.id} className="flex flex-wrap items-center gap-2 py-2 text-sm"><span className="min-w-0 flex-1 font-semibold">{row.rewardName}</span><span className="text-xs text-slate-600">旧星星 {row.starsSpent} · {row.status === 'confirmed' ? '已确认' : row.status === 'cancelled' ? '已取消' : '历史待处理'}</span></li>)}</ul>
    </section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-slate-900"><History size={19} />积分明细</h2>
      {ledger.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">积分账本还是空的。签到每天 0.5 分；完成核心六题且首答全对可得 1 分。</p> : <ol className="mt-3 divide-y divide-slate-100">{ledger.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-2 py-3 text-sm"><span className="min-w-0 flex-1 font-semibold text-slate-800">{entryNames[entry.type] || '积分记录'}{entry.category ? ` · ${categories.find(item => item.value === entry.category)?.label || entry.category}` : ''}</span><span className={`font-extrabold ${entry.unitsDelta > 0 ? 'text-green-800' : 'text-slate-700'}`}>{entry.unitsDelta > 0 ? '+' : ''}{entry.unitsDelta / 2} 分</span><time className="w-full text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString('zh-CN')}{entry.note ? ` · ${entry.note}` : ''}{entry.rewardName ? ` · ${entry.rewardName}` : ''}</time></li>)}</ol>}
    </section>

    {confirmReward && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-reward-title" className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">确认积分兑换</p><h2 id="confirm-reward-title" className="mt-1 text-xl font-extrabold text-slate-950">{confirmReward.name}</h2>{confirmReward.description && <p className="mt-1 text-sm text-slate-600">{confirmReward.description}</p>}<div className="my-4 rounded-xl bg-amber-50 p-4 text-sm"><p>将扣除：<strong>15 积分</strong></p><p>当前余额：<strong>{balance} 积分</strong></p><p>申请后余额：<strong>{Math.max(0, balance - 15)} 积分</strong></p></div><p className="text-sm text-slate-600">这会提交给家长线下确认，不会自动赠送实物或服务。</p><div className="mt-4 flex gap-2"><button type="button" disabled={busy} className="min-h-11 flex-1 rounded-xl border border-slate-300 font-bold text-slate-800" onClick={closeConfirm}>返回</button><button type="button" disabled={busy || balance < 15} className="min-h-11 flex-1 rounded-xl bg-amber-800 font-bold text-white disabled:bg-slate-300" onClick={makeRequest}>{busy ? '正在保存…' : '确认申请并扣 15 分'}</button></div></div></div>}
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">{message}<button type="button" className="ml-2 underline" onClick={() => setMessage('')}>关闭</button></p>}
  </div>;
}
