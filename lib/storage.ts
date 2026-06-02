import { GameState, DEFAULT_GAME_STATE, MistakeRecord } from './types';

const STORAGE_KEY = 'math-detective-state';

export function loadState(): GameState {
  if (typeof window === 'undefined') return { ...DEFAULT_GAME_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GAME_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_GAME_STATE };
  }
}

export function saveState(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full, ignore
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

  // 答错：只记录 attempt 和复习日期，不改变 totalCompleted 和 correctCount
  if (!correct) {
    return {
      ...state,
      answerAttempts: newAttempts,
      questionReviewDates: reviewDates,
      questionReviewCounts: reviewCounts,
    };
  }

  // 答对：如果是重复做题，不重复计分
  if (alreadyDone) {
    return {
      ...state,
      answerAttempts: newAttempts,
      questionReviewDates: reviewDates,
      questionReviewCounts: reviewCounts,
    };
  }

  const newStars = getStarReward(state.level);

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
    stars: state.stars + newStars,
    skillLevel: newSkillLevel,
    weeklySnapshots: newSnapshots,
    questionReviewDates: reviewDates,
    questionReviewCounts: reviewCounts,
  };
}

function getStarReward(level: number): number {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
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
  const today = getDateString();
  if (state.lastCheckinDate === today) return null; // 今天已签到

  const bonus = Math.floor(Math.random() * 5) + 1; // 1-5 颗随机星星
  return {
    state: { ...state, stars: state.stars + bonus, lastCheckinDate: today },
    bonus,
  };
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
  const playedToday = state.lastPlayDate === today;
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
