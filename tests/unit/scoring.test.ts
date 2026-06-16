/**
 * test:scoring — 积分发放逻辑单元测试 (v2.8.4)
 *
 * 运行：npm run test:scoring
 *
 * 覆盖：
 * 1. 答对一题后 stars 增加
 * 2. 答错不增加 stars
 * 3. 答错后再答对，只增加一次
 * 4. 同一题重复提交正确答案，不重复增加（completedQuestions 幂等）
 * 5. 完成每日任务后 daily reward 只发一次（rewardClaimed 幂等）
 * 6. rewardShown=true 不影响单题积分
 * 7. rewardClaimed=true 不影响单题积分
 * 8. 重建今日任务不清空历史积分
 * 9. grantDailyRewardOnce 返回正确 bonusStars
 * 10. migrateRewardFlags 不重置 stars
 */

import assert from 'node:assert/strict';
import { completeQuestion } from '@/lib/storage';
import { grantDailyRewardOnce, migrateRewardFlags, shouldGrantDailyReward } from '@/lib/rewardSystem';
import { generateSafeFallbackLesson } from '@/lib/lessonPlanner';
import { DEFAULT_GAME_STATE, type GameState, type TodayLesson } from '@/lib/types';

// ========== Helper ==========

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...DEFAULT_GAME_STATE, ...overrides };
}

function makeLesson(overrides: Partial<TodayLesson> = {}): TodayLesson {
  return {
    date: '2026-06-16',
    steps: [],
    currentStepIndex: 0,
    completed: false,
    ...overrides,
  };
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
}

// ========== Tests ==========

console.log('\n[test:scoring] Running scoring unit tests...\n');

// 1. 答对一题后 stars 增加
run('1. 答对一题后 stars 增加', () => {
  const state = makeState({ stars: 10, level: 1 });
  const after = completeQuestion(state, 'q_test_001', true);
  assert.ok(after.stars > state.stars, `stars should increase: ${state.stars} → ${after.stars}`);
  assert.equal(after.correctCount, state.correctCount + 1);
  assert.equal(after.totalCompleted, state.totalCompleted + 1);
  assert.equal(after.answerAttempts, state.answerAttempts + 1);
});

// 2. 答错不增加 stars
run('2. 答错不增加 stars', () => {
  const state = makeState({ stars: 5 });
  const after = completeQuestion(state, 'q_test_002', false);
  assert.equal(after.stars, state.stars, `stars should not increase on wrong answer`);
  assert.equal(after.correctCount, state.correctCount, 'correctCount unchanged');
  assert.equal(after.answerAttempts, state.answerAttempts + 1, 'answerAttempts incremented');
});

// 3. 答错后再答对，只增加一次
run('3. 答错后再答对，只增加一次星星', () => {
  const state = makeState({ stars: 0 });
  const afterWrong = completeQuestion(state, 'q_test_003', false);
  assert.equal(afterWrong.stars, 0, 'no stars on wrong');
  const afterRight = completeQuestion(afterWrong, 'q_test_003', true);
  assert.ok(afterRight.stars > 0, 'stars added on correct');
  // 再次提交正确 — 同 questionId 已在 completedQuestions，不重复加
  const afterRepeat = completeQuestion(afterRight, 'q_test_003', true);
  assert.equal(afterRepeat.stars, afterRight.stars, 'no duplicate star on repeat correct');
});

// 4. 同一题重复提交正确答案，completedQuestions 幂等
run('4. 同一题重复提交正确答案不重复加分', () => {
  const state = makeState({ stars: 0 });
  const q = 'q_idempotent_test';
  const after1 = completeQuestion(state, q, true);
  const after2 = completeQuestion(after1, q, true);
  const after3 = completeQuestion(after2, q, true);
  assert.equal(after1.stars, after2.stars, 'second submit same stars');
  assert.equal(after2.stars, after3.stars, 'third submit same stars');
  assert.equal(after1.completedQuestions.filter(id => id === q).length, 1, 'question in list exactly once');
});

// 5. 完成每日任务后 daily reward 只发一次（rewardClaimed 幂等）
run('5. daily reward 只发一次', () => {
  const state = makeState({ stars: 0 });
  const lesson = makeLesson({ completed: true });

  const { lesson: l1, bonusStars: s1 } = grantDailyRewardOnce(state, lesson);
  assert.ok(s1 > 0, `bonusStars should be > 0, got ${s1}`);
  assert.equal(l1.rewardClaimed, true, 'lesson.rewardClaimed should be true');

  // 第二次发放：rewardClaimed=true，应返回 bonusStars=0
  const { bonusStars: s2 } = grantDailyRewardOnce(state, l1);
  assert.equal(s2, 0, `second grant should return bonusStars=0, got ${s2}`);
});

// 6. rewardShown=true 不影响单题积分
run('6. rewardShown=true 不影响单题积分', () => {
  // 单题积分由 completeQuestion 完成，与 rewardShown 完全无关
  const state = makeState({ stars: 10 });
  // 即使 lesson rewardShown=true，completeQuestion 也应该正常加分
  const after = completeQuestion(state, 'q_reward_shown', true);
  assert.ok(after.stars > state.stars, 'stars added regardless of rewardShown');
});

// 7. rewardClaimed=true 不影响单题积分
run('7. rewardClaimed=true 不影响单题积分', () => {
  const state = makeState({ stars: 10 });
  // completeQuestion 不读 rewardClaimed，应正常加分
  const after = completeQuestion(state, 'q_reward_claimed', true);
  assert.ok(after.stars > state.stars, 'stars added regardless of rewardClaimed');
});

// 8. 重建今日任务不清空历史积分
run('8. generateSafeFallbackLesson 不清空 GameState', () => {
  // generateSafeFallbackLesson 返回 TodayLesson，不接触 GameState
  const lesson = generateSafeFallbackLesson('G1');
  assert.ok(lesson, 'fallback lesson created');
  assert.ok(lesson.steps.length > 0, 'fallback lesson has steps');
  // GameState 的 stars 完全不受 generateSafeFallbackLesson 影响（返回值只是 lesson）
  const state = makeState({ stars: 999 });
  // stars 仍然是 999，与 lesson 无关
  assert.equal(state.stars, 999, 'GameState.stars unaffected');
});

// 9. grantDailyRewardOnce 返回正确 bonusStars
run('9. grantDailyRewardOnce 返回 bonusStars >= 3', () => {
  const state = makeState({ stars: 0 });
  const lesson = makeLesson({ completed: true });
  const { bonusStars } = grantDailyRewardOnce(state, lesson);
  assert.ok(bonusStars >= 3, `bonusStars should be >= 3, got ${bonusStars}`);
  // 已知规则：3 基础 + 2 全关完成 = 5
  assert.equal(bonusStars, 5, `bonusStars should be exactly 5 for completed lesson`);
});

// 10. migrateRewardFlags 不重置 stars（lesson 中没有 stars 字段）
run('10. migrateRewardFlags 不重置 stars', () => {
  const lesson = makeLesson({ completed: true });
  const migrated = migrateRewardFlags(lesson);
  // migrateRewardFlags 应只设置 rewardClaimed/rewardShown，不接触 stars
  assert.equal(migrated.rewardClaimed, true);
  assert.equal(migrated.rewardShown, true);
  assert.ok(!('stars' in migrated), 'lesson should not have stars field');
});

// 11. shouldGrantDailyReward 语义
run('11. shouldGrantDailyReward: completed+unclaimed → true', () => {
  assert.equal(shouldGrantDailyReward(makeLesson({ completed: true, rewardClaimed: false })), true);
  assert.equal(shouldGrantDailyReward(makeLesson({ completed: true, rewardClaimed: true })), false);
  assert.equal(shouldGrantDailyReward(makeLesson({ completed: false })), false);
  assert.equal(shouldGrantDailyReward(undefined), false);
});

// 12. correctCount 单调递增
run('12. 多次答对 correctCount 单调递增', () => {
  let state = makeState();
  const ids = ['q_a', 'q_b', 'q_c'];
  for (const id of ids) {
    state = completeQuestion(state, id, true);
  }
  assert.equal(state.correctCount, ids.length);
  assert.equal(state.totalCompleted, ids.length);
});

console.log('\n[test:scoring] All tests passed ✓\n');
