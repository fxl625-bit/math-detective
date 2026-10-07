import { writeFileSync } from 'node:fs';
import { learningUnits } from '../../lib/curriculum/learningPath';
import { getQuestionById } from '../../data/questions';
import { progressionQuestions, questionLearningMetadata } from '../../data/questions/progression';

const newIds = new Set(progressionQuestions.map((question) => question.id));
const oldIds = new Set(questionLearningMetadata.filter((entry) => !newIds.has(entry.questionId)).map((entry) => entry.questionId));
const lines = [
  '# G1–G6 课程内容批次验收清单',
  '',
  `本批包含 ${learningUnits.length} 个学习单元、${progressionQuestions.length} 道新题、${questionLearningMetadata.length} 条题目-单元元数据；使用 ${oldIds.size} 个旧题 ID 做真实技能复用。单元目录使用 semester=both 表示暂时没有逐学期归属证据，不代表上下学期逐册或逐课覆盖。`,
  '',
  '自动检查：`tests/content/progression.test.ts` 校验所有新增题均有元数据且无孤儿/重复 ID、题目可安全投放、标准输入可由生产 checker 判对、目标与前置技能存在、先修单元无环、各单元角色池数量及 tier 1/2；`tests/integration/upgrade-all-units.test.ts` 对固定日期/学期/偏好/证据档运行 19,440 个生产课生成案例。',
  '',
  '## 单元候选池',
  '',
  '| 单元 | Foundation | Application | Advanced | Olympiad | 技能键 |',
  '|---|---|---|---|---|---|',
];

for (const unit of learningUnits) {
  const entries = questionLearningMetadata.filter((entry) => entry.unitId === unit.id);
  const roles = (role: string) => entries.filter((entry) => entry.role === role).map((entry) => {
    const source = newIds.has(entry.questionId) ? '新' : '旧';
    return `${entry.questionId}（${source}·T${entry.tier}·${entry.targetSkillKeys.join('+')}）`;
  }).join('<br>');
  lines.push(`| ${unit.id} ${unit.title} | ${roles('foundation')} | ${roles('application')} | ${roles('advanced')} | ${roles('olympiad')} | ${unit.skillKeys.join('<br>')} |`);
}

lines.push('', '## 新题独立复核记录', '', '下列记录把题干所需的独立演算线索与标准答案并列，供数学复审逐题核验；不要仅凭答案字段或元数据标签视为教材覆盖。', '', '| QID | 年级/技能 | 标准答案 | 方程/推导要点 |', '|---|---|---|---|');
for (const question of progressionQuestions) {
  const skill = question.curriculumSkillIds?.join('+') ?? question.skillIds?.join('+') ?? '';
  const proof = [question.equation, ...question.solutionSteps].filter(Boolean).join('<br>');
  const answerUnit = question.answerSchema && 'unit' in question.answerSchema ? question.answerSchema.unit ?? '' : '';
  const answer = `${String(question.answer)}${answerUnit ? ` ${answerUnit}` : ''}`;
  const esc = (value: string) => value.replaceAll('|', '&#124;');
  lines.push(`| ${question.id} | ${question.gradeBand} ${esc(skill)} | ${esc(answer)} | ${esc(proof)} |`);
}

lines.push(
  '',
  '## 边界与历史处理',
  '',
  '- 内容目录不声称逐课/逐册教材覆盖；semester=both 是暂定学期归属。',
  '- 旧题中的错误历史 ID 被 `qualityStatus: fail` 隔离并从新课候选中移除，不覆盖旧答案/ID；代表项包括 `g1ll_65`、`g1ll_67`、`g2_24`、`g5o_13`、`g5o_32`。',
  '- 按授权对 `g6_03` 仅修正无括号造成的除法歧义，成为 `40÷(2/3)=60`；旧 ID 与标准答案未变。',
  '- `g1ll_46` 保留原题干和正确答案，增加三选一输入 schema；`g1ll_48`、`g1ll_50` 使用 yuan/jiao money schema。',
  '- 类型检查与内容/生成测试只证明接口和可生成、可判答案；最终数学签收以 SOL 的逐题审阅为准。',
  '',
);

writeFileSync('reports/2026-09-28-upgrade/content/final-inventory.md', lines.join('\n'), 'utf8');
console.log(`wrote final-inventory.md: ${progressionQuestions.length} new questions, ${questionLearningMetadata.length} metadata entries, ${oldIds.size} distinct legacy references`);
