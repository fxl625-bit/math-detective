/**
 * 题目完整性校验系统 (v2.6 P0修复)
 *
 * 校验项：
 * 1.  lessonType/keywordType 严格匹配
 * 2.  数字线索关卡必须有数字
 * 3.  动作线索关卡不能有至少/保证/倍
 * 4.  保证问题不能有加减选项
 * 5.  逻辑推理不能进入数字线索
 * 6.  一年级禁止复杂算式
 * 7.  选项不能来自其他 lessonType
 * 8.  correctAnswer 唯一、explanation 不为空
 */

import type {
  Question,
  LessonType,
  KeywordType,
  NumberRole,
  GradeBand,
  QuestionValidationResult,
  LessonStepType,
} from './types';
import {
  ALLOWED_KEYWORD_TYPES,
  FORBIDDEN_KEYWORD_TYPES,
  LESSON_TYPE_TO_STEP_TYPE,
} from './types';
import { hintRevealsAnswer, textRevealsAnswer, stepsRevealAnswer, stringStepsRevealAnswer } from './hintSafety';
import { classifyKeyword } from '@/data/keywordRules';

// ========== 关键词分类规则 ==========

const ADD_ACTION_WORDS = new Set([
  '来了', '又来了', '又跑来', '加入', '买来', '收到', '增加', '多了',
  '放进', '添上', '一共', '合起来', '飞来', '游来', '跑来', '走来',
  '过来', '回来', '拿来', '送来', '运来', '搬来', '捡到', '种了',
  '升上', '涨上', '加了', '送', '给',
]);

const SUBTRACT_ACTION_WORDS = new Set([
  '走了', '飞走', '游走', '跑走', '吃掉', '用掉', '送走', '拿走',
  '卖掉', '少了', '还剩', '没来', '缺席', '借出', '送出', '减去',
  '落', '掉', '少', '减少', '没了', '失去', '坏掉', '丢了',
]);

const COMPARE_WORDS = new Set([
  '比', '多几', '少几', '差几', '相差', '多多少', '少多少',
]);

const EQUAL_GROUPS_WORDS = new Set([
  '每份', '每组', '每人', '每盒', '一样多', '几个几', '几份一样多',
  '平均分', '每', '平均',
]);

const TIMES_WORDS = new Set([
  '倍', '几倍', '倍数',
]);

const GUARANTEE_WORDS = new Set([
  '至少', '保证', '最少', '一定', '不管怎样', '最坏情况',
  '摸出', '至少拿几个', '保证有', '保证同色', '保证一样',
  '最倒霉', '最差', '运气最差', '不管怎么',
]);

const LOGIC_CONDITION_WORDS = new Set([
  '不是最后一名', '比谁快', '比谁慢', '排第几', '谁最快',
  '谁最慢', '第一名', '第二名', '最后一名', '排在第',
  '前面', '后面', '不是', '冠军', '亚军', '季军',
]);

const IRRELEVANT_INFO_WORDS = new Set([
  '年龄', '颜色', '编号', '日期', '身高', '页码', '学号',
  '班级', '楼层', '座位号',
]);

// ========== 中文字数字识别 ==========

const CHINESE_NUMBER_MAP: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '两': 2, '几': -1, '半': 0.5, '百': 100, '千': 1000,
};

/**
 * 提取题目中所有表面数字（阿拉伯+中文）
 */
export function extractNumbers(text: string): number[] {
  const numbers: number[] = [];

  // 阿拉伯数字
  const arabicMatches = text.match(/\d+/g);
  if (arabicMatches) {
    numbers.push(...arabicMatches.map(Number));
  }

  // 中文数字（简单匹配，不处理复合如"十二"）
  for (const [ch, val] of Object.entries(CHINESE_NUMBER_MAP)) {
    if (text.includes(ch) && val > 0) {
      numbers.push(val);
    }
  }

  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * 判断中文数字的角色
 */
export function classifyNumberRole(
  num: number,
  text: string,
  domain?: string,
  operation?: string,
): NumberRole {
  // 仅当 domain 明确为 logic_reasoning 或 operation 为 logic 时，数字才可能是背景数字
  // 其他场景（addition_subtraction、multiplication_division 等）的数字即使出现在
  // 含有"比赛""跑步"等场景描写的题目中，也是计算数字而非背景数字
  const isPureLogic = domain === 'logic_reasoning' || operation === 'logic';

  if (isPureLogic) {
    const logicKeywords = ['赛跑', '排队', '名次', '比赛', '跑步', '游泳比赛'];
    const isLogicContext = logicKeywords.some(k => text.includes(k));
    if (isLogicContext) {
      return 'background_number';
    }
  }

  // 检查是否出现在无关信息中（年龄、编号等）
  const irrelevantKeywords = ['岁', '年龄', '号', '码', '层', '楼', '编号'];
  const isIrrelevant = irrelevantKeywords.some(k => {
    const idx = text.indexOf(k);
    if (idx === -1) return false;
    const nearText = text.substring(Math.max(0, idx - 5), Math.min(text.length, idx + 10));
    return nearText.includes(String(num));
  });

  if (isIrrelevant) return 'irrelevant_number';

  return 'useful_number';
}

// ========== 自动分类 ==========

/**
 * 自动推断题目的 lessonType（基于现有字段）
 */
export function inferLessonType(q: Question): LessonType | null {
  const text = q.text;

  // 检查逻辑推理
  if (q.domain === 'logic_reasoning') return 'logic_reasoning';
  // operation='logic' 可能来自规律题/周期题/图形题，非纯逻辑推理
  if (q.operation === 'logic' && q.domain !== 'pattern' && q.domain !== 'geometry' && q.domain !== 'measurement' && q.domain !== 'time') {
    return 'logic_reasoning';
  }

  // 检查保证/最坏情况
  const hasGuarantee = q.keywords.some(k =>
    GUARANTEE_WORDS.has(k.word) || k.word.includes('至少') || k.word.includes('保证')
  );
  if (hasGuarantee) return 'guarantee_worst_case';

  // 检查倍（也接受 mixed 操作，因为倍数题常涉及"先求另一数再求和"等多步计算）
  const hasTimes = q.keywords.some(k =>
    k.word.includes('倍') || TIMES_WORDS.has(k.word)
  );
  if (hasTimes && (q.operation === 'multiplication' || q.operation === 'division' || q.operation === 'mixed')) {
    return 'times_intro';
  }

  // 检查植树/间隔
  const hasPlanting = text.includes('植树') || text.includes('种一棵') ||
    ((text.includes('每隔') || text.includes('每')) && (text.includes('米') || text.includes('棵')));
  if (hasPlanting && q.domain === 'geometry') return 'planting_interval';

  // 检查图形计数
  const hasGeometryCount = text.includes('正方形') || text.includes('三角形') ||
    text.includes('长方形') || text.includes('有几个');
  if (hasGeometryCount && q.domain === 'geometry') return 'geometry_count';

  // 检查多余信息
  if (q.extraNumbers && q.extraNumbers.length > 0) return 'irrelevant_info';

  // 检查几个一样多
  const hasEqualGroups = q.keywords.some(k =>
    EQUAL_GROUPS_WORDS.has(k.word) || k.word.includes('每') || k.word.includes('平均')
  );
  if (hasEqualGroups && (q.operation === 'multiplication' || q.operation === 'division')) {
    return 'equal_groups_intro';
  }

  // 检查比较多少（comparison 或 subtraction 都可，因为比较本质是减法）
  const hasCompare = q.keywords.some(k =>
    COMPARE_WORDS.has(k.word) || k.word.includes('比')
  );
  if (hasCompare && (q.operation === 'comparison' || q.operation === 'subtraction' || q.operation === 'mixed')) {
    return 'compare_more_less';
  }

  // 检查动作线索（加减）
  const hasAddAction = q.keywords.some(k => ADD_ACTION_WORDS.has(k.word) || k.type === 'add');
  const hasSubtractAction = q.keywords.some(k => SUBTRACT_ACTION_WORDS.has(k.word) || k.type === 'subtract');
  if ((hasAddAction || hasSubtractAction) &&
    (q.operation === 'addition' || q.operation === 'subtraction')) {
    return 'add_sub_action';
  }

  // 检查纯逻辑推理条件
  const hasLogicCondition = LOGIC_CONDITION_WORDS.has(text) ||
    q.keywords.some(k => LOGIC_CONDITION_WORDS.has(k.word));
  if (hasLogicCondition && q.numbers.length === 0) return 'logic_reasoning';

  // 检查数字线索（最后兜底）
  if (q.numbers.length > 0 && q.operation !== 'logic') {
    return 'number_clue';
  }

  return null;
}

/**
 * 自动推断题目的 keywordType
 */
export function inferKeywordType(q: Question): KeywordType | null {
  // 检查保证/最坏情况关键词
  const hasGuarantee = q.keywords.some(k =>
    GUARANTEE_WORDS.has(k.word) || k.word.includes('至少') || k.word.includes('保证')
  );
  if (hasGuarantee) return 'guarantee_worst_case';

  // 检查倍
  const hasTimes = q.keywords.some(k => k.word.includes('倍'));
  if (hasTimes) return 'times_intro';

  // 检查一样多
  const hasEqual = q.keywords.some(k => EQUAL_GROUPS_WORDS.has(k.word));
  if (hasEqual) return 'equal_groups';

  // 检查逻辑条件
  const hasLogic = q.keywords.some(k => LOGIC_CONDITION_WORDS.has(k.word));
  if (hasLogic) return 'logic_condition';

  // 检查比较
  const hasCompare = q.keywords.some(k => COMPARE_WORDS.has(k.word));
  if (hasCompare) return 'compare';

  // 检查无关信息
  const hasIrrelevant = q.keywords.some(k => IRRELEVANT_INFO_WORDS.has(k.word));
  if (hasIrrelevant) return 'irrelevant_info';

  // 检查增加动作
  const hasAdd = q.keywords.some(k => ADD_ACTION_WORDS.has(k.word) || k.type === 'add');
  if (hasAdd) return 'add_action';

  // 检查减少动作
  const hasSubtract = q.keywords.some(k => SUBTRACT_ACTION_WORDS.has(k.word) || k.type === 'subtract');
  if (hasSubtract) return 'subtract_action';

  // 数字线索
  if (q.numbers.length > 0) return 'number_extract';

  return null;
}

// ========== 核心校验 ==========

/**
 * 校验题目完整性 (17项)
 */
export function validateQuestionIntegrity(q: Question): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lessonType = q.lessonType || inferLessonType(q);
  const keywordType = q.keywordType || inferKeywordType(q);

  // 1. questionText 不为空
  if (!q.text || q.text.trim().length === 0) {
    errors.push('questionText 为空');
  }

  // 2. explanation 不为空
  if (!q.explanation || q.explanation.trim().length === 0) {
    errors.push('explanation 为空');
  }

  // 3. correctAnswer 唯一
  if (q.correctMeaning && q.questionMeaningOptions) {
    const count = q.questionMeaningOptions.filter(o => o === q.correctMeaning).length;
    if (count !== 1) {
      errors.push(`correctMeaning 匹配到 ${count} 个选项（应为1）`);
    }
  }

  // 4. number_clue 题必须有数字
  if (lessonType === 'number_clue' && q.numbers.length === 0) {
    errors.push('number_clue 题目 numbers.length === 0');
  }

  // 5. number_clue 题每个数字必须出现在题干中
  if (lessonType === 'number_clue') {
    for (const n of q.numbers) {
      if (!q.text.includes(String(n))) {
        const cnKeys = Object.entries(CHINESE_NUMBER_MAP)
          .filter(([_, v]) => v === n)
          .map(([k]) => k);
        const foundCn = cnKeys.some(k => q.text.includes(k));
        if (!foundCn) {
          errors.push(`number_clue 题：数字 ${n} 未在题干中找到`);
        }
      }
    }
  }

  // 6. add_sub_action 不得出现"至少/保证/倍"
  if (lessonType === 'add_sub_action') {
    const forbidden = q.keywords.filter(k =>
      GUARANTEE_WORDS.has(k.word) || k.word.includes('倍') || k.word.includes('至少') || k.word.includes('保证')
    );
    if (forbidden.length > 0) {
      errors.push(`add_sub_action 题包含禁止关键词：${forbidden.map(k => k.word).join('、')}`);
    }
  }

  // 7. guarantee_worst_case 不得出现加减动作词
  if (keywordType === 'guarantee_worst_case') {
    const hasAction = q.keywords.some(k => ADD_ACTION_WORDS.has(k.word) || SUBTRACT_ACTION_WORDS.has(k.word));
    if (hasAction) {
      errors.push('guarantee_worst_case 题混入了加减动作词');
    }
  }

  // 8. logic_reasoning 不得进入数字线索关卡
  if (lessonType === 'number_clue' && keywordType === 'logic_condition') {
    errors.push('逻辑推理题被分配到了 number_clue 关卡');
  }

  // 9. 一年级禁止复杂算式
  if (q.gradeBand === 'G1' || q.gradeBand === 'OlympiadIntro') {
    if (q.operation === 'multiplication' || q.operation === 'division' ||
      q.operation === 'mixed' || q.operation === 'fraction') {
      warnings.push(`一年级题目使用了 ${q.operation} 运算`);
    }
    if (/[×÷*\/]/.test(q.equation) || /\(.*\)/.test(q.equation)) {
      warnings.push('一年级题目包含乘除或括号');
    }
  }

  // 10. options 有效性：至少2个选项
  if (q.questionMeaningOptions && q.questionMeaningOptions.length < 2) {
    errors.push('选项数量不足2个');
  }

  // 11. lessonType 与 keywordType 匹配
  if (lessonType && keywordType) {
    const allowed = ALLOWED_KEYWORD_TYPES[lessonType] || [];
    if (!allowed.includes(keywordType)) {
      errors.push(
        `类型不匹配：lessonType=${lessonType} 不允许 keywordType=${keywordType}。` +
        `允许：${allowed.join(', ')}`
      );
    }
  }

  // 12. keywords 与 keywordType 匹配
  if (keywordType && q.keywords.length === 0) {
    errors.push(`keywordType=${keywordType} 但 keywords 数组为空`);
  }

  // 13. 数字线索题至少1个可点击数字
  if (lessonType === 'number_clue' && q.numbers.length === 0) {
    errors.push('number_clue 关卡无可用数字');
  }

  // 14. 低年级禁止让近义概念中硬分辨
  if (q.gradeBand === 'G1' && q.questionMeaningOptions) {
    const options = q.questionMeaningOptions;
    // 检查是否有过于相似的两个选项
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const similarity = stringSimilarity(options[i], options[j]);
        if (similarity > 0.8 && options[i].length > 4) {
          warnings.push(`G1 选项过于相似：'${options[i]}' vs '${options[j]}'`);
        }
      }
    }
  }

  // 15. 数字线索题不能全是 background_number
  if (lessonType === 'number_clue' && q.numbers.length > 0) {
    const allBackground = q.numbers.every(
      n => classifyNumberRole(n, q.text, q.domain, q.operation) === 'background_number'
    );
    if (allBackground) {
      errors.push('number_clue 题所有数字都是背景数字（非计算用）');
    }
  }

  // 16. 选项不能有两个都对或都错
  if (q.questionMeaningOptions && q.correctMeaning) {
    const hasCorrect = q.questionMeaningOptions.includes(q.correctMeaning);
    if (!hasCorrect) {
      errors.push('correctAnswer 不在选项列表中');
    }
  }

  // 17. 题干不能为空或过短
  if (q.text.length < 5) {
    errors.push('题干过短（少于5个字符）');
  }

  // v2.6.6: 逻辑排序题元数据检查（增强版）
  const isLogicRanking = q.problemType === 'logic_ranking'
    || q.problemType === 'logic_truth'
    || q.problemType === 'logic_ordering';
  const hasRankingKeywords = /\b(名次|第.*名|排出|最高|最矮|最快|谁最|比赛|谁第几)\b/.test(q.text);

  if (isLogicRanking || (q.operation === 'logic' && hasRankingKeywords)) {
    // 18. logic_ranking 必须 operation = 'logic'
    if (q.operation !== 'logic') {
      errors.push(`逻辑排序题 operation=${q.operation}，应为 'logic'`);
    }
    // 19. requiresEquation 应为 false
    if (q.requiresEquation !== false) {
      errors.push(`逻辑排序题 requiresEquation 必须为 false，当前=${q.requiresEquation}`);
    }
    // 20. answerType 应为 'ranking'（如果问的是完整排序）
    if (q.answerType !== 'ranking' && /排出|名次/.test(q.text)) {
      errors.push('题目要求排完整名次，answerType 必须为 ranking');
    }
    // 21. correctRanking 必须存在
    if (!q.correctRanking) {
      errors.push('逻辑排序题缺少 correctRanking');
    }
    // 22. stepCompatibility 不应包含 equation 流程
    if (q.stepCompatibility) {
      if (q.stepCompatibility.includes('find_numbers') && q.requiresEquation === false) {
        warnings.push('逻辑排序题 stepCompatibility 包含 find_numbers，但 requiresEquation=false');
      }
    }
    // 23. 逻辑题文案检查：不应出现库存/算式/mixed运算文本
    const forbiddenTexts = ['库存', '列算式', '算出库存', '用 mixed 运算', '数量关系', '糖果店', '宠物店'];
    for (const ft of forbiddenTexts) {
      if (q.text.includes(ft) || q.explanation.includes(ft) || (q.storyTitle && q.storyTitle.includes(ft))) {
        errors.push(`逻辑题出现不匹配文案: "${ft}"`);
      }
    }
    // 24. v2.6.6: title/theme 检查
    if (q.storyTitle && /库存|糖果店|宠物店|算出库存/.test(q.storyTitle)) {
      console.warn('[Question Validation] Logic ranking UI mismatch', {
        id: q.id, text: q.text.slice(0, 50), issue: 'storyTitle contains forbidden text',
      });
    }
    // 25. v2.6.6: full_solve phases 不应包含 build_equation
    if (q.stepCompatibility?.includes('full_solve')) {
      if (q.requiresEquation !== false) {
        warnings.push('逻辑排序题通过 full_solve 但 requiresEquation 未设为 false');
      }
    }
    // 26. v2.6.6: structuredHints.fullSteps 存在时必须安全使用
    if (q.structuredHints?.fullSteps && q.structuredHints.fullSteps.length > 0) {
      const fullStepsContainAnswer = q.structuredHints.fullSteps.some(step =>
        step.explanation.includes('只能是') || step.explanation.includes('所以')
      );
      if (fullStepsContainAnswer) {
        warnings.push('逻辑题 structuredHints.fullSteps 包含完整答案，必须仅在 explain 阶段或用户点击"看完整推理"后展示');
      }
    }
    // 27. v2.6.6: 排名题不应有单个字符串 answer
    if (typeof q.answer === 'string' && q.answerType === 'ranking') {
      warnings.push('排名题 answer 为单个字符串，建议使用 correctRanking 字段');
    }
  }

  // v2.6.6: 检测题目文本中隐含逻辑排序但缺少元数据
  if (!isLogicRanking && hasRankingKeywords) {
    const rankingIndicators = ['名次', '第一名', '最后一名', '排出', '谁最快', '谁第几', '比赛'];
    const matchedIndicators = rankingIndicators.filter(kw => q.text.includes(kw));
    if (matchedIndicators.length >= 2) {
      warnings.push(`题目包含逻辑排序关键词 (${matchedIndicators.join(', ')}) 但 problemType 不是 logic_ranking`);
    }
  }

  // v2.6.5: 非计算题但包含方程式文案检查
  if (q.requiresEquation === false) {
    if (q.equation && q.equation.length > 0) {
      warnings.push('requiresEquation=false 但 equation 不为空');
    }
  }

  // ========== v2.6.7: Pre-answer 泄题检测 ==========

  // 28. hint.light 不能包含最终答案
  if (q.structuredHints?.light) {
    if (hintRevealsAnswer(q.structuredHints.light, q)) {
      errors.push('[P0] structuredHints.light 泄露了最终答案，pre-answer 阶段显示会直接泄题');
      console.error('[Question Validation] Pre-answer hint reveals answer (light)', {
        id: q.id, problemType: q.problemType, answer: q.answer, hint: q.structuredHints.light.slice(0, 80),
      });
    }
  }

  // 29. hint.medium 不应包含最终答案
  if (q.structuredHints?.medium) {
    if (hintRevealsAnswer(q.structuredHints.medium, q)) {
      warnings.push('structuredHints.medium 包含最终答案，建议仅在 fullSteps 中展示');
    }
  }

  // 30. hints[0] 不应泄露答案（旧版提示数组）
  if (q.hints.length > 0) {
    if (hintRevealsAnswer(q.hints[0], q)) {
      errors.push('[P0] hints[0] 泄露了最终答案，ClueSummary 和 HintSystem 默认会展示');
      console.error('[Question Validation] Pre-answer hint reveals answer (hints[0])', {
        id: q.id, problemType: q.problemType, answer: q.answer, hint: q.hints[0].slice(0, 80),
      });
    }
  }

  // 31. solutionSteps 不应默认渲染泄露答案的步骤
  if (q.solutionSteps.length > 0 && !q.structuredHints) {
    const leakCheck = stringStepsRevealAnswer(q.solutionSteps, q);
    if (leakCheck.leaksAnswer) {
      errors.push(`[P0] solutionSteps[${leakCheck.offendingIndex}] 在 pre-answer 阶段泄露答案 — 应改为 structuredHints`);
      console.error('[Question Validation] solutionSteps reveals answer', {
        id: q.id, problemType: q.problemType,
        offendingIndex: leakCheck.offendingIndex,
        step: q.solutionSteps[leakCheck.offendingIndex!]?.slice(0, 80),
      });
    }
  }

  // 32. solutionStepsDetailed 存在时应确认不会在 pre-answer 渲染
  if (q.solutionStepsDetailed && q.solutionStepsDetailed.length > 0) {
    const leakCheck = stepsRevealAnswer(q.solutionStepsDetailed, q);
    if (leakCheck.leaksAnswer) {
      errors.push(`[P0] solutionStepsDetailed[${leakCheck.offendingStep}] 在 pre-answer 阶段泄露答案`);
      console.error('[Question Validation] solutionStepsDetailed reveals answer', {
        id: q.id, problemType: q.problemType,
        offendingStep: leakCheck.offendingStep,
        stepTitle: q.solutionStepsDetailed[leakCheck.offendingStep!]?.stepTitle,
      });
    }
  }

  // 33. pattern 题专项：默认步骤不应包含目标层结果
  if (q.problemType === 'pattern' || /规律|第.*层/.test(q.text)) {
    const allStepText = [
      ...q.solutionSteps,
      ...(q.solutionStepsDetailed || []).map(s => `${s.stepTitle}: ${s.explanation}`),
    ].join(' ');
    if (typeof q.answer === 'number') {
      const numStr = String(q.answer);
      const patternLeakRegex = new RegExp(`第[0-9一二三四五六七八九十]+层[：:是＝=]\\s*${numStr}|${numStr}.*第[0-9一二三四五六七八九十]+层`);
      if (patternLeakRegex.test(allStepText)) {
        errors.push('[P0] pattern 题步骤中直接显示了目标层的计算结果，pre-answer 会泄题');
      }
    }
  }

  // 34. ranking 题专项：默认提示不应包含完整排序
  if (q.problemType === 'logic_ranking' || q.problemType === 'logic_truth' || q.problemType === 'logic_ordering') {
    if (q.correctRanking) {
      const rankStr = q.correctRanking.order?.join('');
      const allText = [q.structuredHints?.light, q.structuredHints?.medium, q.hints.join(' '), q.solutionSteps.join(' ')].join(' ');
      if (rankStr && rankStr.length >= 3 && allText.includes(rankStr)) {
        errors.push('[P0] ranking 题 pre-answer 提示包含完整排序');
      }
    }
  }

  // 35. age_problem 专项：默认提示不应包含"再过X年"
  if (q.problemType === 'age_problem' || /岁|年龄/.test(q.text)) {
    const allText = [q.structuredHints?.light, q.hints[0], ...q.solutionSteps].join(' ');
    if (/再过[0-9]+年|[0-9]+年后/.test(allText)) {
      errors.push('[P0] age_problem 题 pre-answer 提示包含"再过X年"');
    }
  }

  // 36. planting_problem 专项：默认提示不应包含最终棵数
  if (q.problemType === 'planting_problem' || q.lessonType === 'planting_interval') {
    if (typeof q.answer === 'number') {
      const numStr = String(q.answer);
      const allText = [q.structuredHints?.light, q.hints[0], ...q.solutionSteps].join(' ');
      if (new RegExp(`${numStr}\\s*棵|共\\s*${numStr}`).test(allText)) {
        errors.push('[P0] planting_problem 题 pre-answer 提示包含最终棵数');
      }
    }
  }

  // 37. ratio_distribution 专项：默认提示不应包含最终角度/数值
  if (q.problemType === 'ratio_distribution' || q.lessonType === 'geometry_count') {
    if (typeof q.answer === 'number') {
      const numStr = String(q.answer);
      const allText = [q.structuredHints?.light, q.hints[0], ...q.solutionSteps].join(' ');
      if (new RegExp(`最大角.*${numStr}|${numStr}.*最大角|一共${numStr}份`).test(allText)) {
        errors.push('[P0] ratio_distribution 题 pre-answer 提示包含最终角度/数值');
      }
    }
  }

  // ========== v2.6.9: 倍词检测 + age_problem 专项 ==========

  // 38. 题目含"倍/几倍"时，keywordType 必须为 times_intro
  const hasMultiplicativeKeyword = q.keywords.some(k => {
    const cls = classifyKeyword(k.word);
    return cls?.category === 'multiplicative_comparison';
  });
  if (hasMultiplicativeKeyword && keywordType !== 'times_intro') {
    errors.push(`题目含"倍/几倍"关键词，keywordType 应为 times_intro，当前=${keywordType}`);
  }

  // 39. age_problem 题不允许出现商店/库存场景关键词
  if (q.problemType === 'age_problem') {
    const shopSceneKeywords = ['糖果店', '库存', '进货', '卖出', '宠物店', '文具店', '商店', '卖掉了', '还剩几个'];
    const hasShopWords = shopSceneKeywords.some(w =>
      q.text.includes(w) || (q.storyTitle && q.storyTitle.includes(w))
    );
    if (hasShopWords) {
      errors.push('age_problem 题出现商店/库存关键词，场景不兼容');
    }
    // sceneType 检查
    const incompatibleScenes = ['candy_inventory', 'shop_stock', 'shop', 'inventory'];
    if (q.sceneType && incompatibleScenes.includes(q.sceneType)) {
      errors.push(`age_problem 题 sceneType=${q.sceneType}，不兼容商店/库存场景`);
    }
    // themeTags 检查
    if (q.themeTags) {
      const badTags = q.themeTags.filter(t => incompatibleScenes.some(s => t.includes(s)));
      if (badTags.length > 0) {
        errors.push(`age_problem 题 themeTags 包含不兼容标签: ${badTags.join(', ')}`);
      }
    }
  }

  // 40. find_action_words 关卡必须有 addition_change/subtraction_change 关键词分类
  // (stepCompatibility 含 find_action_words 的题也检查)
  const isForFindActionWords = q.lessonType === 'add_sub_action'
    || (q.stepCompatibility && q.stepCompatibility.includes('find_action_words'));
  if (isForFindActionWords) {
    const hasActionKeyword = q.keywords.some(k => {
      const cls = classifyKeyword(k.word);
      return cls?.category === 'addition_change' || cls?.category === 'subtraction_change';
    });
    if (!hasActionKeyword) {
      errors.push('适合 find_action_words 的题目缺少 addition_change/subtraction_change 关键词分类');
    }
  }

  // 41. stepCompatibility 含 shop 场景关键词但 question sceneType 不匹配
  if (q.storyTitle && /卖出|进货|库存/.test(q.storyTitle)) {
    const isShopOrInventory = q.sceneType === 'shop_stock' || q.sceneType === 'candy_inventory'
      || q.text.includes('商店') || q.text.includes('进货') || q.text.includes('库存');
    if (!isShopOrInventory) {
      errors.push(`storyTitle="${q.storyTitle}"含商店/库存关键词，但题目场景不匹配`);
    }
  }

  // ========== v2.7: 多答案题校验 ==========

  // 42. 多答案题必须有 subAnswers
  if (q.answerType === 'multi_answer') {
    if (!q.subAnswers || q.subAnswers.length === 0) {
      errors.push('[P0] answerType=multi_answer 但 subAnswers 为空');
    }
    if (q.subAnswers) {
      for (const sub of q.subAnswers) {
        if (!sub.id) errors.push('[P0] subAnswer 缺少 id');
        if (!sub.label) errors.push('[P0] subAnswer 缺少 label');
        if (sub.answer === undefined || sub.answer === null) errors.push(`[P0] subAnswer "${sub.label}" 缺少 answer`);
      }
    }
  }

  // 43. 题目含多个"？"且 answer 是字符串 → 应为 multi_answer
  const questionMarks = (q.text.match(/？|\?/g) || []).length;
  if (questionMarks >= 2 && q.answerType !== 'multi_answer' && q.answerType !== 'ranking') {
    const answerStr = String(q.answer);
    // 如果答案包含中文分隔符，很可能是多答案
    if (/，|；|和/.test(answerStr) && !/^\d+$/.test(answerStr)) {
      warnings.push(`题目含${questionMarks}个问号且答案含分隔符，可能应标注 answerType=multi_answer`);
    }
  }

  // 44. multi_answer 题不应进入 find_action_words
  if (q.answerType === 'multi_answer' && q.stepCompatibility?.includes('find_action_words')) {
    warnings.push('multi_answer 题不适合 find_action_words 步');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    questionId: q.id,
    lessonType,
    keywordType,
    grade: q.gradeBand,
  };
}

/**
 * 校验选项有效性
 */
export function validateOptions(q: Question): string[] {
  const errors: string[] = [];
  const lessonType = q.lessonType || inferLessonType(q);

  // 1. 选项必须能清晰区分
  if (q.questionMeaningOptions) {
    const unique = new Set(q.questionMeaningOptions);
    if (unique.size !== q.questionMeaningOptions.length) {
      errors.push('存在重复选项');
    }
  }

  // 2. 选项必须与 lessonType 匹配
  if (lessonType === 'guarantee_worst_case') {
    const forbiddenOptions = ['变多', '变少', '加法', '减法'];
    if (q.questionMeaningOptions) {
      for (const opt of q.questionMeaningOptions) {
        for (const fb of forbiddenOptions) {
          if (opt.includes(fb)) {
            errors.push(`guarantee_worst_case 题包含禁止选项：'${opt}'`);
          }
        }
      }
    }
  }

  // 3. add_sub_action 题选项应是加减判断
  if (lessonType === 'add_sub_action') {
    const validOptions = q.questionMeaningOptions || [];
    if (validOptions.length > 0) {
      const hasAddOption = validOptions.some(o => o.includes('多') || o.includes('加'));
      const hasSubtractOption = validOptions.some(o => o.includes('少') || o.includes('减'));
      if (!hasAddOption && !hasSubtractOption && validOptions.length <= 2) {
        errors.push('add_sub_action 选项缺少加减判断');
      }
    }
  }

  return errors;
}

/**
 * 校验题目-关卡-挑战的跨引用一致性
 */
export function validateCrossReference(
  question: Question,
  stepType: LessonStepType,
  storyTitle?: string,
): string[] {
  const errors: string[] = [];
  const lessonType = question.lessonType || inferLessonType(question);

  // 检查 lessonType 与 stepType 映射
  if (lessonType) {
    const expectedStep = LESSON_TYPE_TO_STEP_TYPE[lessonType];
    if (expectedStep && expectedStep !== stepType) {
      // 这是严重错误：题型与关卡不匹配
      errors.push(
        `关卡类型不匹配：question.lessonType=${lessonType} ` +
        `→ 期望 stepType=${expectedStep}，实际 stepType=${stepType}`
      );
    }
  }

  return errors;
}

// ========== 辅助函数 ==========

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let intersection = 0;
  for (const c of setA) {
    if (setB.has(c)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * v2.6.9: step-question 跨引用匹配校验
 *
 * 校验题目与步骤类型/标题/主题的兼容性。
 * 覆盖：
 * - age_problem 不能进入 find_action_words / shop 场景
 * - find_action_words 必须有 addition_change/subtraction_change 关键词
 * - step title 含商店关键词时 question 必须是 shop/inventory 场景
 */
export function validateStepQuestionMatch(
  question: Question,
  stepType: LessonStepType,
  stepTitle?: string,
  themeId?: string,
): { errors: string[]; warnings: string[]; isValidForStep: boolean } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. age_problem 不兼容 find_action_words
  if (question.problemType === 'age_problem' && stepType === 'find_action_words') {
    errors.push('age_problem 不兼容 find_action_words 关卡');
  }

  // 2. age_problem 不兼容 candy_inventory/shop_stock theme
  if (question.problemType === 'age_problem') {
    const incompatibleThemes = ['candy_inventory', 'shop_stock'];
    if (themeId && incompatibleThemes.includes(themeId)) {
      errors.push(`age_problem 不兼容 theme=${themeId}`);
    }
    if (question.sceneType && incompatibleThemes.includes(question.sceneType)) {
      errors.push(`age_problem 不兼容 sceneType=${question.sceneType}`);
    }
    const shopKeywords = ['糖果店', '库存', '进货', '卖出', '宠物店', '商店', '卖掉了'];
    if (shopKeywords.some(w => question.text.includes(w))) {
      errors.push('age_problem 题含商店/库存场景关键词');
    }
  }

  // 3. find_action_words 步必须有 addition_change/subtraction_change 关键词分类
  if (stepType === 'find_action_words') {
    const hasValidActionKeyword = question.keywords.some(k => {
      const cls = classifyKeyword(k.word);
      return cls?.category === 'addition_change' || cls?.category === 'subtraction_change';
    });
    if (!hasValidActionKeyword) {
      errors.push('find_action_words 步缺少 addition_change/subtraction_change 关键词分类');
    }
    // 额外检查: 不应该有 multiplicative_comparison 关键词
    const hasMultiplicative = question.keywords.some(k => {
      const cls = classifyKeyword(k.word);
      return cls?.category === 'multiplicative_comparison';
    });
    if (hasMultiplicative) {
      warnings.push('find_action_words 步含 multiplicative_comparison 关键词（倍），可能导致错配');
    }
  }

  // 4. step title 含"卖出/进货/库存"时 question 必须是 shop/inventory 场景
  if (stepTitle && /卖出|进货|库存/.test(stepTitle)) {
    const isShopOrInventory = question.sceneType === 'shop_stock' || question.sceneType === 'candy_inventory'
      || question.sceneType === 'shop' || question.sceneType === 'inventory'
      || question.text.includes('商店') || question.text.includes('糖果店')
      || question.text.includes('进货') || question.text.includes('库存');
    if (!isShopOrInventory) {
      errors.push(`步标题"${stepTitle}"含商店关键词，但题目场景(sceneType=${question.sceneType})不匹配`);
    }
  }

  return {
    errors,
    warnings,
    isValidForStep: errors.length === 0,
  };
}

// Re-export from types for convenience
export { ALLOWED_KEYWORD_TYPES } from './types';
