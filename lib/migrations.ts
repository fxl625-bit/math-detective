import { GameState, DEFAULT_GAME_STATE, TodayLesson, LessonStepType } from './types';
import { normalizeLesson, normalizeStep, getDefaultPhasesForStepType } from './lessonPlanner';

export const LEARNING_STATE_VERSION = 3;

// ========== 扩展状态类型（带 version） ==========

export interface VersionedState extends GameState {
  version: number;
}

// ========== 主迁移入口 ==========

export function migrateGameState(raw: unknown): VersionedState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_STATE, version: LEARNING_STATE_VERSION };
  }

  const obj = raw as Record<string, unknown>;
  const existingVersion = typeof obj.version === 'number' ? obj.version : 0;

  // 已经是当前版本，直接返回
  if (existingVersion === LEARNING_STATE_VERSION) {
    return { ...DEFAULT_GAME_STATE, ...obj, version: LEARNING_STATE_VERSION } as VersionedState;
  }

  // 合并默认值
  const base: VersionedState = {
    ...DEFAULT_GAME_STATE,
    ...(obj as Partial<GameState>),
    version: LEARNING_STATE_VERSION,
  };

  // 修复 parentSettings 缺失字段
  base.parentSettings = {
    ...DEFAULT_GAME_STATE.parentSettings,
    ...(base.parentSettings || {}),
  };

  // 修复 skillMistakes
  if (!base.skillMistakes || typeof base.skillMistakes !== 'object') {
    base.skillMistakes = {};
  }

  // 修复 mistakes 数组
  if (!Array.isArray(base.mistakes)) {
    base.mistakes = [];
  }

  // 修复 completedQuestions 数组
  if (!Array.isArray(base.completedQuestions)) {
    base.completedQuestions = [];
  }

  // 修复 badges 数组
  if (!Array.isArray(base.badges)) {
    base.badges = [];
  }

  // 修复 parentRewards 数组
  if (!Array.isArray(base.parentRewards)) {
    base.parentRewards = [];
  }

  // 修复 rewardRedemptions 数组
  if (!Array.isArray(base.rewardRedemptions)) {
    base.rewardRedemptions = [];
  }

  // 修复 parentGateAttempts 数组
  if (!Array.isArray(base.parentGateAttempts)) {
    base.parentGateAttempts = [];
  }

  return base;
}

// ========== TodayLesson 迁移 ==========

export function migrateTodayLesson(raw: unknown): TodayLesson | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // 尝试 normalize
  const lesson = normalizeLesson(obj as unknown as TodayLesson);
  if (!lesson) return null;

  // 确保每个 step 都有有效的 questionId
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i];
    if (!step.questionId || typeof step.questionId !== 'string') {
      // 无法修复，整个 lesson 作废
      return null;
    }
  }

  return lesson;
}

// ========== 页面初始化时调用 ==========

export function initTodayLesson(): TodayLesson | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem('math-detective-today-lesson');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = migrateTodayLesson(parsed);
      if (migrated) return migrated;
    }
  } catch { /* ignore */ }

  // 旧数据无法修复 → 清除并返回 null，让调用方重新生成
  try {
    localStorage.removeItem('math-detective-today-lesson');
  } catch { /* ignore */ }
  return null;
}
