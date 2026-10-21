import { writeFileSync } from 'node:fs';
import { allQuestions, isQuestionSafeForNewLesson, safeQuestions } from '@/data/questions';
import { inferAnswerSchema } from '@/lib/answerSchema';
import { textRevealsAnswer } from '@/lib/hintSafety';
import { buildReasoningTasks, getExplicitQuestionNumberLiterals, selectTransferQuestion } from '@/lib/independentSolving';

const gradeQuestions = allQuestions.filter(q => /^G[1-6]$/.test(q.gradeBand) || q.gradeBand === 'OlympiadIntro');
function independentAnswerLeakCheck(label: string, question: typeof gradeQuestions[number]): boolean {
  const compact = (value: string) => value.toLowerCase().replace(/[\s，,。；;：:、()（）]/g, '');
  const visible = compact(label);
  const answer = compact(String(question.answer));
  if (answer && (visible === answer || (answer.length >= 2 && visible.includes(answer)))) return true;
  const sentence = compact(question.answerSentence || '');
  if (sentence && visible.includes(sentence)) return true;
  if (/\d+(?:\.\d+)?\s*[+＋\-−×*÷/]\s*\d+(?:\.\d+)?\s*(?:=|＝)\s*[-+]?\d/.test(label)) return true;
  if (/[=＝<>]/.test(label) && /\d/.test(label)) return true;
  if (typeof question.answer === 'number') {
    const literal = String(question.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\d.])${literal}(?![\\d.])`).test(label)) return true;
  }
  return false;
}
const audit = gradeQuestions.map(question => ({
  id: question.id,
  grade: question.gradeBand,
  semester: question.curriculumSemester || (question as unknown as Record<string, unknown>).semester || null,
  skillIds: question.curriculumSkillIds || question.skillIds || [],
  operation: question.operation,
  domain: question.domain,
  answerSchema: inferAnswerSchema(question),
  reasoningFrame: question.reasoningFrame ? {
    targetQuestionType: question.reasoningFrame.targetQuestion.questionType,
    factRoles: question.reasoningFrame.knownFacts.map(fact => fact.role),
  } : null,
  safe: isQuestionSafeForNewLesson(question),
  tasks: buildReasoningTasks(question).map(task => {
    const learnerFacing = [task.prompt, task.feedback, task.scaffold, ...task.options.map(option => option.label)];
    const source = task.id.includes(':curated-')
      ? 'explicit_curated_content'
      : task.skill === 'target'
      ? question.questionMeaningOptions?.includes(question.correctMeaning) ? 'questionMeaningOptions' : 'questionText.target_vs_known_facts'
      : task.skill === 'relation' ? 'reasoningFrame.knownFacts+targetQuestion+operation'
        : task.prompt === '题目中给出的数字是哪一组？' ? 'question.text.explicit_numeric_literals'
          : 'reasoningFrame.knownFacts.role';
    return {
      id: task.id,
      skill: task.skill,
      source,
      sourceLiterals: source === 'question.text.explicit_numeric_literals' ? getExplicitQuestionNumberLiterals(question.text) : undefined,
      prompt: task.prompt,
      options: task.options,
      correctOptionId: task.correctOptionId,
      feedback: task.feedback,
      scaffold: task.scaffold,
      answerLeakCheckPassed: learnerFacing.every(text => !textRevealsAnswer(text, question)),
      independentAnswerCheckPassed: task.options.filter(option => option.id === task.correctOptionId)
        .every(option => !independentAnswerLeakCheck(option.label, question)),
      optionAnswerCheckPassed: task.options.every(option => !independentAnswerLeakCheck(option.label, question)),
    };
  }),
  transfer: selectTransferQuestion(question, safeQuestions),
}));
const taskCount = (row: typeof audit[number]) => row.tasks.length;

const grades = Object.fromEntries(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'OlympiadIntro'].map(grade => {
  const rows = audit.filter(row => row.grade === grade);
  const taskAvailable = rows.filter(row => taskCount(row) > 0).length;
  const transferMatched = rows.filter(row => row.transfer.kind === 'matched').length;
  return [grade, {
    total: rows.length,
    taskAvailable,
    taskCoverage: rows.length ? Number((taskAvailable / rows.length).toFixed(4)) : 0,
    tasksByCount: Object.fromEntries([1, 2, 3].map(count => [count, rows.filter(row => taskCount(row) === count).length])),
    strictTransferMatched: transferMatched,
    strictTransferRate: rows.length ? Number((transferMatched / rows.length).toFixed(4)) : 0,
    taskGapIds: rows.filter(row => taskCount(row) === 0).map(row => row.id),
    transferGapIds: rows.filter(row => row.transfer.kind === 'unavailable').map(row => row.id),
    transferGapReasons: Object.fromEntries([...new Set(rows.filter(row => row.transfer.kind === 'unavailable').map(row => row.transfer.reason))]
      .map(reason => [reason, rows.filter(row => row.transfer.kind === 'unavailable' && row.transfer.reason === reason).length])),
  }];
}));

const matchedRows = audit.filter(row => row.transfer.kind === 'matched');
const independentAnswerFailures = audit.flatMap(row => row.tasks.filter(task => !task.independentAnswerCheckPassed)
  .map(task => ({ questionId: row.id, taskId: task.id, correctOption: task.options.find(option => option.id === task.correctOptionId)?.label })));
const anyOptionAnswerFailures = audit.flatMap(row => row.tasks.filter(task => !task.optionAnswerCheckPassed)
  .map(task => ({ questionId: row.id, taskId: task.id })));
const output = {
  scope: 'allQuestions G1-G6 and OlympiadIntro; original IDs remain the coverage denominator; transfer-only variants are excluded',
  total: gradeQuestions.length,
  allQuestionBankCount: allQuestions.length,
  safeNewLessonCount: audit.filter(row => row.safe).length,
  taskAvailable: audit.filter(row => taskCount(row) > 0).length,
  taskCoverage: gradeQuestions.length ? Number((audit.filter(row => taskCount(row) > 0).length / gradeQuestions.length).toFixed(4)) : 0,
  strictTransferMatched: matchedRows.length,
  strictTransferRate: gradeQuestions.length ? Number((matchedRows.length / gradeQuestions.length).toFixed(4)) : 0,
  independentAnswerLeakFailures: independentAnswerFailures,
  optionAnswerLeakFailures: anyOptionAnswerFailures,
  strictTransferMatches: matchedRows.map(row => ({ originalId: row.id, transferId: row.transfer.kind === 'matched' ? row.transfer.questionId : undefined })),
  grades,
  questions: audit,
};
const outputPath = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : 'reports/2026-10-21-transfer-expansion/independent-content-audit.json';
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputPath,
  total: output.total,
  taskAvailable: output.taskAvailable,
  taskCoverage: output.taskCoverage,
  independentAnswerLeakFailures: independentAnswerFailures.length,
  optionAnswerLeakFailures: anyOptionAnswerFailures.length,
  strictTransferMatched: output.strictTransferMatched,
  strictTransferRate: output.strictTransferRate,
  grades: Object.fromEntries(Object.entries(grades).map(([grade, row]) => [grade, {
    total: row.total, taskAvailable: row.taskAvailable, strictTransferMatched: row.strictTransferMatched,
    taskGapIds: row.taskGapIds,
  }])),
}, null, 2));
