/**
 * 批量为题库添加 answerType
 * 运行: node scripts/add-answertype.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function inferAnswerType(text, answer, problemType, correctRanking, subAnswers, isInsufficient) {
  // 显式类型
  if (correctRanking) return 'ranking';
  if (subAnswers?.length) return 'multi_answer';
  if (isInsufficient) return 'not_enough_information';

  // 从 problemType 推断
  if (problemType === 'logic_ranking' || problemType === 'logic_truth' || problemType === 'logic_ordering') {
    // 如果只问一个人（谁最快/谁第一），用 text
    if (/谁.*最快|谁.*第一|谁.*最慢|谁.*最后/.test(text)) return 'text';
    return 'ranking';
  }

  // 从文本推断多答案
  const questionMarks = (text.match(/？|\?/g) || []).length;
  if (questionMarks >= 2) {
    const answerStr = String(answer);
    if (/，|；|和/.test(answerStr) && !/^\d+$/.test(answerStr)) {
      return 'multi_answer';
    }
  }

  // 从答案类型推断
  if (typeof answer === 'number') return 'number';
  if (typeof answer === 'string') {
    // 纯数字字符串
    if (!isNaN(Number(answer))) return 'number';
    // 包含中文的文本答案
    if (/[一-鿿]/.test(answer)) return 'text';
    // 分数
    if (/^\d+\/\d+$/.test(answer)) return 'number';
  }

  return 'number'; // 默认
}

const FILES = [
  'g1.ts', 'g2.ts', 'g3.ts', 'g4.ts', 'g5.ts', 'g6.ts',
  'g1-thinking.ts', 'g2-olympiad.ts', 'g3-multiplication.ts',
  'g3-olympiad.ts', 'g4-olympiad.ts', 'g5-olympiad.ts',
  'olympiadIntro.ts', 'extra-info.ts', 'missing-info.ts',
];

let totalFixed = 0;

for (const file of FILES) {
  const filepath = join(ROOT, 'data', 'questions', file);
  let content;
  try {
    content = readFileSync(filepath, 'utf-8');
  } catch { continue; }

  // 检查是否已有 answerType
  const lines = content.split('\n');
  let fixCount = 0;
  let currentText = '';
  let currentAnswer = '';
  let currentProblemType = '';
  let currentCorrectRanking = false;
  let currentSubAnswers = false;
  let currentIsInsufficient = false;
  let hasAnswerType = false;
  let insertAfterLine = -1;

  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测新题目块
    if (/^\s*\{\s*$/.test(line) || /id:\s*'/.test(line)) {
      // 前一个题目缺 answerType 则插入
      if (insertAfterLine >= 0 && currentText && !hasAnswerType) {
        const inferred = inferAnswerType(
          currentText, currentAnswer, currentProblemType,
          currentCorrectRanking, currentSubAnswers, currentIsInsufficient
        );
        newLines.splice(insertAfterLine + 1, 0, `    answerType: '${inferred}',`);
        fixCount++;
      }
      currentText = '';
      currentAnswer = '';
      currentProblemType = '';
      currentCorrectRanking = false;
      currentSubAnswers = false;
      currentIsInsufficient = false;
      hasAnswerType = false;
      insertAfterLine = -1;
    }

    const textMatch = line.match(/text:\s*'([^']+)'/);
    if (textMatch) currentText = textMatch[1];

    const answerMatch = line.match(/answer:\s*'?([^',]+)'?/);
    if (answerMatch) currentAnswer = answerMatch[1];

    const ptMatch = line.match(/problemType:\s*'([^']+)'/);
    if (ptMatch) currentProblemType = ptMatch[1];

    if (line.includes('correctRanking:')) currentCorrectRanking = true;
    if (line.includes('subAnswers:')) currentSubAnswers = true;
    if (line.includes('isInsufficient:')) currentIsInsufficient = true;
    if (line.includes('answerType:')) hasAnswerType = true;

    if (line.includes('stepCompatibility:') || line.includes('requiresAnswer:')) {
      insertAfterLine = newLines.length;
    }

    newLines.push(line);
  }

  // 最后一个题目
  if (insertAfterLine >= 0 && currentText && !hasAnswerType) {
    const inferred = inferAnswerType(
      currentText, currentAnswer, currentProblemType,
      currentCorrectRanking, currentSubAnswers, currentIsInsufficient
    );
    newLines.splice(insertAfterLine + 1, 0, `    answerType: '${inferred}',`);
    fixCount++;
  }

  if (fixCount > 0) {
    writeFileSync(filepath, newLines.join('\n'), 'utf-8');
    console.log(`  [FIX] ${file}: ${fixCount} answerType added`);
    totalFixed += fixCount;
  }
}

console.log(`\n✅ Done! Added answerType to ${totalFixed} questions.`);
