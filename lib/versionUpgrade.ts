/**
 * 版本升级处理器 (v2.6.1 新增)
 * 
 * 在应用启动时检测版本变化，自动执行迁移、修复和缓存清理。
 */
import { APP_VERSION, LAST_VERSION_KEY } from './appVersion';
import { migrateGameState } from './migrations';
import { migrateRewardFlags } from './rewardSystem';
import type { GameState, TodayLesson } from './types';

/**
 * 检查是否有合法的多余信息。
 * 在修复 todayLesson 时使用，必须在客户端安全环境中运行。
 */
function hasValidExtraNumbers(question: {
  extraNumbers?: number[];
  noisePhrases?: string[];
  usefulPhrases?: string[];
  text?: string;
}): boolean {
  // v2.8.1: spot_extra_info ONLY checks extraNumbers, NOT noisePhrases
  return Array.isArray(question.extraNumbers) && question.extraNumbers.length > 0;
}

function hasValidNoisePhrases(question: {
  noisePhrases?: string[];
}): boolean {
  // v2.8.1: remove_noise ONLY checks noisePhrases
  return Array.isArray(question.noisePhrases) && question.noisePhrases.length > 0;
}

function hasValidExtraInfo(question: {
  extraNumbers?: number[];
  noisePhrases?: string[];
  usefulPhrases?: string[];
  text?: string;
}): boolean {
  // v2.8.1: requires EITHER extraNumbers OR noisePhrases
  return hasValidExtraNumbers(question) || hasValidNoisePhrases(question);

}
/**
 * 修复非法 todayLesson：
 * - 检查 identify_extra_info / spot_extra_info step 是否指向合法题目
 * - 检查 remove_noise step 是否指向有 noisePhrases 的题目
 * - 不合法的 step 标记为需要重建
 */
export function repairInvalidTodayLesson(
  lesson: TodayLesson,
  getQuestionById: (id: string) => {
    extraNumbers?: number[];
    noisePhrases?: string[];
    usefulPhrases?: string[];
    text?: string;
  } | undefined
): { lesson: TodayLesson; wasRepaired: boolean } {
  if (!lesson || !lesson.steps) return { lesson, wasRepaired: false };

  let wasRepaired = false;

  for (const step of lesson.steps) {
    const isExtraInfo = step.type === 'spot_extra_info';
    const isRemoveNoise = step.type === 'remove_noise';

        if (isExtraInfo) {
      const q = getQuestionById(step.questionId);
      if (!q || !hasValidExtraNumbers(q)) {
        console.warn(
          `[Upgrade] Invalid spot_extra_info step detected (questionId=${step.questionId}), marking for repair`
        );
        wasRepaired = true;
        break;
      }
    }
    if (isRemoveNoise) {
      const q = getQuestionById(step.questionId);
      if (!q || !hasValidNoisePhrases(q)) {
        console.warn(
          `[Upgrade] Invalid remove_noise step detected (questionId=${step.questionId}), marking for repair`
        );
        wasRepaired = true;
        break;
      }
    }
  }

  return { lesson, wasRepaired };
}

/**
 * 主入口：处理版本升级。
 * 
 * 1. 检查 localStorage 中的上一次版本
 * 2. 如果不一致（或不存在），执行迁移和修复
 * 3. 写入新版本号
 * 4. 返回修复后的 state
 * 
 * 注意：此函数返回后，调用方仍需执行具体的 rebuildTodayLesson 逻辑。
 */
export function handleAppVersionUpgrade(
  state: GameState,
  getQuestionById: (id: string) => {
    extraNumbers?: number[];
    noisePhrases?: string[];
    usefulPhrases?: string[];
    text?: string;
  } | undefined
): { state: GameState; wasUpgraded: boolean; needsLessonRebuild: boolean } {
  if (typeof window === 'undefined') {
    return { state, wasUpgraded: false, needsLessonRebuild: false };
  }

  const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
  const isSameVersion = lastVersion === APP_VERSION;

  if (isSameVersion) {
    return { state, wasUpgraded: false, needsLessonRebuild: false };
  }

  console.info(
    `[Upgrade] Version change detected: ${lastVersion || 'first-run'} → ${APP_VERSION}`
  );

  // 1. 数据迁移
  let migrated = migrateGameState(state);

  // 2. 修复 todayLesson
  let needsLessonRebuild = false;
  const lessonKey = 'math-detective-today-lesson';
  try {
    const raw = localStorage.getItem(lessonKey);
    if (raw) {
      let lesson = JSON.parse(raw) as TodayLesson;
      const { wasRepaired } = repairInvalidTodayLesson(lesson, getQuestionById);
      if (wasRepaired) {
        console.info('[Upgrade] Invalid todayLesson detected, needs rebuild');
        needsLessonRebuild = true;
        localStorage.removeItem(lessonKey);
      } else {
        // v2.6.3: 奖励幂等迁移 — 修复旧 completed lesson 的 rewardClaimed/rewardShown
        const migrated = migrateRewardFlags(lesson);
        if (migrated !== lesson) {
          localStorage.setItem(lessonKey, JSON.stringify(migrated));
        }
      }
    }
  } catch (e) {
    console.warn('[Upgrade] Failed to read todayLesson:', e);
    needsLessonRebuild = true;
  }

  // 3. 写入新版本号
  localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);

  // 4. 清理旧缓存（异步，不阻塞）
  import('./appVersion').then(({ clearOldCachesSafely }) => {
    clearOldCachesSafely().catch(() => {});
  });

  return { state: migrated, wasUpgraded: true, needsLessonRebuild };
}

/** 简短提示文本 */
export const UPGRADE_TOAST_MESSAGE = '已更新到新版本，学习任务已修复。';
