'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Coins, Gift, Medal, ShieldCheck, Shirt, KeyRound } from 'lucide-react';
import { DEFAULT_PARENT_REWARDS, type GameState, type ParentReward } from '@/lib/types';
import { useGameState } from '@/hooks/useGameState';
import PageContainer from '@/components/layout/PageContainer';
import FamilyPointsPanel from '@/components/rewards/FamilyPointsPanel';
import DetectiveStage from '@/components/rewards/DetectiveStage';
import MedalGallery from '@/components/rewards/MedalGallery';
import WardrobePanel from '@/components/rewards/WardrobePanel';
import { getUnlockedItems, getAvatarItemById } from '@/data/avatarItems';
import ParentPasswordGate from '@/components/ParentPasswordGate';
import { clearParentAccess, grantParentAccess, isParentAccessGranted, useParentAccess } from '@/hooks/useParentAccess';

type Tab = 'points' | 'honors' | 'wardrobe' | 'parent';
type RewardDraft = Pick<ParentReward, 'name' | 'description' | 'icon' | 'enabled'>;

const rewardIdeas: RewardDraft[] = [
  { name: '亲子桌游时间', description: '一起挑一款桌游，约好合适的时间玩一局。', icon: '🎲', enabled: true },
  { name: '一起烘焙', description: '和家长一起选一个简单食谱，安排一次烘焙时间。', icon: '🧁', enabled: true },
  { name: '公园探险', description: '和家长商量一次公园散步或自然观察。', icon: '🌳', enabled: true },
  { name: '选择周末电影', description: '从家长同意的片单里选一部周末一起看。', icon: '🎬', enabled: true },
  { name: '睡前故事', description: '邀请家长安排一次睡前共读或讲故事时间。', icon: '📖', enabled: true },
  { name: '手工创作时间', description: '和家长一起选材料，做一个小手工。', icon: '✂️', enabled: true },
  { name: '选择周末活动', description: '和家长一起从可安排的活动中选一个。', icon: '🗓️', enabled: true },
  { name: '专属亲子时间', description: '和家长约定一段专心陪伴的时间，并一起决定做什么。', icon: '💛', enabled: true },
];

function createActionId(prefix: string) {
  const secureUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  return `${prefix}:${secureUuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function RewardEditor({ value, draft, onSave, onCancel }: { value?: ParentReward; draft?: RewardDraft; onSave: (reward: Omit<ParentReward, 'id' | 'createdAt'>) => void; onCancel: () => void }) {
  const initial = value || draft;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [icon, setIcon] = useState(initial?.icon || '🎁');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><form role="dialog" aria-modal="true" aria-labelledby="reward-editor-title" onSubmit={event => { event.preventDefault(); if (name.trim()) onSave({ name: name.trim(), description: description.trim(), icon, enabled, cost: 15 }); }} className="w-full space-y-3 rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl">
    <h2 id="reward-editor-title" className="text-xl font-extrabold text-slate-950">{value ? '编辑家庭奖励' : '新增家庭奖励'}</h2>
    <p className="text-sm text-slate-600">奖励说明会显示在申请卡片上；申请成本统一为 15 积分。</p>
    <label className="block text-sm font-bold">奖励名称<input autoFocus value={name} onChange={event => setName(event.target.value)} maxLength={80} required className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
    <label className="block text-sm font-bold">奖励说明<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={300} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label>
    <label className="block text-sm font-bold">图标<input value={icon} onChange={event => setIcon(event.target.value)} maxLength={8} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
    <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />启用此奖励</label>
    <div className="flex gap-2"><button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-xl border border-slate-300 font-bold">返回</button><button type="submit" disabled={!name.trim()} className="min-h-11 flex-1 rounded-xl bg-blue-800 font-bold text-white disabled:bg-slate-300">保存</button></div>
  </form></div>;
}

export default function RewardsPage() {
  const { state, getState, commitGameState, clearParentGateAttempts, resetTodayLesson, clearLearningProgress, resetAllState } = useGameState();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('points');
  const parentAuthed = useParentAccess();
  const [showGate, setShowGate] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [editor, setEditor] = useState<ParentReward | null | undefined>(undefined);
  const [editorDraft, setEditorDraft] = useState<RewardDraft | undefined>(undefined);
  const [message, setMessage] = useState('');
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!parentAuthed) {
      setEditor(undefined); setEditorDraft(undefined); setShowPasswordChange(false);
      if (tab === 'parent') setShowGate(true);
    }
  }, [parentAuthed, tab]);
  const rewards = useMemo(() => state.parentRewards || [], [state.parentRewards]);

  if (!mounted) return <div className="grid min-h-[55vh] place-items-center text-sm font-bold text-amber-900">正在打开奖励中心…</div>;

  function enterParent() {
    grantParentAccess();
    setShowGate(false); setTab('parent');
  }

  function saveReward(reward: Omit<ParentReward, 'id' | 'createdAt'>) {
    if (!isParentAccessGranted()) { setMessage('家长验证已过期，请重新验证后操作。'); return; }
    const current = getState();
    const currentRewards = current.parentRewards || [];
    const next: GameState = editor
      ? { ...current, parentRewards: currentRewards.map(item => item.id === editor.id ? { ...item, ...reward, cost: 15 } : item) }
      : { ...current, parentRewards: [...currentRewards, { ...reward, cost: 15, id: createActionId('reward'), createdAt: new Date().toISOString() }] };
    if (!commitGameState(next)) { setMessage('奖励没有保存成功，请保持内容不变后重试。'); return; }
    setEditor(undefined); setEditorDraft(undefined); setMessage('奖励已保存；申请成本为 15 积分。');
  }

  function updateReward(id: string, update: Partial<ParentReward>) {
    if (!isParentAccessGranted()) { setMessage('家长验证已过期，请重新验证后操作。'); return; }
    const current = getState();
    const next = { ...current, parentRewards: (current.parentRewards || []).map(item => item.id === id ? { ...item, ...update, cost: 15 } : item) };
    setMessage(commitGameState(next) ? '奖励设置已保存。' : '没有保存成功，请重试。');
  }

  function deleteReward(id: string) {
    if (!isParentAccessGranted()) { setMessage('家长验证已过期，请重新验证后操作。'); return; }
    if (!window.confirm('确定删除这项家庭奖励吗？历史兑换记录会保留。')) return;
    if (!isParentAccessGranted()) { setMessage('家长验证已过期，请重新验证后操作。'); return; }
    const current = getState();
    const next = { ...current, parentRewards: (current.parentRewards || []).filter(item => item.id !== id) };
    setMessage(commitGameState(next) ? '奖励已删除。' : '没有保存成功，请重试。');
  }

  function restoreExampleRewards() {
    if (!isParentAccessGranted()) { setMessage('家长验证已过期，请重新验证后操作。'); return; }
    const current = getState();
    const currentRewards = current.parentRewards || [];
    const names = new Set(currentRewards.map(reward => reward.name));
    const missing = DEFAULT_PARENT_REWARDS.filter(reward => !names.has(reward.name)).map(reward => ({
      ...reward, cost: 15, id: createActionId('reward-default'), createdAt: new Date().toISOString(),
    }));
    if (!missing.length) { setMessage('示例奖励已全部在列表中。'); return; }
    setMessage(commitGameState({ ...current, parentRewards: [...currentRewards, ...missing] })
      ? `已添加 ${missing.length} 项示例奖励，原奖励和说明均保留。` : '没有保存成功，请重试。');
  }

  function equip(id: string) {
    const current = getState();
    const unlocked = new Set(getUnlockedItems(current).map(item => item.id));
    if (!unlocked.has(id)) { setMessage('这件装扮尚未解锁，当前只是试穿预览。'); return; }
    const item = getAvatarItemById(id);
    if (!item) return;
    const decorations = [...(current.decorations || [])];
    const alreadyEquipped = decorations.includes(id);
    const nextDecorations = alreadyEquipped
      ? decorations.filter(value => value !== id)
      : [...decorations.filter(value => {
        const existing = getAvatarItemById(value);
        return !(existing && existing.slot === item.slot && !existing.canStack && !item.canStack);
      }), id];
    if (!commitGameState({ ...current, decorations: nextDecorations })) setMessage('装扮没有保存成功，请重试。');
    else setMessage(alreadyEquipped ? '已卸下装扮。' : '装扮已装备。');
  }

  const tabItems: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'points', label: '积分', icon: <Coins size={17} /> },
    { id: 'honors', label: '荣誉', icon: <Medal size={17} /> },
    { id: 'wardrobe', label: '换装', icon: <Shirt size={17} /> },
    { id: 'parent', label: '家长', icon: <ShieldCheck size={17} /> },
  ];

  return <PageContainer className="max-w-5xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-700">侦探奖励中心</p><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">奖励与侦探档案</h1><p className="mt-1 text-sm text-slate-600">积分来自真实学习和家长记录；荣誉与装扮按学习进度解锁。</p></div>{parentAuthed && <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold" onClick={() => { clearParentAccess(); setShowGate(false); setShowPasswordChange(false); setTab('points'); }}>退出家长区</button>}</header>
    <nav aria-label="奖励中心分区" className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:gap-2">{tabItems.map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => { if (item.id === 'parent' && !parentAuthed) { setShowGate(true); return; } if (item.id !== 'parent' && tab === 'parent') { clearParentAccess(); setShowGate(false); } setTab(item.id); }} className={`flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-sm font-bold sm:gap-2 sm:px-3 ${tab === item.id ? 'bg-indigo-900 text-white' : 'text-slate-700 hover:bg-indigo-50'}`}>{item.icon}<span>{item.label}</span></button>)}</nav>

    {tab === 'points' && <FamilyPointsPanel state={state} getState={getState} commitGameState={commitGameState} rewards={rewards} parentAuthed={parentAuthed} />}
    {tab === 'honors' && <div className="space-y-4"><DetectiveStage state={state} size="large" /><MedalGallery state={state} /></div>}
    {tab === 'wardrobe' && <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><header className="mb-3"><h2 className="text-xl font-extrabold text-slate-950">试穿与装备</h2><p className="mt-1 text-sm text-slate-600">点击装备才会保存；锁定物品仅供试穿。家庭积分不会用于购买装扮。</p></header><WardrobePanel state={state} onEquip={equip} /></section>}
    {tab === 'parent' && parentAuthed && <div className="space-y-4"><FamilyPointsPanel state={state} getState={getState} commitGameState={commitGameState} rewards={rewards} parentAuthed /> <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-4 sm:p-5">
      {showPasswordChange && <ParentPasswordGate mode="change" onSuccess={() => { clearParentAccess(); setShowPasswordChange(false); setTab('points'); setMessage('家长密码已更新，需重新验证才能再次进入家长区。'); }} onCancel={() => setShowPasswordChange(false)} />}
      {!showPasswordChange && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300 px-3 text-sm font-bold text-blue-900" onClick={() => setShowPasswordChange(true)}><KeyRound size={17} />修改家长密码</button>}
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold text-slate-950">家庭奖励设置</h2><p className="mt-1 text-sm text-slate-600">原有奖励名称和说明已保留；所有奖励申请统一扣 15 积分。</p></div><div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-xl border border-blue-300 px-3 text-sm font-bold text-blue-900" onClick={restoreExampleRewards}>恢复示例奖励</button><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-800 px-4 font-bold text-white" onClick={() => { setEditorDraft(undefined); setEditor(null); }}><Gift size={17} />新增奖励</button></div></header>
      <div className="space-y-2">{rewards.map(reward => <article key={reward.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="text-2xl">{reward.icon}</span><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-900">{reward.name}</h3><p className="text-sm text-slate-600">{reward.description || '暂无说明'}</p><p className="mt-1 text-xs font-bold text-amber-800">申请成本 15 积分 · {reward.enabled ? '启用中' : '已停用'}</p></div><button type="button" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold" onClick={() => setEditor(reward)}>编辑</button><button type="button" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold" onClick={() => updateReward(reward.id, { enabled: !reward.enabled })}>{reward.enabled ? '停用' : '启用'}</button><button type="button" className="min-h-11 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-800" onClick={() => deleteReward(reward.id)}>删除</button></article>)}</div>
      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <h3 className="font-extrabold text-amber-950">奖励灵感</h3>
        <p className="mt-1 text-sm text-amber-900">选一个想法后可自行修改名称和说明。它只是草稿，保存前不会加入奖励列表，也不代表家长已经承诺兑现。</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{rewardIdeas.map(idea => <button key={idea.name} type="button" data-testid={`reward-idea-${idea.name}`} onClick={() => { setEditorDraft(idea); setEditor(null); }} className="flex min-h-14 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-left text-sm font-bold text-slate-800 hover:border-amber-500 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700"><span aria-hidden="true" className="text-xl">{idea.icon}</span><span>{idea.name}</span></button>)}</div>
      </section>
      <div className="border-t border-slate-200 pt-4"><h3 className="font-bold text-slate-900">高级工具</h3><p className="mt-1 text-xs text-slate-600">家长密码仅用于此浏览器的本地家长操作区，不代表服务器身份验证。</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold" onClick={() => { if (isParentAccessGranted() && window.confirm('重置今天的课程进度？') && isParentAccessGranted()) resetTodayLesson(); }}>重置今日课程</button><button type="button" className="min-h-11 rounded-xl border border-amber-300 px-3 text-sm font-bold text-amber-900" onClick={() => { if (isParentAccessGranted() && window.confirm('清空所有学习记录？此操作不可撤销。') && isParentAccessGranted()) clearLearningProgress(); }}>清空学习进度</button><button type="button" className="min-h-11 rounded-xl border border-rose-300 px-3 text-sm font-bold text-rose-800" onClick={() => { if (isParentAccessGranted() && window.confirm('恢复全部初始状态？此操作不可撤销。') && isParentAccessGranted()) resetAllState(); }}>全部重置</button></div><button type="button" className="mt-3 min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold" onClick={() => { if (isParentAccessGranted()) clearParentGateAttempts(); }}>清空家长区进入记录</button></div>
    </section></div>}

    {showGate && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-label="家长密码验证" className="max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 sm:max-w-lg sm:rounded-3xl sm:p-5"><ParentPasswordGate onSuccess={enterParent} onCancel={() => setShowGate(false)} /></div></div>}
    {parentAuthed && editor !== undefined && <RewardEditor value={editor || undefined} draft={editorDraft} onSave={saveReward} onCancel={() => { setEditor(undefined); setEditorDraft(undefined); }} />}
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">{message}<button type="button" className="ml-2 underline" onClick={() => setMessage('')}>关闭</button></p>}
  </PageContainer>;
}
