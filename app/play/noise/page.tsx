'use client';

/* eslint-disable react-hooks/purity, react-hooks/exhaustive-deps -- legacy standalone level
   page (see ARCHIVE.md); question pool is shuffled once on mount via Math.random by design. */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eraser, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { questions } from '@/data/questions';
import { useGameState } from '@/hooks/useGameState';
import Confetti from '@/components/Confetti';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import DetectiveMascot from '@/components/DetectiveMascot';
import ProgressBar from '@/components/ProgressBar';
import { getRandomEncouragement } from '@/data/levels';

const ROUNDS_PER_GAME = 3;

export default function NoiseReductionPage() {
  const router = useRouter();
  const { state, completeQuestion } = useGameState();

  const gameQuestions = useMemo(() => {
    const pool = questions.filter(
      (q) => q.noisePhrases.length > 0 && !state.completedQuestions.includes(q.id)
    );
    if (pool.length >= ROUNDS_PER_GAME) {
      return [...pool].sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME);
    }
    // Include questions even if already done if not enough with noise
    const noisePool = questions.filter((q) => q.noisePhrases.length > 0);
    return [...noisePool].sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME);
  }, []);

  const [round, setRound] = useState(0);
  const [erasedBlocks, setErasedBlocks] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ show: boolean; type: 'success' | 'hint' | 'info'; message: string }>({ show: false, type: 'info', message: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'erasing' | 'done'>('erasing');
  const [gameOver, setGameOver] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const currentQ = gameQuestions[round] || gameQuestions[0];

  // Split text into blocks
  const blocks = useMemo(() => {
    if (!currentQ) return [];
    const result: { text: string; isNoise: boolean }[] = [];
    const text = currentQ.text;

    // Mark noise phrases
    const noisePositions: { start: number; end: number }[] = [];
    for (const np of currentQ.noisePhrases) {
      const idx = text.indexOf(np);
      if (idx >= 0) {
        noisePositions.push({ start: idx, end: idx + np.length });
      }
    }
    noisePositions.sort((a, b) => a.start - b.start);

    // Mark useful phrases
    const usefulPositions: { start: number; end: number }[] = [];
    for (const up of currentQ.usefulPhrases) {
      const idx = text.indexOf(up);
      if (idx >= 0) {
        usefulPositions.push({ start: idx, end: idx + up.length });
      }
    }
    usefulPositions.sort((a, b) => a.start - b.start);

    // Build blocks by finding non-overlapping segments
    // Simple approach: split by Chinese punctuation
    const segments = text.split(/(?<=[，。！？、])/);
    for (const seg of segments) {
      if (!seg.trim()) continue;
      const isNoise = currentQ.noisePhrases.some((np) => seg.includes(np));
      result.push({ text: seg, isNoise });
    }

    return result;
  }, [currentQ]);

  function handleEraseBlock(idx: number) {
    if (phase !== 'erasing') return;
    const block = blocks[idx];
    const newErased = new Set(erasedBlocks);

    if (block.isNoise) {
      newErased.add(idx);
      setErasedBlocks(newErased);
      setFeedback({
        show: true,
        type: 'success',
        message: '✅ 正确！这段话和数学无关，擦掉它！',
      });
    } else {
      newErased.add(idx);
      setErasedBlocks(newErased);
      setFeedback({
        show: true,
        type: 'hint',
        message: '⚠️ 这段包含有用的数学信息哦，不过没关系，再试试别的！',
      });
    }

    // Check if all noise is erased
    const remainingNoise = blocks.filter((b, i) => b.isNoise && !newErased.has(i));
    if (remainingNoise.length === 0 && newErased.size > 0) {
      setTimeout(() => {
        if (!mountedRef.current) return;
        const gotWrong = blocks.some((b, i) => !b.isNoise && newErased.has(i));
        if (!gotWrong) {
          setCorrectCount((c) => c + 1);
        }
        setPhase('done');
        setFeedback({
          show: true,
          type: 'success',
          message: getRandomEncouragement() + '\n你已经找到真正有用的线索了！',
        });
        setShowConfetti(true);
      }, 800);
    }
  }

  function handleNext() {
    completeQuestion(currentQ.id, !blocks.some((b, i) => !b.isNoise && erasedBlocks.has(i)), {
      questionId: currentQ.id,
      questionText: currentQ.text,
      myAnswer: '已擦掉废话',
      correctAnswer: currentQ.answer,
      errorType: '干扰信息判断错误',
      retriedCorrect: true,
    });

    if (round + 1 >= ROUNDS_PER_GAME) {
      setGameOver(true);
    } else {
      setRound((r) => r + 1);
      setErasedBlocks(new Set());
      setPhase('erasing');
      setFeedback({ show: false, type: 'info', message: '' });
    }
  }

  function handleReset() {
    setErasedBlocks(new Set());
    setPhase('erasing');
  }

  if (gameOver || gameQuestions.length === 0) {
    return (
      <div className="space-y-5 pb-4 text-center">
        <DetectiveMascot mood="excited" size="md" />
        <div className="card-detective p-6">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-extrabold text-amber-800">挑战完成！</h2>
          <p className="text-gray-600 mt-2">
            你成功识别了 {correctCount} / {ROUNDS_PER_GAME} 题的干扰信息
          </p>
          <div className="text-sm text-amber-600 mt-1">
            {correctCount === ROUNDS_PER_GAME
              ? '火眼金睛！废话再也骗不了你！'
              : '继续练习，你会越来越厉害的！'}
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
        <Link href="/play" className="p-2 rounded-xl bg-pink-100 hover:bg-pink-200 transition-colors">
          <ArrowLeft size={20} className="text-pink-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-pink-800">玩法三：擦掉废话 🧹</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">第 {round + 1}/{ROUNDS_PER_GAME} 题</span>
            <ProgressBar value={round} max={ROUNDS_PER_GAME} color="bg-pink-400" />
          </div>
        </div>
      </div>

      {/* Detective */}
      <div className="flex justify-center">
        <DetectiveMascot mood="thinking" size="sm" />
      </div>

      {/* Instructions */}
      <div className="card-detective p-3 bg-pink-50 border-pink-200">
        <div className="flex items-center gap-2 text-pink-700 text-sm font-bold">
          <Eraser size={18} />
          题目里有些话是干扰信息，和数学无关！点击它，把它擦掉！
        </div>
      </div>

      {/* Question blocks */}
      <div className="card-detective p-5">
        <h3 className="text-sm font-bold text-gray-500 mb-3">📋 题目（点击擦掉无关信息）：</h3>
        <div className="space-y-1">
          {blocks.map((block, idx) => (
            <motion.div
              key={idx}
              className={`text-block ${
                erasedBlocks.has(idx)
                  ? block.isNoise
                    ? 'erased bg-green-50 border-green-200'
                    : 'erased bg-red-50 border-red-200'
                  : block.isNoise
                    ? 'noise'
                    : 'useful'
              } cursor-pointer`}
              onClick={() => handleEraseBlock(idx)}
              whileHover={phase === 'erasing' && !erasedBlocks.has(idx) ? { scale: 1.02, x: 4 } : {}}
              whileTap={phase === 'erasing' ? { scale: 0.97 } : {}}
              animate={
                erasedBlocks.has(idx)
                  ? block.isNoise
                    ? { opacity: 0.3, scale: 0.95 }
                    : { opacity: 0.3, scale: 0.95 }
                  : {}
              }
            >
              {erasedBlocks.has(idx) && (
                <span className="mr-1">{block.isNoise ? '🧹' : '❓'}</span>
              )}
              {block.text}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <motion.button
          className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
        >
          <RotateCcw size={18} />
          重新擦除
        </motion.button>
      </div>

      {/* Done phase */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            className="card-detective p-5 bg-green-50 border-green-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="text-lg font-extrabold text-green-700">
                你已经找到真正有用的线索了！
              </h3>
              <div className="mt-3 p-3 bg-white rounded-xl text-left">
                <div className="text-sm font-bold text-gray-600">有用信息：</div>
                <div className="text-sm text-gray-700 mt-1">
                  {currentQ.usefulPhrases.join('；')}
                </div>
                <div className="text-sm font-bold text-gray-600 mt-2">列式：</div>
                <div className="text-lg font-extrabold text-amber-600">
                  {currentQ.equation.replace('?', String(currentQ.answer))}
                </div>
              </div>
              <motion.button
                className="mt-4 px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold rounded-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
              >
                {round + 1 >= ROUNDS_PER_GAME ? '查看成绩' : '下一题 →'}
              </motion.button>
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
