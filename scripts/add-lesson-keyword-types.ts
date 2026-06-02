/**
 * 批量补齐 lessonType 和 keywordType
 * 
 * 用法: npx tsx scripts/add-lesson-keyword-types.ts
 * 
 * 为所有题库文件中的每道题目自动推断并注入 lessonType 和 keywordType 字段。
 * 安全机制：只处理缺失字段的题目，已有字段的不覆盖。
 */

import { Question, LessonType, KeywordType } from '@/lib/types';
import { inferLessonType, inferKeywordType } from '@/lib/questionValidation';
import * as fs from 'fs';
import * as path from 'path';

// 题库文件列表
const QUESTION_FILES = [
  'g1.ts', 'g1-thinking.ts', 'g2.ts', 'g2-olympiad.ts',
  'g3.ts', 'g3-multiplication.ts', 'g3-olympiad.ts',
  'g4.ts', 'g4-olympiad.ts',
  'g5.ts', 'g5-olympiad.ts',
  'g6.ts',
  'extra-info.ts', 'missing-info.ts', 'olympiadIntro.ts',
];

const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

interface InferredFields {
  lessonType: LessonType | null;
  keywordType: KeywordType | null;
}

function getInferredFields(q: Question): InferredFields {
  const lessonType = inferLessonType(q);
  const keywordType = inferKeywordType(q);
  
  // 如果 lessonType 是 null，尝试基于操作类型兜底
  let finalLessonType = lessonType;
  if (!finalLessonType) {
    if (q.numbers.length > 0 && q.operation !== 'logic') {
      finalLessonType = 'number_clue';
    }
  }
  
  let finalKeywordType = keywordType;
  if (!finalKeywordType) {
    if (q.numbers.length > 0) {
      finalKeywordType = 'number_extract';
    }
  }
  
  return { lessonType: finalLessonType, keywordType: finalKeywordType };
}

/**
 * 在问题对象的字符串中注入 lessonType 和 keywordType。
 * 支持多行和单行两种格式。
 */
function injectFields(questionStr: string, inferred: InferredFields): string {
  const { lessonType, keywordType } = inferred;
  const fields: string[] = [];
  
  if (lessonType) {
    fields.push(`lessonType:'${lessonType}'`);
  }
  if (keywordType) {
    fields.push(`keywordType:'${keywordType}'`);
  }
  
  if (fields.length === 0) return questionStr;
  
  const injection = fields.join(',');
  
  // 检测是否是单行格式（没有换行或只有少量换行）
  const isCompactLine = questionStr.indexOf('\n') === -1 || 
    questionStr.trim().split('\n').length <= 2;
  
  if (isCompactLine) {
    // 单行格式：在最后一个 }, 之前插入
    const lastIdx = questionStr.lastIndexOf('},');
    if (lastIdx !== -1) {
      return questionStr.substring(0, lastIdx + 1) + injection + ',' + questionStr.substring(lastIdx + 1);
    }
    // 可能是不带逗号的最后一个对象
    const lastObjEnd = questionStr.lastIndexOf('}');
    if (lastObjEnd > 0 && questionStr[lastObjEnd - 1] !== ',') {
      return questionStr.substring(0, lastObjEnd) + ',' + injection + '}';
    }
    return questionStr;
  }
  
  // 多行格式：在 requiresAnswer 行之后、stepCompatibility 行之前插入
  // 找到 requiresAnswer: true, 行（或其他最后一个必填字段），在此之后插入
  const lines = questionStr.split('\n');
  
  // 尝试找到 requiresAnswer 行
  const requireIdx = lines.findIndex(l => /requiresAnswer:\s*(true|false),?\s*$/.test(l.trim()));
  
  if (requireIdx !== -1) {
    // 在 requiresAnswer 之后插入新行
    const indent = '  '; // 使用2空格缩进
    const newLines = fields.map(f => `${indent}${f},`);
    lines.splice(requireIdx + 1, 0, ...newLines);
    return lines.join('\n');
  }
  
  // 兜底：在最后一个 } 之前插入
  const lastCloseIdx = lines.findLastIndex(l => l.trim() === '},');
  if (lastCloseIdx !== -1) {
    const indent = '  ';
    const newLines = fields.map(f => `${indent}${f},`);
    lines.splice(lastCloseIdx, 0, ...newLines);
    return lines.join('\n');
  }
  
  return questionStr;
}

async function main() {
  const stats = {
    total: 0,
    hasLessonType: 0,
    hasKeywordType: 0,
    added: 0,
    skipped: 0,
  };

  for (const fileName of QUESTION_FILES) {
    const filePath = path.join(QUESTIONS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过不存在的文件: ${fileName}`);
      continue;
    }

    // 动态导入题库（Windows 兼容：转 file:// URL）
    const fileUrl = 'file:///' + filePath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => d + ':');
    const module = await import(fileUrl);
    const exportKey = Object.keys(module).find(k => k.endsWith('Questions'));
    if (!exportKey) {
      console.log(`⚠️  未找到 Questions 导出: ${fileName}`);
      continue;
    }
    
    const questions: Question[] = module[exportKey];
    console.log(`\n📄 ${fileName} (${questions.length} 题)`);

    // 检查是否有缺失
    const missing = questions.filter(q => !q.lessonType || !q.keywordType);
    
    if (missing.length === 0) {
      console.log(`   ✅ 全部已补齐，跳过`);
      stats.skipped += questions.length;
      continue;
    }

    // 构建推断映射
    const inferredMap = new Map<string, InferredFields>();
    for (const q of missing) {
      inferredMap.set(q.id, getInferredFields(q));
    }

    // 读取源文件
    let source = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // 对每个缺失的题目，在源码中查找并注入
    for (const q of missing) {
      const inferred = inferredMap.get(q.id)!;
      if (!inferred.lessonType && !inferred.keywordType) {
        console.log(`   ⚠️  ${q.id}: 无法推断 lessonType/keywordType`);
        continue;
      }

      // 检测是否已经有 lessonType 字段
      const alreadyHas = source.includes(`${q.id}'`) && 
        new RegExp(`id:\\s*'${q.id}'.*?lessonType:`).test(
          source.substring(source.indexOf(`id: '${q.id}'`), source.indexOf(`id: '${q.id}'`) + 2000)
        );
      
      if (alreadyHas) {
        stats.hasLessonType++;
        continue;
      }

      // 提取这个题目的源码字符串
      const idPattern = `id: '${q.id}'`;
      const idIdx = source.indexOf(idPattern);
      if (idIdx === -1) {
        console.log(`   ⚠️  ${q.id}: 在源文件中未找到`);
        continue;
      }

      // 从 id 位置往前找 {, 往后找匹配的 }
      const startIdx = source.lastIndexOf('{', idIdx);
      if (startIdx === -1) continue;

      // 简单括号匹配找到题目对象的结束位置
      let depth = 0;
      let endIdx = startIdx;
      // 找到开始括号后的第一个 {
      const objStart = source.indexOf('{', startIdx);
      for (let i = objStart; i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
      
      if (endIdx === startIdx) {
        console.log(`   ⚠️  ${q.id}: 找不到题目对象边界`);
        continue;
      }

      const questionStr = source.substring(startIdx, endIdx + 1);
      const newQuestionStr = injectFields(questionStr, inferred);
      
      if (newQuestionStr !== questionStr) {
        source = source.substring(0, startIdx) + newQuestionStr + source.substring(endIdx + 1);
        modified = true;
        stats.added++;
        const lt = inferred.lessonType || 'null';
        const kt = inferred.keywordType || 'null';
        console.log(`   ✅ ${q.id}: lessonType=${lt}, keywordType=${kt}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, source, 'utf-8');
      console.log(`   💾 已保存 ${fileName}`);
    }
    
    stats.total += questions.length;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 汇总:');
  console.log(`   总题数: ${stats.total}`);
  console.log(`   已添加 lessonType/keywordType: ${stats.added} 道`);
  console.log(`   已有字段跳过: ${stats.hasLessonType} 道`);
  console.log(`   无需处理: ${stats.skipped} 道`);
}

main().catch(console.error);
