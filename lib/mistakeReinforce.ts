import { MistakeRecord, Question } from './types';
import { allQuestions } from '@/data/questions';

export interface ReinforceChallenge {
  questions: Question[];
  targetSkill: string;
  domain: string;
}

/**
 * 根据错题记录生成针对性再练挑战（3道同知识点不同题目）
 */
export function generateReinforceChallenge(
  mistake: MistakeRecord,
  completedIds: string[]
): ReinforceChallenge | null {
  const originalQuestion = allQuestions.find(q => q.id === mistake.questionId);
  if (!originalQuestion) return null;

  const { domain, cognitiveSkills } = originalQuestion;
  const completedSet = new Set(completedIds);

  // 找同领域、同认知技能但不同ID的题目
  let candidates = allQuestions.filter(q =>
    q.id !== mistake.questionId &&
    !completedSet.has(q.id) &&
    q.domain === domain &&
    q.cognitiveSkills.some(s => cognitiveSkills.includes(s))
  );

  // 如果同领域不够，放宽到任意题目
  if (candidates.length < 3) {
    candidates = allQuestions.filter(q =>
      q.id !== mistake.questionId &&
      !completedSet.has(q.id)
    );
  }

  // 随机选3道
  shuffleArray(candidates);
  const questions = candidates.slice(0, Math.min(3, candidates.length));

  if (questions.length === 0) return null;

  return {
    questions,
    targetSkill: cognitiveSkills.join('、'),
    domain,
  };
}

/**
 * 获取所有待复习的错题
 */
export function getActiveMistakes(mistakes: MistakeRecord[]): MistakeRecord[] {
  return mistakes.filter(m => !m.retriedCorrect);
}

/**
 * 将错题标记为已掌握（归档）
 */
export function archiveMistake(mistakes: MistakeRecord[], questionId: string): MistakeRecord[] {
  return mistakes.map(m =>
    m.questionId === questionId ? { ...m, retriedCorrect: true } : m
  );
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
