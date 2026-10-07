import type { Question } from '@/lib/types';
import type { LearningMethod, LearningRole } from '@/lib/curriculum/learningPath';
import { learningUnits } from '@/lib/curriculum/learningPath';

export interface QuestionLearningMetadata {
  questionId: string;
  questionVersion: number;
  unitId: string;
  role: LearningRole;
  variantFamily: string;
  variantIndex: number;
  tier: 1 | 2 | 3;
  prerequisiteSkillKeys: string[];
  targetSkillKeys: string[];
  multiplicationFacts?: [number, number][];
  tableRequirement?: 'concept' | 'facts';
  method: LearningMethod;
}

export interface NewQuestionSpec {
  id: string;
  gradeBand: `G${1 | 2 | 3 | 4 | 5 | 6}`;
  unitId: string;
  skillKey: string;
  domain: Question['domain'];
  visualKey?: Question['visualKey'];
  cognitiveSkills?: Question['cognitiveSkills'];
  text: string;
  answer: number | string;
  answerSentence: string;
  answerType?: Question['answerType'];
  subAnswers?: Question['subAnswers'];
  answerSchema: NonNullable<Question['answerSchema']>;
  operation: Question['operation'];
  equation: string;
  explanation: string;
  solutionSteps: string[];
  hints: [string, string, string];
  numbers: number[];
  unit?: string;
  difficulty: Question['difficulty'];
  role: LearningRole;
  family?: string;
  tier: 1 | 2 | 3;
  method: LearningMethod;
  variantIndex?: number;
}

/** Resolve legacy questions to the most specific unit skill from their actual prompt and operation. */
export function inferTargetSkill(unitId: string, question: Pick<Question, 'text' | 'domain' | 'operation' | 'answerType'>): string {
  const keys = learningUnits.find((unit) => unit.id === unitId)?.skillKeys;
  if (!keys?.length) throw new Error(`Unknown learning unit: ${unitId}`);
  if (keys.length === 1) return keys[0];
  const text = question.text.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));
  let second = false;
  switch (unitId) {
    case 'g1-u1': second = question.operation === 'subtraction'; break;
    case 'g1-u2': second = ['addition', 'subtraction'].includes(question.operation ?? '') || has('相差', '还剩', '一共'); break;
    case 'g1-u3': second = !has('谁的贴纸多', '谁的糖多', '谁多', '谁少', '多多少', '少多少', '相差', '差多少', '多几颗', '多几张', '少几颗', '少几张') && has('□', '未知', '还原', '求原来', '原来是多少', '原来有多少', '增加前', '减少前', '又买来', '现在有', '还剩', '有多少', '多少颗', '多少张', '小丽有多少', '小明有多少'); break;
    case 'g1-u4': second = has('分类', '分成', '属于哪类', '哪一类'); break;
    case 'g1-u5': second = !(question.domain === 'money' || question.answerType === 'money' || has('元', '角', '人民币')); break;
    case 'g1-u6': second = has('几种', '搭配', '所有可能', '有几种', '排列'); break;
    case 'g2-u1': second = has('改写成乘法', '乘法算式', '口诀', '乘法事实', '积是'); break;
    case 'g2-u2': second = !has('平均分', '平均放', '平均分给'); break;
    case 'g2-u3': second = question.operation === 'mixed' || has('先', '然后', '再', '又'); break;
    case 'g2-u4': second = has('时刻', '几时', '分钟', '小时', '几时几分'); break;
    case 'g2-u5': second = has('拼', '位置', '方向', '周长', '剪开', '外边'); break;
    case 'g2-u6': second = has('几种', '搭配', '排列', '所有可能', '枚举', '组合'); break;
    case 'g3-u1': second = question.operation === 'division' || has('余数', '平均分', '能分几'); break;
    case 'g3-u2': second = has('原来', '□', '未知', '补回', '倒推'); break;
    case 'g3-u3': second = has('小数', '十分', '0.', '小数点'); break;
    case 'g3-u4': second = has('面积', '平方', '铺满', '方格'); break;
    case 'g3-u5': second = has('千克', '克', '质量', '毫升', '升'); break;
    case 'g3-u6': second = has('搭配', '组合', '几种', '排法', '选法'); break;
    case 'g4-u1': second = !has('数位', '四舍五入', '四位数', '千位', '百位', '组成的数'); break;
    case 'g4-u2': second = has('运算律', '交换', '结合', '凑整', '规律'); break;
    case 'g4-u3': second = has('相加', '相减', '一共', '还剩', '相差'); break;
    case 'g4-u4': second = has('三角形', '锐角', '钝角', '直角', '分类'); break;
    case 'g4-u5': second = has('平均数', '平均', '均值'); break;
    case 'g4-u6': second = has('周期', '重复', '最少', '最多', '优化'); break;
    case 'g5-u1': second = question.operation === 'division' || has('除以', '平均每'); break;
    case 'g5-u2': second = has('整除', '余数', '末尾', '数字和', '规律', '公倍数', '共同倍数'); break;
    case 'g5-u3': second = !has('相等的分数', '等值分数', '通分'); break;
    case 'g5-u4': second = has('体积', '立方', '小正方体', '容积'); break;
    case 'g5-u5': second = has('数量关系', '总价', '成人票', '儿童票', '全长', '还剩', '两数', '比甲', '比乙') && !has('解方程', '求x', '求x', 'x是多少', '方程的解'); break;
    case 'g5-u6': second = has('几种', '多少种', '排列', '搭配', '选法', '组合', '所有可能', '不重复', '枚举'); break;
    case 'g6-u1': second = question.operation === 'division' || has('除以', '除法'); break;
    case 'g6-u2': second = has('求比例', '比例式', '未知项', '□'); break;
    case 'g6-u3': second = has('增加', '减少', '涨价', '降价', '折扣', '变化'); break;
    case 'g6-u4': second = has('面积', '体积', '圆柱', '半圆'); break;
    case 'g6-u5': second = has('说明', '推断', '平均数', '中位数', '变化', '结论'); break;
    case 'g6-u6': second = has('最少', '最多', '最优', '最省', '最大', '最小'); break;
    default: second = false;
  }
  return keys[second ? 1 : 0];
}

/** Builds only the repeated Question envelope; each prompt, answer, proof and hint remains explicit. */
export function makeProgressionQuestion(spec: NewQuestionSpec): Question {
  return {
    id: spec.id,
    gradeBand: spec.gradeBand,
    domain: spec.domain,
    cognitiveSkills: (spec.cognitiveSkills ?? ['build_model', 'explain_reasoning'])
      .filter(skill => skill !== 'understand_question'),
    text: spec.text,
    numbers: spec.numbers,
    keywords: [],
    noisePhrases: [],
    usefulPhrases: [],
    questionMeaningOptions: [],
    correctMeaning: '',
    questionMeaningMode: 'direct',
    operation: spec.operation,
    equation: spec.equation,
    answer: spec.answer,
    answerSentence: spec.answerSentence,
    explanation: spec.explanation,
    solutionSteps: spec.solutionSteps,
    hints: spec.hints,
    difficulty: spec.difficulty,
    category: spec.domain === 'geometry' || spec.domain === 'pattern' || spec.domain === 'logic_reasoning' ? 'mixed'
      : spec.operation === 'multiplication' ? 'multiplication'
      : spec.operation === 'division' ? 'division'
        : spec.operation === 'subtraction' ? 'subtraction' : 'addition',
    visualKey: spec.visualKey ?? 'thinking',
    requiresAnswer: true,
    requiresEquation: false,
    answerType: spec.answerType ?? 'number',
    answerSchema: spec.answerSchema,
    ...(spec.subAnswers ? { subAnswers: spec.subAnswers } : {}),
    solutionStepsDetailed: spec.solutionSteps.map((explanation, index) => ({
      stepTitle: `第${index + 1}步`, explanation,
    })),
    qualityStatus: 'pass',
    curriculumGrade: Number(spec.gradeBand.slice(1)),
    curriculumSemester: 'both',
    curriculumSkillIds: [spec.skillKey],
    skillIds: [spec.skillKey],
    assessmentTier: spec.role === 'olympiad' ? 'challenge' : spec.role === 'advanced' ? 'test' : 'practice',
    isExtendedThinking: spec.role === 'olympiad',
    isStretch: spec.role === 'advanced' || spec.role === 'olympiad',
    prerequisiteSkills: [],
    difficultyProfile: {
      knowledgeLevel: Math.min(spec.difficulty, 5) as 1 | 2 | 3 | 4 | 5,
      readingLoad: 1,
      relationComplexity: spec.difficulty,
      informationNoise: 1,
      reasoningSteps: Math.min(spec.solutionSteps.length, 5) as 1 | 2 | 3 | 4 | 5,
      transferLevel: spec.tier,
    },
  };
}

export function metadataFor(
  unitId: string,
  skillKeys: string[],
  groups: Partial<Record<LearningRole, string[]>>,
  methods: Partial<Record<LearningRole, LearningMethod>>,
): QuestionLearningMetadata[] {
  const records: QuestionLearningMetadata[] = [];
  for (const role of ['foundation', 'application', 'advanced', 'olympiad'] as const) {
    const ids = groups[role] ?? [];
    ids.forEach((questionId, index) => records.push({
      questionId,
      questionVersion: 1,
      unitId,
      role,
      variantFamily: `${unitId}-${role}-${questionId}`,
      variantIndex: 1,
      tier: role === 'foundation' || role === 'application' ? 1 : index === 0 ? 1 : 2,
      // Caller enriches this with verified prerequisites; target skills are never prerequisites.
      prerequisiteSkillKeys: [],
      targetSkillKeys: [skillKeys[0]],
      method: methods[role] ?? 'representation',
    }));
  }
  return records;
}

