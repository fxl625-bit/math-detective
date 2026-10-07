'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- The offline service worker caches documents, not Next RSC navigation payloads. */

import { useEffect, useRef, useState } from 'react';
import { Calculator, Home, RotateCcw, Trophy } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { normalizeLearningSettingsFromParent } from '@/lib/learningSettings';
import PageContainer from '@/components/layout/PageContainer';
import {
  availableMentalMathOperations, checkMentalMathAnswer, createSessionId, generateQuestions, getDateString,
  GRADE_OPTIONS, OPERATION_LABELS, summarizeSession,
  type MentalMathAnswer, type MentalMathMode, type MentalMathOperation, type MentalMathQuestion, type MentalMathSession,
} from '@/lib/mentalMath';

type Phase = 'setup' | 'quiz' | 'result';
const COUNTS = [10, 20, 30];
const GRADE_NAMES = Object.fromEntries(GRADE_OPTIONS.map(item => [item.value, item.label]));

export default function MentalMathPage() {
  const { state, saveMentalMathSession } = useGameState();
  const canonical = normalizeLearningSettingsFromParent(state.parentSettings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [grade, setGrade] = useState(canonical.grade);
  const [operation, setOperation] = useState<MentalMathOperation>(availableMentalMathOperations(canonical.grade)[0]);
  const [mode, setMode] = useState<MentalMathMode>('learning');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<MentalMathQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<MentalMathAnswer[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; firstCorrect: boolean; submitted: string; attempts: number } | null>(null);
  const [methodVisible, setMethodVisible] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [resultSession, setResultSession] = useState<MentalMathSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const gradeChosen = useRef(false);
  const firstAttempt = useRef<MentalMathAnswer | null>(null);
  const saved = useRef(false);
  const elapsed = useRef(0);
  const lastResume = useRef(0);
  const active = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!gradeChosen.current && phase === 'setup') {
      setGrade(canonical.grade);
      setOperation(availableMentalMathOperations(canonical.grade)[0]);
    }
  }, [canonical.grade, phase]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('count');
    if (requested && /^\d+$/.test(requested)) setCount(Math.min(30, Math.max(1, Number(requested))));
  }, []);

  const elapsedNow = () => elapsed.current + (active.current ? Date.now() - lastResume.current : 0);
  const pauseTimer = () => {
    if (active.current) { elapsed.current += Date.now() - lastResume.current; active.current = false; }
  };
  const resumeTimer = () => { if (!active.current && !document.hidden) { lastResume.current = Date.now(); active.current = true; } };
  const resetTimer = () => { elapsed.current = 0; active.current = false; resumeTimer(); };

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (!feedback) resumeTimer();
    const onVisibility = () => { if (document.hidden) pauseTimer(); else if (!feedback) resumeTimer(); };
    document.addEventListener('visibilitychange', onVisibility);
    const ticker = window.setInterval(() => setElapsedDisplay(elapsedNow()), 300);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(ticker); pauseTimer(); };
    // Timer refs are intentionally managed by event handlers, independent of render cadence.
  }, [phase, feedback]);
  useEffect(() => { if (phase === 'quiz' && !feedback) inputRef.current?.focus(); }, [phase, currentIndex, feedback]);

  const selectGrade = (next: typeof grade) => {
    gradeChosen.current = true;
    setGrade(next);
    if (!availableMentalMathOperations(next).includes(operation)) setOperation(availableMentalMathOperations(next)[0]);
  };
  const startQuiz = () => {
    const safeOperation = availableMentalMathOperations(grade).includes(operation) ? operation : availableMentalMathOperations(grade)[0];
    const rows = grade === 'G2' ? canonical.learnedTableRange : null;
    setQuestions(generateQuestions(safeOperation, grade, count, { learnedTableRange: rows }));
    setOperation(safeOperation);
    setCurrentIndex(0); setAnswers([]); setInput(''); setFeedback(null); setMethodVisible(false);
    firstAttempt.current = null; saved.current = false; setSaveStatus('idle');
    setSessionId(createSessionId()); resetTimer(); setPhase('quiz');
  };

  const current = questions[currentIndex];
  const submitAnswer = () => {
    if (!current || feedback || !input.trim()) return;
    pauseTimer();
    const correct = checkMentalMathAnswer(input, current);
    const attempts = (firstAttempt.current?.attempts ?? 0) + 1;
    if (!firstAttempt.current) {
      firstAttempt.current = {
        questionId: current.id, correct, submitted: input.trim(), answer: current.answer,
        timeMs: Math.max(0, Math.round(elapsedNow())), finalCorrect: correct, attempts,
        helpUsed: methodVisible,
        questionSnapshot: {
          id: current.id,
          gradeBand: /^G[1-6]$/.test(grade) ? grade as 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' : 'G1',
          text: current.text,
          answer: current.answer,
          answerType: 'number',
          answerSchema: current.answerKind === 'percent' ? { kind: 'percent' }
            : current.answerKind === 'fraction' ? { kind: 'fraction' }
              : undefined,
          answerSentence: String(current.answer),
          explanation: current.method || '',
        },
      };
    } else {
      firstAttempt.current = { ...firstAttempt.current, finalCorrect: correct, attempts,
        timeMs: Math.max(firstAttempt.current.timeMs, Math.round(elapsedNow())), helpUsed: true };
    }
    setFeedback({ correct, firstCorrect: firstAttempt.current.correct, submitted: input.trim(), attempts });
  };

  const continueQuiz = () => {
    if (!feedback || !firstAttempt.current || saved.current) return;
    const completed = { ...firstAttempt.current, finalCorrect: feedback.correct };
    const updated = [...answers, completed];
    setAnswers(updated);
    firstAttempt.current = null;
    setFeedback(null); setInput(''); setMethodVisible(false);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      resetTimer(); setElapsedDisplay(0);
      return;
    }
    saved.current = true;
    const session = summarizeSession({
      id: sessionId, date: getDateString(), grade, operation, mode,
      totalQuestions: questions.length, answers: updated, completedAt: new Date().toISOString(),
    });
    setResultSession(session);
    setSaveStatus(saveMentalMathSession(session) ? 'saved' : 'failed');
    setPhase('result');
  };
  const retrySave = () => {
    if (resultSession && saveStatus === 'failed') setSaveStatus(saveMentalMathSession(resultSession) ? 'saved' : 'failed');
  };
  const retry = () => { if (!feedback || feedback.correct) return; setInput(''); setFeedback(null); resumeTimer(); };
  const resetAll = () => {
    pauseTimer(); setPhase('setup'); setQuestions([]); setAnswers([]); setInput(''); setFeedback(null);
    setResultSession(null); setSaveStatus('idle'); firstAttempt.current = null; saved.current = false;
  };
  const allowed = availableMentalMathOperations(grade);
  const countOptions = [...new Set([...COUNTS, count])].sort((left, right) => left - right);
  const g2Range = grade === 'G2'
    ? canonical.learnedTableRange === null ? '口诀范围未确认：先用分组与平均分示例练习，不考背口诀。'
      : canonical.learnedTableRange.length === 0 ? '尚未学口诀：先用分组与平均分示例练习。'
        : `已学口诀行：${canonical.learnedTableRange.join('、')}；只抽取这些行对应的乘除事实。`
    : '';

  return <PageContainer bottomPadding className="max-w-3xl space-y-5">
    <header className="flex items-center gap-2"><Calculator className="text-amber-600" /><h1 className="text-2xl font-extrabold text-stone-900">口算练习器</h1></header>
    {phase === 'setup' && <div className="space-y-4">
      <section className="rounded-2xl border border-amber-200 bg-white p-4"><h2 className="font-bold">选择年级</h2><p className="text-sm text-stone-600">只调整本次口算范围，不改变正在进行的日课。</p><div className="mt-3 grid grid-cols-3 gap-2">{GRADE_OPTIONS.map(item => <button key={item.value} type="button" onClick={() => selectGrade(item.value as typeof grade)} aria-pressed={grade === item.value} className={`min-h-12 rounded-xl border-2 font-semibold ${grade === item.value ? 'border-amber-600 bg-amber-100' : 'border-stone-200'}`}>{item.label}</button>)}</div>{g2Range && <p className="mt-3 rounded-lg bg-blue-50 p-2 text-sm">{g2Range}</p>}</section>
      <section className="rounded-2xl border border-amber-200 bg-white p-4"><h2 className="font-bold">运算与模式</h2><div className="mt-3 flex flex-wrap gap-2">{allowed.map(item => <button key={item} type="button" aria-pressed={operation === item} onClick={() => setOperation(item)} className={`min-h-11 rounded-xl border px-3 font-semibold ${operation === item ? 'border-amber-600 bg-amber-100' : 'border-stone-300'}`}>{OPERATION_LABELS[item]}</button>)}</div><div className="mt-4 flex gap-3">{([['learning', '学习练习'], ['fluency', '熟练练习']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-11 rounded-xl border px-4 font-semibold ${mode === value ? 'border-blue-600 bg-blue-50' : 'border-stone-300'}`}>{label}</button>)}</div><p className="mt-2 text-sm text-stone-600">学习练习可查看方法并重试；熟练练习显示用时，但不会因时间到而判错。</p></section>
      <section className="rounded-2xl border border-amber-200 bg-white p-4"><h2 className="font-bold">题目数量</h2><div className="mt-3 flex flex-wrap gap-2">{countOptions.map(value => <button key={value} type="button" aria-pressed={count === value} onClick={() => setCount(value)} className={`min-h-11 rounded-xl border px-4 ${count === value ? 'border-amber-600 bg-amber-100' : 'border-stone-300'}`}>{value} 题</button>)}</div>{!COUNTS.includes(count) && <p className="mt-2 text-sm text-stone-600">当前设置为本次自选加练 {count} 题。</p>}</section>
      <button type="button" onClick={startQuiz} className="w-full rounded-xl bg-amber-600 px-5 py-4 font-bold text-white">开始练习</button>
    </div>}
    {phase === 'quiz' && current && <div className="space-y-4">
      <p className="text-sm font-bold">{GRADE_NAMES[grade]} · {OPERATION_LABELS[operation]} · 第 {currentIndex + 1}/{questions.length} 题</p>
      <div className="h-3 rounded-full bg-amber-100" role="progressbar" aria-valuenow={currentIndex} aria-valuemin={0} aria-valuemax={questions.length} aria-label="口算进度"><div className="h-full rounded-full bg-amber-500" style={{ width: `${currentIndex / questions.length * 100}%` }} /></div>
      <section className="rounded-2xl border border-amber-200 bg-white p-6 text-center"><p className="text-sm text-stone-500">{mode === 'fluency' ? `本题用时 ${(elapsedDisplay / 1000).toFixed(1)} 秒（切到后台暂停）` : '看清算式，再说说方法'}</p><h2 className="mt-4 text-3xl font-extrabold text-stone-900">{current.text}</h2></section>
      {mode === 'learning' && <div><button type="button" onClick={() => setMethodVisible(true)} className="min-h-11 rounded-lg border border-blue-400 px-3 py-2 font-semibold">看方法</button>{methodVisible && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm">{current.method}</p>}</div>}
      <form onSubmit={event => { event.preventDefault(); submitAnswer(); }} className="space-y-3"><label className="block font-bold">我的答案<input ref={inputRef} type="text" inputMode={current.answerKind === 'fraction' || current.answerKind === 'percent' ? 'text' : 'decimal'} autoComplete="off" value={input} onChange={event => setInput(event.target.value)} disabled={!!feedback} placeholder={current.answerKind === 'percent' ? '例如 25%' : current.answerKind === 'fraction' ? '例如 1/2' : '输入完整数字'} className="mt-2 w-full rounded-xl border-2 border-amber-300 p-4 text-center text-2xl" /></label><button type="submit" disabled={!!feedback || !input.trim()} className="min-h-11 w-full rounded-xl bg-green-700 p-3 font-bold text-white disabled:opacity-50">提交答案</button></form>
      {feedback && <section aria-live="polite" className={`space-y-3 rounded-xl p-4 ${feedback.correct ? 'bg-green-50' : 'bg-amber-50'}`}><p className="font-bold">{feedback.correct ? '答对了。' : `这次不对；你填的是 ${feedback.submitted}。`}</p>{!feedback.correct && <p>正确答案：{current.answer}。{mode === 'learning' ? current.method : '可以重试，也可手动继续。'}</p>}<p className="text-sm">{feedback.firstCorrect ? '首答正确' : '首答未正确'}；目前已尝试 {feedback.attempts} 次。</p><div className="flex gap-3">{!feedback.correct && <button type="button" onClick={retry} className="min-h-11 rounded-xl border border-amber-600 px-4 py-2 font-semibold">再试一次</button>}<button type="button" onClick={continueQuiz} className="min-h-11 rounded-xl bg-amber-700 px-4 py-2 font-semibold text-white">{currentIndex + 1 === questions.length ? '查看结果' : '继续下一题'}</button></div></section>}
      <button type="button" onClick={resetAll} className="min-h-11 text-sm text-stone-600 underline">退出本次练习（未完成不保存）</button>
    </div>}
    {phase === 'result' && resultSession && <div className="space-y-4"><section className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center"><Trophy className="mx-auto text-amber-600" /><h2 className="mt-2 text-2xl font-bold">本次练习完成</h2><p>首答正确 {resultSession.correctCount}/{resultSession.totalQuestions} 题；重试后完成 {resultSession.answers.filter(item => item.finalCorrect ?? item.correct).length}/{resultSession.totalQuestions} 题。</p><p>平均每题实际作答用时 {(resultSession.avgTimeMs / 1000).toFixed(1)} 秒，切到后台不计时。</p><p role="status" className={`mt-2 text-sm font-bold ${saveStatus === 'saved' ? 'text-green-800' : 'text-red-700'}`}>{saveStatus === 'saved' ? '本次记录已保存在这台设备。' : '保存失败，本次结果尚未写入设备。'}</p>{saveStatus === 'failed' && <button type="button" onClick={retrySave} className="mt-2 min-h-11 rounded-xl border border-red-400 bg-white px-4 font-bold text-red-800">重试保存</button>}</section>{resultSession.answers.some(item => !item.correct) && <section className="rounded-2xl border border-amber-200 bg-white p-4"><h3 className="font-bold">首答回顾</h3>{resultSession.answers.filter(item => !item.correct).map(item => <p key={item.questionId} className="mt-2 border-b py-2 text-sm">{questions.find(q => q.id === item.questionId)?.text}：首答 {item.submitted}，标准答案 {item.answer}；{item.finalCorrect ? '重试后正确' : '尚未答对'}。</p>)}</section>}<div className="flex gap-3"><button type="button" onClick={resetAll} className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-600 px-4 py-3 font-bold"><RotateCcw size={18} />再练一次</button><a href="/" className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-4 py-3 font-bold text-white"><Home size={18} />返回首页</a></div></div>}
  </PageContainer>;
}
