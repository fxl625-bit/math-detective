'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Check, X, ArrowUpRight, ArrowDownRight, ShieldCheck, Lightbulb, Calculator } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { getTodayLesson, normalizeLesson, safeNormalizeLesson, getCurrentStep, getCurrentPhase, advancePhase, saveTodayLesson, clearTodayLesson, getStepLabel, getCompletionMessage, getQuestionForLesson, getTomorrowLessonPreview, getLearningProfile, getCaseStoryForLesson } from '@/lib/lessonPlanner';
import { getStepNarrative } from '@/lib/storySystem';
import { getVisual } from '@/data/visualItems';
import type { TodayLesson, LessonStep, LessonStepType, StepPhase } from '@/lib/types';
import type { Question, KeywordItem } from '@/lib/types';
import { needsAddSubtractPrompt, getKeywordTypeDescription, classifyKeyword } from '@/data/keywordRules';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import PageContainer from '@/components/layout/PageContainer';
import BottomActionBar from '@/components/layout/BottomActionBar';
import DetectiveMascot from '@/components/DetectiveMascot';
import AnimatedItems from '@/components/AnimatedItems';
import Confetti from '@/components/Confetti';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import ProgressBar from '@/components/ProgressBar';
import StarDisplay from '@/components/StarDisplay';
import TomorrowPreviewCard from '@/components/TomorrowPreviewCard';
import NumberLine from '@/components/NumberLine';
import CountingBlocks from '@/components/CountingBlocks';
import BalanceScale from '@/components/BalanceScale';

const STEP_ORDER: LessonStepType[] = ['find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'full_solve', 'find_compare_numbers', 'spot_extra_info', 'spot_missing_info'];

export default function PlayPage() {
  const router = useRouter();
  const { state, completeQuestion } = useGameState();

  const [lesson, setLesson] = useState<TodayLesson | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'hint' | 'info'; message: string }>({ show: false, type: 'info', message: '' });

  useEffect(() => {
    setMounted(true);
    const raw = getTodayLesson();
    const validated = safeNormalizeLesson(raw);
    setLesson(validated);

    // 开发环境调试日志
    if (typeof window !== 'undefined' && (localStorage.getItem('mathDetectiveDebug') === '1')) {
      if (validated) {
        console.debug('[Lesson Debug]', {
          date: validated.date,
          currentStepIndex: validated.currentStepIndex,
          stepStatuses: validated.steps.map(s => s.status),
          completed: validated.completed,
        });
      }
    }
  }, []);

  const handleRegenerateLesson = useCallback(() => {
    clearTodayLesson();
    const fresh = getTodayLesson();
    const validated = safeNormalizeLesson(fresh);
    setLesson(validated);
    setFeedback({ show: false, type: 'info', message: '' });
  }, []);

  const currentStep = lesson ? getCurrentStep(lesson) : null;
  const currentPhase = lesson ? getCurrentPhase(lesson) : null;
  const question: Question | null = currentStep
    ? (getQuestionForLesson(lesson!) || null)
    : null;
  const visual = question ? getVisual(question.visualKey) : null;

  // Phase advancement (does NOT complete the step)
  const handlePhaseAdvance = useCallback(() => {
    if (!lesson) return;
    const updated = advancePhase(lesson);
    saveTodayLesson(updated);
    setLesson(updated);
  }, [lesson]);

  // Phase back (go to previous phase in current step)
  const handlePhaseBack = useCallback(() => {
    if (!lesson || !currentStep) return;
    const steps = [...lesson.steps];
    const idx = lesson.currentStepIndex;
    const step = { ...steps[idx] };
    if (step.currentPhaseIndex > 0) {
      step.currentPhaseIndex = step.currentPhaseIndex - 1;
      steps[idx] = step;
      const updated = { ...lesson, steps };
      saveTodayLesson(updated);
      setLesson(updated);
    }
  }, [lesson, currentStep]);

  // Back to previous level (or home if on first level)
  const handleBackToPrevLevel = useCallback(() => {
    if (!lesson) { router.push('/'); return; }
    if (lesson.currentStepIndex <= 0) { router.push('/'); return; }
    const steps = [...lesson.steps];
    const idx = lesson.currentStepIndex;
    steps[idx] = { ...steps[idx], status: 'locked' as const, currentPhaseIndex: 0 };
    steps[idx - 1] = { ...steps[idx - 1], status: 'current' as const, currentPhaseIndex: 0 };
    const updated = { ...lesson, steps, currentStepIndex: idx - 1 };
    saveTodayLesson(updated);
    setLesson(updated);
  }, [lesson, router]);

  // Record wrong answer (答错记录到错题本和统计)
  const handleWrongAnswer = useCallback((input: string) => {
    if (!question) return;
    completeQuestion(question.id, false, {
      questionId: question.id,
      questionText: question.text,
      myAnswer: input,
      correctAnswer: question.answer,
      errorType: 'answer_wrong',
      retriedCorrect: false,
    });
  }, [question, completeQuestion]);

  // Step completion (called from explain phase "完成本关" button)
  const handleStepComplete = useCallback((correct: boolean) => {
    if (!lesson || !currentStep || !question) return;

    completeQuestion(question.id, correct, correct ? undefined : {
      questionId: question.id,
      questionText: question.text,
      myAnswer: '未正确完成',
      correctAnswer: question.answer,
      errorType: `关卡"${currentStep.title}"未通过`,
      retriedCorrect: false,
    });

    // 单次推进：从 explain → completed → next step
    const afterAdvance = advancePhase(lesson);
    saveTodayLesson(afterAdvance);
    setLesson(afterAdvance);

    if (afterAdvance.completed) {
      setShowConfetti(true);
      setFeedback({
        show: true,
        type: 'success',
        message: getCompletionMessage(4, 5),
      });
    } else if (afterAdvance.currentStepIndex !== lesson.currentStepIndex) {
      // Step changed (completed a step)
      setFeedback({
        show: true,
        type: 'success',
        message: getCompletionMessage(afterAdvance.currentStepIndex - 1, 5),
      });
    }
  }, [lesson, currentStep, question, completeQuestion]);

  if (!mounted) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce-gentle">🔍</div>
            <p className="text-gray-500">小侦探正在准备...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!lesson) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors flex-shrink-0">
            <ArrowLeft size={20} className="text-amber-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-amber-800">任务加载失败</h1>
        </div>
        <AppCard variant="amber">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="font-extrabold text-amber-800 text-lg mb-2">无法加载今日任务</h3>
            <p className="text-sm text-gray-600 mb-4">请刷新页面或重新生成任务。</p>
            <AppButton variant="primary" size="lg" onClick={handleRegenerateLesson}>
              重新生成今日任务
            </AppButton>
          </div>
        </AppCard>
      </PageContainer>
    );
  }

  // Complete screen
  if (lesson.completed) {
    const profile = getLearningProfile();
    const tomorrowPreview = getTomorrowLessonPreview(profile, state);
    const attempts = state.answerAttempts || 0;
    const todayAccuracy = attempts > 0 ? Math.round((state.correctCount / attempts) * 100) : 0;
    const starsEarned = state.level >= 5 ? 15 : state.level >= 3 ? 10 : 5;
    const completeCaseStory = getCaseStoryForLesson(lesson);

    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="p-2 rounded-xl bg-green-100 hover:bg-green-200 transition-colors">
            <ArrowLeft size={20} className="text-green-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-green-800">今日任务完成</h1>
        </div>

        {/* Congratulations */}
        <AppCard variant="green">
          <div className="text-center py-4">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-xl font-extrabold text-green-700">今天的侦探任务全部完成！</h2>
            <p className="text-sm text-green-600 mt-2">
              你通过了全部 {lesson.steps.length} 个关卡，获得了今日宝箱！
            </p>
            <StarDisplay count={starsEarned} size="lg" animate />
          </div>
        </AppCard>

        {/* Case story completion */}
        {completeCaseStory && (
          <AppCard variant="blue">
            <div className="text-center py-3">
              <DetectiveMascot mood="excited" size="md" message={completeCaseStory.completeText} />
              <p className="text-xs text-blue-600 mt-2">{completeCaseStory.rewardHint}</p>
            </div>
          </AppCard>
        )}

        {/* Today Performance */}
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-3">📊 今日学习表现</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-extrabold text-blue-600">{lesson.steps.length}/{lesson.steps.length}</div>
              <div className="text-xs text-gray-500">完成关卡</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-green-600">{todayAccuracy}%</div>
              <div className="text-xs text-gray-500">总正确率</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-600">{state.streak}天</div>
              <div className="text-xs text-gray-500">连续打卡</div>
            </div>
          </div>
          {profile.weakSkills.length > 0 && (
            <p className="text-xs text-blue-600 mt-3 text-center">
              💡 还可以继续练习：{profile.weakSkills.slice(0, 2).map(s => s === 'remove_noise' ? '擦掉没用的信息' : s === 'find_numbers' ? '找数字线索' : s === 'find_keywords' ? '找动作词' : s).join('、')}
            </p>
          )}
        </AppCard>

        {/* Steps completed */}
        <AppCard variant="default">
          <h3 className="font-extrabold text-gray-700 mb-2">✅ 已通关卡</h3>
          <div className="space-y-2">
            {lesson.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-2">
                <Check size={16} className="text-green-500 flex-shrink-0" />
                <span>第 {i + 1} 关：{step.title}</span>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Tomorrow preview */}
        <TomorrowPreviewCard preview={tomorrowPreview} variant="full" />

        {/* Action buttons */}
        <div className="space-y-3">
          <AppButton variant="primary" size="lg" fullWidth onClick={() => router.push('/')}>
            返回首页
          </AppButton>
          <AppButton variant="ghost" size="lg" fullWidth onClick={() => router.push('/rewards')}>
            🎁 去奖励中心看看
          </AppButton>
        </div>

        <Confetti show={showConfetti} />
      </PageContainer>
    );
  }

  // No current step — show appropriate recovery
  if (!currentStep || !question || !visual || !currentPhase) {
    // Lesson exists but phase/step data is corrupted → show recovery UI
    if (lesson && !lesson.completed) {
      return (
        <PageContainer>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors flex-shrink-0">
              <ArrowLeft size={20} className="text-amber-700" />
            </Link>
            <h1 className="text-lg font-extrabold text-amber-800">任务数据需要刷新</h1>
          </div>

          <AppCard variant="amber">
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🔧</div>
              <h3 className="font-extrabold text-amber-800 text-lg mb-2">今天的任务数据需要刷新一下</h3>
              <p className="text-sm text-gray-600 mb-4">
                任务进度数据格式可能已更新，点下方按钮重新生成今日任务。
              </p>
              <AppButton variant="primary" size="lg" onClick={handleRegenerateLesson}>
                重新生成今日任务
              </AppButton>
            </div>
          </AppCard>
        </PageContainer>
      );
    }

    // Initial load — still waiting or no lesson at all
    return (
      <PageContainer>
        <AppCard>
          <div className="text-center py-8">
            <p className="text-gray-500">正在准备今天的任务...</p>
          </div>
        </AppCard>
      </PageContainer>
    );
  }

    const caseStory = getCaseStoryForLesson(lesson!);
    const stepNarrative = getStepNarrative(caseStory, currentStep.type);

  return (
    <PageContainer bottomPadding={false}>
      {/* Header with story context */}
      {caseStory && (
        <div className="text-center mb-1">
          <span className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-600 border border-blue-200">
            📋 {caseStory.title}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button onClick={handleBackToPrevLevel} className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors flex-shrink-0" aria-label="返回上一关">
          <ArrowLeft size={20} className="text-amber-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-amber-800 truncate">
            {getStepLabel(currentStep, lesson)}
          </h1>
          <p className="text-xs text-amber-600 truncate">{stepNarrative.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <ProgressBar
              value={lesson.currentStepIndex}
              max={lesson.steps.length}
              color="bg-gradient-to-r from-amber-400 to-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Detective with step instruction */}
      <div className="flex justify-center">
        <DetectiveMascot mood="thinking" size="sm" message={stepNarrative.instruction} />
      </div>

      {/* Phase-aware step content */}
      <AnimatePresence mode="wait">
        <PhaseAwareStep
          key={`${currentStep.id}-${currentStep.currentPhaseIndex}`}
          step={currentStep}
          phase={currentPhase}
          question={question}
          visual={visual}
          onPhaseAdvance={handlePhaseAdvance}
          onStepComplete={handleStepComplete}
          onPhaseBack={handlePhaseBack}
          onWrongAnswer={handleWrongAnswer}
        />
      </AnimatePresence>

      <FeedbackOverlay
        show={feedback.show}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, show: false }))}
      />
      <Confetti show={showConfetti} />
    </PageContainer>
  );
}

// ========== Phase-Aware Step Router ==========

function PhaseAwareStep({
  step, phase, question, visual,
  onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: {
  step: LessonStep;
  phase: StepPhase | null;
  question: Question;
  visual: ReturnType<typeof getVisual>;
  onPhaseAdvance: () => void;
  onStepComplete: (correct: boolean) => void;
  onPhaseBack: () => void;
  onWrongAnswer: (input: string) => void;
}) {
  if (!phase) return null;

  switch (step.type) {
    case 'find_numbers':
      return <FindNumbersPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'find_action_words':
      return <FindActionWordsPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'simulation':
      return <SimulationPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'remove_noise':
      return <RemoveNoisePhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'full_solve':
      return <FullSolvePhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'find_compare_numbers':
      return <CompareNumbersPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'spot_extra_info':
      return <SpotExtraInfoPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    case 'spot_missing_info':
      return <SpotMissingInfoPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
    default:
      return null;
  }
}

// ========== Shared: Grade-Aware Equation Display ==========

function isComplexEquation(eq: string): boolean {
  return /[×÷*\/]/.test(eq) || /\(.*\)/.test(eq);
}

function getDisplayEquation(question: Question): string {
  // 复杂公式 → 用 gradeFriendlyEquation 兜底
  if (isComplexEquation(question.equation) && question.gradeFriendlyEquation) {
    // 尝试 G1 解释优先
    const friendly = question.gradeFriendlyEquation.G1
      || question.gradeFriendlyEquation.G2
      || question.gradeFriendlyEquation.G3;
    if (friendly) return friendly;
  }
  return question.equation.replace('?', '___');
}

// ========== Shared: Clue Summary ==========

function ClueSummary({ question }: { question: Question }) {
  const hasAge = question.text.includes('年龄') || question.text.includes('岁') || question.text.includes('爸爸') || question.text.includes('妈妈');
  const hasBei = question.keywords.some(k => k.word === '倍');

  const opLabel: Record<string, string> = {
    addition: '变多了（加法）',
    subtraction: '变少了（减法）',
    multiplication: '变多了（乘法）',
    division: '平均分（除法）',
    comparison: '比多少（用减法求差）',
    mixed: hasAge ? '年龄差不变，一年一年试' : hasBei ? '几份一样多合起来' : '多步计算，分步来想',
    logic: '逻辑推理',
  };

  // 对"倍"生成低年级友好解释
  const beiHint = hasBei
    ? question.numbers.filter(n => n !== 0).length >= 2
      ? `${question.numbers[0]}的${question.numbers[1]}倍 = ${question.numbers[0]} + ${question.numbers[0]}（${question.numbers[1]}个${question.numbers[0]}合起来）`
      : '"倍"就是几份一样多，可以先看成重复相加'
    : null;

  return (
    <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 space-y-2">
      <h4 className="text-sm font-extrabold text-blue-700 flex items-center gap-1">
        <Lightbulb size={16} /> 回看一下我们找到的线索
      </h4>
      {/* 原题 */}
      <div className="bg-white rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
        <span className="font-bold text-blue-600">📋 案件卷宗：</span>
        {question.text}
      </div>
      {/* 数字线索 */}
      {question.numbers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-blue-600">🔢 数字线索：</span>
          {question.numbers.map((n, i) => (
            <span key={i} className="px-2 py-0.5 bg-amber-100 rounded-lg font-bold text-amber-700">{n}</span>
          ))}
        </div>
      )}
      {/* 关键词 */}
      {question.keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-blue-600">🏷️ 动作线索：</span>
          {question.keywords.map((kw, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-100 rounded-lg font-medium text-green-700">
              {kw.word}
            </span>
          ))}
        </div>
      )}
      {/* 有用信息（去噪后） */}
      {question.usefulPhrases.length > 0 && (
        <div className="bg-white rounded-lg p-2 text-sm text-gray-600">
          <span className="font-bold text-blue-600">📝 有用信息：</span>
          {question.usefulPhrases.map((p, i) => (
            <span key={i}>「{p}」{i < question.usefulPhrases.length - 1 ? ' / ' : ''}</span>
          ))}
        </div>
      )}
      {/* 运算关系 */}
      <div className="text-sm">
        <span className="font-bold text-blue-600">🧮 数量关系：</span>
        <span className="text-gray-700">{opLabel[question.operation] || '分析中...'}</span>
      </div>
      {/* "倍"的低年级友好解释 */}
      {beiHint && (
        <div className="text-sm bg-amber-50 rounded-lg p-2 border border-amber-200">
          <span className="font-bold text-amber-700">💡 关于"倍"：</span>
          <span className="text-amber-800">{beiHint}</span>
        </div>
      )}
      {/* 提示 */}
      {question.hints.length > 0 && (
        <details className="text-sm">
          <summary className="text-amber-600 font-medium cursor-pointer">💡 小提示</summary>
          <p className="mt-1 text-gray-600 pl-4">{question.hints[0]}</p>
        </details>
      )}
    </div>
  );
}

// ========== Shared: Equation + Answer Phase ==========

function EquationAnswerPhase({ question, visual, onCorrect, onPhaseBack, onWrongAnswer }: {
  question: Question;
  visual: ReturnType<typeof getVisual>;
  onCorrect: () => void;
  onPhaseBack?: () => void;
  onWrongAnswer: (input: string) => void;
}) {
  const [userAnswer, setUserAnswer] = useState('');
  const [shakeInput, setShakeInput] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const [showClues, setShowClues] = useState(true);

  function handleSubmit() {
    const input = userAnswer.trim();
    if (!input) return;

    const correctStr = String(question.answer);
    const isCorrect = input === correctStr || parseFloat(input) === question.answer;

    if (isCorrect) {
      setAnswered(true);
      setWrongFeedback(null);
      onCorrect();
    } else {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      onWrongAnswer(input);
      // 温和反馈
      const op = question.operation;
      if (op === 'addition') setWrongFeedback('还差一点！这里数量变多了，用的是加法，再算算看～');
      else if (op === 'subtraction') setWrongFeedback('还差一点！这里数量变少了，用的是减法，再想想～');
      else setWrongFeedback('还差一点，我们再看一眼线索，重新算一遍～');
    }
  }

  if (answered) {
    const showNumLine = question.operation === 'addition' || question.operation === 'subtraction';
    const nA = question.numbers[0];
    const nB = question.numbers[1] || 0;
    const opT = question.operation === 'addition' ? 'add' : 'subtract' as const;
    const res = typeof question.answer === 'number' ? question.answer : undefined;

    const displayEq = isComplexEquation(question.equation) && question.gradeFriendlyEquation
      ? (question.gradeFriendlyEquation.G1 || question.gradeFriendlyEquation.G2 || question.gradeFriendlyEquation.G3)
      : question.equation.replace('?', String(question.answer));

    return (
      <AppCard variant="green">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="font-extrabold text-green-700 text-lg">回答正确！</h3>
          <div className="mt-3 p-3 bg-white rounded-xl text-lg font-extrabold text-amber-600 whitespace-pre-line">
            {displayEq}
          </div>
          <p className="text-sm text-gray-600 mt-2">{question.answerSentence}</p>
          {showNumLine && res !== undefined && (
            <div className="mt-4 pt-3 border-t border-green-200">
              <NumberLine
                range={opT === 'add'
                  ? [Math.max(0, nA - 2), nA + nB + 2]
                  : [Math.max(0, nA - nB - 2), nA + 2]}
                operation={{ type: opT, from: nA, amount: nB }}
                highlighted={[nA, res]}
                compact
              />
            </div>
          )}
        </div>
      </AppCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* 线索摘要（默认展开） */}
      {showClues && <ClueSummary question={question} />}
      {!showClues && (
        <button
          onClick={() => setShowClues(true)}
          className="w-full text-sm text-blue-600 font-bold py-2 hover:text-blue-800 underline"
        >
          👁️ 展开线索摘要
        </button>
      )}

      <AppCard variant="amber">
        <div className="text-center">
          <Calculator size={32} className="mx-auto mb-2 text-amber-600" />
          <h3 className="font-extrabold text-amber-800 text-lg mb-2">🧮 列算式，算答案！</h3>
          <p className="text-sm text-gray-600 mb-3">
            根据线索，一步一步算出答案
          </p>
          <div className="text-lg font-extrabold text-gray-700 mb-4 p-3 bg-amber-50 rounded-xl whitespace-pre-line">
            {getDisplayEquation(question)}
          </div>
        </div>
      </AppCard>

      <AppCard>
        <div className={`text-center ${shakeInput ? 'animate-shake' : ''}`}>
          <label className="text-sm font-bold text-gray-500 mb-2 block">✏️ 输入你的答案：</label>
          <input
            type="text"
            inputMode="decimal"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-32 h-16 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
            placeholder="?"
            autoFocus
          />
        </div>
      </AppCard>

      {/* 错误反馈 */}
      {wrongFeedback && (
        <AppCard variant="amber">
          <div className="text-center text-sm">
            <span className="text-amber-700">💡 {wrongFeedback}</span>
          </div>
        </AppCard>
      )}

      <div className="flex items-center gap-2">
        {onPhaseBack && (
          <AppButton variant="secondary" size="md" onClick={onPhaseBack}>
            ⬅️ 上一步
          </AppButton>
        )}
        <div className="flex-1">
          <AppButton variant="success" size="md" fullWidth disabled={!userAnswer.trim()} onClick={handleSubmit}>
            提交答案
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ========== Step 1: Find Numbers (Phased) ==========
// Phases: read → find_numbers → [equation+answer] → completed

function FindNumbersPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [found, setFound] = useState<Set<number>>(new Set());
  const allFound = found.size === question.numbers.length;

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">仔细阅读题目，准备寻找数字线索！</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始找数字 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_numbers') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">🧭 任务：找到所有数字</h3>
          <p className="text-sm text-gray-600">题目中提到了哪些数字？点击你找到的数字！</p>
        </AppCard>

        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
        </AppCard>

        <div className="grid grid-cols-4 gap-3">
          {question.numbers.map((n, i) => (
            <motion.button
              key={i}
              className={`py-5 rounded-2xl font-extrabold text-2xl border-2 transition-all min-h-[64px] ${
                found.has(i)
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              }`}
              onClick={() => {
                const next = new Set(found);
                next.has(i) ? next.delete(i) : next.add(i);
                setFound(next);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {n}
            </motion.button>
          ))}
          {/* Distractors */}
          {Array.from({ length: Math.max(0, 4 - question.numbers.length) }).map((_, i) => (
            <div key={`fake-${i}`} className="py-5 rounded-2xl font-extrabold text-2xl border-2 border-gray-200 bg-gray-50 text-gray-300 flex items-center justify-center min-h-[64px]">
              —
            </div>
          ))}
        </div>

        {found.size > 0 && !allFound && (
          <p className="text-sm text-amber-600 text-center">还有数字没找到哦，再仔细看看题目～</p>
        )}

        {allFound && (
          <AppCard variant="green">
            <div className="text-center">
              <p className="font-extrabold text-green-700 mb-1">✅ 找到了所有数字！</p>
              <p className="text-sm text-gray-600">
                这 {question.numbers.length} 个数字代表了{visual.itemEmoji} {visual.itemName}的数量信息
              </p>
            </div>
          </AppCard>
        )}

        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!allFound} onClick={onPhaseAdvance}>
            数字找齐了，去列算式算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  // phases after find_numbers → equation + answer
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 2: Find Action Words (Phased) ==========
// Phases: read → find_keywords → choose_operation → [equation+answer] → completed

function FindActionWordsPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [found, setFound] = useState<Set<number>>(new Set());
  const [opChoice, setOpChoice] = useState<'add' | 'subtract' | null>(null);
  const allFound = found.size === question.keywords.length;
  const correctOp = question.operation === 'addition' ? 'add' : question.operation === 'subtraction' ? 'subtract' : null;

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">认真读题，注意里面的动作词（关键词）！</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始找关键词 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_keywords') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">🔑 任务：找出关键词/动作词</h3>
          <p className="text-sm text-gray-600">点击题目中包含的动作词！</p>
        </AppCard>
        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
        </AppCard>
        <div className="flex flex-wrap gap-2">
          {question.keywords.map((kw, i) => (
            <motion.button
              key={i}
              className={`px-4 py-3 rounded-xl font-bold text-lg border-2 transition-all ${
                found.has(i)
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              }`}
              onClick={() => {
                const next = new Set(found);
                next.has(i) ? next.delete(i) : next.add(i);
                setFound(next);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              &ldquo;{kw.word}&rdquo;
              {found.has(i) && <Check size={16} className="inline ml-1" />}
            </motion.button>
          ))}
        </div>
        {allFound && (
          <AppCard variant="green">
            <p className="text-center font-extrabold text-green-700">✅ 找到了所有关键词！</p>
          </AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!allFound} onClick={onPhaseAdvance}>
            关键词找到了，判断运算 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

    if (phase === 'choose_operation') {
    const isAddSubtractOnly = needsAddSubtractPrompt(question.keywords);
    const hasMultiplicative = question.keywords.some(k => classifyKeyword(k.word)?.category === 'multiplicative_comparison');
    const hasComparison = question.keywords.some(k => classifyKeyword(k.word)?.category === 'comparison');
    const hasDivision = question.keywords.some(k => classifyKeyword(k.word)?.category === 'division_share');
    const hasGrouping = question.keywords.some(k => classifyKeyword(k.word)?.category === 'multiplication_groups');

    const promptTitle = hasMultiplicative
      ? '🤔 “倍”可以先怎么理解？'
      : hasComparison ? '🤔 这些词在说什么关系？'
      : hasDivision ? '🤔 “平均分”是什么意思？'
      : '🤔 关键词表示什么变化？';

    const optionList = isAddSubtractOnly
      ? [{ v:'add', l:'变多了，用加法', i:'📈', m:['addition'] }, { v:'subtract', l:'变少了，用减法', i:'📉', m:['subtraction'] }]
      : hasMultiplicative || hasGrouping
        ? [{ v:'misconception_more', l:'比小猫多几个', i:'➕', m:[] }, { v:'equal_groups', l:'有几份，每份一样多', i:'📦', m:['multiplication','mixed','addition'] }]
        : hasComparison
          ? [{ v:'compare', l:'比一比谁多谁少', i:'🔍', m:['comparison','subtraction'] }, { v:'add', l:'数量合起来', i:'📈', m:['addition'] }]
          : hasDivision
            ? [{ v:'share', l:'每份一样多（平均分）', i:'➗', m:['division'] }, { v:'add', l:'数量合起来', i:'📈', m:['addition'] }]
            : [{ v:'add', l:'数量变多，用加法', i:'📈', m:['addition'] }, { v:'subtract', l:'数量变少，用减法', i:'📉', m:['subtraction'] }];

    const checkOk = (v:string) => optionList.find(o=>o.v===v)?.m.includes(question.operation) ?? false;

    return (
      <div className="space-y-4">
        <AppCard variant="amber">
          <h3 className="font-extrabold text-amber-800 mb-3 text-center">
            {promptTitle}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-3">
            关键词：{question.keywords.map(k => '"' + k.word + '"').join('、')}
          </p>
        </AppCard>
        <div className="grid grid-cols-1 gap-3">
          {optionList.map(opt => {
            const correct = opChoice === opt.v ? checkOk(opt.v) : null;
            return (
              <motion.button key={opt.v}
                className={'py-4 rounded-2xl font-extrabold text-base border-2 flex items-center gap-3 px-4 ' + (
                  opChoice === opt.v
                    ? (correct ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700')
                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                )}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setOpChoice(opt.v as any)}
              >
                <span className="text-2xl">{opt.i}</span><span className="text-left">{opt.l}</span>
              </motion.button>
            );
          })}
        </div>
        {opChoice && checkOk(opChoice) === false && (
          <AppCard variant="amber">
            <p className="text-center text-amber-700 text-sm">
              💡 再想想：{hasMultiplicative ? '提示：想想几个一样多合起来' : '提示：它表示什么变化？'}
            </p>
          </AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!opChoice} onClick={onPhaseAdvance}>
            判断完毕，去算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  // Final phase: equation + answer
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 3: Simulation (Phased) ==========
// Phases: read → simulation → choose_operation → answer → completed

function SimulationPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [animationShown, setAnimationShown] = useState(false);
  const [opChoice, setOpChoice] = useState<'add' | 'subtract' | null>(null);
  const [showHandsOn, setShowHandsOn] = useState(false);
  const correctOp = question.operation === 'addition' ? 'add' : question.operation === 'subtraction' ? 'subtract' : null;

  const numA = question.numbers[0];
  const numB = question.numbers[1] || 0;
  const opType = question.operation === 'addition' ? 'add' : question.operation === 'subtraction' ? 'subtract' : 'add';
  const result = opType === 'add' ? numA + numB : numA - numB;
  const numberLineRange: [number, number] = opType === 'add'
    ? [Math.max(0, numA - 2), numA + numB + 2]
    : [Math.max(0, numA - numB - 2), numA + 2];

  if (phase === 'read') {
    // ... same as before
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">读题，想想{visual.itemName}发生了什么变化</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，看动画 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'simulation') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">🎬 观察变化</h3>
          <p className="text-sm text-gray-600">点击按钮播放动画，看看{visual.itemName}怎么变化！</p>
        </AppCard>
        {!animationShown ? (
          <div className="text-center">
            <AppButton variant="primary" size="lg" onClick={() => setAnimationShown(true)}>
              🎬 播放动画
            </AppButton>
          </div>
        ) : (
          <div className="space-y-4">
            <AppCard variant="amber">
              <AnimatedItems
                visual={visual}
                initialCount={numA}
                changeCount={numB}
                operation={opType === 'add' ? 'addition' : 'subtraction'}
                showResult={false}
              />
            </AppCard>
            {/* 数轴可视化 */}
            <AppCard variant="blue">
              <h4 className="text-sm font-bold text-blue-700 mb-2">📏 数轴上看变化</h4>
              <NumberLine
                range={numberLineRange}
                operation={{ type: opType, from: numA, amount: numB }}
                highlighted={[numA, result]}
              />
              <p className="text-xs text-gray-500 text-center mt-1">
                {opType === 'add'
                  ? `${numA} + ${numB} = ${result}，从${numA}向右跳${numB}格`
                  : `${numA} - ${numB} = ${result}，从${numA}向左跳${numB}格`}
              </p>
            </AppCard>
            {/* 动手试试 */}
            <div className="text-center">
              <button
                onClick={() => setShowHandsOn(!showHandsOn)}
                className="text-sm text-amber-600 font-bold hover:text-amber-800 underline"
              >
                {showHandsOn ? '收起' : '🖐️ 动手试试'} — 自己数一数{visual.itemName}
              </button>
            </div>
            {showHandsOn && (
              <AppCard variant="amber">
                <CountingBlocks
                  itemEmoji={visual.itemEmoji}
                  itemName={visual.itemName}
                  targetCount={result}
                  maxBlocks={numA + numB + 3}
                  mode={opType}
                />
              </AppCard>
            )}
          </div>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!animationShown} onClick={onPhaseAdvance}>
            看完动画，判断运算 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'choose_operation') {
    return (
      <div className="space-y-4">
        <AppCard variant="amber">
          <h3 className="font-extrabold text-amber-800 mb-3 text-center">
            🤔 {visual.itemName}变多了还是变少了？
          </h3>
        </AppCard>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            className={`py-5 rounded-2xl font-extrabold text-lg border-2 flex flex-col items-center gap-2 ${
              opChoice === 'add'
                ? opChoice === correctOp ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
            }`}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setOpChoice('add')}
          >
            <ArrowUpRight size={32} /><span>变多了（➕）</span>
          </motion.button>
          <motion.button
            className={`py-5 rounded-2xl font-extrabold text-lg border-2 flex flex-col items-center gap-2 ${
              opChoice === 'subtract'
                ? opChoice === correctOp ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
            }`}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setOpChoice('subtract')}
          >
            <ArrowDownRight size={32} /><span>变少了（➖）</span>
          </motion.button>
        </div>
        {opChoice && opChoice !== correctOp && (
          <AppCard variant="amber"><p className="text-center text-amber-700">💡 再观察一下动画中的变化！</p></AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!opChoice} onClick={onPhaseAdvance}>
            判断完毕，去算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  // answer phase
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 4: Remove Noise (Phased) ==========
// Phases: read → remove_noise → build_equation → answer → completed

function RemoveNoisePhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [erased, setErased] = useState<Set<number>>(new Set());
  const [noiseDone, setNoiseDone] = useState(false);

  const segments = question.text.split(/(?<=[，。！？、])/).filter((s) => s.trim());
  const noiseIdx = new Set<number>();
  segments.forEach((seg, i) => {
    if (question.noisePhrases.some((np) => seg.includes(np))) noiseIdx.add(i);
  });
  const hasNoise = noiseIdx.size > 0;

  function handleErase(idx: number) {
    if (noiseDone) return;
    const next = new Set(erased);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setErased(next);

    const allNoiseGone = Array.from(noiseIdx).every((i) => next.has(i));
    const noUsefulErased = !segments.some((_s, i) => !noiseIdx.has(i) && next.has(i));
    if (allNoiseGone && noUsefulErased) {
      setNoiseDone(true);
    }
  }

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="pink">
          <h3 className="font-extrabold text-pink-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">有些句子可能和数学无关哦，读的时候留意一下</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始擦废话 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'remove_noise') {
    return (
      <div className="space-y-4">
        <AppCard variant="pink">
          <h3 className="font-extrabold text-pink-800 mb-2">🧹 任务：擦掉和数学无关的废话</h3>
          <p className="text-sm text-gray-600">
            点击包含废话的句子把它擦掉（保留真正有用的数学信息）
          </p>
        </AppCard>
        <AppCard>
          <h3 className="text-sm font-bold text-gray-500 mb-3">📋 题目（点击擦掉无关信息）：</h3>
          <div className="flex flex-wrap gap-1">
            {segments.map((seg, i) => {
              const isNoise = noiseIdx.has(i);
              const isErased = erased.has(i);
              return (
                <motion.span
                  key={i}
                  className={`inline-block px-2 py-1 rounded-lg cursor-pointer text-sm border transition-all ${
                    isErased
                      ? isNoise ? 'bg-green-50 border-green-200 text-green-400 line-through opacity-40' : 'bg-red-50 border-red-200 text-red-300 line-through opacity-50'
                      : isNoise ? 'bg-red-50 border-red-200 border-dashed hover:bg-red-100' : 'bg-green-50 border-green-200 hover:bg-green-100'
                  }`}
                  onClick={() => handleErase(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isErased && <span className="mr-1">{isNoise ? '🧹' : '❓'}</span>}
                  {seg}
                </motion.span>
              );
            })}
          </div>
        </AppCard>
        {noiseDone && (
          <AppCard variant="green">
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-extrabold text-green-700">找到真正有用的线索了！</h3>
              <div className="mt-2 p-3 bg-white rounded-xl text-left text-sm">
                <span className="font-bold text-gray-600">有用信息：</span>
                <span className="text-gray-700">{question.usefulPhrases.join('；')}</span>
              </div>
            </div>
          </AppCard>
        )}
        {!hasNoise && (
          <AppCard variant="green">
            <p className="text-center text-green-700">这道题没有废话，所有句子都有用！</p>
          </AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={hasNoise && !noiseDone} onClick={onPhaseAdvance}>
            废话擦干净了，去列算式算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  // Final phases: build_equation → answer
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 5: Full Solve (Phased) ==========
// Phases: read → find_numbers → find_keywords → choose_operation → build_equation → answer → explain → completed

function FullSolvePhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">完整破解一道题，按步骤来！</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始破案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_numbers') {
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">🧭 第1步：找出题目中的数字</h3>
        </AppCard>
        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
          <div className="flex flex-wrap gap-3">
            {question.numbers.map((n, i) => (
              <div key={i} className="px-6 py-4 bg-amber-50 rounded-2xl font-extrabold text-2xl border-2 border-amber-300 text-amber-700">{n}</div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">数量分别是 {question.numbers.join(' 和 ')}，代表{visual.itemEmoji} {visual.itemName}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth onClick={onPhaseAdvance}>
            找到数字 ✓ 下一步 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_keywords') {
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">🔑 第2步：找到关键词/动作词</h3>
        </AppCard>
        <AppCard>
          <div className="flex flex-wrap gap-2 mb-3">
            {question.keywords.length > 0
              ? question.keywords.map((kw, i) => (
                  <span key={i} className="px-4 py-3 bg-blue-100 rounded-xl font-bold text-blue-700 text-lg border-2 border-blue-300">
                    &ldquo;{kw.word}&rdquo;
                  </span>
                ))
              : <p className="text-gray-500 text-sm">这道题没有明显的动作关键词，需要理解题意来判断</p>
            }
          </div>
          {question.keywords.length > 0 && (
            <p className="text-sm text-gray-600">这些词提示了{visual.itemName}的数量变化方向</p>
          )}
        </AppCard>
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth onClick={onPhaseAdvance}>
            找到关键词 ✓ 下一步 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'choose_operation') {
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">🤔 第3步：题目在问什么？</h3>
        </AppCard>
        <div className="space-y-2">
          {question.questionMeaningOptions.map((opt, i) => (
            <motion.button
              key={i}
              className={`w-full py-4 rounded-xl font-bold border-2 transition-all ${
                selectedMeaning === opt
                  ? opt === question.correctMeaning ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
              onClick={() => setSelectedMeaning(opt)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {opt}
            </motion.button>
          ))}
        </div>
        {selectedMeaning && selectedMeaning !== question.correctMeaning && (
          <AppCard variant="amber"><p className="text-center text-amber-700">💡 再读读题目，看看它到底在问什么？</p></AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!selectedMeaning} onClick={onPhaseAdvance}>
            理解题意 ✓ 下一步 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'build_equation') {
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">🧮 第4步：列出算式</h3>
          <p className="text-sm text-gray-600">根据前面的线索，这道题的算式是：</p>
        </AppCard>
        <AppCard variant="amber">
          <div className="text-center py-4">
            <Lightbulb size={32} className="mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-extrabold text-gray-700">
              {question.equation.replace('?', '___')}
            </div>
            <p className="text-sm text-gray-500 mt-2">用 {question.operation} 运算</p>
          </div>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth onClick={onPhaseAdvance}>
            算式确认 ✓ 去算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'answer') {
    return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
  }

  // explain phase
  if (phase === 'explain') {
    return (
      <div className="space-y-4">
        <AppCard variant="green">
          <div className="text-center py-4">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-xl font-extrabold text-green-700">案件完美侦破！</h3>
            <p className="text-gray-600 mt-2">{question.explanation}</p>
            <div className="mt-3 p-3 bg-white rounded-xl text-lg font-extrabold text-amber-600">
              {question.equation.replace('?', String(question.answer))}
            </div>
            <p className="text-sm text-green-600 mt-2">{question.answerSentence}</p>
          </div>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={() => onStepComplete(true)}>
            完成，进入下一关 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  return null;
}

// ========== Step 6: Find Compare Numbers (Phased) ==========

function CompareNumbersPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">仔细读题，注意数字之间的关系</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始分析 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_numbers' || phase === 'find_compare_numbers') {
    const n1 = question.numbers[0];
    const n2 = question.numbers[1] || 0;
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">🔢 找出数字之间的关系</h3>
          <p className="text-sm text-gray-600">题目中的数字是什么关系？谁大？谁小？</p>
        </AppCard>
        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {question.numbers.map((n, i) => (
              <div key={i} className="px-6 py-4 bg-amber-50 rounded-2xl font-extrabold text-2xl border-2 border-amber-300 text-amber-700">{n}</div>
            ))}
          </div>
        </AppCard>
        {/* 天平可视化比较 */}
        {question.numbers.length >= 2 && (
          <AppCard variant="amber">
            <h4 className="text-sm font-bold text-amber-700 mb-2 text-center">⚖️ 天平上看比较</h4>
            <BalanceScale
              leftCount={n1}
              rightCount={n2}
              leftEmoji={visual.itemEmoji}
              rightEmoji={visual.itemEmoji}
              leftLabel={`${n1} ${visual.itemName}`}
              rightLabel={`${n2} ${visual.itemName}`}
            />
          </AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth onClick={onPhaseAdvance}>
            找到数字关系 ✓ 下一步 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 7: Spot Extra Info (Phased) ==========

function SpotExtraInfoPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [foundExtra, setFoundExtra] = useState<Set<number>>(new Set());
  const extraNumbers = question.extraNumbers ?? [];
  const allExtraFound = extraNumbers.length > 0 && foundExtra.size === extraNumbers.length;

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">题目里可能有多余的数字，和问题没关系！</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，开始找多余数字 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_numbers' || phase === 'spot_extra_info') {
    return (
      <div className="space-y-4">
        <AppCard variant="amber">
          <h3 className="font-extrabold text-amber-800 mb-2">🔍 找出和问题无关的数字</h3>
          <p className="text-sm text-gray-600">哪些数字是多余的？它们和题目问题没有关系！</p>
        </AppCard>
        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
        </AppCard>
        <div className="grid grid-cols-4 gap-3">
          {question.numbers.map((n, i) => (
            <motion.button
              key={i}
              className={`py-5 rounded-2xl font-extrabold text-2xl border-2 transition-all min-h-[64px] ${
                foundExtra.has(i)
                  ? extraNumbers.includes(n) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              }`}
              onClick={() => {
                const next = new Set(foundExtra);
                next.has(i) ? next.delete(i) : next.add(i);
                setFoundExtra(next);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {n}
              {foundExtra.has(i) && <span className="block text-xs mt-1">{extraNumbers.includes(n) ? '✓多余' : '✗有用'}</span>}
            </motion.button>
          ))}
        </div>
        {allExtraFound && (
          <AppCard variant="green">
            <p className="text-center font-extrabold text-green-700">✅ 找到了多余的数字！真正的有用数字是：{question.numbers.filter(n => !extraNumbers.includes(n)).join(' 和 ')}</p>
          </AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={!allExtraFound} onClick={onPhaseAdvance}>
            找出多余数字 ✓ 去算答案 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}

// ========== Step 8: Spot Missing Info (Phased) ==========

function SpotMissingInfoPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [choice, setChoice] = useState<boolean | null>(null);
  const isInsufficient = question.isInsufficient === true;

  if (phase === 'read') {
    return (
      <div className="space-y-4">
        <AppCard variant="blue">
          <h3 className="font-extrabold text-blue-800 mb-2">📖 仔细读题</h3>
          <p className="text-sm text-gray-600">有些题目可能缺少信息，根本无法计算！</p>
        </AppCard>
        <AppCard>
          <p className="text-base leading-relaxed text-gray-700">{question.text}</p>
        </AppCard>
        <BottomActionBar>
          <AppButton variant="primary" size="lg" fullWidth onClick={onPhaseAdvance}>
            读完了，判断题目 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  if (phase === 'find_numbers' || phase === 'spot_missing_info') {
    return (
      <div className="space-y-4">
        <AppCard variant="amber">
          <h3 className="font-extrabold text-amber-800 mb-2">🤔 这道题能算出来吗？</h3>
          <p className="text-sm text-gray-600">仔细看看题目中给出的信息够不够做出计算？</p>
        </AppCard>
        <AppCard>
          <p className="text-sm text-gray-700 mb-3">{question.text}</p>
        </AppCard>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            className={`py-5 rounded-2xl font-extrabold text-lg border-2 ${
              choice === true
                ? isInsufficient ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
            }`}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setChoice(true)}
          >
            ❓ 信息不足，无法计算
          </motion.button>
          <motion.button
            className={`py-5 rounded-2xl font-extrabold text-lg border-2 ${
              choice === false
                ? !isInsufficient ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
            }`}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setChoice(false)}
          >
            ✅ 信息足够，可以计算
          </motion.button>
        </div>
        {choice !== null && (
          choice === isInsufficient
            ? <AppCard variant="green"><p className="text-center font-extrabold text-green-700">✅ 判断正确！</p></AppCard>
            : <AppCard variant="amber"><p className="text-center text-amber-700">💡 再仔细看看题目给出数字间的关系</p></AppCard>
        )}
        <BottomActionBar>
          <AppButton variant="success" size="lg" fullWidth disabled={choice === null} onClick={onPhaseAdvance}>
            判断完毕 ✓ 下一步 →
          </AppButton>
        </BottomActionBar>
      </div>
    );
  }

  // If insufficient, skip equation answer
  if (isInsufficient) {
    return (
      <AppCard variant="green">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🧠</div>
          <h3 className="font-extrabold text-green-700 text-lg">你的判断很准确！</h3>
          <p className="text-sm text-gray-600 mt-2">这道题确实缺少必要信息，无法直接计算。</p>
          <p className="text-sm text-gray-500 mt-1">{question.explanation}</p>
          <div className="mt-4">
            <AppButton variant="primary" size="lg" onClick={() => onStepComplete(true)}>
              完成，进入下一关 →
            </AppButton>
          </div>
        </div>
      </AppCard>
    );
  }

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} />;
}
