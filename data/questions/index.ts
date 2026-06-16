import { Question, GradeBand, MathDomain, CognitiveSkill } from '@/lib/types';
import { g1Questions } from './g1';
import { g1ThinkingQuestions } from './g1-thinking';
import { g2Questions } from './g2';
import { g2OlympiadQuestions } from './g2-olympiad';
import { g3Questions } from './g3';
import { g3OlympiadQuestions } from './g3-olympiad';
import { g4Questions } from './g4';
import { g4OlympiadQuestions } from './g4-olympiad';
import { g5Questions } from './g5';
import { g5OlympiadQuestions } from './g5-olympiad';
import { g6Questions } from './g6';
import { olympiadIntroQuestions } from './olympiadIntro';
import { g3MultiplicationQuestions } from './g3-multiplication';
import { extraInfoQuestions } from './extra-info';
import { missingInfoQuestions } from './missing-info';
import { allG1Annotations } from './annotations';

// ========== v2.9.0: Annotation merge ==========

/**
 * Merge annotation patches into question data.
 * Annotation patches add curriculum metadata without modifying original data files.
 */
function applyAnnotations(questions: Question[], annotations: Record<string, Partial<Question>>): Question[] {
  return questions.map(q => {
    const patch = annotations[q.id];
    if (!patch) return q;
    return { ...q, ...patch };
  });
}

// ========== 全部题库（含v2.9.0标注合并） ==========

export const allQuestions: Question[] = applyAnnotations([
  ...g1Questions,
  ...g1ThinkingQuestions,
  ...g2Questions,
  ...g2OlympiadQuestions,
  ...g3Questions,
  ...g3OlympiadQuestions,
  ...g4Questions,
  ...g4OlympiadQuestions,
  ...g5Questions,
  ...g5OlympiadQuestions,
  ...g6Questions,
  ...g3MultiplicationQuestions,
  ...extraInfoQuestions,
  ...missingInfoQuestions,
  ...olympiadIntroQuestions,
], allG1Annotations);

// ========== 按年级分组（使用标注后的 allQuestions） ==========

export const questionsByGrade: Record<GradeBand, Question[]> = {
  'G1': allQuestions.filter(q => q.gradeBand === 'G1'),
  'G2': allQuestions.filter(q => q.gradeBand === 'G2'),
  'G3': allQuestions.filter(q => q.gradeBand === 'G3'),
  'G4': allQuestions.filter(q => q.gradeBand === 'G4'),
  'G5': allQuestions.filter(q => q.gradeBand === 'G5'),
  'G6': allQuestions.filter(q => q.gradeBand === 'G6'),
  'OlympiadIntro': allQuestions.filter(q => q.gradeBand === 'OlympiadIntro' || (q as any).isExtendedThinking).map(q => ({ ...q, isExtendedThinking: true })),
};

// ========== 按年级和领域筛选 ==========

export function getQuestionsByFilter(options: {
  grade?: GradeBand;
  domain?: MathDomain;
  difficulty?: number;
  skill?: CognitiveSkill;
  excludeIds?: string[];
  maxDifficulty?: number;
}): Question[] {
  let pool = allQuestions;

  if (options.grade) {
    pool = pool.filter(q => q.gradeBand === options.grade);
  }
  if (options.domain) {
    pool = pool.filter(q => q.domain === options.domain);
  }
  if (options.difficulty !== undefined) {
    pool = pool.filter(q => q.difficulty === options.difficulty);
  }
  if (options.maxDifficulty !== undefined) {
    const maxDiff = options.maxDifficulty;
    pool = pool.filter(q => q.difficulty <= maxDiff);
  }
  if (options.skill) {
    const skill = options.skill;
    pool = pool.filter(q => q.cognitiveSkills.includes(skill));
  }
  if (options.excludeIds && options.excludeIds.length > 0) {
    const excludeSet = new Set(options.excludeIds);
    pool = pool.filter(q => !excludeSet.has(q.id));
  }

  return pool;
}

// ========== 按 ID 查找 ==========

export function getQuestionById(id: string): Question | undefined {
  return allQuestions.find(q => q.id === id);
}

// ========== 获取年级对应的默认领域 ==========

export function getDomainsForGrade(grade: GradeBand): MathDomain[] {
  const questions = questionsByGrade[grade] || [];
  const domains = new Set(questions.map(q => q.domain));
  return Array.from(domains).sort();
}

// ========== 统计信息 ==========

export function getQuestionStats() {
  const stats: Record<string, number> = {};
  for (const [grade, questions] of Object.entries(questionsByGrade)) {
    stats[grade] = questions.length;
  }
  stats['total'] = allQuestions.length;
  return stats;
}

// ========== 获取推荐题目（按学习画像） ==========

export function getRecommendedQuestions(
  grade: GradeBand,
  completedIds: string[],
  weakSkills: CognitiveSkill[],
  count: number,
  maxDifficulty: number,
): Question[] {
  const gradePool = questionsByGrade[grade] || [];
  const completedSet = new Set(completedIds);

  // 未完成的题目
  let available = gradePool.filter(q => !completedSet.has(q.id) && q.difficulty <= maxDifficulty);

  // 优先弱项技能
  if (weakSkills.length > 0) {
    const weakPool = available.filter(q =>
      q.cognitiveSkills.some(s => weakSkills.includes(s))
    );
    if (weakPool.length >= count) {
      available = weakPool;
    }
  }

  // 按难度排序，混合出题
  available.sort((a, b) => a.difficulty - b.difficulty);

  // 取前 count 题，但随机打乱相同难度的题目
  const result = available.slice(0, Math.min(count * 3, available.length));
  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, count);
}

// ========== 为今日课程选择题目 ==========

export function pickDailyQuestions(
  grade: GradeBand,
  completedIds: string[],
  count: number,
  maxDifficulty: number,
): Question[] {
  return getRecommendedQuestions(grade, completedIds, [], count, maxDifficulty);
}
