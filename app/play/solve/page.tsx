'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { questions } from '@/data/questions';
import { useGameState } from '@/hooks/useGameState';
import Confetti from '@/components/Confetti';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import DetectiveMascot from '@/components/DetectiveMascot';
import StarDisplay from '@/components/StarDisplay';
import ProgressBar from '@/components/ProgressBar';
import { getRandomEncouragement, getRandomHint } from '@/data/levels';

type SolveStep = 'numbers' | 'keywords' | 'noise' | 'meaning' | 'operation' | 'answer' | 'done';

const stepLabels: Record<SolveStep, string> = {
  numbers: '找数字',
  keywords: '找关键词',
  noise: '删除废话',
  meaning: '理解问题',
  operation: '判断运算',
  answer: '填写答案',
  done: '完成',
};

export default function FullSolvePage() {
  const router = useRouter();
  const { state, completeQuestion } = useGameState();

  const [q] = useState(() => {
    const undone = questions.filter(
      (q) => q.noisePhrases.length > 0 && !state.completedQuestions.includes(q.id)
    );
    const pool = undone.length > 0 ? undone : questions;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const [step, setStep] = useState<SolveStep>('numbers');
  const [foundNumbers, setFoundNumbers] = useState<Set<number>>(new Set());
  const [foundKeywords, setFoundKeywords] = useState<Set<number>>(new Set());
  const [erasedNoise, setErasedNoise] = useState<Set<number>>(new Set());
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<'add' | 'subtract' | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'hint' | 'info'; message: string }>({ show: false, type: 'info', message: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);

  // Blocks for noise erasing
  const noiseBlocks = useMemo(() => {
    const result: { text: string; isNoise: boolean }[] = [];
    const segments = q.text.split(/(?<=[，。！？、])/);
    for (const seg of segments) {
      if (!seg.trim()) continue;
      result.push({
        text: seg,
        isNoise: q.noisePhrases.some((np) => seg.includes(np)),
      });
    }
    return result;
  }, [q]);

  function handleNextStep() {
    const flow: SolveStep[] = ['numbers', 'keywords', 'noise', 'meaning', 'operation', 'answer', 'done'];
    const idx = flow.indexOf(step);
    if (idx < flow.length - 1) {
      setStep(flow[idx + 1]);
    }
  }

  function handleSubmitAnswer() {
    const num = parseInt(userAnswer);
    if (isNaN(num)) {
      setFeedback({ show: true, type: 'hint', message: '请输入一个数字哦～' });
      return;
    }
    if (num === q.answer) {
      const stars = q.difficulty === 2 ? 3 : 2;
      setStarsEarned(stars);
      setFeedback({
        show: true,
        type: 'success',
        message: getRandomEncouragement(),
      });
      setShowConfetti(true);
      setStep('done');
      completeQuestion(q.id, true);
    } else {
      setShakeInput(true);
      setFeedback({
        show: true,
        type: 'hint',
        message: getRandomHint(),
      });
      setTimeout(() => setShakeInput(false), 500);
      completeQuestion(q.id, false, {
        questionId: q.id,
        questionText: q.text,
        myAnswer: num,
        correctAnswer: q.answer,
        errorType: '计算错误',
        retriedCorrect: false,
      });
    }
  }

  const stepIndex = (['numbers', 'keywords', 'noise', 'meaning', 'operation', 'answer', 'done'] as SolveStep[]).indexOf(step);
  const totalSteps = 6;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/play" className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 transition-colors">
          <ArrowLeft size={20} className="text-purple-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-purple-800">玩法四：完整破案 🕵️</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">步骤 {stepIndex}/{totalSteps}：{stepLabels[step]}</span>
            <ProgressBar
              value={stepIndex}
              max={totalSteps}
              color="bg-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Detective */}
      <div className="flex justify-center">
        <DetectiveMascot mood={step === 'done' ? 'excited' : 'thinking'} size="sm" />
      </div>

      {/* Question text - always visible */}
      <div className="card-detective p-4">
        <h3 className="text-sm font-bold text-gray-500 mb-2">📋 案件卷宗：</h3>
        <p className="text-base leading-relaxed text-gray-700">{q.text}</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Find numbers */}
        {step === 'numbers' && (
          <motion.div
            key="numbers"
            className="card-detective p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-amber-800 mb-3">
              🧭 第1步：找数字
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              题目里有哪些数字？点击你找到的数字！
            </p>
            <div className="flex flex-wrap gap-3">
              {q.numbers.map((n, i) => (
                <motion.button
                  key={i}
                  className={`px-6 py-4 rounded-2xl font-extrabold text-2xl border-2 transition-all ${
                    foundNumbers.has(i)
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}
                  onClick={() => {
                    const next = new Set(foundNumbers);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setFoundNumbers(next);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {n}
                </motion.button>
              ))}
            </div>
            {foundNumbers.size === q.numbers.length && (
              <motion.button
                className="w-full mt-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextStep}
              >
                ✅ 找到了所有数字！下一步 →
              </motion.button>
            )}
            {foundNumbers.size > 0 && foundNumbers.size < q.numbers.length && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                还有数字没找到哦，再仔细看看题目～
              </p>
            )}
          </motion.div>
        )}

        {/* Step 2: Find keywords */}
        {step === 'keywords' && (
          <motion.div
            key="keywords"
            className="card-detective p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-blue-800 mb-3">
              🔑 第2步：找关键词
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              这些词告诉你该做加法还是减法，点击它们！
            </p>
            <div className="flex flex-wrap gap-2">
              {q.keywords.map((kw, i) => (
                <motion.button
                  key={i}
                  className={`px-4 py-3 rounded-xl font-bold text-lg border-2 transition-all ${
                    foundKeywords.has(i)
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                  }`}
                  onClick={() => {
                    const next = new Set(foundKeywords);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setFoundKeywords(next);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  &ldquo;{kw.word}&rdquo;
                </motion.button>
              ))}
            </div>
            {foundKeywords.size === q.keywords.length && (
              <motion.button
                className="w-full mt-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextStep}
              >
                ✅ 找到了所有关键词！下一步 →
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Step 3: Erase noise */}
        {step === 'noise' && (
          <motion.div
            key="noise"
            className="card-detective p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-pink-800 mb-3">
              🧹 第3步：删除废话
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              点击擦掉和数学无关的句子！
            </p>
            <div className="space-y-1">
              {noiseBlocks.map((block, i) => (
                <motion.div
                  key={i}
                  className={`text-block cursor-pointer ${
                    erasedNoise.has(i)
                      ? block.isNoise
                        ? 'erased bg-green-50'
                        : 'erased bg-red-50'
                      : block.isNoise
                        ? 'noise'
                        : 'useful'
                  }`}
                  onClick={() => {
                    const next = new Set(erasedNoise);
                    next.has(i) ? next.delete(i) : next.add(i);
                    setErasedNoise(next);
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {erasedNoise.has(i) && <span className="mr-1">🧹</span>}
                  {block.text}
                </motion.div>
              ))}
            </div>
            <motion.button
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextStep}
            >
              下一步 →
            </motion.button>
          </motion.div>
        )}

        {/* Step 4: Question meaning */}
        {step === 'meaning' && (
          <motion.div
            key="meaning"
            className="card-detective p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-cyan-800 mb-3">
              🤔 第4步：题目在问什么？
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              读一读题目，它想问什么？
            </p>
            <div className="space-y-2">
              {q.questionMeaningOptions.map((opt, i) => (
                <motion.button
                  key={i}
                  className={`w-full py-4 rounded-xl font-bold text-lg border-2 transition-all ${
                    selectedMeaning === opt
                      ? opt === q.correctMeaning
                        ? 'bg-green-100 border-green-400 text-green-700'
                        : 'bg-red-100 border-red-400 text-red-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-cyan-300'
                  }`}
                  onClick={() => setSelectedMeaning(opt)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {opt}
                  {selectedMeaning === opt && opt === q.correctMeaning && (
                    <Check size={20} className="inline ml-2 text-green-600" />
                  )}
                  {selectedMeaning === opt && opt !== q.correctMeaning && (
                    <X size={20} className="inline ml-2 text-red-600" />
                  )}
                </motion.button>
              ))}
            </div>
            {selectedMeaning && selectedMeaning !== q.correctMeaning && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                不太对哦，再想想～答案是：{q.correctMeaning}
              </p>
            )}
            <motion.button
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextStep}
            >
              下一步 →
            </motion.button>
          </motion.div>
        )}

        {/* Step 5: Choose operation */}
        {step === 'operation' && (
          <motion.div
            key="operation"
            className="card-detective p-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-orange-800 mb-3">
              🧮 第5步：用加法还是减法？
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              根据关键词判断，这道题应该用什么运算？
            </p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                className={`py-5 rounded-2xl font-extrabold text-lg border-2 flex flex-col items-center gap-2 ${
                  selectedOperation === 'add'
                    ? q.operation === 'addition'
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                }`}
                onClick={() => setSelectedOperation('add')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <ArrowUpRight size={32} />
                加法 ➕
                <span className="text-xs">变多了 / 合起来</span>
              </motion.button>
              <motion.button
                className={`py-5 rounded-2xl font-extrabold text-lg border-2 flex flex-col items-center gap-2 ${
                  selectedOperation === 'subtract'
                    ? q.operation === 'subtraction'
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
                }`}
                onClick={() => setSelectedOperation('subtract')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <ArrowDownRight size={32} />
                减法 ➖
                <span className="text-xs">变少了 / 去掉</span>
              </motion.button>
            </div>
            <motion.button
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextStep}
            >
              下一步 →
            </motion.button>
          </motion.div>
        )}

        {/* Step 6: Answer */}
        {step === 'answer' && (
          <motion.div
            key="answer"
            className="card-detective p-5 text-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-extrabold text-green-800 mb-3">
              ✏️ 第6步：列算式，算答案！
            </h3>
            <div className="text-2xl font-extrabold text-gray-700 mb-4">
              {q.equation.replace('?', '___')}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              请把答案填在横线上
            </p>
            <div className={shakeInput ? 'animate-shake' : ''}>
              <input
                type="number"
                inputMode="numeric"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                className="w-24 h-14 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
                placeholder="?"
                autoFocus
              />
            </div>
            <motion.button
              className="mt-4 px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitAnswer}
            >
              提交答案
            </motion.button>
          </motion.div>
        )}

        {/* Done */}
        {step === 'done' && (
          <motion.div
            key="done"
            className="card-detective p-5 bg-green-50 border-green-200 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-xl font-extrabold text-green-700">案件完美侦破！</h3>
            <p className="text-gray-600 mt-2">{q.explanation}</p>
            <div className="mt-3 p-3 bg-white rounded-xl">
              <div className="text-lg font-extrabold text-amber-600">
                算式：{q.equation.replace('?', String(q.answer))}
              </div>
            </div>
            <div className="mt-3">
              <StarDisplay count={starsEarned} size="lg" animate />
              <span className="text-sm text-amber-600 ml-1">星星奖励</span>
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button
                className="px-6 py-3 bg-amber-400 text-white font-extrabold rounded-xl"
                onClick={() => router.push('/play')}
              >
                返回挑战
              </button>
              <button
                className="px-6 py-3 bg-purple-400 text-white font-extrabold rounded-xl"
                onClick={() => window.location.reload()}
              >
                再破一案
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackOverlay
        show={feedback.show}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, show: false }))}
      />

      <Confetti show={showConfetti} />
    </div>
  );
}
