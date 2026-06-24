import { GameState, DEFAULT_GAME_STATE, TodayLesson } from './types';
import { normalizeLesson } from './lessonPlanner';

export const LEARNING_STATE_VERSION = 8;

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
    const base = { ...DEFAULT_GAME_STATE, ...obj, version: LEARNING_STATE_VERSION } as VersionedState;
    ensureArrays(base);
    return base;
  }

  // 合并默认值
  const base: VersionedState = {
    ...DEFAULT_GAME_STATE,
    ...(obj as Partial<GameState>),
    version: LEARNING_STATE_VERSION,
  };

  // v5 migration: 移除 easyMode
  migrateParentSettingsV5(base);

  // 修复 parentSettings 缺失字段
  base.parentSettings = {
    ...DEFAULT_GAME_STATE.parentSettings,
    ...(base.parentSettings || {}),
  };

  // 确保v5新增字段存在
  if (!Array.isArray(base.weeklySnapshots)) {
    base.weeklySnapshots = [];
  }
  if (typeof base.skillLevel !== 'number' || base.skillLevel < 1) {
    base.skillLevel = 1;
  }
  if (!Array.isArray(base.decorations)) {
    base.decorations = [];
  }
  if (!Array.isArray(base.collectibleCards)) {
    base.collectibleCards = [];
  }
  if (!base.questionReviewDates || typeof base.questionReviewDates !== 'object') {
    base.questionReviewDates = {};
  }
  if (!base.questionReviewCounts || typeof base.questionReviewCounts !== 'object') {
    base.questionReviewCounts = {};
  }
  if (typeof base.answerAttempts !== 'number' || base.answerAttempts < 0) {
    base.answerAttempts = Math.max(
      Number(base.correctCount ?? 0),
      Number(base.wrongCount ?? 0),
      Number(base.totalCompleted ?? 0)
    );
  }

  ensureArrays(base);

  return base;
}

function migrateParentSettingsV5(base: VersionedState): void {
  // 移除旧版 easyMode 字段
  if (base.parentSettings && 'easyMode' in base.parentSettings) {
    const settings = base.parentSettings as Record<string, unknown>;
    delete settings.easyMode;
    base.parentSettings = settings as unknown as typeof base.parentSettings;
  }
}

function ensureArrays(base: VersionedState): void {
  if (!Array.isArray(base.skillMistakes) && typeof base.skillMistakes !== 'object') {
    base.skillMistakes = {};
  }
  if (!Array.isArray(base.mistakes)) {
    base.mistakes = [];
  }
  if (!Array.isArray(base.completedQuestions)) {
    base.completedQuestions = [];
  }
  if (!Array.isArray(base.badges)) {
    base.badges = [];
  }
  if (!Array.isArray(base.parentRewards)) {
    base.parentRewards = [];
  }
  if (!Array.isArray(base.rewardRedemptions)) {
    base.rewardRedemptions = [];
  }
  if (!Array.isArray(base.parentGateAttempts)) {
    base.parentGateAttempts = [];
  }
  if (!Array.isArray(base.weeklySnapshots)) {
    base.weeklySnapshots = [];
  }
  if (!Array.isArray(base.decorations)) {
    base.decorations = [];
  }
  if (!Array.isArray(base.collectibleCards)) {
    base.collectibleCards = [];
  }
  if (!base.questionReviewDates || typeof base.questionReviewDates !== 'object') {
    base.questionReviewDates = {};
  }
  if (!base.questionReviewCounts || typeof base.questionReviewCounts !== 'object') {
    base.questionReviewCounts = {};
  }
  if (typeof base.answerAttempts !== 'number' || base.answerAttempts < 0) {
    base.answerAttempts = Math.max(
      Number(base.correctCount ?? 0),
      Number(base.wrongCount ?? 0),
      Number(base.totalCompleted ?? 0)
    );
  }
  if (typeof base.skillLevel !== 'number' || base.skillLevel < 1) {
    base.skillLevel = 1;
  }
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
