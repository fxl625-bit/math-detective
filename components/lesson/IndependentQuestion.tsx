'use client';

import { useMemo, useRef, useState } from 'react';
import type { Question, LessonStep } from '@/lib/types';
import { getQuestionById } from '@/data/questions';
import { AnswerInputRouter } from '@/components/lesson/AnswerInputRouter';
import { inferAnswerSchema } from '@/lib/answerSchema';
import { buildReasoningTasks } from '@/lib/independentSolving';
import type { LessonAction, LessonActionPayload } from '@/lib/lessonTransaction';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';

interface IndependentQuestionProps {
  question: Question;
  step: LessonStep;
  onAction: (action: LessonAction, payload: LessonActionPayload, source: string) => boolean;
  onSubmitAnswer: (inputAnswer: string, questionId: string) => void;
  onContinue: () => void;
  disabled?: boolean;
}

type AnswerValue = string | Record<string, string>;

function hasValue(value: AnswerValue): boolean {
  return typeof value === 'string'
    ? value.trim().length > 0
    : Object.values(value).some(part => part.trim().length > 0);
}

function serializeAnswer(value: AnswerValue): string {
  return typeof value === 'string' ? value.trim() : JSON.stringify(value);
}

export default function IndependentQuestion({
  question, step, onAction, onSubmitAnswer, onContinue, disabled = false,
}: IndependentQuestionProps) {
  const [answer, setAnswer] = useState<AnswerValue>('');
  const [transferAnswer, setTransferAnswer] = useState<AnswerValue>('');
  const [selectedOption, setSelectedOption] = useState('');
  const [helpPaused, setHelpPaused] = useState(false);
  const submitLock = useRef(false);
  const submitTransferLock = useRef(false);
  const evidence = step.solving;
  const transfer = step.transfer;
  const tasks = useMemo(() => buildReasoningTasks(question), [question]);
  const task = tasks[evidence?.helpTaskIndex ?? 0];
  const visibleTaskOptions = task && (evidence?.helpWrongCount ?? 0) >= 2
    ? task.options.filter(option => option.id === task.correctOptionId || option.id === task.options.find(item => item.id !== task.correctOptionId)?.id)
    : task?.options;
  const isExplained = evidence?.phase === 'explanation' && evidence.fullExplanationViewedBeforeSolve;
  const legacyReview = !evidence && Boolean(step.awardedAt);
  const isOriginalCorrect = (evidence?.phase === 'review' && evidence.finalCorrect) || legacyReview;
  const transferQuestion = transfer?.questionId ? getQuestionById(transfer.questionId) : undefined;

  function createPayload(questionId = question.id, extra: LessonActionPayload = {}): LessonActionPayload {
    return { questionId, actionId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...extra };
  }

  function submitHelpTask() {
    if (!task || !selectedOption) return;
    const committed = onAction('submit_help_task', createPayload(question.id, { taskId: task.id, value: selectedOption }), 'IndependentHelpTask');
    if (committed) setSelectedOption('');
  }

  if (isExplained) {
    const transferResolved = transfer?.status === 'correct' || transfer?.status === 'deferred';
    const unavailable = Boolean(transfer?.unavailableReason);
    if (transfer?.status === 'pending' || transfer?.status === 'answering') {
      if (!transferQuestion) {
        return <AppCard variant="amber"><p>这道题的变式题暂时不可用，已记为待复练。</p><AppButton data-testid="defer-transfer" variant="primary" size="lg" fullWidth onClick={() => onAction('defer_transfer', createPayload(transfer.questionId, { questionInstanceId: transfer.questionInstanceId }), 'TransferUnavailable')}>继续下一题</AppButton></AppCard>;
      }
      return (
        <section className="space-y-4" aria-label="迁移练习">
          <AppCard variant="purple"><p className="font-bold">试试用刚才的想法解决这道新题</p><p className="mt-2" data-testid="lesson-question-prompt">{transferQuestion.text}</p></AppCard>
          <AppCard>
            <form onSubmit={event => { event.preventDefault(); submitTransfer(); }}>
              <AnswerInputRouter schema={transferQuestion.answerSchema || inferAnswerSchema(transferQuestion)} value={transferAnswer} onChange={setTransferAnswer} onSubmit={submitTransfer} disabled={disabled} />
              <AppButton data-testid="submit-answer" variant="success" size="lg" fullWidth type="submit" disabled={!hasValue(transferAnswer) || disabled}>提交答案</AppButton>
            </form>
          </AppCard>
          {transfer?.status === 'answering' && transfer.solving.attemptCount > 0 && transfer.solving.finalCorrect === false && <p role="status" className="text-amber-700">再看看新题中的数量关系，可以继续尝试，也可以先安排复练。</p>}
          <AppButton data-testid="defer-transfer" variant="secondary" size="lg" fullWidth disabled={disabled} onClick={() => onAction('defer_transfer', createPayload(transferQuestion.id, { questionInstanceId: transfer.questionInstanceId }), 'TransferDeferred')}>先继续，安排复练</AppButton>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <section data-testid="full-explanation">
          <AppCard variant="green">
            <h2 className="font-extrabold text-green-800">这题的完整讲解</h2>
            <p className="mt-2 whitespace-pre-line text-gray-700">{question.explanation || question.answerSentence || '回到题目中的已知条件，按照题目要求逐步求出答案。'}</p>
            {question.answerSentence && question.answerSentence !== question.explanation && <p className="mt-2 text-gray-700">{question.answerSentence}</p>}
            <SolutionWalkthrough question={question} />
            <p className="mt-3 font-bold text-green-800">答案：{String(question.answer)}</p>
          </AppCard>
        </section>
        {transferResolved ? (
          <>
            <AppCard variant={transfer?.status === 'correct' ? 'green' : 'amber'}>
              <p data-testid="mastery-status" className="font-bold">{transfer?.status === 'correct' ? '学习后完成变式' : '原题已记录为待巩固，已安排复练'}</p>
              {unavailable && <p className="mt-2 text-sm">这题暂时没有经过核验的同构变式，继续课程并安排同知识点复练。</p>}
            </AppCard>
            <AppButton data-testid="continue-feedback" variant="primary" size="lg" fullWidth disabled={disabled} onClick={onContinue}>完成，进入下一关 →</AppButton>
          </>
        ) : (
          <AppButton data-testid="start-transfer" variant="primary" size="lg" fullWidth disabled={disabled} onClick={() => onAction('start_transfer', createPayload(), 'StartTransfer')}>试试一道相似的新题</AppButton>
        )}
      </section>
    );
  }

  if (isOriginalCorrect) {
    return (
      <section className="space-y-4">
        <AppCard variant="green">
          <h2 className="font-extrabold text-green-800" data-testid="question-review">回答正确！</h2>
          <p className="mt-2">答案：{String(question.answer)}</p>
          {question.explanation && <p data-testid="review-explanation" className="mt-2 text-gray-700">{question.explanation}</p>}
          {question.answerSentence && <p data-testid="review-answer-sentence" className="mt-2 font-bold text-green-800">{question.answerSentence}</p>}
          <SolutionWalkthrough question={question} />
          <p className="mt-2" data-testid="mastery-status">{legacyReview ? '历史题已完成，独立程度未知' : evidence?.masteryStatus === 'independent'
            ? '独立完成'
            : evidence?.outcome === 'retry_correct'
              ? '自行重试后完成'
              : evidence?.hintCount
                ? '使用帮助后完成'
                : '已完成'}</p>
        </AppCard>
        <AppButton data-testid="continue-feedback" variant="primary" size="lg" fullWidth disabled={disabled} onClick={onContinue}>完成，进入下一关 →</AppButton>
      </section>
    );
  }

  const helpTaskIndex = evidence?.helpTaskIndex ?? 0;
  // A requested task stays unlocked until it is completed, including while the
  // learner returns to the original answer and makes another attempt.
  const helpTaskUnlocked = (evidence?.hintCount ?? 0) > helpTaskIndex
    && evidence?.phase !== 'explanation' && evidence?.phase !== 'review';
  const helpActive = helpTaskUnlocked && !helpPaused;
  const canRequestHelp = tasks.length > helpTaskIndex
    && (evidence?.hintCount ?? 0) === helpTaskIndex
    && !isExplained && !evidence?.finalCorrect;
  const canReveal = !isExplained;

  function submitOriginal() {
    if (!hasValue(answer) || disabled || submitLock.current) return;
    submitLock.current = true;
    onSubmitAnswer(serializeAnswer(answer), question.id);
    window.setTimeout(() => { submitLock.current = false; }, 300);
  }

  function submitTransfer() {
    if (!transferQuestion || !transfer || !hasValue(transferAnswer) || disabled || submitTransferLock.current) return;
    submitTransferLock.current = true;
    onAction('submit_transfer', createPayload(transferQuestion.id, {
      questionInstanceId: transfer.questionInstanceId,
      inputAnswer: serializeAnswer(transferAnswer),
    }), 'SubmitTransfer');
    window.setTimeout(() => { submitTransferLock.current = false; }, 300);
  }

  return (
    <section className="space-y-4" aria-label="独立作答">
      <AppCard variant="amber">
        <p className="text-base leading-relaxed text-gray-800" data-testid="lesson-question-prompt">{question.text}</p>
        <p className="mt-2 text-xs text-gray-500">{helpActive ? '正在使用帮助，仍可随时回到原题作答。' : '你可以先独立作答，也可以在需要时寻求帮助。'}</p>
        <p className="mt-1 text-xs text-gray-500" data-testid="mastery-status">{(evidence?.hintCount ?? 0) > 0 ? '使用帮助中' : '独立作答中'}</p>
      </AppCard>
      {evidence && evidence.attemptCount > 0 && evidence.finalCorrect === false && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">还不对，换个方法再试一次。你可以修改答案后重新提交。</p>}
      <AppCard>
        <label className="mb-2 block text-sm font-bold text-gray-600">✏️ 写下你的答案</label>
        <form onSubmit={event => { event.preventDefault(); submitOriginal(); }}>
          <AnswerInputRouter schema={question.answerSchema || inferAnswerSchema(question)} value={answer} onChange={setAnswer} onSubmit={submitOriginal} disabled={disabled} />
          <AppButton data-testid="submit-answer" variant="success" size="lg" fullWidth type="submit" disabled={!hasValue(answer) || disabled}>提交答案</AppButton>
        </form>
      </AppCard>
      {helpActive && task && (
        <AppCard variant="purple">
          <h2 className="mb-3 font-extrabold text-purple-800">想一想</h2>
          <p className="mb-3" data-testid="help-task">{task.prompt}</p>
          <div className="space-y-2">
            {visibleTaskOptions?.map(option => (
              <button key={option.id} data-testid={`help-option-${option.id}`} type="button" aria-pressed={selectedOption === option.id} disabled={disabled} onClick={() => setSelectedOption(option.id)} className={`min-h-11 w-full rounded-xl border-2 px-3 py-2 text-left ${selectedOption === option.id ? 'border-purple-500 bg-purple-100' : 'border-gray-200 bg-white'}`}>
                {option.label}
              </button>
            ))}
          </div>
          {step.helpFeedback?.taskId === task.id && <div className="mt-3 rounded-lg bg-purple-50 p-2 text-sm text-purple-800" role="status">
            <p>{step.helpFeedback.feedback}</p>
            {!step.helpFeedback.correct && step.helpFeedback.scaffold && <p className="mt-1">{step.helpFeedback.scaffold}</p>}
          </div>}
          {!step.helpFeedback?.correct && (evidence?.helpWrongCount ?? 0) >= 2 && <p className="mt-2 rounded-lg bg-purple-50 p-2 text-sm text-purple-800">{task.scaffold}</p>}
          <AppButton data-testid="submit-help-task" variant="primary" size="lg" fullWidth disabled={!selectedOption || disabled} onClick={submitHelpTask}>确认我的判断</AppButton>
          {!task && <p className="text-sm text-gray-600">这道题的互动帮助已完成，仍请回到原题作答。</p>}
        </AppCard>
      )}
      {evidence?.phase !== 'explanation' && evidence?.phase !== 'review' && !helpTaskUnlocked && step.helpFeedback && <AppCard variant="purple"><p role="status">{step.helpFeedback.feedback}</p>{!step.helpFeedback.correct && step.helpFeedback.scaffold && <p className="mt-1 text-sm">{step.helpFeedback.scaffold}</p>}</AppCard>}
      <div className="space-y-2">
        {canRequestHelp && <AppButton data-testid="request-help" variant="secondary" size="lg" fullWidth disabled={disabled} onClick={() => { if (onAction('request_help', createPayload(), 'RequestIndependentHelp')) { setHelpPaused(false); setSelectedOption(''); } }}>我需要帮助</AppButton>}
        {helpTaskUnlocked && !helpPaused && <AppButton data-testid="return-to-answer" variant="secondary" size="lg" fullWidth disabled={disabled} onClick={() => { setSelectedOption(''); setHelpPaused(true); }}>回到原题继续尝试</AppButton>}
        {helpTaskUnlocked && helpPaused && <AppButton data-testid="continue-help" variant="secondary" size="lg" fullWidth disabled={disabled} onClick={() => setHelpPaused(false)}>继续这一步帮助</AppButton>}
        {canReveal && <AppButton data-testid="reveal-explanation" variant="ghost" size="lg" fullWidth disabled={disabled} onClick={() => onAction('reveal_explanation', createPayload(), 'RevealExplanation')}>这题我不会，查看完整讲解</AppButton>}
      </div>
    </section>
  );
}

function SolutionWalkthrough({ question }: { question: Question }) {
  const detailedSteps = question.solutionStepsDetailed || [];
  if (detailedSteps.length > 0) {
    return <ol className="mt-3 space-y-2" aria-label="解题步骤">
      {detailedSteps.map((step, index) => <li key={`${index}-${step.stepTitle}`} className="rounded-lg bg-white/80 p-2 text-sm text-gray-700">
        <span className="font-bold">第 {index + 1} 步：{step.stepTitle}</span>
        {step.explanation && <span>：{step.explanation}</span>}
      </li>)}
    </ol>;
  }
  if (question.solutionSteps.length > 0) {
    return <ol className="mt-3 space-y-2" aria-label="解题步骤">
      {question.solutionSteps.map((step, index) => <li key={`${index}-${step}`} className="rounded-lg bg-white/80 p-2 text-sm text-gray-700">第 {index + 1} 步：{step}</li>)}
    </ol>;
  }
  return null;
}
