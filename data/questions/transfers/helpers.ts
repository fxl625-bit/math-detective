import type { Question } from '@/lib/types';
import { inferAnswerSchema } from '@/lib/answerSchema';
import type { TransferEntry, TransferRelation, TransferWitness } from './types';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Portable complete-content guard. This is a drift check, not a mathematical proof. */
export function transferFingerprint(question: Question): string {
  const input = canonical(question);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}:${input.length}`;
}

export type TransferContent = Pick<Question, 'text' | 'numbers' | 'answer' | 'answerSentence' | 'equation' | 'explanation' | 'solutionSteps' | 'hints'>
  & Partial<Pick<Question, 'answerSchema' | 'answerType' | 'subAnswers' | 'correctRanking' | 'rankingOptions' | 'people' | 'statements'>>;

/** Copy curriculum/difficulty only; rebuild all solution-bearing legacy presentation. */
export function makeTransferEntry(source: Question, content: TransferContent, relation: TransferRelation,
  witness: TransferWitness, verificationMode: TransferEntry['verificationMode'] = 'numeric-distinct'): TransferEntry {
  // Preserve actual story distractions, rather than making a noise-filtering task easier.
  const visibleNoise = source.noisePhrases.filter(phrase => source.text.includes(phrase));
  const missingNoise = visibleNoise.filter(phrase => !content.text.includes(phrase));
  const background = missingNoise.map(phrase => phrase.startsWith('觉得') ? `小动物们${phrase}` : phrase).join('，');
  const variant: Question = {
    id: `transfer_${source.id}_v1_01`, gradeBand: source.gradeBand, domain: source.domain,
    cognitiveSkills: [...source.cognitiveSkills], operation: source.operation,
    difficulty: source.difficulty, category: source.category, visualKey: 'thinking', requiresAnswer: true,
    questionMeaningOptions: [], correctMeaning: '', questionMeaningMode: 'direct',
    keywords: [], usefulPhrases: [], requiresEquation: false,
    curriculumGrade: source.curriculumGrade, curriculumSemester: source.curriculumSemester,
    curriculumSkillIds: source.curriculumSkillIds, skillIds: source.skillIds,
    prerequisiteSkills: source.prerequisiteSkills, difficultyProfile: source.difficultyProfile,
    assessmentTier: source.assessmentTier, isExtendedThinking: source.isExtendedThinking,
    isStretch: source.isStretch, isTwoStep: source.isTwoStep, qualityStatus: 'pass',
    answerType: source.answerType,
    ...content,
    text: background ? `${background}。${content.text}` : content.text,
    noisePhrases: [...visibleNoise],
    solutionStepsDetailed: content.solutionSteps.map((explanation, index) => ({ stepTitle: `第${index + 1}步`, explanation })),
  };
  if (!content.answerSchema) {
    const schema = inferAnswerSchema(source);
    variant.answerSchema = schema.kind === 'text'
      ? { kind: 'text', acceptedAnswers: [String(content.answer)] } : structuredClone(schema);
  }
  return { sourceId: source.id, sourceFingerprint: transferFingerprint(source), relation, variant, witness, verificationMode };
}
