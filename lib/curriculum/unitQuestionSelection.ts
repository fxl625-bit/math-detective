import type { LearningRole } from './learningPath';

export type DailyCoreSlot = 'due_review' | 'current_concept' | 'same_skill_variant' | 'application' | 'stretch' | 'olympiad';

export const CORE_SLOT_TITLE: Record<DailyCoreSlot, string> = {
  due_review: '热身回顾',
  current_concept: '学会方法',
  same_skill_variant: '换个问法',
  application: '生活应用',
  stretch: '提高挑战',
  olympiad: '思维探索',
};

const roleBySlot: Record<DailyCoreSlot, LearningRole> = {
  due_review: 'foundation',
  current_concept: 'foundation',
  same_skill_variant: 'foundation',
  application: 'application',
  stretch: 'advanced',
  olympiad: 'olympiad',
};

/** Stable within a date; adjacent dates rotate finite candidate pools. */
export function orderDailyCandidates<T>(entries: readonly T[], date: string, unitId: string, slot: DailyCoreSlot): T[] {
  if (entries.length < 2) return [...entries];
  const value = `${date}:${unitId}:${slot}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  const rotation = (hash >>> 0) % entries.length;
  return [...entries.slice(rotation), ...entries.slice(0, rotation)];
}

export interface DailyCoreCandidate {
  questionId: string;
  role: LearningRole;
}

/**
 * Selects distinct IDs for the six fixed core slots. Future-slot candidates are
 * reserved with a small bipartite matching pass so an early foundation pick
 * cannot consume an ID needed to keep a later olympiad slot distinct.
 */
export function selectDistinctCoreCandidates(
  candidatesBySlot: Record<DailyCoreSlot, DailyCoreCandidate[]>,
): Array<DailyCoreCandidate | null> {
  const slots = Object.keys(roleBySlot) as DailyCoreSlot[];
  const candidates = slots.map(slot => {
    const seen = new Set<string>();
    return candidatesBySlot[slot].filter(candidate => {
      // Review revisits the original teaching role, including applications and
      // challenges. New-learning slots still enforce their declared role.
      if ((slot !== 'due_review' && candidate.role !== roleBySlot[slot]) || seen.has(candidate.questionId)) return false;
      seen.add(candidate.questionId);
      return true;
    });
  });

  const maxMatchRemaining = (start: number, unavailable: Set<string>): number => {
    const assigned = new Map<string, number>();
    const visit = (slotIndex: number, visited: Set<string>): boolean => {
      for (const candidate of candidates[slotIndex]) {
        const id = candidate.questionId;
        if (unavailable.has(id) || visited.has(id)) continue;
        visited.add(id);
        const priorSlot = assigned.get(id);
        if (priorSlot === undefined || visit(priorSlot, visited)) {
          assigned.set(id, slotIndex);
          return true;
        }
      }
      return false;
    };
    let count = 0;
    for (let index = start; index < slots.length; index++) if (visit(index, new Set())) count += 1;
    return count;
  };

  const selected: Array<DailyCoreCandidate | null> = [];
  const usedIds = new Set<string>();
  for (let index = 0; index < slots.length; index++) {
    const targetCount = maxMatchRemaining(index, usedIds);
    const choice = candidates[index].find(candidate => {
      if (usedIds.has(candidate.questionId)) return false;
      const remaining = new Set(usedIds);
      remaining.add(candidate.questionId);
      return 1 + maxMatchRemaining(index + 1, remaining) === targetCount;
    });
    selected.push(choice ?? null);
    if (choice) usedIds.add(choice.questionId);
  }
  return selected;
}
