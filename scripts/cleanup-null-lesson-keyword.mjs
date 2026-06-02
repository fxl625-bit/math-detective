/**
 * 清理注入错误的 'null' 值并手工修复边缘 case
 * 
 * 用法: node scripts/cleanup-null-lesson-keyword.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');
const QUESTION_FILES = [
  'g1.ts', 'g1-thinking.ts', 'g2.ts', 'g2-olympiad.ts',
  'g3.ts', 'g3-multiplication.ts', 'g3-olympiad.ts',
  'g4.ts', 'g4-olympiad.ts',
  'g5.ts', 'g5-olympiad.ts',
  'g6.ts',
  'extra-info.ts', 'missing-info.ts', 'olympiadIntro.ts',
];

for (const fileName of QUESTION_FILES) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(filePath)) continue;
  
  let source = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 清理错误的 'null' 值（多行格式）
  if (source.includes("lessonType:'null'")) {
    // 删除整行 "  lessonType:'null',"
    source = source.replace(/^\s*lessonType:'null',\n/gm, '');
    modified = true;
  }
  if (source.includes("keywordType:'null'")) {
    source = source.replace(/^\s*keywordType:'null',\n/gm, '');
    modified = true;
  }
  
  // 清理紧凑格式中的 null：,lessonType:'null',keywordType:'null',
  source = source.replace(/,lessonType:'null'/g, '');
  source = source.replace(/,keywordType:'null'/g, '');
  
  if (modified) {
    fs.writeFileSync(filePath, source, 'utf-8');
    console.log(`✅ 已清理 ${fileName}`);
  } else {
    console.log(`⏭️  跳过 ${fileName} (无需处理)`);
  }
}
console.log('\n清理完成！');
