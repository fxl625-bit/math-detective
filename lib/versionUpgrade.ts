/**
 * 版本升级处理器 (v2.6.1 新增)
 * 
 * 在应用启动时检测版本变化，自动执行迁移、修复和缓存清理。
 */
import { APP_VERSION, LAST_VERSION_KEY } from './appVersion';
import { migrateGameState } from './migrations';
import type { GameState, TodayLesson } from './types';

/**
 * 检查是否有合法的多余信息。
 * 在修复 todayLesson 时使用，必须在客户端安全环境中运行。
 */
function hasValidExtraInfo(question: {
  extraNumbers?: number[];
  noisePhrases?: string[];
  usefulPhrases?: string[];
  text?: string;
}): boolean {
  const extraCount = (question.extraNumbers ?? []).length;
  const noiseCount = (question.noisePhrases ?? []).length;
  if (extraCount === 0 && noiseCount === 0) return false;
  // 至少有一些 usefulPhrases
  if ((question.usefulPhrases ?? []).length === 0) return false;
  return true;
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

    if (isExtraInfo || isRemoveNoise) {
      const q = getQuestionById(step.questionId);
      if (!q || !hasValidExtraInfo(q)) {
        console.warn(
          `[Upgrade] Invalid ${step.type} step detected (questionId=${step.questionId}), marking for repair`
        );
        wasRepaired = true;
        break; // 一个无效即需重建整体
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
      const lesson = JSON.parse(raw) as TodayLesson;
      const { wasRepaired } = repairInvalidTodayLesson(lesson, getQuestionById);
      if (wasRepaired) {
        console.info('[Upgrade] Invalid todayLesson detected, needs rebuild');
        needsLessonRebuild = true;
        // 清除旧课程数据
        localStorage.removeItem(lessonKey);
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
