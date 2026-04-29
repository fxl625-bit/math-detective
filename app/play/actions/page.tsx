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

const ROUNDS_PER_GAME = 5;

export default function ActionWordsPage() {
  const router = useRouter();
  const { state, completeQuestion } = useGameState();

  const gameQuestions = useMemo(() => {
    const pool = questions.filter((q) => !state.completedQuestions.includes(q.id));
    const selected = pool.length >= ROUNDS_PER_GAME
      ? [...pool].sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME)
      : [...questions].sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME);
    return selected;
  }, []);

  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedType, setSelectedType] = useState<'add' | 'subtract' | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'hint' | 'info'; message: string }>({ show: false, type: 'info', message: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const currentQ = gameQuestions[round] || gameQuestions[0];
  const keywords = currentQ.keywords;
  const keywordText = keywords.map((k) => k.word).join('、');
  const correctOp = currentQ.operation === 'addition' ? 'add' : 'subtract';

  function handleAnswer(type: 'add' | 'subtract') {
    if (answered) return;
    setSelectedType(type);
    setAnswered(true);
    const correct = type === correctOp;
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setFeedback({
        show: true,
        type: 'success',
        message: getRandomEncouragement(),
      });
      setShowConfetti(true);
    } else {
      setFeedback({
        show: true,
        type: 'hint',
        message: getRandomHint(),
      });
    }
  }

  function handleNext() {
    completeQuestion(currentQ.id, isCorrect, {
      questionId: currentQ.id,
      questionText: currentQ.text,
      myAnswer: selectedType === 'add' ? '加法' : '减法',
      correctAnswer: currentQ.answer,
      errorType: '动作词识别错误',
      retriedCorrect: isCorrect,
    });

    if (round + 1 >= ROUNDS_PER_GAME) {
      setGameOver(true);
    } else {
      setRound((r) => r + 1);
      setAnswered(false);
      setSelectedType(null);
      setIsCorrect(false);
    }
    setFeedback({ show: false, type: 'info', message: '' });
  }

  if (gameOver) {
    return (
      <div className="space-y-5 pb-4 text-center">
        <DetectiveMascot mood="excited" size="md" />
        <div className="card-detective p-6">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-extrabold text-amber-800">挑战完成！</h2>
          <p className="text-gray-600 mt-2">
            你答对了 {correctCount} / {ROUNDS_PER_GAME} 题
          </p>
          <StarDisplay count={correctCount} size="lg" animate />
          <div className="text-sm text-amber-600 mt-1">
            {correctCount === ROUNDS_PER_GAME
              ? '动作词大师！你已经完全掌握了！'
              : correctCount >= 3
                ? '很不错！继续加油！'
                : '再练练动作词吧，你可以的！'}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
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
            再来一轮
          </button>
        </div>
        <Confetti show={true} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/play" className="p-2 rounded-xl bg-blue-100 hover:bg-blue-200 transition-colors">
          <ArrowLeft size={20} className="text-blue-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-blue-800">玩法二：动作词识别 🧠</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">第 {round + 1}/{ROUNDS_PER_GAME} 题</span>
            <ProgressBar value={round} max={ROUNDS_PER_GAME} color="bg-blue-400" />
          </div>
        </div>
      </div>

      {/* Detective */}
      <div className="flex justify-center">
        <DetectiveMascot mood="thinking" size="sm" />
      </div>

      {/* Question */}
      <div className="card-detective p-5">
        <h3 className="text-sm font-bold text-gray-500 mb-2">📋 读一读这道题：</h3>
        <p className="text-lg leading-relaxed text-gray-700">{currentQ.text}</p>
      </div>

      {/* Keyword highlight */}
      <div className="card-detective p-4 bg-blue-50 border-blue-200">
        <h3 className="text-sm font-bold text-blue-700 mb-2">
          🔑 题目中的动作词/关键词：
        </h3>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw, i) => (
            <motion.span
              key={i}
              className="inline-block px-3 py-2 bg-blue-100 border-2 border-blue-300 rounded-xl text-blue-800 font-bold text-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.2, type: 'spring' }}
            >
              &ldquo;{kw.word}&rdquo;
            </motion.span>
          ))}
        </div>
      </div>

      {/* Question prompt */}
      <div className="text-center">
        <motion.h2
          className="text-xl font-extrabold text-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          这个词代表什么运算？
        </motion.h2>
        <p className="text-sm text-gray-500 mt-1">
          是让数量变多（加法），还是变少（减法）？
        </p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          className={`py-5 rounded-2xl font-extrabold text-lg flex flex-col items-center gap-2 border-2 transition-all ${
            answered && selectedType === 'add'
              ? isCorrect
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-red-100 border-red-400 text-red-700 animate-shake'
              : answered && correctOp === 'add'
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
          }`}
          whileHover={!answered ? { scale: 1.03 } : {}}
          whileTap={!answered ? { scale: 0.97 } : {}}
          onClick={() => handleAnswer('add')}
          disabled={answered}
        >
          <ArrowUpRight size={36} />
          <span>加法 ➕</span>
          <span className="text-xs font-normal">变多了 / 合起来</span>
          {answered && correctOp === 'add' && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={24} className="text-green-600" />
            </motion.span>
          )}
          {answered && selectedType === 'add' && !isCorrect && (
            <X size={24} className="text-red-600" />
          )}
        </motion.button>

        <motion.button
          className={`py-5 rounded-2xl font-extrabold text-lg flex flex-col items-center gap-2 border-2 transition-all ${
            answered && selectedType === 'subtract'
              ? isCorrect
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-red-100 border-red-400 text-red-700 animate-shake'
              : answered && correctOp === 'subtract'
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
          }`}
          whileHover={!answered ? { scale: 1.03 } : {}}
          whileTap={!answered ? { scale: 0.97 } : {}}
          onClick={() => handleAnswer('subtract')}
          disabled={answered}
        >
          <ArrowDownRight size={36} />
          <span>减法 ➖</span>
          <span className="text-xs font-normal">变少了 / 去掉</span>
          {answered && correctOp === 'subtract' && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={24} className="text-green-600" />
            </motion.span>
          )}
          {answered && selectedType === 'subtract' && !isCorrect && (
            <X size={24} className="text-red-600" />
          )}
        </motion.button>
      </div>

      {/* Feedback after answering */}
      <AnimatePresence>
        {answered && (
          <motion.div
            className={`card-detective p-4 ${
              isCorrect ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">{isCorrect ? '🎉' : '💡'}</div>
              <p className={`font-extrabold ${isCorrect ? 'text-green-700' : 'text-yellow-700'}`}>
                {isCorrect
                  ? '太棒了！判断完全正确！'
                  : '再想想哦～'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                &ldquo;{keywordText}&rdquo; 表示数量
                {correctOp === 'add' ? '增加，应该用加法！' : '减少，应该用减法！'}
              </p>
              {!isCorrect && (
                <div className="mt-2 p-3 bg-blue-50 rounded-xl text-left">
                  <div className="text-sm font-bold text-blue-700">💡 小提示：</div>
                  <ul className="text-sm text-blue-600 mt-1 space-y-0.5">
                    <li>🔺 加法：又来了、一共、合起来、加上、新增...</li>
                    <li>🔻 减法：飞走了、吃掉了、送给了、还剩、借走了...</li>
                  </ul>
                </div>
              )}
            </div>
            <motion.button
              className="w-full mt-4 py-3 bg-gradient-to-r from-blue-400 to-cyan-400 text-white font-extrabold rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
            >
              {round + 1 >= ROUNDS_PER_GAME ? '查看成绩' : '下一题 →'}
            </motion.button>
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
