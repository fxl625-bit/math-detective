'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, DEFAULT_GAME_STATE, DEFAULT_PARENT_REWARDS, MistakeRecord, ParentReward, RewardRedemption, ParentGateAttempt } from '@/lib/types';
import {
  loadState,
  getStorageRecoveryStatus,
  saveState,
  checkDailyReset,
  updateStreak,
  checkWeeklyCard,
  checkBadges,
  addMistake,
  retryMistakeCorrect,
  completeQuestion,
  normalizeStats,
} from '@/lib/storage';
import { getAvatarItemById } from '@/data/avatarItems';
import { logAppVersion } from '@/lib/appVersion';
import { handleAppVersionUpgrade, UPGRADE_TOAST_MESSAGE } from '@/lib/versionUpgrade';
import { questions as allQuestions } from '@/data/questions';
import { updateLearningSettingsState } from '@/lib/learningSettings';
import { ensurePointsState, claimCheckin, addParentPoints as applyParentPoints, requestReward as applyRewardRequest, resolveRedemption as applyRedemptionResolution, type PointsResult, type ParentPointsInput, type RewardRequestInput, type RedemptionResolutionInput } from '@/lib/familyPoints';
import { submitMistakeReview as applyMistakeReview, type MistakeReviewInput, type MistakeReviewResult } from '@/lib/mistakeReview';
import { appendUniqueEvent, createEventIdentity } from '@/lib/learningEvents';
import { buildMentalMathLearningEvents, buildMentalMathMistakes, type MentalMathSession } from '@/lib/mentalMath';

let globalState: GameState | null = null;
let listeners: Array<(s: GameState) => void> = [];

function notify(state: GameState) {
  globalState = state;
  listeners.forEach((fn) => fn(state));
}

function latestState(): GameState {
  if (typeof window === 'undefined') return globalState ?? ensurePointsState(DEFAULT_GAME_STATE);
  const current = loadState();
  globalState = current;
  return current;
}

function update(updater: (s: GameState) => GameState): boolean {
  const current = latestState();
  if (getStorageRecoveryStatus()) return false;
  const next = ensurePointsState(updater(current));
  if (!saveState(next)) return false;
  notify(next);
  return true;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    if (typeof window !== 'undefined' && (window as any).__debugLog) (window as any).__debugLog('[useGameState] init start');
    
    // v2.6.1: 版本检测与升级
    logAppVersion();
    
    if (globalState) {
      if (typeof window !== 'undefined' && (window as any).__debugLog) (window as any).__debugLog('[useGameState] using cached globalState');
      return globalState;
    }
    try {
      const loaded = loadState();
      const normalized = normalizeStats(loaded);
      
      // v2.6.1: 版本升级处理
      let recoveredState = normalized;
      let needsLessonRebuild = false;
      let wasUpgraded = false;
      if (!getStorageRecoveryStatus()) {
        try {
          const upgrade = handleAppVersionUpgrade(normalized, (id) => allQuestions.find(q => q.id === id));
          recoveredState = upgrade.state;
          needsLessonRebuild = upgrade.needsLessonRebuild;
          wasUpgraded = upgrade.wasUpgraded;
        } catch (error) {
          console.warn('[useGameState] version migration deferred because browser storage is unavailable', error);
        }
      }
      if (wasUpgraded) {
        if (typeof window !== 'undefined' && (window as any).__debugLog) {
          (window as any).__debugLog('[useGameState] version upgraded, needsLessonRebuild=' + needsLessonRebuild);
        }
        // 标记需要显示 toast（由页面层处理）
        (window as any).__upgradeToast = UPGRADE_TOAST_MESSAGE;
      }
      if (needsLessonRebuild) {
        (window as any).__needsLessonRebuild = true;
      }
      
      const daily = checkDailyReset(recoveredState);
      const weekly = checkWeeklyCard(daily);
      const badged = { ...weekly, stars: 0, badges: checkBadges(weekly) };
      globalState = badged;
      if (typeof window !== 'undefined' && (window as any).__debugLog) (window as any).__debugLog('[useGameState] init done, stars=' + badged.stars);
      return badged;
    } catch (e) {
      if (typeof window !== 'undefined' && (window as any).__debugLog) (window as any).__debugLog('[useGameState] ERROR: ' + (e instanceof Error ? e.message : String(e)));
      throw e;
    }
  });

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((fn) => fn !== setState);
    };
  }, []);

  const refresh = useCallback(() => {
    const current = latestState();
    setState(current);
  }, []);

  const handleCompleteQuestion = useCallback(
    (questionId: string, correct: boolean, mistakeRecord?: Omit<MistakeRecord, 'date'>) => {
      update((s) => {
        let ns = s;
        ns = checkDailyReset(ns);
        ns = updateStreak(ns);
        ns = checkWeeklyCard(ns);
        ns = completeQuestion(ns, questionId, correct);
        ns.stars = 0;
        ns.badges = checkBadges(ns);

        if (!correct && mistakeRecord) {
          ns = addMistake(ns, { ...mistakeRecord, date: new Date().toISOString() });
        }

        return ns;
      });
    },
    []
  );

  const handleRetryCorrect = useCallback((questionId: string) => {
    update((s) => {
      return retryMistakeCorrect(s, questionId);
    });
  }, []);

  const setParentSettings = useCallback((settings: Partial<import('@/lib/types').ParentSettings>) => {
    update((s) => updateLearningSettingsState(s, settings));
  }, []);

  const saveParentSettings = useCallback((settings: Partial<import('@/lib/types').ParentSettings>): boolean => {
    try {
      const current = latestState();
      if (getStorageRecoveryStatus()) return false;
      const next = updateLearningSettingsState(current, settings);
      if (!saveState(next)) return false;
      notify(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const redeemReward = useCallback((_cost: number): boolean => false, []);

  // ========== 家长奖励 CRUD ==========

  const addParentReward = useCallback((reward: Omit<ParentReward, 'id' | 'createdAt'>) => {
    update((s) => ({
      ...s,
      parentRewards: [
        ...s.parentRewards,
        {
          ...reward,
          id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const updateParentReward = useCallback((id: string, updates: Partial<Omit<ParentReward, 'id' | 'createdAt'>>) => {
    update((s) => ({
      ...s,
      parentRewards: s.parentRewards.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  const removeParentReward = useCallback((id: string) => {
    update((s) => ({
      ...s,
      parentRewards: s.parentRewards.filter((r) => r.id !== id),
    }));
  }, []);

  const redeemRewardWithPending = useCallback((reward: ParentReward): boolean => {
    void reward;
    return false;
  }, []);

  const confirmRedemption = useCallback((redemptionId: string) => {
    update((s) => ({
      ...s,
      rewardRedemptions: s.rewardRedemptions.map((r) =>
        r.id === redemptionId ? { ...r, status: 'confirmed' as const } : r
      ),
    }));
  }, []);

  const cancelRedemption = useCallback((redemptionId: string, refundStars: boolean) => {
    update((s) => {
      void refundStars;
      const updated: typeof s.rewardRedemptions = s.rewardRedemptions.map((r) =>
        r.id === redemptionId ? { ...r, status: 'cancelled' as const } : r
      );
      return { ...s, stars: 0, rewardRedemptions: updated };
    });
  }, []);

  // ========== 家长验证记录 ==========

  const addParentGateAttempt = useCallback((attempt: Omit<ParentGateAttempt, 'id'>) => {
    update((s) => {
      const entry: ParentGateAttempt = {
        ...attempt,
        id: `pga_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      };
      const trimmed = [entry, ...s.parentGateAttempts].slice(0, 50);
      return { ...s, parentGateAttempts: trimmed };
    });
  }, []);

  const clearParentGateAttempts = useCallback(() => {
    update((s) => ({ ...s, parentGateAttempts: [] }));
  }, []);

  // ========== 重置功能 ==========

  const resetTodayLesson = useCallback(() => {
    update((s) => ({
      ...s,
      completedToday: 0,
      lastPlayDate: '',
    }));
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('math-detective-today-lesson'); } catch { /* ignore */ }
    }
  }, []);

  const clearLearningProgress = useCallback(() => {
    update((s) => ({
      ...s,
      stars: 0,
      streak: 0,
      lastPlayDate: '',
      completedToday: 0,
      totalCompleted: 0,
      correctCount: 0,
      wrongCount: 0,
      answerAttempts: 0,       // v2.6.8: 修复遗漏重置，根除正确率分母膨胀
      attemptRecords: [],       // v2.6.8: 清空答题记录
      level: 1,
      badges: [],
      completedQuestions: [],
      mistakes: [],
      resumeCards: 1,
      lastStreakCheckDate: '',
      skillMistakes: {},
    }));
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('math-detective-today-lesson'); } catch { /* ignore */ }
    }
  }, []);

  const resetAllState = useCallback(() => {
    const fresh: GameState = {
      ...DEFAULT_GAME_STATE,
      parentRewards: DEFAULT_PARENT_REWARDS.map((r, i) => ({
        ...r,
        id: `pr_default_${i}`,
        createdAt: new Date().toISOString(),
      })),
    };
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('math-detective-today-lesson'); } catch { /* ignore */ }
    }
    update(() => fresh);
  }, []);

  const restoreDefaultParentRewards = useCallback(() => {
    update((s) => {
      const existingIds = new Set(s.parentRewards.map((r) => r.id));
      const defaults = DEFAULT_PARENT_REWARDS
        .filter((d) => !s.parentRewards.some((r) => r.name === d.name))
        .map((d, i) => ({
          ...d,
          id: `pr_default_${Date.now()}_${i}`,
          createdAt: new Date().toISOString(),
        }));
      return { ...s, parentRewards: [...s.parentRewards, ...defaults] };
    });
  }, []);

  const getState = useCallback((): GameState => latestState(), []);

  const commitGameState = useCallback((next: GameState): boolean => {
    if (getStorageRecoveryStatus()) return false;
    const safeNext = ensurePointsState(next);
    if (!saveState(safeNext)) return false;
    notify(safeNext);
    return true;
  }, []);

  /**
   * v2.8.4: 每日奖励星星发放 — 通过 update() 写入 localStorage + 通知所有订阅者
   * grantDailyRewardOnce 返回的 updatedState 需要通过此路径保存，
   * 不能用 saveTodayLesson 代替（那只存 lesson，不存 GameState）
   */
  const addStars = useCallback((_amount: number) => undefined, []);

  const toggleDecoration = useCallback((decorationId: string) => {
    update((s) => {
      const current = new Set(s.decorations || []);
      const item = getAvatarItemById(decorationId);
      if (current.has(decorationId)) {
        // 卸下
        current.delete(decorationId);
      } else {
        // 装备前检查：同 slot 且不可叠加的自动替换
        if (item && !item.canStack) {
          for (const existingId of current) {
            const existing = getAvatarItemById(existingId);
            if (existing && existing.slot === item.slot && !existing.canStack) {
              current.delete(existingId); // 卸下旧装饰
            }
          }
        }
        // 同 anchor 检查（aura/sticker 等可叠加但同 anchor 只能一个）
        if (item?.canStack) {
          for (const existingId of current) {
            const existing = getAvatarItemById(existingId);
            if (existing && existing.anchor === item.anchor && existing.slot === item.slot) {
              current.delete(existingId);
            }
          }
        }
        current.add(decorationId);
      }
      return { ...s, decorations: Array.from(current) };
    });
  }, []);

  const persistPointsResult = useCallback((result: PointsResult): PointsResult => {
    if (!result.ok) return result;
    if (!commitGameState(result.state)) {
      return { state: latestState(), ok: false, message: '保存失败，积分没有到账。请检查设备存储后重试。', pointsDelta: 0 };
    }
    return result;
  }, [commitGameState]);

  const claimDailyCheckin = useCallback((): PointsResult => {
    const current = latestState();
    if (getStorageRecoveryStatus()) return { state: current, ok: false, message: '当前设备数据不可写，签到未保存。', pointsDelta: 0 };
    return persistPointsResult(claimCheckin(current));
  }, [persistPointsResult]);

  const doCheckin = useCallback((): number | null => {
    const result = claimDailyCheckin();
    return result.ok && result.pointsDelta > 0 ? result.pointsDelta : null;
  }, [claimDailyCheckin]);

  const addParentPoints = useCallback((input: ParentPointsInput): PointsResult => {
    const current = latestState();
    if (getStorageRecoveryStatus()) return { state: current, ok: false, message: '当前设备数据不可写，积分未保存。', pointsDelta: 0 };
    return persistPointsResult(applyParentPoints(current, input));
  }, [persistPointsResult]);

  const requestReward = useCallback((input: RewardRequestInput): PointsResult => {
    const current = latestState();
    if (getStorageRecoveryStatus()) return { state: current, ok: false, message: '当前设备数据不可写，兑换申请未保存。', pointsDelta: 0 };
    return persistPointsResult(applyRewardRequest(current, input));
  }, [persistPointsResult]);

  const resolvePointRedemption = useCallback((input: RedemptionResolutionInput): PointsResult => {
    const current = latestState();
    if (getStorageRecoveryStatus()) return { state: current, ok: false, message: '当前设备数据不可写，处理结果未保存。', pointsDelta: 0 };
    return persistPointsResult(applyRedemptionResolution(current, input));
  }, [persistPointsResult]);

  const submitMistakeReview = useCallback((input: MistakeReviewInput): MistakeReviewResult => {
    const current = latestState();
    if (getStorageRecoveryStatus()) return { state: current, ok: false, correct: false, message: '当前设备数据不可写，订正未保存。', pointsDelta: 0 };
    const result = applyMistakeReview(current, input);
    if (!result.ok) return result;
    if (!commitGameState(result.state)) {
      return { state: latestState(), ok: false, correct: result.correct, message: '保存失败，订正结果没有记录。请检查设备存储后重试。', pointsDelta: 0 };
    }
    return result;
  }, [commitGameState]);

  /**
   * v2.12.0: 保存一次口算练习会话记录。
   */
  const saveMentalMathSession = useCallback((session: MentalMathSession): boolean => {
    const current = latestState();
    const records = Array.isArray(current.mentalMathRecords) ? current.mentalMathRecords : [];
    // A completed session is an immutable transaction. Retrying its save must not
    // duplicate mistakes/events or notify subscribers again.
    if (records.some((record) => record.id === session.id)) return true;

    const generatedIdentity = createEventIdentity();
    const identity = {
      childProfileId: current.childProfileId || generatedIdentity.childProfileId,
      deviceId: current.deviceId || generatedIdentity.deviceId,
    };
    const existingEvents = Array.isArray(current.learningEvents) ? current.learningEvents : [];
    let learningEvents = existingEvents;
    for (const event of buildMentalMathLearningEvents(session, identity)) {
      const appended = appendUniqueEvent(learningEvents, event);
      if (!appended.accepted && appended.reason !== 'duplicate') return false;
      learningEvents = appended.events;
    }

    const existingMistakes = Array.isArray(current.mistakes) ? current.mistakes : [];
    const knownMistakeInstances = new Set(existingMistakes.map((mistake) => mistake.instanceId).filter(Boolean));
    const mistakes = buildMentalMathMistakes(session).filter((mistake) => {
      if (!mistake.instanceId || knownMistakeInstances.has(mistake.instanceId)) return false;
      knownMistakeInstances.add(mistake.instanceId);
      return true;
    });
    return commitGameState({
      ...current,
      childProfileId: identity.childProfileId,
      deviceId: identity.deviceId,
      mentalMathRecords: [...records, session],
      mistakes: [...existingMistakes, ...mistakes],
      learningEvents,
    });
  }, [commitGameState]);

  return {
    state,
    saveMentalMathSession,
    completeQuestion: handleCompleteQuestion,
    retryCorrect: handleRetryCorrect,
    setParentSettings,
    saveParentSettings,
    redeemReward,
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
    toggleDecoration,
    doCheckin,
    claimDailyCheckin,
    addParentPoints,
    requestReward,
    resolvePointRedemption,
    submitMistakeReview,
    getState,
    commitGameState,
    addStars,
    refresh,
  };
}
