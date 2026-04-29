import { allQuestions } from '@/data/questions';
import { getVisual } from '@/data/visualItems';
import type { Question } from './types';

// Reuse the existing questions import for backward compat
const questions = allQuestions;

/**
 * 自检：题库中的 text 和 visual 是否一致。
 * 在开发环境 console 中输出警告。
 */
export function validateQuestions(): string[] {
  const warnings: string[] = [];

  // 文本关键词 -> 期望的 visualKey 映射
  const textItemMap: { pattern: RegExp; expectedKeys: string[] }[] = [
    { pattern: /蜡笔/, expectedKeys: ['crayon'] },
    { pattern: /苹果/, expectedKeys: ['apple'] },
    { pattern: /小鸟/, expectedKeys: ['bird'] },
    { pattern: /小?兔子/, expectedKeys: ['rabbit'] },
    { pattern: /气球/, expectedKeys: ['balloon'] },
    { pattern: /糖果|糖/, expectedKeys: ['candy'] },
    { pattern: /图书|书/, expectedKeys: ['book'] },
    { pattern: /铅笔/, expectedKeys: ['pencil'] },
    { pattern: /小花|[^动]花/, expectedKeys: ['flower'] },
    { pattern: /玩具车/, expectedKeys: ['toyCar'] },
    { pattern: /金鱼/, expectedKeys: ['goldfish'] },
    { pattern: /鸡蛋/, expectedKeys: ['egg'] },
    { pattern: /白鹅/, expectedKeys: ['goose'] },
    { pattern: /小朋友|同学/, expectedKeys: ['child'] },
    { pattern: /小鱼/, expectedKeys: ['fish'] },
    { pattern: /水杯/, expectedKeys: ['cup'] },
    { pattern: /皮球/, expectedKeys: ['ball'] },
    { pattern: /桃子/, expectedKeys: ['peach'] },
    { pattern: /包子/, expectedKeys: ['bun'] },
    { pattern: /鸭子/, expectedKeys: ['duck'] },
    { pattern: /饼干/, expectedKeys: ['cookie'] },
    { pattern: /酸奶/, expectedKeys: ['yogurt'] },
    { pattern: /蝴蝶/, expectedKeys: ['butterfly'] },
    { pattern: /草莓/, expectedKeys: ['strawberry'] },
    { pattern: /胡萝卜/, expectedKeys: ['carrot'] },
    { pattern: /乘客/, expectedKeys: ['passenger'] },
    { pattern: /贴纸/, expectedKeys: ['sticker'] },
    { pattern: /家长/, expectedKeys: ['adult'] },
    { pattern: /青蛙/, expectedKeys: ['frog'] },
  ];

  for (const q of questions) {
    const visual = getVisual(q.visualKey);
    const vKey = q.visualKey;

    // 检查是否有对应的文本关键词
    for (const { pattern, expectedKeys } of textItemMap) {
      if (pattern.test(q.text)) {
        if (!expectedKeys.includes(vKey)) {
          const msg = `题目 ${q.id}: 文本包含 "${pattern.source.replace(/\\/g, '').replace(/[?+[\](){}|^$.*]/g, '')}" 但 visualKey 是 "${vKey}"，期望 ${expectedKeys.join('/')}`;
          warnings.push(msg);
          console.warn(`[validateQuestions] ${msg}`);
        }
      }
    }

    // 检查 visualKey 是否存在
    if (!visual || visual.key === 'unknown') {
      const msg = `题目 ${q.id}: visualKey "${vKey}" 在 visualItems 中不存在`;
      warnings.push(msg);
      console.warn(`[validateQuestions] ${msg}`);
    }

    // 检查 requiresAnswer 必须包含 answer/equation/answerSentence
    if (q.requiresAnswer) {
      if (q.answer === undefined || q.answer === null || q.answer === '') {
        const msg = `题目 ${q.id}: requiresAnswer=true 但 answer 为空`;
        warnings.push(msg);
        console.warn(`[validateQuestions] ${msg}`);
      }
      if (!q.equation) {
        const msg = `题目 ${q.id}: requiresAnswer=true 但 equation 为空`;
        warnings.push(msg);
        console.warn(`[validateQuestions] ${msg}`);
      }
    }

    // 检查 stepCompatibility 一致性
    if (q.stepCompatibility) {
      const sc = q.stepCompatibility;

      // remove_noise → 必须有 noisePhrases 和 usefulPhrases
      if (sc.includes('remove_noise')) {
        if (!Array.isArray(q.noisePhrases) || q.noisePhrases.length === 0) {
          const msg = `题目 ${q.id}: stepCompatibility 含 remove_noise 但 noisePhrases 为空`;
          warnings.push(msg);
          console.warn(`[validateQuestions] ${msg}`);
        }
        if (!Array.isArray(q.usefulPhrases) || q.usefulPhrases.length < 2) {
          const msg = `题目 ${q.id}: stepCompatibility 含 remove_noise 但 usefulPhrases 少于 2 条`;
          warnings.push(msg);
          console.warn(`[validateQuestions] ${msg}`);
        }
        // 检查 noisePhrases 文本是否在 text 中
        for (const np of q.noisePhrases) {
          if (!q.text.includes(np)) {
            const msg = `题目 ${q.id}: noisePhrase "${np}" 不在 text 中`;
            warnings.push(msg);
            console.warn(`[validateQuestions] ${msg}`);
          }
        }
        // 检查 usefulPhrases 文本是否在 text 中
        for (const up of q.usefulPhrases) {
          if (!q.text.includes(up)) {
            const msg = `题目 ${q.id}: usefulPhrase "${up}" 不在 text 中`;
            warnings.push(msg);
            console.warn(`[validateQuestions] ${msg}`);
          }
        }
      }

      // simulation → operation 必须是 addition 或 subtraction，visualKey 必须存在
      if (sc.includes('simulation')) {
        if (q.operation !== 'addition' && q.operation !== 'subtraction') {
          const msg = `题目 ${q.id}: stepCompatibility 含 simulation 但 operation 是 "${q.operation}"（应为 addition/subtraction）`;
          warnings.push(msg);
          console.warn(`[validateQuestions] ${msg}`);
        }
        if (!q.visualKey) {
          const msg = `题目 ${q.id}: stepCompatibility 含 simulation 但 visualKey 为空`;
          warnings.push(msg);
          console.warn(`[validateQuestions] ${msg}`);
        }
      }
    }
  }

  if (warnings.length === 0) {
    console.log('[validateQuestions] ✅ 所有题目文本与 visual 一致，校验通过。');
  } else {
    console.warn(`[validateQuestions] ⚠️ 发现 ${warnings.length} 个不一致项，请检查。`);
  }

  return warnings;
}

// 仅在开发环境自动运行
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟执行，确保所有模块加载完毕
  setTimeout(() => {
    validateQuestions();
  }, 1000);
}
