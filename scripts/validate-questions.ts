/**
 * 题库全面扫描脚本 (v2.6 P0修复)
 *
 * 使用 `npx tsx -r tsconfig-paths/register scripts/validate-questions.ts` 运行
 * 或 `npm run validate:questions`
 *
 * 扫描所有题目，检查13项规则，输出通过/失败统计。
 */

import { allQuestions } from '@/data/questions';
import { inferLessonType, classifyNumberRole as libClassifyNumberRole } from '@/lib/questionValidation';

// ========== 禁止关键词列表 ==========

const FORBIDDEN_IN_NUMBER_CLUE = new Set([
  '至少', '保证', '最少', '一定', '不管', '最坏', '摸出',
  '倍', '谁最快', '谁最慢', '第一名', '最后一名',
]);

const FORBIDDEN_IN_ACTION_WORDS = new Set([
  '至少', '保证', '最少', '一定', '不管', '最坏', '摸出',
  '倍', '几倍', '倍数',
  '比', '多几', '少几', '差几',
  '每份', '每组', '每人', '平均', '一样多',
  '谁最快', '谁最慢', '不是最后一名',
]);

function classifyNumberRole(num: number, text: string, domain?: string, operation?: string): string {
  return libClassifyNumberRole(num, text, domain, operation);
}

// ========== 校验 ==========

interface ValidationError {
  questionId: string;
  grade: string;
  lessonType: string | null;
  errors: string[];
}

function validateQuestion(q: typeof allQuestions[0]): ValidationError {
  const errors: string[] = [];
  const lessonType = q.lessonType || inferLessonType(q);

  // 1. number_clue 是否存在0数字题 [P0]
  if (lessonType === 'number_clue' && q.numbers.length === 0) {
    errors.push('[CRITICAL] number_clue 题 numbers.length=0');
  }

  // 2. number_clue 是否混入逻辑推理题 [P0]
  if (lessonType === 'number_clue' && (q.domain === 'logic_reasoning' || q.operation === 'logic')) {
    errors.push('[CRITICAL] number_clue 混入逻辑推理题');
  }

  // 3. number_clue 禁止关键词 [P0]
  const hasForbiddenNum = q.keywords.some(k => FORBIDDEN_IN_NUMBER_CLUE.has(k.word));
  if (lessonType === 'number_clue' && hasForbiddenNum) {
    const fbw = q.keywords.filter(k => FORBIDDEN_IN_NUMBER_CLUE.has(k.word)).map(k => k.word);
    errors.push(`[CRITICAL] number_clue 包含禁止关键词: ${fbw.join(', ')}`);
  }

  // 4. add_sub_action 混入禁止关键词 [P0]
  if (lessonType === 'add_sub_action') {
    const forbidden = q.keywords.filter(k => FORBIDDEN_IN_ACTION_WORDS.has(k.word));
    if (forbidden.length > 0) {
      errors.push(`[CRITICAL] add_sub_action 包含禁止关键词: ${forbidden.map(k => k.word).join(', ')}`);
    }
  }

  // 5. 逻辑推理被分配数字线索 [P0]
  if (lessonType === 'number_clue') {
    const allBackground = q.numbers.length > 0 && q.numbers.every(n => classifyNumberRole(n, q.text, q.domain, q.operation) === 'background_number');
    if (allBackground) {
      errors.push('[CRITICAL] number_clue 所有数字都是背景数字（非计算用）');
    }
  }

  // 6. guarantee_worst_case 的选项检查 [P0]
  if (lessonType === 'guarantee_worst_case') {
    if (q.questionMeaningOptions) {
      const badOptions = q.questionMeaningOptions.filter(o =>
        o.includes('变多') || o.includes('变少') || o.includes('加法') || o.includes('减法')
      );
      if (badOptions.length > 0) {
        errors.push(`[CRITICAL] guarantee_worst_case 包含加减选项: ${badOptions.join(', ')}`);
      }
    }
  }

  // 7. 一年级禁止复杂算式
  if (q.gradeBand === 'G1' &&
    (q.operation === 'multiplication' || q.operation === 'division' || q.operation === 'mixed')) {
    errors.push(`[WARNING] G1 用了 ${q.operation} 运算`);
  }

  // 8. 空 explanation
  if (!q.explanation || q.explanation.trim().length === 0) {
    errors.push('[WARNING] explanation 为空');
  }

  // 9. 选项数量不足
  if (q.questionMeaningOptions && q.questionMeaningOptions.length < 2) {
    errors.push('[WARNING] 选项数量不足2个');
  }

  // 10. correctAnswer 不在选项中
  if (q.questionMeaningOptions && q.correctMeaning && !q.questionMeaningOptions.includes(q.correctMeaning)) {
    errors.push('[WARNING] correctMeaning 不在选项中');
  }

  // 11. number_clue 数字必须在题干中存在
  if (lessonType === 'number_clue') {
    for (const n of q.numbers) {
      const arabicFound = q.text.includes(String(n));
      const cnMap: Record<number, string[]> = {
        1: ['一'], 2: ['二', '两'], 3: ['三'], 4: ['四'], 5: ['五'],
        6: ['六'], 7: ['七'], 8: ['八'], 9: ['九'], 10: ['十'],
      };
      const cnFound = cnMap[n]?.some(c => q.text.includes(c)) || false;
      if (!arabicFound && !cnFound) {
        errors.push(`[WARNING] 数字 ${n} 未在题干中找到`);
      }
    }
  }

  // 12. 低年级高相似度选项
  if ((q.gradeBand === 'G1' || q.gradeBand === 'OlympiadIntro') && q.questionMeaningOptions) {
    const opts = q.questionMeaningOptions;
    for (let i = 0; i < opts.length; i++) {
      for (let j = i + 1; j < opts.length; j++) {
        if (opts[i].length > 3 && opts[j].length > 3) {
          const aWords = new Set(opts[i]);
          const bWords = new Set(opts[j]);
          let common = 0;
          for (const w of aWords) { if (bWords.has(w)) common++; }
          const all = new Set([...aWords, ...bWords]).size;
          const sim = common / all;
          if (sim > 0.85) {
            errors.push(`[WARNING] G1 选项相似度 ${(sim*100).toFixed(0)}%: "${opts[i]}" vs "${opts[j]}"`);
          }
        }
      }
    }
  }

  // 13. stepCompatibility 标注冲突
  if (q.stepCompatibility && lessonType === 'logic_reasoning') {
    if (q.stepCompatibility.includes('find_numbers')) {
      errors.push('[WARNING] 逻辑推理题标注了 find_numbers 兼容');
    }
  }

  return { questionId: q.id, grade: q.gradeBand, lessonType, errors };
}

// ========== 主扫描 ==========

function main() {
  console.log('🔍 数学侦探题库全面扫描 (v2.6 P0修复)\n');

  let passedCount = 0;
  let failedCount = 0;
  const allResults: ValidationError[] = [];

  for (const q of allQuestions) {
    const result = validateQuestion(q);
    allResults.push(result);
    if (result.errors.length > 0) failedCount++;
    else passedCount++;
  }

  const totalQuestions = allQuestions.length;

  // ========== 输出报告 ==========
  console.log(`📊 扫描结果：`);
  console.log(`   总题数：${totalQuestions}`);
  console.log(`   通过：${passedCount} ✅`);
  console.log(`   失败：${failedCount} ❌\n`);

  if (failedCount > 0) {
    const criticalErrors = allResults.filter(r => r.errors.some(e => e.includes('[CRITICAL]')));
    const warnings = allResults.filter(r => r.errors.length > 0 && !r.errors.some(e => e.includes('[CRITICAL]')));

    if (criticalErrors.length > 0) {
      console.log(`🔴 CRITICAL 错误 (${criticalErrors.length} 题)：\n`);
      for (const r of criticalErrors) {
        console.log(`  [${r.questionId}] grade=${r.grade} lessonType=${r.lessonType}`);
        for (const e of r.errors) console.log(`    ❌ ${e}`);
        console.log('');
      }
    }

    if (warnings.length > 0) {
      console.log(`🟡 WARNING (${warnings.length} 题)：\n`);
      for (const r of warnings) {
        console.log(`  [${r.questionId}] grade=${r.grade} lessonType=${r.lessonType}`);
        for (const e of r.errors) console.log(`    ⚠️ ${e}`);
        console.log('');
      }
    }
  }

  // 按年级统计
  console.log(`📈 按年级统计：`);
  const gradeStats: Record<string, { total: number; pass: number; fail: number }> = {};
  for (const r of allResults) {
    const g = r.grade || 'unknown';
    if (!gradeStats[g]) gradeStats[g] = { total: 0, pass: 0, fail: 0 };
    gradeStats[g].total++;
    if (r.errors.length > 0) gradeStats[g].fail++;
    else gradeStats[g].pass++;
  }

  for (const [grade, stats] of Object.entries(gradeStats).sort()) {
    const icon = stats.fail === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${grade}: ${stats.pass}/${stats.total} (${stats.fail} 失败)`);
  }

  // 按 lessonType 统计
  console.log(`\n📊 按 lessonType 分布：`);
  const typeStats: Record<string, number> = {};
  for (const r of allResults) {
    const t = r.lessonType || 'unknown';
    typeStats[t] = (typeStats[t] || 0) + 1;
  }

  for (const [type, count] of Object.entries(typeStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} 题`);
  }

  if (failedCount > 0) {
    console.log(`\n⚠️ 有 ${failedCount} 题校验失败！请修复后重新扫描。`);
    process.exitCode = 1;
  } else {
    console.log(`\n✅ 所有题目校验通过！`);
  }
}

main();
