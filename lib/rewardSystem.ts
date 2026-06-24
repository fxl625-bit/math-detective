/**
 * 每日奖励系统 (v2.6.3 新增)
 *
 * 确保每日奖励幂等：
 * 1. 同一天同一个 todayLesson 只发一次星星/经验
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
  const bonusStars = calculatedDailyStars(lesson);

  const updatedLesson: TodayLesson = {
    ...lesson,
    rewardClaimed: true,
    rewardClaimedAt: now,
  };

  // v2.8.4 修复：只更新 lesson 的 rewardClaimed 标志
  // stars 实际写入由调用方通过 addStars(bonusStars) 完成，
  // 不在此处修改 state.stars（避免 stale closure 问题）
  console.info(
    `[Reward] Granting daily reward: ${bonusStars} stars, date=${lesson.date}`
  );

  return { state, lesson: updatedLesson, bonusStars };
}

function calculatedDailyStars(lesson: TodayLesson): number {
  // 基础：完成今日任务 = 3 颗星
  let stars = 3;
  // 全部关卡完成额外 +2
  if (lesson.completed) stars += 2;
  return stars;
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

  const updated = { ...lesson };
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
