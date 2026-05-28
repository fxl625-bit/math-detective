'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Edit, Trash2, Check, X, Plus, ShieldCheck, ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import StarDisplay from '@/components/StarDisplay';
import DetectiveMascot from '@/components/DetectiveMascot';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import PageContainer from '@/components/layout/PageContainer';
import ParentRewardForm from '@/components/ParentRewardForm';
import RedeemConfirmModal from '@/components/RedeemConfirmModal';
import CostumeShop from '@/components/CostumeShop';
import { badges as badgeData } from '@/data/badges';
import { getVirtualRewards } from '@/lib/lessonPlanner';
import { ParentReward, DEFAULT_PARENT_REWARDS } from '@/lib/types';

// ========== 家长验证题生成 ==========

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateParentGateQuestion(): { question: string; answer: number } {
  const templates = [
    () => {
      const a = randomInt(17, 59);
      const b = randomInt(18, 69);
      return { question: `${a} + ${b} = ?`, answer: a + b };
    },
    () => {
      const a = randomInt(60, 150);
      const b = randomInt(18, 69);
      return { question: `${a} - ${b} = ?`, answer: a - b };
    },
    () => {
      const a = randomInt(12, 19);
      const b = randomInt(6, 9);
      return { question: `${a} × ${b} = ?`, answer: a * b };
    },
    () => {
      const b = randomInt(6, 12);
      const answer = randomInt(8, 18);
      return { question: `${b * answer} ÷ ${b} = ?`, answer };
    },
    () => {
      const a = randomInt(20, 59);
      const b = randomInt(20, 59);
      return { question: `${a} + ${b} = ?`, answer: a + b };
    },
  ];
  return templates[randomInt(0, templates.length - 1)]();
}

// ========== 子组件 ==========

function ParentGateModal({
  open,
  onSuccess,
  onClose,
  onLogAttempt,
}: {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  onLogAttempt: (q: string, input: string, correct: boolean, reason: string) => void;
}) {
  const [challenge, setChallenge] = useState(() => generateParentGateQuestion());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (open) {
      setChallenge(generateParentGateQuestion());
      setAnswer('');
      setError('');
      setFailCount(0);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (!trimmed) {
      onLogAttempt(challenge.question, '', false, 'empty_answer');
      setError('请输入答案');
      return;
    }
    const num = parseInt(trimmed);
    if (num === challenge.answer) {
      onLogAttempt(challenge.question, trimmed, true, 'success');
      setAnswer('');
      setError('');
      setFailCount(0);
      onSuccess();
    } else {
      const newFailCount = failCount + 1;
      onLogAttempt(challenge.question, trimmed, false, 'wrong_answer');
      setFailCount(newFailCount);
      setAnswer('');
      if (newFailCount >= 3) {
        setError('请稍后再试，建议让爸爸妈妈来操作。');
      } else {
        setError('验证失败，请让爸爸妈妈操作。');
      }
      setChallenge(generateParentGateQuestion());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-lg font-extrabold text-gray-800">请爸爸妈妈验证</h2>
          <p className="text-sm text-gray-500 mt-1">
            这里可以修改奖励内容，请让爸爸妈妈来操作。
          </p>
        </div>

        <div className="text-center mb-4">
          <p className="text-2xl font-extrabold text-amber-700">{challenge.question}</p>
        </div>

        <input
          type="number"
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-xl text-center font-extrabold mb-3"
          placeholder="请输入答案"
          autoFocus
        />

        {error && (
          <p className={`text-sm font-bold text-center mb-3 ${failCount >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <AppButton variant="ghost" size="md" fullWidth onClick={onClose}>
            取消
          </AppButton>
          <AppButton variant="primary" size="md" fullWidth onClick={handleSubmit} disabled={failCount >= 3}>
            确认
          </AppButton>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'ghost';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-3xl mb-2"><AlertTriangle size={32} className="mx-auto text-amber-500" /></div>
          <h2 className="text-lg font-extrabold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-2">
          <AppButton variant="ghost" size="md" fullWidth onClick={onCancel}>取消</AppButton>
          <AppButton variant={confirmVariant || 'danger'} size="md" fullWidth onClick={onConfirm}>
            {confirmLabel || '确认'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ========== 主组件 ==========

export default function RewardsPage() {
  const {
    state,
    addParentReward,
    updateParentReward,
    removeParentReward,
    redeemRewardWithPending,
    confirmRedemption,
    cancelRedemption,
    addParentGateAttempt,
    clearParentGateAttempts,
    resetTodayLesson,
    clearLearningProgress,
    resetAllState,
    restoreDefaultParentRewards,
  } = useGameState();

  // All useState hooks
  const [mounted, setMounted] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'virtual' | 'redeem' | 'parent' | 'costume'>('virtual');
  const [parentAuthed, setParentAuthed] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);

  // Reward form state
  const [rewardFormOpen, setRewardFormOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<ParentReward | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  // Redeem modal state
  const [redeemTarget, setRedeemTarget] = useState<ParentReward | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  // Confirm modal state (for reset operations)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; label: string; variant: 'primary' | 'danger'; fn: () => void }>({
    title: '', message: '', label: '', variant: 'danger', fn: () => {},
  });

  // All useEffect hooks
  useEffect(() => setMounted(true), []);

  // All useCallback hooks
  const logGateAttempt = useCallback((question: string, input: string, correct: boolean, reason: string) => {
    addParentGateAttempt({
      attemptedAt: new Date().toISOString(),
      question,
      inputAnswer: input,
      correct,
      reason: reason as 'wrong_answer' | 'empty_answer' | 'cancelled' | 'success',
    });
  }, [addParentGateAttempt]);

  const handleGateSuccess = useCallback(() => {
    setParentAuthed(true);
    setGateModalOpen(false);
    setActiveTab('parent');
  }, []);

  const handleGateCancel = useCallback(() => {
    logGateAttempt('', '', false, 'cancelled');
    setGateModalOpen(false);
  }, [logGateAttempt]);

  const openGate = useCallback(() => {
    setGateModalOpen(true);
  }, []);

  const exitParentMode = useCallback(() => {
    setParentAuthed(false);
    setActiveTab('virtual');
  }, []);

  // Reward CRUD
  const handleAddReward = useCallback((data: Omit<ParentReward, 'id' | 'createdAt'>) => {
    addParentReward(data);
  }, [addParentReward]);

  const handleEditReward = useCallback((data: Omit<ParentReward, 'id' | 'createdAt'>) => {
    if (editingReward) {
      updateParentReward(editingReward.id, data);
    }
  }, [editingReward, updateParentReward]);

  const openAddForm = useCallback(() => {
    setEditingReward(undefined);
    setFormKey((k) => k + 1);
    setRewardFormOpen(true);
  }, []);

  const openEditForm = useCallback((reward: ParentReward) => {
    setEditingReward(reward);
    setFormKey((k) => k + 1);
    setRewardFormOpen(true);
  }, []);

  const handleFormSave = useCallback((data: Omit<ParentReward, 'id' | 'createdAt'>) => {
    if (editingReward) {
      handleEditReward(data);
    } else {
      handleAddReward(data);
    }
    setRewardFormOpen(false);
    setEditingReward(undefined);
  }, [editingReward, handleAddReward, handleEditReward]);

  const handleFormClose = useCallback(() => {
    setRewardFormOpen(false);
    setEditingReward(undefined);
  }, []);

  // Redeem flow
  const handleOpenRedeem = useCallback((reward: ParentReward) => {
    setRedeemTarget(reward);
    setRedeemModalOpen(true);
  }, []);

  const handleConfirmRedeem = useCallback(() => {
    if (!redeemTarget) return;
    const success = redeemRewardWithPending(redeemTarget);
    setRedeemMsg(success
      ? `成功兑换 "${redeemTarget.name}"！请找爸爸妈妈确认奖励～`
      : '星星不够哦，继续做题攒星星吧！⭐');
    setRedeemModalOpen(false);
    setRedeemTarget(null);
    setTimeout(() => setRedeemMsg(''), 3000);
  }, [redeemTarget, redeemRewardWithPending]);

  // Reset confirm flow
  const showConfirm = useCallback((title: string, message: string, label: string, variant: 'primary' | 'danger', fn: () => void) => {
    setConfirmAction({ title, message, label, variant, fn });
    setConfirmOpen(true);
  }, []);

  const handleConfirmAction = useCallback(() => {
    confirmAction.fn();
    setConfirmOpen(false);
    setRedeemMsg('操作成功！');
    setTimeout(() => setRedeemMsg(''), 2000);
  }, [confirmAction]);

  // ALL hooks defined. Now conditional return.
  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-4 animate-bounce-gentle">🎁</div><p className="text-pink-600 font-bold">正在加载奖励中心...</p></div></div>;

  // Derived data
  const virtualRewards = getVirtualRewards(state);
  const allRewards = state.parentRewards || [];
  const enabledRewards = allRewards.filter((r) => r.enabled);
  const redemptions = state.rewardRedemptions || [];
  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');
  const confirmedRedemptions = redemptions.filter((r) => r.status === 'confirmed');
  const gateAttempts = state.parentGateAttempts || [];
  const recentAttempts = gateAttempts.slice(0, 20);
  const failedAttempts = recentAttempts.filter((a) => !a.correct);
  const unlockedCount = virtualRewards.filter((v) => v.unlocked).length;

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-pink-800">🎁 奖励中心</h1>
        {parentAuthed ? (
          <AppButton variant="ghost" size="sm" onClick={exitParentMode}>
            <ShieldOff size={16} /> 退出家长模式
          </AppButton>
        ) : (
          <AppButton variant="ghost" size="sm" onClick={openGate}>
            <ShieldCheck size={16} /> 家长设置
          </AppButton>
        )}
      </div>

      {/* Stars */}
      <AppCard variant="amber">
        <div className="flex items-center gap-4">
          <div className="text-5xl">⭐</div>
          <div>
            <div className="text-2xl font-extrabold text-amber-500">{state.stars}</div>
            <div className="text-sm text-gray-500">可用星星</div>
          </div>
          <div className="flex-1" />
          <DetectiveMascot mood="happy" size="sm" />
        </div>
      </AppCard>

      {/* Redeem message */}
      <AnimatePresence>
        {redeemMsg && (
          <motion.div
            className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 text-green-700 font-bold text-center"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            {redeemMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button
          className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'virtual' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('virtual')}
        >
          🏆 我的侦探奖励 ({unlockedCount}/{virtualRewards.length})
        </button>
        <button
          className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'redeem' ? 'bg-white shadow text-pink-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('redeem')}
        >
          🛒 家长奖励兑换
        </button>
        <button
          className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'costume' ? 'bg-white shadow text-orange-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('costume')}
        >
          🧥 换装
        </button>
        {parentAuthed && (
          <button
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'parent' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab('parent')}
          >
            ⚙️ 家长设置
          </button>
        )}
      </div>

      {/* ========== Tab 1: Virtual Rewards ========== */}
      {activeTab === 'virtual' && (
        <div className="space-y-4">
          {/* Virtual rewards grid */}
          <h3 className="text-sm font-bold text-gray-500">侦探成就</h3>
          <div className="grid grid-cols-2 gap-3">
            {virtualRewards.map((reward, i) => (
              <motion.div
                key={reward.id}
                className={`p-4 rounded-2xl border-2 text-center ${
                  reward.unlocked
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={`text-4xl mb-2 ${reward.unlocked ? '' : 'grayscale'}`}>
                  {reward.icon}
                </div>
                <div className={`font-extrabold text-sm ${reward.unlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                  {reward.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {reward.unlocked ? reward.description : reward.unlockCondition}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Badges section (from existing badgeData) */}
          <h3 className="text-sm font-bold text-gray-500 mt-4">已获得徽章</h3>
          {state.badges.length === 0 ? (
            <AppCard variant="gray">
              <div className="text-center py-3 text-gray-500 text-sm">
                继续完成侦探任务来解锁徽章吧！
              </div>
            </AppCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {badgeData.filter((b) => state.badges.includes(b.id)).map((badge) => (
                <div key={badge.id} className="p-4 rounded-2xl border-2 bg-amber-50 border-amber-200 text-center">
                  <div className="text-4xl mb-1">{badge.icon}</div>
                  <div className="font-extrabold text-sm text-gray-800">{badge.name}</div>
                  <div className="text-xs text-gray-500">{badge.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== Tab 2: Parent Reward Exchange ========== */}
      {activeTab === 'redeem' && (
        <div className="space-y-4">
          {enabledRewards.length === 0 ? (
            <AppCard variant="gray">
              <div className="text-center py-4 text-gray-500">
                <div className="text-3xl mb-2">🎁</div>
                <p className="font-bold">还没有可以兑换的奖励</p>
                <p className="text-sm">请家长在家长设置中添加奖励</p>
              </div>
            </AppCard>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500">可兑换奖励</h3>
              {enabledRewards.map((reward, i) => (
                <motion.div
                  key={reward.id}
                  className="card-detective p-4 flex items-center gap-3"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                >
                  <div className="text-3xl">{reward.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-gray-800 text-sm">
                      {reward.name}
                      <span className="ml-1 text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">家长奖励</span>
                    </div>
                    {reward.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{reward.description}</div>
                    )}
                  </div>
                  <AppButton
                    variant={state.stars >= reward.cost ? 'primary' : 'ghost'}
                    size="sm"
                    disabled={state.stars < reward.cost}
                    onClick={() => handleOpenRedeem(reward)}
                  >
                    <Star size={14} fill={state.stars >= reward.cost ? 'white' : 'currentColor'} />
                    {reward.cost}
                  </AppButton>
                </motion.div>
              ))}
            </div>
          )}

          {pendingRedemptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-600">⏳ 等待家长确认</h3>
              {pendingRedemptions.map((r) => (
                <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-700">{r.rewardName}</span>
                  <span className="text-xs text-amber-500">-{r.starsSpent}⭐</span>
                  <span className="ml-auto text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">待确认</span>
                </div>
              ))}
            </div>
          )}

          {confirmedRedemptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-green-600">✅ 已确认奖励</h3>
              {confirmedRedemptions.map((r) => (
                <div key={r.id} className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-green-700">{r.rewardName}</span>
                  <span className="text-xs text-green-500">-{r.starsSpent}⭐</span>
                  <span className="ml-auto text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">已确认</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== Tab 3: Parent Settings (authed only) ========== */}
      {activeTab === 'parent' && parentAuthed && (
        <div className="space-y-4">
          {/* Reward Management */}
          <AppButton variant="primary" size="md" fullWidth onClick={openAddForm}>
            <Plus size={18} /> 添加新奖励
          </AppButton>

          {allRewards.length === 0 ? (
            <AppCard variant="gray">
              <div className="text-center py-4 text-gray-500">
                <div className="text-3xl mb-2">📝</div>
                <p className="font-bold">还没有自定义奖励</p>
                <p className="text-sm">点击上方按钮添加第一个奖励，或恢复默认奖励</p>
              </div>
            </AppCard>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500">全部奖励</h3>
                <button
                  onClick={() => showConfirm(
                    '恢复默认家长奖励',
                    '确定要恢复默认家长奖励吗？这会把默认奖励添加到当前列表中（不会删除已有奖励）。',
                    '恢复默认',
                    'primary',
                    restoreDefaultParentRewards
                  )}
                  className="text-xs text-amber-600 font-bold hover:underline"
                >
                  恢复默认奖励
                </button>
              </div>
              {allRewards.map((reward) => (
                <AppCard key={reward.id} variant={reward.enabled ? 'default' : 'gray'}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{reward.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-800 text-sm">{reward.name}</div>
                      <div className="text-xs text-gray-500">{reward.description}</div>
                      <div className="flex items-center gap-1 text-xs text-amber-600 font-bold mt-1">
                        <Star size={12} fill="currentColor" /> {reward.cost}
                        {!reward.enabled && <span className="text-gray-400 ml-1">（已停用）</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditForm(reward)} className="p-2 rounded-xl hover:bg-amber-100 text-amber-600">
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => updateParentReward(reward.id, { enabled: !reward.enabled })}
                        className={`p-2 rounded-xl ${reward.enabled ? 'hover:bg-red-100 text-red-500' : 'hover:bg-green-100 text-green-500'}`}
                      >
                        {reward.enabled ? <X size={16} /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => { if (confirm('确定删除这个奖励吗？')) removeParentReward(reward.id); }}
                        className="p-2 rounded-xl hover:bg-red-100 text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </AppCard>
              ))}
            </div>
          )}

          {/* Redemption Management */}
          {redemptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500">兑换记录</h3>
              {redemptions.map((r) => (
                <AppCard key={r.id} variant={r.status === 'confirmed' ? 'green' : r.status === 'cancelled' ? 'gray' : 'amber'}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-800 text-sm">{r.rewardName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.redeemedAt).toLocaleDateString('zh-CN')} · -{r.starsSpent} ⭐
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <AppButton variant="success" size="sm" onClick={() => confirmRedemption(r.id)}>
                          <Check size={14} /> 确认
                        </AppButton>
                        <AppButton variant="danger" size="sm" onClick={() => cancelRedemption(r.id, true)}>
                          <X size={14} /> 取消
                        </AppButton>
                      </div>
                    )}
                    {r.status === 'confirmed' && (
                      <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full font-bold">已确认</span>
                    )}
                    {r.status === 'cancelled' && (
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold">已取消</span>
                    )}
                  </div>
                </AppCard>
              ))}
            </div>
          )}

          {/* Gate Attempt Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500">🔐 家长模式访问记录</h3>
              {gateAttempts.length > 0 && (
                <button onClick={clearParentGateAttempts} className="text-xs text-gray-400 hover:text-red-500 font-bold">
                  清空记录
                </button>
              )}
            </div>
            {recentAttempts.length === 0 ? (
              <p className="text-xs text-gray-400">暂无访问记录</p>
            ) : (
              <div className="space-y-2">
                {failedAttempts.length > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                    最近有人尝试进入家长设置，如果不是爸爸妈妈操作，可以适当提高验证难度。
                  </p>
                )}
                {recentAttempts.map((a) => (
                  <div key={a.id} className={`text-xs p-3 rounded-xl border ${
                    a.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {new Date(a.attemptedAt).toLocaleTimeString('zh-CN')}
                      </span>
                      <span className={a.correct ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                        {a.correct ? '✅ 成功' : '❌ 失败'}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      题目：{a.question} 输入：{a.inputAnswer || '(空)'}
                      {a.reason === 'cancelled' && ' · 已取消'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Tools */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500">🛠️ 重置与测试工具</h3>

            <AppButton
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => showConfirm(
                '重置今日任务',
                '确定要重置今日任务吗？这不会清空星星和历史记录。',
                '重置今日任务',
                'danger',
                resetTodayLesson
              )}
            >
              <RefreshCw size={14} /> 重置今日任务
            </AppButton>

            <AppButton
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => showConfirm(
                '清空学习进度',
                '确定要清空学习进度吗？星星、打卡、错题、徽章都会清空，但家长自定义奖励会保留。',
                '清空学习进度',
                'danger',
                clearLearningProgress
              )}
            >
              <RefreshCw size={14} /> 清空学习进度（保留奖励）
            </AppButton>

            <AppButton
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => showConfirm(
                '恢复全部初始状态',
                '确定要恢复全部初始状态吗？这会清空所有学习记录、奖励设置和兑换记录。此操作不可撤销！',
                '全部重置',
                'danger',
                resetAllState
              )}
            >
              <AlertTriangle size={14} /> 恢复全部初始状态
            </AppButton>
          </div>
        </div>
      )}

      {/* ========== Tab 4: Costume Shop ========== */}
      {activeTab === 'costume' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">收集装饰品，装扮你的侦探！</p>
          </div>
          <CostumeShop />
        </div>
      )}

      {/* Modals */}
      <ParentGateModal
        open={gateModalOpen}
        onSuccess={handleGateSuccess}
        onClose={handleGateCancel}
        onLogAttempt={logGateAttempt}
      />

      <ParentRewardForm
        key={formKey}
        open={rewardFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        initialData={editingReward}
      />

      <RedeemConfirmModal
        open={redeemModalOpen}
        reward={redeemTarget}
        currentStars={state.stars}
        onConfirm={handleConfirmRedeem}
        onCancel={() => { setRedeemModalOpen(false); setRedeemTarget(null); }}
      />

      <ConfirmModal
        open={confirmOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        confirmLabel={confirmAction.label}
        confirmVariant={confirmAction.variant}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageContainer>
  );
}
