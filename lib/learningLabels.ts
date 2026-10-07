import type { CognitiveSkill, LessonStepType } from './types';

const STEP_TYPE_LABELS: Record<LessonStepType, string> = {
  find_numbers: '找数字线索',
  find_action_words: '找动作线索',
  simulation: '观察变化',
  remove_noise: '擦掉废话',
  full_solve: '完整解题',
  find_compare_numbers: '找比较关系',
  spot_extra_info: '识别多余信息',
  spot_missing_info: '判断信息是否足够',
  answer_only: '独立解题',
};

const COGNITIVE_SKILL_LABELS: Record<CognitiveSkill, string> = {
  find_numbers: '找数字线索',
  find_keywords: '找动作线索',
  remove_noise: '擦掉废话',
  understand_question: '理解题意',
  choose_operation: '选择运算',
  find_compare_numbers: '找比较关系',
  spot_extra_info: '识别多余信息',
  spot_missing_info: '判断信息是否足够',
  build_model: '建立数学模型',
  multi_step_reasoning: '多步推理',
  estimate: '估算',
  explain_reasoning: '解释思路',
};

export function getStepTypeLabel(value: unknown): string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STEP_TYPE_LABELS, value)
    ? STEP_TYPE_LABELS[value as LessonStepType]
    : '其他练习内容';
}

export function getCognitiveSkillLabel(value: unknown): string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COGNITIVE_SKILL_LABELS, value)
    ? COGNITIVE_SKILL_LABELS[value as CognitiveSkill]
    : '其他学习技能';
}
