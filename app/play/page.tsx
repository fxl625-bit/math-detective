'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Check, X, ArrowUpRight, ArrowDownRight, ShieldCheck, Lightbulb, Calculator } from 'lucide-react';
import LogicRankingGuide from '@/components/LogicRankingGuide';
import SequencePatternGuide from '@/components/lesson/SequencePatternGuide';
import { useGameState } from '@/hooks/useGameState';
import { loadState, getAccuracyStats } from '@/lib/storage';
import { getTodayLesson, normalizeLesson, safeNormalizeLesson, getCurrentStep, getCurrentPhase, saveTodayLesson, clearTodayLesson, getStepLabel, getCompletionMessage, getQuestionForLesson, getTomorrowLessonPreview, getLearningProfile, getCaseStoryForLesson } from '@/lib/lessonPlanner';
import { getStepNarrative } from '@/lib/storySystem';
import { getVisual } from '@/data/visualItems';
import type { TodayLesson, LessonStep, LessonStepType, StepPhase } from '@/lib/types';
import type { Question, KeywordItem } from '@/lib/types';
import { needsAddSubtractPrompt, getKeywordTypeDescription, classifyKeyword } from '@/data/keywordRules';
import { inferLessonType, extractNumbers, classifyNumberRole } from '@/lib/questionValidation';
import { checkAnswer, resolveAnswerType } from '@/lib/answerChecker';
import { textRevealsAnswer, hintRevealsAnswer, stringStepsRevealAnswer } from '@/lib/hintSafety';
import { grantDailyRewardOnce, markDailyRewardShown } from '@/lib/rewardSystem';
import { commitLessonTransaction, updateDebugState, assertCorrectAnswerAdvanced, assertRepairContinued, getDebugState, type LessonAction, type LearningState, type LessonActionPayload } from '@/lib/lessonTransaction';
import HintSystem from '@/components/lesson/HintSystem';
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
  const lessonRef = useRef<TodayLesson | null>(null);
  const transitioningRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'hint' | 'info'; message: string }>({ show: false, type: 'info', message: '' });

  useEffect(() => {
    setMounted(true);
    const raw = getTodayLesson();
    const validated = safeNormalizeLesson(raw);
    lessonRef.current = validated;
    setLesson(validated);

    // v2.6.9: 版本迁移检测
    if (typeof window !== 'undefined') {
      const lastVersion = localStorage.getItem('math-detective-app-version');
      if (lastVersion !== '2.6.9') {
        console.log('[v2.6.9] Version migration triggered. safeNormalizeLesson handles repair automatically.');
        localStorage.setItem('math-detective-app-version', '2.6.9');
      }
    }

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

  // v2.6.4: 同步 lessonRef 保持与 React state 一致
  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  const handleRegenerateLesson = useCallback(() => {
    clearTodayLesson();
    const fresh = getTodayLesson();
    const validated = safeNormalizeLesson(fresh);
    lessonRef.current = validated;
    setLesson(validated);
    setFeedback({ show: false, type: 'info', message: '' });
  }, []);

  // ========== v2.6.4 统一事务系统：runLessonAction ==========

  const runLessonAction = useCallback((
    action: LessonAction,
    payload: LessonActionPayload,
    source: string
  ) => {
    if (transitioningRef.current) {
      console.warn('[runLessonAction] blocked by transition lock', { action, source });
      return;
    }
    transitioningRef.current = true;
    setIsAdvancing(true);

    try {
      const currentLesson = lessonRef.current;
      if (!currentLesson) return;

      // v2.7: submit_answer / information_check / identify_extra_info — 使用统一 checker
      const isAnswerAction = action === 'submit_answer' || action === 'information_check' || action === 'identify_extra_info';
      if (isAnswerAction && payload.questionId && payload.inputAnswer) {
        const q = getQuestionForLesson(currentLesson);
        if (q) {
          // v2.7: 使用统一答案检查器
          const answerResult = checkAnswer(payload.inputAnswer, q);
          completeQuestion(payload.questionId, answerResult.correct, answerResult.correct ? undefined : {
            questionId: q.id,
            questionText: q.text,
            myAnswer: typeof payload.inputAnswer === 'string' ? payload.inputAnswer : JSON.stringify(payload.inputAnswer),
            correctAnswer: q.answer,
            errorType: 'answer_wrong',
            retriedCorrect: false,
          });
          // 答错只记录 stats，不推进 lesson
          if (!answerResult.correct) {
            return;
          }
        }
      }

      const currentState: LearningState = {
        lesson: currentLesson,
        gameState: state, // snapshot from hook (用于 transaction 内部的 completeQuestion 计算)
      };

      const result = commitLessonTransaction({
        state: currentState,
        action,
        payload,
        source,
      });

      updateDebugState(result, action, source);

      // P0 断言
      assertCorrectAnswerAdvanced(result, action, source);
      assertRepairContinued(result, action, source);

      if (!result.changed) {
        console.warn('[runLessonAction] no state changed', {
          action, source, reason: result.reason
        });
      }

      if (isAnswerAction && !result.advanced) {
        console.error('[P0] answer action did not advance', { action, source, result });
      }

      // 持久化 lesson
      saveTodayLesson(result.nextLesson);

      // 同步 ref 和 state
      lessonRef.current = result.nextLesson;
      setLesson(result.nextLesson);

      // v2.6.3: lesson 完成时处理每日奖励
      if (result.nextLesson.completed) {
        const now = new Date().toISOString();
        let completedLesson: TodayLesson = {
          ...result.nextLesson,
          completedAt: result.nextLesson.completedAt || now,
        };

        const { lesson: rewardedLesson } = grantDailyRewardOnce(state, completedLesson);
        completedLesson = rewardedLesson;
        const { lesson: shownLesson } = markDailyRewardShown(state, completedLesson);
        completedLesson = shownLesson;

        saveTodayLesson(completedLesson);
        lessonRef.current = completedLesson;
        setLesson(completedLesson);

        setShowConfetti(true);
        setFeedback({
          show: true,
          type: 'success',
          message: '🎉 今天的侦探任务完成！你获得了今日宝箱！',
        });
      } else if (result.nextLesson.currentStepIndex !== currentLesson.currentStepIndex) {
        const steps = result.nextLesson.steps;
        const completedCount = steps.filter(s => s.status === 'completed').length;
        setFeedback({
          show: true,
          type: 'success',
          message: `✅ 很好，下一条线索出现了！已完成 ${completedCount}/${steps.length} 关，继续破案！`,
        });
      }

    } finally {
      setTimeout(() => {
        transitioningRef.current = false;
        setIsAdvancing(false);
      }, 300);
    }
  }, [state, completeQuestion]);

  // ========== 专用 action 处理器 ==========

  // 普通 phase 推进
  const handlePhaseAdvance = useCallback(() => {
    runLessonAction('complete_phase', {}, 'PhaseAdvance');
  }, [runLessonAction]);

  // 正确答案提交（v2.6.4: 一次事务 — stats 在 runLessonAction 中通过 hook 记录）
  const handleSubmitAnswer = useCallback((inputAnswer: string, questionId: string) => {
    runLessonAction('submit_answer', { inputAnswer, questionId }, 'AnswerSubmit');
  }, [runLessonAction]);

  // 答题完成后完成关卡（从 explain 按钮调用）
  const handleStepComplete = useCallback((correct: boolean) => {
    runLessonAction('complete_step', {}, 'StepComplete');
  }, [runLessonAction]);

  // (v2.6.9: repair now happens in data layer via safeNormalizeLesson)

  const currentStep = lesson ? getCurrentStep(lesson) : null;
  const currentPhase = lesson ? getCurrentPhase(lesson) : null;
  const question: Question | null = currentStep
    ? (getQuestionForLesson(lesson!) || null)
    : null;
  const visual = question ? getVisual(question.visualKey) : null;

  // Phase back (v2.6.4: 走事务系统，消除闭包陈旧问题)
  const handlePhaseBack = useCallback(() => {
    runLessonAction('go_back', {}, 'PhaseBack');
  }, [runLessonAction]);

  // Back to previous level (v2.6.4: 走事务系统)
  const handleBackToPrevLevel = useCallback(() => {
    const currentLesson = lessonRef.current;
    if (!currentLesson) { router.push('/'); return; }
    if (currentLesson.currentStepIndex <= 0) { router.push('/'); return; }
    runLessonAction('go_prev_level', {}, 'PrevLevelBack');
  }, [runLessonAction, router]);

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
    const { overallAccuracy: todayAccuracy, todayCompleted } = getAccuracyStats(state);
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
    const isDebugMode = typeof window !== 'undefined' && localStorage.getItem('mathDetectiveDebug') === '1';
    const inferredLessonType = question ? (question.lessonType || inferLessonType(question)) : null;

    // v2.6.11: 从 question 生成 step 文案（不再依赖 story 模板）
    const isLogicRanking = question?.problemType === 'logic_ranking'
      || question?.problemType === 'logic_truth'
      || question?.problemType === 'logic_ordering';
    const isSequence = question?.problemType === 'pattern'
      || question?.problemType === 'sequence_arithmetic';
    const displayCaseStoryTitle = caseStory?.title || '';

    // v2.6.11: step 描述从 step 对象获取（由 buildStepFromQuestion 生成）
    const displayStepDescription = currentStep.description || '';
    // v2.6.11: instruction 从 question 推断
    const displayStepInstruction = generateStepInstruction(question, currentStep.type);

  return (
    <PageContainer bottomPadding={false}>
      {/* v2.6 P0修复：开发调试信息 */}
      {isDebugMode && question && (() => {
        const ds = getDebugState();
        return (
        <div className="mb-2 p-2 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 border border-gray-300 space-y-1">
          <div className="font-bold text-amber-700 border-b border-gray-300 pb-1 mb-1">📋 题目信息</div>
          <div>questionId=<span className="text-blue-600">{question.id}</span></div>
          <div>lessonType=<span className="text-green-600">{String(inferredLessonType || 'unknown')}</span></div>
          <div>keywordType=<span className="text-purple-600">{String(question.keywordType || 'auto')}</span></div>
          <div>numbers.length=<span className="text-amber-600">{question.numbers.length}</span></div>
          <div>keywords=<span className="text-orange-600">{question.keywords.map(k => k.word).join(', ') || '(none)'}</span></div>
          {ds.lastLessonAction && (
            <>
              <div className="font-bold text-amber-700 border-b border-gray-300 pb-1 mb-1 mt-2">🔍 事务追踪 (v{ds.appVersion})</div>
              <div>lastAction=<span className="text-blue-600">{ds.lastLessonAction}</span></div>
              <div>source=<span className="text-green-600">{ds.lastActionSource}</span></div>
              <div>advanced=<span className={ds.lastAdvanced ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(ds.lastAdvanced)}</span></div>
              <div>phase=<span className="text-purple-600">{ds.lastFromPhase}</span> → <span className="text-amber-600">{ds.lastToPhase}</span></div>
              <div>reason=<span className="text-gray-500">{ds.lastReason || '(none)'}</span></div>
              <div>stateVersion=<span className="text-blue-600">{ds.stateVersion}</span></div>
              <div>at=<span className="text-gray-400">{ds.lastActionAt.slice(11, 19)}</span></div>
            </>
          )}
        </div>
        );
      })()}

      {/* Header with story context */}
      {displayCaseStoryTitle && (
        <div className="text-center mb-1">
          <span className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-600 border border-blue-200">
            📋 {displayCaseStoryTitle}
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
          <p className="text-xs text-amber-600 truncate">{displayStepDescription}</p>
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
        <DetectiveMascot mood="thinking" size="sm" message={displayStepInstruction} />
      </div>

      {/* Phase-aware step content (v2.6 P0修复: 加 question.id 防状态残留) */}
      <AnimatePresence mode="wait">
        <PhaseAwareStep
          key={`${currentStep.id}-${question.id}-${currentStep.currentPhaseIndex}`}
          step={currentStep}
          phase={currentPhase}
          question={question}
          visual={visual}
          onPhaseAdvance={handlePhaseAdvance}
          onStepComplete={handleStepComplete}
          onPhaseBack={handlePhaseBack}
          onWrongAnswer={handleWrongAnswer}
          onSubmitAnswer={handleSubmitAnswer}
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

// ========== v2.6.6: Ranking 答案校验 ==========

/**
 * 校验排名答案是否正确。
 * 支持：
 * 1. option id (如 "A")
 * 2. order array (逗号分隔，如 "小华,小红,小明")
 * 3. 文本兜底（带分隔符的格式）
 */
function isRankingAnswerCorrect(input: string, question: Question): boolean {
  const ranking = question.correctRanking;
  if (!ranking) return false;

  const expectedOrder = ranking.order || [
    ranking.first, ranking.second, ranking.third,
    ranking.fourth, ranking.fifth,
  ].filter(Boolean) as string[];
  const trimmed = input.trim();

  // 方式1: option id (如 "A")
  if (question.rankingOptions && question.rankingOptions.length > 0) {
    const option = question.rankingOptions.find(o => o.id === trimmed);
    if (option) return option.correct;
  }

  // 方式2: order array (逗号分隔)
  if (trimmed.includes(',')) {
    const inputOrder = trimmed.split(/[,，]+/).map(s => s.trim()).filter(Boolean);
    return isOrderMatch(inputOrder, expectedOrder);
  }

  // 方式3: 文本兜底 — 解析各种分隔符格式
  const normalized = normalizeRankingInput(trimmed);
  if (normalized) {
    return isOrderMatch(normalized, expectedOrder);
  }

  // 方式4: 检查是否只有部分答案（只输入第一名）
  if (expectedOrder.length > 1) {
    const partialMatch = expectedOrder.slice(0, 1).every(name => trimmed.includes(name));
    if (partialMatch && !expectedOrder.slice(1).every(name => trimmed.includes(name))) {
      // 只匹配了第一名但不完整 — 不视为正确
      console.log('[RankingAnswer] Partial answer detected — only first place');
      return false;
    }
  }

  return false;
}

function isOrderMatch(inputOrder: string[], expectedOrder: string[]): boolean {
  if (inputOrder.length !== expectedOrder.length) return false;
  return inputOrder.every((name, i) => name === expectedOrder[i]);
}

function normalizeRankingInput(input: string): string[] | null {
  // 尝试各种格式
  const patterns = [
    // 小华-小红-小明
    /^([^-]+)-([^-]+)-([^-]+)$/,
    // 小华，小红，小明  (already handled above)
    // 小华、小红、小明
    /^([^、]+)、([^、]+)、([^、]+)$/,
    // 小华 小红 小明
    /^(\S+)\s+(\S+)\s+(\S+)$/,
    // 第一小华第二小红第三小明
    /^第一(\S+)第二(\S+)第三(\S+)$/,
    // 第一名小华第二名小红第三名小明
    /^第一名(\S+)第二名(\S+)第三名(\S+)$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return [match[1].trim(), match[2].trim(), match[3].trim()];
    }
  }

  return null;
}

// ========== Phase-Aware Step Router ==========

function PhaseAwareStep({
  step, phase, question, visual,
  onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer,
  onSubmitAnswer,
}: {
  step: LessonStep;
  phase: StepPhase | null;
  question: Question;
  visual: ReturnType<typeof getVisual>;
  onPhaseAdvance: () => void;
  onStepComplete: (correct: boolean) => void;
  onPhaseBack: () => void;
  onWrongAnswer: (input: string) => void;
  onSubmitAnswer: (inputAnswer: string, questionId: string) => void;
}) {
  if (!phase) return null;

  // v2.6.5: 逻辑排序题使用专用组件
  const isLogicQuestion = question.problemType === 'logic_ranking'
    || question.problemType === 'logic_truth'
    || question.problemType === 'logic_ordering';

  if (isLogicQuestion) {
    // 运行时防御 P0: 逻辑题不应进入方程构建器
    if (phase === 'build_equation') {
      console.error('[P0] Logic question routed to build_equation!', {
        questionId: question.id,
        text: question.text.slice(0, 50),
        problemType: question.problemType,
        phase,
      });
    }
    return (
      <LogicRankingGuide
        question={question}
        phase={phase}
        onPhaseAdvance={onPhaseAdvance}
        onPhaseBack={onPhaseBack}
        onSubmitAnswer={onSubmitAnswer}
      />
    );
  }

  // v2.7: 等差数列/规律题使用 SequencePatternGuide
  const isSequenceQuestion = question.problemType === 'pattern'
    || question.problemType === 'sequence_arithmetic'
    || (question.answerType === 'multi_answer' && question.subAnswers?.length);

  if (isSequenceQuestion) {
    // 运行时防御：数列题不应进入方程构建器
    if (phase === 'build_equation') {
      console.warn('[P0] Sequence question routed to build_equation, redirecting to choose_operation');
    }
    const gradeBand = question.gradeBand || 'G1';
    return (
      <SequencePatternGuide
        question={question}
        phase={phase}
        gradeBand={gradeBand}
        onPhaseAdvance={onPhaseAdvance}
        onPhaseBack={onPhaseBack}
        onSubmitAnswer={onSubmitAnswer}
      />
    );
  }

  switch (step.type) {
    case 'find_numbers':
      return <FindNumbersPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'find_action_words':
      return <FindActionWordsPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'simulation':
      return <SimulationPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'remove_noise':
      return <RemoveNoisePhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'full_solve':
      return <FullSolvePhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'find_compare_numbers':
      return <CompareNumbersPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'spot_extra_info':
      return <SpotExtraInfoPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
    case 'spot_missing_info':
      return <SpotMissingInfoPhased phase={phase} question={question} visual={visual} onPhaseAdvance={onPhaseAdvance} onStepComplete={onStepComplete} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
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
  const hasAge = question.text.includes('岁') || question.text.includes('年龄');
  const hasBei = question.keywords.some(k => k.word === '倍');
  const hasInterval = question.text.includes('每隔') || question.text.includes('植树') || question.text.includes('种一棵');
  const hasCircle = question.text.includes('圆形') || question.text.includes('一圈') || question.text.includes('池塘周');
  const hasShare = question.text.includes('平均分') || question.text.includes('每人') || question.text.includes('每份');
  const hasCompare = question.text.includes('比') && question.text.includes('多') || question.text.includes('相差');
  const isMultiStep = question.operation === 'mixed';
  const isLogicRanking = question.problemType === 'logic_ranking' || question.problemType === 'logic_truth' || question.problemType === 'logic_ordering';

  // 数量关系——用孩子能懂的语言
  let opDesc = '';
  if (isLogicRanking) {
    opDesc = '这道题不是算数字，而是根据每个人的话排除不可能的位置。用排除法一步一步推理！';
  } else if (hasAge) {
    opDesc = '爸爸和孩子每年都长大1岁，年龄差永远不变。可以一年一年试！';
  } else if (hasCircle && hasInterval) {
    opDesc = '沿着圆圈走一圈，每走一段就到一个种树位置。因为是圆圈，最后一段会接回起点，所以有几段就有几棵树。';
  } else if (hasInterval) {
    opDesc = '先看总长，再看每段多长。有几段就有几个位置。注意两端要不要多算。';
  } else if (hasBei) {
    opDesc = `"倍"可以看成几份一样多。比如3的2倍 = 3 + 3（2个3合起来）。`;
  } else if (hasShare) {
    opDesc = '"平均分"就是每份一样多。把总数分成几份，每份是多少。';
  } else if (hasCompare) {
    opDesc = '要比较两个数量：谁多？谁少？多几个？用减法求相差。';
  } else if (isMultiStep) {
    opDesc = '这道题要分几步来想：先做什么，再做什么，最后算什么。一步一步来！';
  } else {
    const map: Record<string, string> = {
      addition: '数量合起来——变多了，用加法。',
      subtraction: '数量减少——变少了，用减法。',
      multiplication: '几个一样多合起来——每份一样多，有几份。',
      division: '把总数分成一样多的几份——这就是除法。',
      comparison: '比一比：谁多？谁少？差多少？',
      logic: '这道题要用推理来想，不是直接算。',
    };
    opDesc = map[question.operation] || '仔细读题，理解题目意思。';
  }

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
      {/* v2.6.5: 逻辑排序题人物和陈述线索 */}
      {isLogicRanking && question.people && question.people.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-blue-600">👥 人物线索：</span>
          {question.people.map((p, i) => (
            <span key={i} className="px-2 py-0.5 bg-purple-100 rounded-lg font-bold text-purple-700">{p}</span>
          ))}
        </div>
      )}
      {isLogicRanking && question.statements && question.statements.length > 0 && (
        <div className="bg-white rounded-lg p-2 text-sm space-y-1">
          <span className="font-bold text-blue-600">📝 话语线索：</span>
          {question.statements.map((s, i) => (
            <div key={i} className="flex items-start gap-1 text-gray-700">
              <span className="text-purple-500 flex-shrink-0">•</span>
              <span><span className="font-medium">{s.speaker}</span>：{s.text}</span>
            </div>
          ))}
        </div>
      )}
      {/* 数字线索 */}
      {question.numbers.length > 0 && !isLogicRanking && (
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
        <span className="font-bold text-blue-600">{isLogicRanking ? '🧠 怎么想：' : '🧮 怎么想：'}</span>
        <span className="text-gray-700">{opDesc}</span>
      </div>
      {/* v2.7.1: 小提示由 HintSystem 统一渲染，ClueSummary 不再渲染 */}
    </div>
  );
}

// ========== v2.6.7: 分层提示辅助函数 ==========

/** 从题目中提取轻量提示，保证不泄露答案 */
function getLightHint(question: Question): string {
  // 优先使用 structuredHints.light
  if (question.structuredHints?.light) return question.structuredHints.light;
  // 使用 hints[0] 但需安全检查
  if (question.hints.length > 0) {
    const first = question.hints[0];
    if (!hintRevealsAnswer(first, question)) return first;
  }
  // 生成安全默认提示
  return generateSafeDefaultHint(question);
}

/** 从题目中提取中等提示 */
function getMediumHint(question: Question): string | undefined {
  if (question.structuredHints?.medium) return question.structuredHints.medium;
  if (question.hints.length > 1) return question.hints[1];
  return undefined;
}

/** 从题目中提取完整步骤 */
function getFullStepsFromQuestion(question: Question) {
  // 优先使用 structuredHints.fullSteps
  if (question.structuredHints?.fullSteps?.length) return question.structuredHints.fullSteps;
  // 如果有 solutionStepsDetailed，转换为格式
  if (question.solutionStepsDetailed?.length) return question.solutionStepsDetailed;
  // 将 solutionSteps string[] 转为 SolutionStepDetailed[]
  if (question.solutionSteps.length > 0) {
    return question.solutionSteps.map((step, i) => ({
      stepTitle: `第${i + 1}步`,
      explanation: step,
    }));
  }
  return undefined;
}

/** 为不同题型生成安全的默认轻提示 */
/** v2.6.11: 从 question + stepType 生成 instruction（不依赖 story 模板） */
function generateStepInstruction(question: Question | null, stepType: string): string {
  if (!question) return '仔细读题，找出线索！';

  const text = question.text;
  const hasShopping = /超市|商店|购物|价格|优惠|找零|元|买|卖/.test(text);
  const hasAnimal = /兔子|兔|小鸟|鸟|小鸡|猫|狗|鱼/.test(text);
  const hasFood = /苹果|桃子|包子|饼干|蛋糕|糖果|牛奶/.test(text);
  const hasPlayground = /操场|跑道|彩旗|每隔|种树|植树/.test(text);
  const hasAge = /年龄|岁/.test(text);
  const hasGeometry = /正方形|长方形|三角形|圆形|面积|周长/.test(text);

  // 根据场景生成开头
  let scene = '';
  if (hasShopping) scene = '看看购物清单';
  else if (hasAnimal) scene = '看看小动物';
  else if (hasFood) scene = '看看食物';
  else if (hasPlayground) scene = '看看操场';
  else if (hasAge) scene = '看看年龄';
  else if (hasGeometry) scene = '看看图形';
  else scene = '仔细读题';

  // 根据 stepType 生成指令
  switch (stepType) {
    case 'find_numbers':
      return `${scene}，找出题目里所有的数字！`;
    case 'find_action_words':
      return `找出关键词，判断是增加还是减少！`;
    case 'simulation':
      return `观察物品的变化过程，想想用了什么运算！`;
    case 'remove_noise':
      return `有些信息是干扰项，擦掉和数学无关的！`;
    case 'full_solve':
      return `运用所有侦探技能，一步步破解这道题！`;
    case 'find_compare_numbers':
      return `找出数字之间的关系，谁多谁少？`;
    case 'spot_extra_info':
      return `有些数字是多余的，找出来！`;
    case 'spot_missing_info':
      return `判断信息够不够用来计算！`;
    default:
      return `${scene}，仔细想想！`;
  }
}

function generateSafeDefaultHint(question: Question): string {
  const pt = question.problemType;
  if (pt === 'pattern' || /规律/.test(question.text)) {
    return '先比较相邻两层，每次多了多少。把多的数量记下来。';
  }
  if (pt === 'logic_ranking' || pt === 'logic_truth' || pt === 'logic_ordering') {
    return '仔细读每个人的话，看看谁的话能帮你排除一些可能。';
  }
  if (pt === 'age_problem' || /岁|年龄/.test(question.text)) {
    return '爸爸和孩子每年都长大1岁，年龄差永远不变。可以一年一年试试。';
  }
  if (pt === 'planting_problem' || question.lessonType === 'planting_interval') {
    return '先看总共有多少段，再看两端要不要多算。一段一段数。';
  }
  if (pt === 'ratio_distribution' || question.lessonType === 'geometry_count') {
    return '先找一共有几份，再算每一份是多少。';
  }
  if (question.operation === 'mixed') {
    return '这道题要分几步来想。先看题目给了哪些数，再看看要算什么。';
  }
  return '先仔细读题，找出所有数字和关键词，再想想用什么方法。';
}

// ========== Shared: Equation + Answer Phase ==========

function EquationAnswerPhase({ question, visual, onCorrect, onPhaseBack, onWrongAnswer, onSubmitAnswer }: {
  question: Question;
  visual: ReturnType<typeof getVisual>;
  onCorrect: () => void;
  onPhaseBack?: () => void;
  onWrongAnswer: (input: string) => void;
  onSubmitAnswer?: (inputAnswer: string, questionId: string) => void;
}) {
  const [userAnswer, setUserAnswer] = useState('');
  const [shakeInput, setShakeInput] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const [showClues, setShowClues] = useState(true);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [usedFullHint, setUsedFullHint] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  function handleSubmit() {
    const input = userAnswer.trim();
    if (!input) return;

    // v2.7: 使用统一答案检查器
    const answerResult = checkAnswer(input, question);

    if (answerResult.correct) {
      setAnswered(true);
      setWrongFeedback(null);
      // v2.6.4: 使用统一事务提交 — 一次点击完成提交+推进
      if (onSubmitAnswer) {
        onSubmitAnswer(input, question.id);
      } else {
        // Fallback for components without onSubmitAnswer
        onCorrect();
      }
    } else {
      setShakeInput(true);
      setTimeout(() => { if (mountedRef.current) setShakeInput(false); }, 500);
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);
      onWrongAnswer(input);
      // v2.7: 使用统一 checker 的反馈
      setWrongFeedback(answerResult.feedback || '再想想哦～');
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

      {/* v2.6.7: 统一分层提示系统 — 答题前只显示 light hint */}
      <HintSystem
        question={question}
        phase={answered ? 'explain' : 'answer'}
        lightHint={getLightHint(question)}
        mediumHint={getMediumHint(question)}
        fullSteps={getFullStepsFromQuestion(question)}
        allowFullHint={usedFullHint}
        wrongAttempts={wrongAttempts}
        onFullHintRequested={() => setUsedFullHint(true)}
      />

      <AppCard variant="amber">
        <div className="text-center">
          <Calculator size={32} className="mx-auto mb-2 text-amber-600" />
          <h3 className="font-extrabold text-amber-800 text-lg mb-2">🧮 列算式，算答案！</h3>
          <p className="text-sm text-gray-600 mb-3">
            根据上面的步骤，写出算式并算出答案
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

// ========== Step 1: Find Numbers (Phased) (v2.6 P0修复) ==========
// Phases: read → find_numbers → [equation+answer] → completed

function FindNumbersPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
  const [found, setFound] = useState<Set<number>>(new Set());

  // v2.6.9: data-layer repair means this should never happen, but keep safety net
  const lessonType = inferLessonType(question);
  const isInvalidForNumbers = question.numbers.length === 0 ||
    lessonType === 'logic_reasoning' ||
    lessonType === 'guarantee_worst_case';

  const numbersToFind = question.numbers.filter(n =>
    classifyNumberRole(n, question.text) !== 'background_number'
  );
  const effectiveNumbers = numbersToFind.length > 0 ? numbersToFind : question.numbers;
  const allFound = effectiveNumbers.length > 0 && found.size === effectiveNumbers.length;

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
    // v2.6.9: Data-layer repair ensures this never renders. Safety net only.
    if (isInvalidForNumbers) {
      return (
        <div className="space-y-4">
          <AppCard variant="amber">
            <div className="text-center py-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="font-extrabold text-amber-800 text-lg mb-2">关卡数据异常</h3>
              <p className="text-sm text-gray-600 mb-4">
                系统检测到当前关卡数据不兼容，已自动生成新任务。
              </p>
              <AppButton variant="primary" size="md" onClick={() => { window.location.href = '/'; }}>
                返回首页重新开始
              </AppButton>
            </div>
          </AppCard>
        </div>
      );
    }

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
          {effectiveNumbers.map((n, i) => (
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
          {Array.from({ length: Math.max(0, 4 - effectiveNumbers.length) }).map((_, i) => (
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
                这 {effectiveNumbers.length} 个数字代表了{visual.itemEmoji} {visual.itemName}的数量信息
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
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 2: Find Action Words (Phased) (v2.6 P0修复) ==========
// Phases: read → find_keywords → choose_operation → [equation+answer] → completed

function FindActionWordsPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
  const [found, setFound] = useState<Set<number>>(new Set());
  const [opChoice, setOpChoice] = useState<'add' | 'subtract' | null>(null);

  // v2.6.9: data-layer repair ensures this never happens, safety net only
  const lessonType = inferLessonType(question);
  const isInvalidForAction = lessonType === 'guarantee_worst_case' ||
    lessonType === 'times_intro' ||
    lessonType === 'logic_reasoning' ||
    question.keywords.some(k =>
      k.word.includes('至少') || k.word.includes('保证') ||
      k.word.includes('倍') || k.word.includes('最坏')
    );

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
    // v2.6.9: Data-layer repair ensures this never renders. Safety net only.
    if (isInvalidForAction) {
      return (
        <div className="space-y-4">
          <AppCard variant="amber">
            <div className="text-center py-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="font-extrabold text-amber-800 text-lg mb-2">关卡数据异常</h3>
              <p className="text-sm text-gray-600 mb-4">
                检测到动作词关卡数据不兼容（含倍/年龄/逻辑等非加减词），系统已自动处理。
              </p>
              <AppButton variant="primary" size="md" onClick={() => { window.location.href = '/'; }}>
                返回首页重新开始
              </AppButton>
            </div>
          </AppCard>
        </div>
      );
    }

    const isAddSubtractOnly = needsAddSubtractPrompt(question.keywords);
    const hasMultiplicative = question.keywords.some(k => classifyKeyword(k.word)?.category === 'multiplicative_comparison');
    const hasComparison = question.keywords.some(k => classifyKeyword(k.word)?.category === 'comparison');
    const hasDivision = question.keywords.some(k => classifyKeyword(k.word)?.category === 'division_share');
    const hasGrouping = question.keywords.some(k => classifyKeyword(k.word)?.category === 'multiplication_groups');

    const promptTitle = hasMultiplicative
      ? '🤔 "倍"可以先怎么理解？'
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
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 3: Simulation (Phased) ==========
// Phases: read → simulation → choose_operation → answer → completed

function SimulationPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
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
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 4: Remove Noise (Phased) ==========
// Phases: read → remove_noise → build_equation → answer → completed

function RemoveNoisePhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
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
  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 5: Full Solve (Phased) ==========
// Phases: read → find_numbers → find_keywords → choose_operation → build_equation → answer → explain → completed

// v2.6.2: 孩子端友好的运算标签
function getOperationLabel(operation: string): string {
  switch (operation) {
    case 'addition': return '这道题要把数字加起来。';
    case 'subtraction': return '这道题要用减法来算。';
    case 'multiplication': return '这道题要用乘法来算。';
    case 'division': return '这道题要分一分，用除法来算。';
    case 'mixed': return '这道题要分几步来想，一步一步算。';
    case 'comparison': return '这道题要比一比数字的大小。';
    case 'fraction': return '这道题和分数有关。';
    case 'logic': return '这道题需要动脑筋推理。';
    default: return '动脑筋想一想，找到答案！';
  }
}

function FullSolvePhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);

  // v2.6.6: P0 运行时防御 — 逻辑题不应进入 FullSolvePhased
  if (question.problemType === 'logic_ranking' || question.problemType === 'logic_truth' || question.problemType === 'logic_ordering') {
    console.error('[P0] Logic question reached FullSolvePhased — should be routed to LogicRankingGuide', {
      questionId: question.id, text: question.text.slice(0, 50), phase,
    });
  }
  if (phase === 'build_equation' && (question.requiresEquation === false || question.problemType?.startsWith('logic'))) {
    console.error('[P0] Non-equation question in build_equation phase', {
      questionId: question.id, problemType: question.problemType, requiresEquation: question.requiresEquation,
    });
  }

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
          <p className="text-sm text-gray-600 mt-3">
            {question.domain === 'geometry' || question.domain === 'ratio'
              ? `这些数字是题目里的重要线索（${question.numbers.join('、')}），它们代表份数或角度关系。`
              : `数量分别是 ${question.numbers.join(' 和 ')}，代表${visual.itemEmoji} ${visual.itemName}`
            }
          </p>
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
    const isGeometryOrRatio = question.domain === 'geometry' || question.domain === 'ratio';
    return (
      <div className="space-y-4">
        <AppCard variant="purple">
          <h3 className="font-extrabold text-purple-800 mb-2">
            {isGeometryOrRatio ? '🔑 第2步：找到关系线索' : '🔑 第2步：找到关键词/动作词'}
          </h3>
        </AppCard>
        <AppCard>
          <div className="flex flex-wrap gap-2 mb-3">
            {question.keywords.length > 0
              ? question.keywords.map((kw, i) => (
                  <span key={i} className="px-4 py-3 bg-blue-100 rounded-xl font-bold text-blue-700 text-lg border-2 border-blue-300">
                    &ldquo;{kw.word}&rdquo;
                  </span>
                ))
              : <p className="text-gray-500 text-sm">
                  {isGeometryOrRatio ? '这道题不是动作词题，需要用份数和比例关系来理解。' : '这道题没有明显的动作关键词，需要理解题意来判断'}
                </p>
            }
          </div>
          {question.keywords.length > 0 && (
            <p className="text-sm text-gray-600">
              {isGeometryOrRatio ? '这些词提示了数字之间的份数和大小关系' : `这些词提示了${visual.itemName}的数量变化方向`}
            </p>
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
            <p className="text-sm text-gray-500 mt-2">{getOperationLabel(question.operation)}</p>
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
    return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
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
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
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

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 7: Spot Extra Info (Phased) ==========

function SpotExtraInfoPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
  // v2.6.9: data-layer repair ensures valid questions. Safety net only.
  const extraNumbers = question.extraNumbers ?? [];
  const noiseCount = question.noisePhrases?.length ?? 0;
  
  // Safety net: if somehow still invalid, show fallback
  if (extraNumbers.length === 0 && noiseCount === 0) {
    console.error(
      '[P0] spot_extra_info received question without extra info (should have been repaired in safeNormalizeLesson)',
      { questionId: question.id, text: question.text.slice(0, 60) }
    );
    return (
      <div className="space-y-4">
        <AppCard variant="amber">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-extrabold text-amber-800 text-lg mb-2">关卡数据异常</h3>
            <p className="text-sm text-gray-600 mb-4">
              该题目缺少多余信息，不适合当前关卡。系统已记录并自动处理。
            </p>
            <AppButton variant="primary" size="md" onClick={() => { window.location.href = '/'; }}>
              返回首页重新开始
            </AppButton>
          </div>
        </AppCard>
      </div>
    );
  }
  
  // silence unused onPhaseBack warning — used by EquationAnswerPhase
  const [foundExtra, setFoundExtra] = useState<Set<number>>(new Set());
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

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}

// ========== Step 8: Spot Missing Info (Phased) ==========

function SpotMissingInfoPhased({
  phase, question, visual, onPhaseAdvance, onStepComplete, onPhaseBack, onWrongAnswer, onSubmitAnswer,
}: { phase: StepPhase; question: Question; visual: ReturnType<typeof getVisual>; onPhaseAdvance: () => void; onStepComplete: (correct: boolean) => void; onPhaseBack: () => void; onWrongAnswer: (input: string) => void; onSubmitAnswer?: (inputAnswer: string, questionId: string) => void }) {
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

  if (phase === 'spot_missing_info') {
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

  return <EquationAnswerPhase question={question} visual={visual} onCorrect={() => onStepComplete(true)} onPhaseBack={onPhaseBack} onWrongAnswer={onWrongAnswer} onSubmitAnswer={onSubmitAnswer} />;
}
