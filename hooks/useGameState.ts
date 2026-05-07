'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, DEFAULT_GAME_STATE, DEFAULT_PARENT_REWARDS, MistakeRecord, ParentReward, RewardRedemption, ParentGateAttempt } from '@/lib/types';
import {
  loadState,
  saveState,
  checkDailyReset,
  updateStreak,
  checkWeeklyCard,
  calculateLevel,
  checkBadges,
  addMistake,
  retryMistakeCorrect,
  completeQuestion,
} from '@/lib/storage';

let globalState: GameState | null = null;
let listeners: Array<(s: GameState) => void> = [];

function notify(state: GameState) {
  globalState = state;
  listeners.forEach((fn) => fn(state));
}

function update(updater: (s: GameState) => GameState) {
  const current = globalState ?? loadState();
  const next = updater(current);
  saveState(next);
  notify(next);
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    if (globalState) return globalState;
    const loaded = loadState();
    const daily = checkDailyReset(loaded);
    const weekly = checkWeeklyCard(daily);
    const leveled = { ...weekly, level: calculateLevel(weekly.stars) };
    const badged = { ...leveled, badges: checkBadges(leveled) };
    globalState = badged;
    return badged;
  });

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((fn) => fn !== setState);
    };
  }, []);

  const refresh = useCallback(() => {
    const current = globalState ?? loadState();
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
        ns.level = calculateLevel(ns.stars);
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

  const setParentSettings = useCallback((settings: { dailyGoal?: number; gradeBand?: import('@/lib/types').GradeBand; easyMode?: boolean }) => {
    update((s) => ({
      ...s,
      parentSettings: { ...s.parentSettings, ...settings },
    }));
  }, []);

  const redeemReward = useCallback((cost: number): boolean => {
    let success = false;
    update((s) => {
      if (s.stars < cost) return s;
      success = true;
      return { ...s, stars: s.stars - cost };
    });
    return success;
  }, []);

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
    let success = false;
    update((s) => {
      if (s.stars < reward.cost) return s;
      success = true;
      return {
        ...s,
        stars: s.stars - reward.cost,
        rewardRedemptions: [
          ...s.rewardRedemptions,
          {
            id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            rewardId: reward.id,
            rewardName: reward.name,
            starsSpent: reward.cost,
            redeemedAt: new Date().toISOString(),
            status: 'pending' as const,
          },
        ],
      };
    });
    return success;
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
      const redemption = s.rewardRedemptions.find((r) => r.id === redemptionId);
      const updated: typeof s.rewardRedemptions = s.rewardRedemptions.map((r) =>
        r.id === redemptionId ? { ...r, status: 'cancelled' as const } : r
      );
      if (refundStars && redemption) {
        return { ...s, stars: s.stars + redemption.starsSpent, rewardRedemptions: updated };
      }
      return { ...s, rewardRedemptions: updated };
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

  const getState = useCallback((): GameState => {
    return globalState ?? loadState();
  }, []);

  return {
    state,
    completeQuestion: handleCompleteQuestion,
    retryCorrect: handleRetryCorrect,
    setParentSettings,
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
    getState,
    refresh,
  };
}
