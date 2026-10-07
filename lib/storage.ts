import { GameState, DEFAULT_GAME_STATE, MistakeRecord } from './types';
import { initCurriculumProfile, buildLearnerProfile, detectUsageStage } from './learnerProfile';
import { detectSemesterProgress, resolveEffectiveSemester } from './curriculum/semesterDetector';
import type { Semester } from './curriculum/types';
import type { SkillMastery } from './curriculum/types';
import { normalizeLearningSettingsFromParent } from './learningSettings';
import { ensurePointsState, isValidPointsWallet } from './familyPoints';
import { getLegacyQualifiedItems } from '@/data/avatarItems';

const STORAGE_KEY = 'math-detective-state';
export type StorageRecoveryStatus = 'corrupt' | 'unavailable' | null;
let storageRecoveryStatus: StorageRecoveryStatus = null;

export function getStorageRecoveryStatus(): StorageRecoveryStatus {
  return storageRecoveryStatus;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function isValidMistakeReviewAttempts(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => !!item && typeof item === 'object' && !Array.isArray(item)
    && typeof item.id === 'string' && item.id.length > 0
    && typeof item.recordId === 'string' && item.recordId.length > 0
    && typeof item.questionId === 'string' && item.questionId.length > 0
    && typeof item.actionId === 'string' && item.actionId.length > 0
    && (typeof item.answer === 'string' || (!!item.answer && typeof item.answer === 'object' && !Array.isArray(item.answer)
      && Object.values(item.answer).every(value => typeof value === 'string')))
    && typeof item.correct === 'boolean'
    && Number.isFinite(Date.parse(item.submittedAt))
    && Number.isSafeInteger(item.pointsDeltaUnits) && item.pointsDeltaUnits >= 0);
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return { ...DEFAULT_GAME_STATE };
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { storageRecoveryStatus = null; return ensurePointsState({ ...DEFAULT_GAME_STATE }); }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { storageRecoveryStatus = 'corrupt'; return { ...DEFAULT_GAME_STATE }; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      storageRecoveryStatus = 'corrupt';
      return { ...DEFAULT_GAME_STATE };
    }
    storageRecoveryStatus = null;
    const parsedRecord = parsed as Record<string, unknown>;
    const parsedSettings = parsedRecord.parentSettings && typeof parsedRecord.parentSettings === 'object' && !Array.isArray(parsedRecord.parentSettings)
      ? parsedRecord.parentSettings
      : {};
    const mergedSettings = { ...DEFAULT_GAME_STATE.parentSettings, ...parsedSettings };
    if (typeof mergedSettings.gradeBand !== 'string' || !/^G[1-6]$/.test(mergedSettings.gradeBand)) {
      mergedSettings.gradeBand = DEFAULT_GAME_STATE.parentSettings.gradeBand;
    }
    if (mergedSettings.semesterOverride !== 'upper' && mergedSettings.semesterOverride !== 'lower') {
      mergedSettings.semesterOverride = undefined;
    }
    const priorLearningSettings = (mergedSettings.learningSettings && typeof mergedSettings.learningSettings === 'object'
      ? mergedSettings.learningSettings
      : {}) as Record<string, unknown>;
    mergedSettings.learningSettings = normalizeLearningSettingsFromParent(mergedSettings as GameState['parentSettings'], {
      unitId: priorLearningSettings.unitId,
      learnedTableRange: priorLearningSettings.learnedTableRange,
      challengePreference: priorLearningSettings.challengePreference,
    });
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      ...parsedRecord,
      parentSettings: mergedSettings,
    };
    if (parsedRecord.pointsWallet !== undefined && !isValidPointsWallet(parsedRecord.pointsWallet)) {
      throw new Error('points wallet is corrupt');
    }
    if (parsedRecord.mistakeReviewAttempts !== undefined && !isValidMistakeReviewAttempts(parsedRecord.mistakeReviewAttempts)) {
      throw new Error('mistake review history is corrupt');
    }
    if (parsedRecord.unlockedAvatarItemIds !== undefined && (!Array.isArray(parsedRecord.unlockedAvatarItemIds)
      || parsedRecord.unlockedAvatarItemIds.some(id => typeof id !== 'string'))) {
      throw new Error('unlocked avatar item list is corrupt');
    }
    const previouslyUnlocked = Array.isArray(state.unlockedAvatarItemIds) ? state.unlockedAvatarItemIds : [];
    const legacyUnlocked = parsedRecord.pointsWallet === undefined
      ? getLegacyQualifiedItems(state).map(item => item.id)
      : [];
    Object.assign(state, ensurePointsState(state));
    state.unlockedAvatarItemIds = [...new Set([...previouslyUnlocked, ...legacyUnlocked])];
    if (!state.curriculumProfile || typeof state.curriculumProfile !== 'object' || Array.isArray(state.curriculumProfile)) {
      state.curriculumProfile = undefined;
    }
    if (!state.learnerProfile || typeof state.learnerProfile !== 'object' || Array.isArray(state.learnerProfile)) {
      state.learnerProfile = undefined;
    }

    const semesterResolution = resolveEffectiveSemester({
      semesterOverride: state.parentSettings.learningSettings?.semesterSource === 'manual'
        ? state.parentSettings.learningSettings.semester
        : undefined,
    });
    state.parentSettings.gradeBand = state.parentSettings.learningSettings!.grade;
    state.parentSettings.semesterOverride = state.parentSettings.learningSettings?.semesterSource === 'manual'
      ? state.parentSettings.learningSettings.semester
      : undefined;
    state.parentSettings.textbookEdition = state.parentSettings.learningSettings?.textbookEdition;
    state.parentSettings.dailyGoal = state.parentSettings.learningSettings!.dailyGoal;

    // v2.9.0: Auto-migrate — initialize curriculumProfile if missing
    if (!state.curriculumProfile) {
      const gradeMatch = state.parentSettings.gradeBand.match(/G(\d+)/);
      const grade = gradeMatch ? parseInt(gradeMatch[1]) : 1;
      state.curriculumProfile = initCurriculumProfile({
        grade,
        textbookEdition: state.parentSettings.textbookEdition,
        semesterOverride: state.parentSettings.semesterOverride as Semester | undefined,
      });
    }

    // Keep the persisted profile aligned with the same effective value used by lesson generation.
    const settingsGrade = Number(state.parentSettings.learningSettings?.grade.slice(1) || 1);
    const settingsEdition = state.parentSettings.learningSettings?.textbookEdition || 'generic_cn';
    const profileMatchesSettings = state.curriculumProfile.grade === settingsGrade
      && state.curriculumProfile.textbookEdition === settingsEdition
      && state.curriculumProfile.semester === semesterResolution.semester;
    state.curriculumProfile.grade = settingsGrade;
    state.curriculumProfile.textbookEdition = settingsEdition;
    state.curriculumProfile.semester = semesterResolution.semester;
    state.curriculumProfile.semesterOverride = semesterResolution.source === 'override'
      ? semesterResolution.semester
      : undefined;
    if (!profileMatchesSettings) state.curriculumProfile.detectedAt = new Date().toISOString();

    // v2.9.1: Always refresh semesterProgress (month may have changed)
    state.curriculumProfile.semesterProgress = detectSemesterProgress(new Date(), semesterResolution.semester);

    // v2.9.1: Ensure trainingMode + schoolHarder defaults
    if (!state.trainingMode) state.trainingMode = 'adaptive';
    if (state.schoolHarder === undefined) state.schoolHarder = false;

    // v2.9.1: Compute mastered skill ratio from learnerProfile
    const skillMastery = state.learnerProfile?.skillMastery || {};
    const allSkillIds = Object.keys(skillMastery);
    const masteredCount = allSkillIds.filter(
      id => (skillMastery[id] as SkillMastery)?.status === 'mastered'
    ).length;
    const masteredSkillRatio = allSkillIds.length > 0 ? masteredCount / allSkillIds.length : 0;

    // v2.11.0: Compute daysSinceStart from actual startedAt date
    const startedAt = state.learnerProfile?.startedAt;
    const startedAtTimestamp = startedAt ? Date.parse(startedAt) : NaN;
    const hasValidStartedAt = Number.isFinite(startedAtTimestamp);
    const daysSinceStart = hasValidStartedAt
      ? Math.max(1, Math.floor((Date.now() - startedAtTimestamp) / (1000 * 60 * 60 * 24)))
      : Math.max(1, Math.ceil((state.totalCompleted || 0) / 6));

    // v2.9.1: Detect usage stage with extended params
    const stageInfo = detectUsageStage(
      daysSinceStart,
      state.totalCompleted || 0,
      {
        recentAccuracy: state.learnerProfile?.recentAccuracy,
        consecutiveCheckInDays: state.streak || 0,
        fullHintRate: state.learnerProfile?.fullHintRate || 0,
        masteredSkillRatio,
      },
    );
    state.usageStage = stageInfo.stage;

    // v2.9.0 FIX + v2.9.1: Build/rebuild learnerProfile
    if (!state.learnerProfile) {
      state.learnerProfile = buildLearnerProfile({
        curriculumProfile: state.curriculumProfile as any,
        attemptRecords: state.attemptRecords || [],
        totalCompleted: state.totalCompleted || 0,
        consecutiveCheckInDays: state.streak || 0,
      });
    } else {
      state.learnerProfile = buildLearnerProfile({
        existingProfile: state.learnerProfile as any,
        curriculumProfile: state.curriculumProfile as any,
        attemptRecords: state.attemptRecords || [],
        totalCompleted: state.totalCompleted || 0,
        startedAt: state.learnerProfile.startedAt,
        consecutiveCheckInDays: state.streak || 0,
        preserveDifficulty: true,
      });
    }

    // Persist only a real migration/change. Reading state is otherwise idempotent.
    if (stableSerialize(state) !== stableSerialize(parsedRecord)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { storageRecoveryStatus = 'unavailable'; }
    }

    return state;
  } catch {
    storageRecoveryStatus = raw === null ? 'unavailable' : 'corrupt';
    return { ...DEFAULT_GAME_STATE };
  }
}

export function saveState(state: GameState): boolean {
  if (typeof window === 'undefined') return false;
  if (storageRecoveryStatus) return false;
  try {
    if ((state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet))
      || (state.mistakeReviewAttempts !== undefined && !isValidMistakeReviewAttempts(state.mistakeReviewAttempts))) {
      storageRecoveryStatus = 'corrupt';
      return false;
    }
    const safeState = ensurePointsState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
    return true;
  } catch {
    storageRecoveryStatus = 'unavailable';
    return false;
  }
}

// ========== 每日重置检查 ==========

export function checkDailyReset(state: GameState): GameState {
  const today = getDateString();
  if (state.lastPlayDate !== today) {
    return {
      ...state,
      lastPlayDate: today,
      completedToday: 0,
    };
  }
  return state;
}

// ========== 连续打卡 ==========

export function updateStreak(state: GameState): GameState {
  const today = getDateString();
  if (state.lastStreakCheckDate === today) return state;

  const yesterday = getDateString(new Date(Date.now() - 86400000));
  let newStreak = state.streak;
  let newCards = state.resumeCards;

  if (state.lastStreakCheckDate === yesterday) {
    newStreak = state.streak + 1;
  } else if (state.lastStreakCheckDate !== today) {
    // 断签了，如果有补签卡自动使用
    if (newCards > 0 && state.streak > 0) {
      newCards -= 1;
      newStreak = state.streak + 1;
    } else {
      newStreak = 1;
    }
  }

  return {
    ...state,
    streak: newStreak,
    resumeCards: newCards,
    lastStreakCheckDate: today,
  };
}

// ========== 每周送补签卡 ==========

export function checkWeeklyCard(state: GameState): GameState {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  if (dayOfWeek === 0) {
    // 每周日送一张，最多持有2张
    return {
      ...state,
      resumeCards: Math.min(state.resumeCards + 1, 2),
    };
  }
  return state;
}

// ========== 等级计算 ==========

export function getLevelInfo(level: number) {
  const levels = [
    { level: 1, name: '见习侦探', minStars: 0, icon: '🔍', title: '见习侦探' },
    { level: 2, name: '探员', minStars: 20, icon: '⭐', title: '探员' },
    { level: 3, name: '高级探员', minStars: 50, icon: '🌟', title: '高级探员' },
    { level: 4, name: '侦探', minStars: 100, icon: '💫', title: '侦探' },
    { level: 5, name: '名侦探', minStars: 200, icon: '👑', title: '名侦探' },
    { level: 6, name: '传奇侦探', minStars: 400, icon: '🏆', title: '传奇侦探' },
  ];
  return levels.find((l) => l.level === level) || levels[0];
}

export function calculateLevel(stars: number): number {
  if (stars >= 400) return 6;
  if (stars >= 200) return 5;
  if (stars >= 100) return 4;
  if (stars >= 50) return 3;
  if (stars >= 20) return 2;
  return 1;
}

// ========== 徽章检查 ==========

export function checkBadges(state: GameState): string[] {
  const newBadges = [...state.badges];
  const add = (id: string) => {
    if (!newBadges.includes(id)) newBadges.push(id);
  };

  if (state.streak >= 3) add('streak_3');
  if (state.streak >= 7) add('streak_7');
  if (state.streak >= 14) add('streak_14');
  if (state.totalCompleted >= 10) add('completed_10');
  if (state.totalCompleted >= 50) add('completed_50');
  if (state.totalCompleted >= 100) add('completed_100');
  if (state.level >= 3) add('level_3');
  if (state.level >= 5) add('level_5');
  if (state.correctCount >= 10 && state.wrongCount === 0) add('perfect_10');
  if (state.correctCount >= 30 && state.wrongCount <= 2) add('accuracy_high');

  return newBadges;
}

// ========== 错题 ==========

export function addMistake(state: GameState, record: MistakeRecord): GameState {
  return {
    ...state,
    mistakes: [...state.mistakes, record],
    wrongCount: state.wrongCount + 1,
  };
}

export function retryMistakeCorrect(state: GameState, questionId: string): GameState {
  return {
    ...state,
    mistakes: state.mistakes.map((m) =>
      m.questionId === questionId ? { ...m, retriedCorrect: true } : m
    ),
  };
}

// ========== 完成题目 ==========

export function completeQuestion(
  state: GameState,
  questionId: string,
  correct: boolean
): GameState {
  const alreadyDone = state.completedQuestions.includes(questionId);

  // 记录复习日期（新题和复习都记录）
  const today = getDateString();
  const reviewDates = { ...(state.questionReviewDates || {}) };
  const reviewCounts = { ...(state.questionReviewCounts || {}) };
  reviewDates[questionId] = today;
  reviewCounts[questionId] = (reviewCounts[questionId] || 0) + 1;

  // 每次提交答案都计入 answerAttempts
  const newAttempts = (state.answerAttempts || 0) + 1;

  // v2.6.8: 记录每次提交的详情，用于精准统计
  const newRecord: import('./types').AttemptRecord = {
    questionId,
    isCorrect: correct,
    submittedAt: new Date().toISOString(),
    attemptType: 'final_answer',
  };
  const existingRecords = state.attemptRecords || [];
  // Keep the historical submission stream append-only. This legacy row does
  // not prove which lesson instance was answered first; learningEvents does.
  const attemptRecords = [...existingRecords, newRecord].slice(-200);

  // 答错：只记录 attempt 和复习日期，不改变 totalCompleted 和 correctCount
  if (!correct) {
    return {
      ...state,
      stars: 0,
      answerAttempts: newAttempts,
      questionReviewDates: reviewDates,
      questionReviewCounts: reviewCounts,
      attemptRecords,
    };
  }

  // 答对：如果是重复做题，不重复计分
  if (alreadyDone) {
    return {
      ...state,
      stars: 0,
      answerAttempts: newAttempts,
      questionReviewDates: reviewDates,
      questionReviewCounts: reviewCounts,
      attemptRecords,
    };
  }

  let newSkillLevel = state.skillLevel || 1;
  if (state.correctCount % 5 === 0 && newSkillLevel < 10) {
    newSkillLevel += 1;
  }

  let newSnapshots = state.weeklySnapshots || [];
  newSnapshots = recordWeeklySnapshot(newSnapshots, state, correct);

  return {
    ...state,
    completedQuestions: [...state.completedQuestions, questionId],
    completedToday: state.completedToday + 1,
    totalCompleted: state.totalCompleted + 1,
    correctCount: state.correctCount + 1,
    answerAttempts: newAttempts,
    stars: 0,
    skillLevel: newSkillLevel,
    weeklySnapshots: newSnapshots,
    questionReviewDates: reviewDates,
    questionReviewCounts: reviewCounts,
    attemptRecords,
  };
}

// ========== 每周快照 ==========

function getWeekStart(date?: Date): string {
  const d = date || new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

function recordWeeklySnapshot(
  snapshots: import('./types').WeeklySnapshot[],
  state: GameState,
  justCorrect: boolean
): import('./types').WeeklySnapshot[] {
  const weekStart = getWeekStart();
  const existing = snapshots.find(s => s.weekStart === weekStart);

  if (existing) {
    existing.totalCorrect += justCorrect ? 1 : 0;
    existing.totalWrong += justCorrect ? 0 : 1;
    return [...snapshots.filter(s => s.weekStart !== weekStart), existing];
  }

  const newSnapshot: import('./types').WeeklySnapshot = {
    weekStart,
    skills: {},
    totalCorrect: justCorrect ? 1 : 0,
    totalWrong: justCorrect ? 0 : 1,
  };

  return [...snapshots.slice(-11), newSnapshot];
}

// ========== 工具函数 ==========

export function getDateString(date?: Date): string {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStreakMood(streak: number): string {
  if (streak >= 30) return '🔥🔥 火热的侦探魂！';
  if (streak >= 14) return '🔥 坚持不懈的侦探！';
  if (streak >= 7) return '⭐ 侦探正在发光！';
  if (streak >= 3) return '💪 侦探在成长中！';
  return '🕵️ 新的一天，新的案件！';
}

// ========== 每日签到 ==========

export function checkDailyCheckin(state: GameState): { state: GameState; bonus: number } | null {
  // Kept as a compatibility shim. New check-ins must use claimCheckin(),
  // which writes an idempotent half-point ledger entry.
  void state;
  return null;
}

// ========== 最近7天打卡状态 ==========

// ========== 收集型角色卡 ==========

const COLLECTIBLE_CONDITIONS: Array<{ id: string; check: (s: GameState) => boolean }> = [
  { id: 'card-ocean', check: (s) => s.streak >= 30 },
  { id: 'card-space', check: (s) => s.totalCompleted >= 200 },
  { id: 'card-legend', check: (s) => s.level >= 6 },
  { id: 'card-jungle', check: (s) => s.stars >= 100 },
  { id: 'card-winter', check: (s) => s.streak >= 14 },
  { id: 'card-ninja', check: (s) => s.correctCount >= 50 && s.wrongCount === 0 },
  { id: 'card-chef', check: (s) => s.rewardRedemptions.length >= 10 },
  { id: 'card-artist', check: (s) => s.completedQuestions.length >= 8 },
];

export function checkCollectibleCards(state: GameState): string[] {
  const existing = new Set(state.collectibleCards || []);
  const newlyUnlocked: string[] = [];
  for (const card of COLLECTIBLE_CONDITIONS) {
    if (!existing.has(card.id) && card.check(state)) {
      newlyUnlocked.push(card.id);
    }
  }
  return newlyUnlocked;
}

// ========== 正确率计算 ==========

export function calculateAccuracy(state: { correctCount: number; answerAttempts: number }): number {
  const attempts = Math.max(0, Number(state.answerAttempts ?? 0));
  const correct = Math.max(0, Number(state.correctCount ?? 0));
  if (attempts <= 0) return 0;
  const safeCorrect = Math.min(correct, attempts);
  return Math.round((safeCorrect / attempts) * 100);
}

/**
 * v2.6.8: 统一正确率统计函数
 *
 * 口径说明:
 * - 正确率只统计每个 questionInstanceId 的首个真实提交，来源为 learningEvents
 * - 无首答证据的旧 attemptRecords 只计入 unknownLegacyCount，不伪造正确率
 * - 今日完成按 question_completed 事件的课程实例去重
 * - 未作答题目不计入分母，未完成关卡不计入错误
 * - 如果 totalAttempts = 0，正确率返回 0
 */
export function getAccuracyStats(state: GameState): import('./types').AccuracyStats {
  const records = state.attemptRecords || [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStr = getDateString();
  const orderedAttempts = (state.learningEvents || []).map((event, index) => ({ event, index }))
    .filter(({ event }) => event.eventType === 'attempt_submitted')
    .sort((left, right) => left.event.timestamp.localeCompare(right.event.timestamp) || left.index - right.index)
    .map(({ event }) => event);
  const firstByInstance = new Map<string, NonNullable<GameState['learningEvents']>[number]>();
  for (const event of orderedAttempts) if (!firstByInstance.has(event.questionInstanceId)) firstByInstance.set(event.questionInstanceId, event);
  const knownFirstAnswers = [...firstByInstance.values()].filter(event => event.firstAttemptKnown === true);
  const firstQuestionIds = new Set(knownFirstAnswers.map(event => event.questionId));
  const unknownQuestionIds = new Set([...firstByInstance.values()]
    .filter(event => event.firstAttemptKnown !== true)
    .map(event => event.questionId));
  for (const record of records) if (!firstQuestionIds.has(record.questionId)) unknownQuestionIds.add(record.questionId);
  const unknownLegacyCount = unknownQuestionIds.size;

  const totalAttempts = knownFirstAnswers.length;
  const correctAttempts = knownFirstAnswers.filter(event => event.result === 'correct').length;
  const overallAccuracy = totalAttempts > 0
    ? Math.round((correctAttempts / totalAttempts) * 100)
    : 0;

  const last7DaysRecords = knownFirstAnswers.filter(event => {
    const d = new Date(event.timestamp);
    return d >= sevenDaysAgo && d <= now;
  });
  const last7DaysTotalAttempts = last7DaysRecords.length;
  const last7DaysCorrectAttempts = last7DaysRecords.filter(event => event.result === 'correct').length;
  const last7DaysAccuracy = last7DaysTotalAttempts > 0
    ? Math.round((last7DaysCorrectAttempts / last7DaysTotalAttempts) * 100)
    : 0;
  const todayCompleted = new Set((state.learningEvents || []).filter(event => {
    if (event.eventType !== 'question_completed' || !event.questionInstanceId) return false;
    const date = new Date(event.timestamp);
    return Number.isFinite(date.getTime()) && getDateString(date) === todayStr;
  }).map(event => event.questionInstanceId)).size;

  return {
    todayCompleted,
    overallAccuracy,
    isKnown: totalAttempts > 0,
    unknownLegacyCount,
    last7DaysAccuracy,
    last7DaysIsKnown: last7DaysTotalAttempts > 0,
    totalAttempts,
    correctAttempts,
    last7DaysTotalAttempts,
    last7DaysCorrectAttempts,
  };
}

export function normalizeStats(state: GameState): GameState {
  const answerAttempts = Math.max(
    Number(state.answerAttempts ?? 0),
    Number(state.correctCount ?? 0),
    Number(state.wrongCount ?? 0)
  );
  const safeAttempts = Math.max(answerAttempts, Number(state.correctCount ?? 0));
  return { ...state, answerAttempts: safeAttempts };
}

export function formatAccuracy(accuracy: number): string {
  return `${Math.max(0, Math.min(100, Math.round(accuracy)))}%`;
}

// ========== 7天打卡状态 ==========

export function getWeekStreakStatus(state: GameState): boolean[] {
  const today = getDateString();
  const playedToday = (state.learningEvents || []).some(event => event.eventType === 'attempt_submitted' && event.timestamp.slice(0, 10) === today)
    || (state.attemptRecords || []).some(record => record.submittedAt.slice(0, 10) === today)
    || (state.mentalMathRecords || []).some(session => session.date === today && session.totalQuestions > 0)
    || (state.lastPlayDate === today && state.completedToday > 0);
  const result: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    if (i === 0) {
      result.push(playedToday);
    } else {
      result.push(playedToday && state.streak > i);
    }
  }
  return result;
}
