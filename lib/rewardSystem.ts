/**
 * 每日奖励系统 (v2.6.3 新增)
 *
 * 兼容旧奖励标记，但不再发放星星：
 * 1. 旧课程标记只迁移一次，避免旧弹窗/星星重复发放
 * 2. 同一天同一个 todayLesson 只弹一次奖励弹窗
 * 3. 返回首页、刷新、重进都不再重复弹
 */

import type { TodayLesson, GameState } from './types';
import { getDateString } from './storage';

// ========== 查询 ==========

export function shouldGrantDailyReward(lesson: TodayLesson | undefined): boolean {
  if (!lesson) return false;
  return lesson.completed === true && lesson.rewardClaimed !== true;
}

export function shouldShowDailyRewardModal(lesson: TodayLesson | undefined): boolean {
  if (!lesson) return false;
  return lesson.completed === true && lesson.rewardShown !== true;
}

// ========== 发放 ==========

export function grantDailyRewardOnce(
  state: GameState,
  lesson: TodayLesson
): { state: GameState; lesson: TodayLesson; bonusStars: number } {
  if (!shouldGrantDailyReward(lesson)) {
    return { state, lesson, bonusStars: 0 };
  }

  const now = new Date().toISOString();
  const bonusStars = 0;

  const updatedLesson: TodayLesson = {
    ...lesson,
    rewardClaimed: true,
    rewardClaimedAt: now,
  };

  // Legacy reward flags remain for compatibility; all value now comes from the points ledger.

  return { state, lesson: updatedLesson, bonusStars };
}

// ========== 标记已展示 ==========

export function markDailyRewardShown(
  state: GameState,
  lesson: TodayLesson
): { state: GameState; lesson: TodayLesson } {
  if (!shouldShowDailyRewardModal(lesson)) {
    // 已经展示过，直接返回
    if (lesson.rewardShown) return { state, lesson };
  }

  const now = new Date().toISOString();

  const updatedLesson: TodayLesson = {
    ...lesson,
    rewardShown: true,
    rewardShownAt: now,
  };

  // v2.7.6: 修复 bug — 之前返回了原始 lesson 而不是 updatedLesson
  return { state, lesson: updatedLesson };
}

// ========== Migration ==========

/**
 * 修复旧 completed lesson：设置 rewardClaimed=true 防止重复发星，rewardShown=true 防止重复弹。
 * 
 * 规则：
 * - 如果 completedAt 超过 5 分钟，直接标记 rewardShown=true（不再弹旧任务奖励）
 * - MVP：所有旧 completed lesson 直接标记 rewardShown=true
 */
export function migrateRewardFlags(lesson: TodayLesson): TodayLesson {
  if (!lesson.completed) return lesson;

  let updated = { ...lesson };
  let needsFix = false;

  if (updated.rewardClaimed === undefined) {
    updated.rewardClaimed = true;
    updated.rewardClaimedAt = updated.rewardClaimedAt || getDateString();
    needsFix = true;
  }

  if (updated.rewardShown === undefined) {
    // 旧任务直接标记已展示，不再弹
    updated.rewardShown = true;
    updated.rewardShownAt = updated.rewardShownAt || getDateString();
    needsFix = true;
  }

  if (!updated.completedAt) {
    updated.completedAt = getDateString();
    needsFix = true;
  }

  if (needsFix) {
    console.warn(
      '[Reward Migration] Fixed completed lesson reward flags',
      { date: lesson.date, wasClaimed: lesson.rewardClaimed, wasShown: lesson.rewardShown }
    );
  }

  return updated;
}
